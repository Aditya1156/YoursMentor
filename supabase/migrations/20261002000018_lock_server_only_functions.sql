-- YoursMentor.in — lock the functions only the server may call
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default. Every
-- function written for the booking engine therefore ended up callable by anon
-- and authenticated unless a migration took that away, and the ones meant to be
-- called only by our own server with the service role never did.
--
-- This is the same shape as the column-privilege bug: the grant that mattered
-- was the one nobody wrote. Verified against the live database before fixing.
--
-- confirm_booking() was the serious one. It is security definer, had no caller
-- check of any kind — because it was written to run after Razorpay had already
-- been verified — and was reachable by anon. So:
--
--   * a student could confirm their own held seat for free, by calling it with
--     any made-up payment id, and no payments row was ever created
--   * an anonymous caller with no token could confirm ANYONE's booking, needing
--     nothing but the booking uuid
--
-- Both were reproduced against production. The moment real Razorpay keys go on,
-- that is every seat on the platform for free.
--
-- auto_cancel_under_minimum() was the other bad one: anyone could cancel every
-- under-booked session starting in the next six hours and trigger the refunds,
-- over and over.
--
-- cancel_booking() and leave_review() are left alone deliberately. They are
-- meant to be called by the student and both already check
-- student_id = auth.uid() themselves.

-- ---- the payment gate: service role only ----------------------------------
revoke execute on function public.confirm_booking(uuid, text, text)
  from public, anon, authenticated;

-- ---- the scheduled jobs: service role only, via the cron routes -----------
revoke execute on function public.release_expired_holds() from public, anon, authenticated;
revoke execute on function public.auto_cancel_under_minimum() from public, anon, authenticated;
revoke execute on function public.complete_finished_sessions() from public, anon, authenticated;

-- Belt and braces inside the function as well, so that a future migration that
-- re-grants it by accident — or a caller we have not thought of — still cannot
-- confirm a seat that was never paid for. A definer function that moves money
-- should not rely solely on who was granted it.
create or replace function public.confirm_booking(
  p_booking uuid,
  p_payment_id text,
  p_order_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  -- auth.uid() is null for the service role and for a plain postgres
  -- connection, and non-null for anyone arriving through PostgREST with a
  -- token. Only the former has any business confirming a payment.
  if auth.uid() is not null and not public.is_admin() then
    raise exception
      'Seats are confirmed by the payment webhook, not by the client.'
      using errcode = '42501';
  end if;

  select * into v_booking from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'Unknown booking %', p_booking using errcode = 'P0002';
  end if;

  -- Webhooks retry. Confirming twice must be a no-op, not a double seat.
  if v_booking.status = 'confirmed' then
    return;
  end if;

  if v_booking.status <> 'held' then
    raise exception 'Booking % is % and cannot be confirmed', p_booking, v_booking.status
      using errcode = 'P0001';
  end if;

  update public.bookings
     set status = 'confirmed',
         hold_expires_at = null,
         razorpay_payment_id = p_payment_id,
         razorpay_order_id = coalesce(p_order_id, razorpay_order_id)
   where id = p_booking;

  insert into public.notifications (user_id, type, title, body, link)
  select v_booking.student_id, 'booking_confirmed', 'Your seat is confirmed',
         s.title, '/my-sessions'
    from public.sessions s where s.id = v_booking.session_id;
end;
$$;

revoke execute on function public.confirm_booking(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.confirm_booking(uuid, text, text) to service_role;

comment on function public.confirm_booking is
  'Marks a held seat paid. Service role only: the caller is trusted to have
   verified the payment first, so a client must never reach it.';
