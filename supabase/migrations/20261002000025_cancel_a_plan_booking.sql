-- YoursMentor.in — cancelling a seat that a plan paid for
--
-- Found while wiring Pod and Pro up, before either went near a student.
--
-- cancel_booking() refunds bookings.amount into the credit ledger. For a seat
-- paid with money that is right. For a seat paid out of a monthly allowance it
-- is not: no money was taken, the session was. Refunding credit there would
-- hand a Pod subscriber ₹199 of spendable balance for cancelling something they
-- never paid cash for — four times a month, for ₹199 a month. The subscription
-- would print money in the wrong direction.
--
-- So the refund follows whatever actually paid. A plan booking gives the session
-- back to the allowance; a paid booking still gives credit. The payment
-- reference says which: the checkout route writes 'plan_<booking id>' when the
-- allowance covered it, the way it writes 'credits_<booking id>' for credit.

create or replace function public.cancel_booking(p_booking uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_session public.sessions%rowtype;
  v_refunded boolean := false;
  v_by_plan boolean := false;
  v_gave_back boolean := false;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found or v_booking.student_id <> auth.uid() then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if v_booking.status not in ('held', 'confirmed') then
    raise exception 'That booking cannot be cancelled.' using errcode = 'P0001';
  end if;

  select * into v_session from public.sessions where id = v_booking.session_id for update;

  v_by_plan := coalesce(v_booking.razorpay_payment_id, '') like 'plan\_%';

  -- The same 24-hour line applies either way. Inside it, the mentor has held the
  -- slot and neither the money nor the session comes back.
  if v_booking.status = 'confirmed' and v_session.start_at - now() >= interval '24 hours' then
    if v_by_plan then
      v_gave_back := public.refund_subscription_seat(p_booking);
    else
      insert into public.credit_ledger (user_id, amount, reason, booking_id)
      values (v_booking.student_id, v_booking.amount,
              'Cancelled 24h+ before the session', p_booking);
      v_refunded := true;
    end if;
  end if;

  update public.bookings set status = 'cancelled_by_student', hold_expires_at = null
   where id = p_booking;

  update public.sessions set seats_booked = greatest(seats_booked - 1, 0)
   where id = v_booking.session_id;

  return case
    when v_refunded then 'credited'
    when v_gave_back then 'session_returned'
    else 'no_refund'
  end;
end;
$$;

-- cancel_session() has the same problem from the mentor's side: it credits every
-- confirmed student when a mentor cancels. A plan subscriber should get the
-- session back instead, and with no notice requirement — the mentor cancelled.
create or replace function public.cancel_session(p_session uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions%rowtype;
  v_is_admin boolean := public.is_admin();
  r record;
begin
  select * into v_session from public.sessions where id = p_session for update;
  if not found then
    raise exception 'Session not found.' using errcode = 'P0002';
  end if;
  if v_session.mentor_id <> auth.uid() and not v_is_admin then
    raise exception 'Not your session.' using errcode = '42501';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'That session cannot be cancelled.' using errcode = 'P0001';
  end if;

  -- Each student is made whole in the currency they actually paid in.
  for r in
    select b.id, b.student_id, b.amount,
           coalesce(b.razorpay_payment_id, '') like 'plan\_%' as by_plan
      from public.bookings b
     where b.session_id = p_session and b.status = 'confirmed'
  loop
    if r.by_plan then
      perform public.refund_subscription_seat(r.id);
    else
      insert into public.credit_ledger (user_id, amount, reason, booking_id)
      values (r.student_id, r.amount,
              coalesce(p_reason, 'Mentor cancelled the session'), r.id);
    end if;
  end loop;

  insert into public.notifications (user_id, type, title, body, link)
  select b.student_id, 'session_cancelled', 'A session was cancelled',
         coalesce(p_reason, 'The mentor cancelled.')
           || ' You have not lost anything — it is back in your account.',
         '/my-sessions'
    from public.bookings b
   where b.session_id = p_session and b.status in ('held', 'confirmed');

  update public.bookings
     set status = 'cancelled_by_mentor', hold_expires_at = null
   where session_id = p_session and status in ('held', 'confirmed');

  update public.sessions
     set status = 'cancelled', seats_booked = 0
   where id = p_session;

  -- Cancelling 48h+ ahead is courteous, not a breach.
  if v_session.start_at - now() < interval '48 hours' and not v_is_admin then
    update public.mentor_profiles
       set strikes = strikes + 1,
           status = case when strikes + 1 >= 3 then 'suspended'::mentor_status else status end
     where user_id = v_session.mentor_id;
  end if;
end;
$$;

revoke execute on function public.cancel_session(uuid, text) from public, anon;
grant execute on function public.cancel_session(uuid, text) to authenticated;

-- refund_subscription_seat() is called from inside these two definer functions,
-- which run as the owner, so the earlier service_role-only grant is enough and
-- clients still cannot reach it directly.
