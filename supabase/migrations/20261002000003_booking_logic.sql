-- YoursMentor.in — booking logic and row-level security
--
-- Everything that moves a seat or money is a SECURITY DEFINER function, so the
-- tables themselves stay read-mostly for `authenticated`. A student can read
-- their bookings but cannot write one; they call hold_seat() and the database
-- decides. That removes the whole class of "client posted a crafted row" bug.

-- ============================================================ seat holds ====

/**
 * Reserve a seat. Returns the booking id.
 *
 * `for update` on the session row serialises every concurrent attempt on the
 * same session, so the capacity check and the increment cannot interleave.
 * The seats_within_capacity CHECK is the backstop if this is ever bypassed.
 */
create or replace function public.hold_seat(p_session uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_booking uuid;
  v_existing public.bookings%rowtype;
begin
  if v_student is null then
    raise exception 'You need to sign in to book.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_student and is_adult_confirmed and status = 'active'
  ) then
    raise exception 'Your account cannot book sessions yet.' using errcode = '42501';
  end if;

  -- Serialises every booking attempt on this session.
  select * into v_session from public.sessions where id = p_session for update;

  if not found then
    raise exception 'That session no longer exists.' using errcode = 'P0002';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'That session is not open for booking.' using errcode = 'P0001';
  end if;
  if v_session.start_at <= now() then
    raise exception 'That session has already started.' using errcode = 'P0001';
  end if;
  if v_session.mentor_id = v_student then
    raise exception 'You cannot book your own session.' using errcode = 'P0001';
  end if;
  if v_session.seats_booked >= v_session.capacity then
    raise exception 'That session is full.' using errcode = 'P0001';
  end if;

  -- An unexpired hold is handed back rather than duplicated, so a double tap
  -- or a browser retry lands on the same booking.
  select * into v_existing from public.bookings
  where session_id = p_session and student_id = v_student
    and status in ('held', 'confirmed', 'attended', 'no_show_student');

  if found then
    if v_existing.status = 'held' and v_existing.hold_expires_at > now() then
      return v_existing.id;
    end if;
    raise exception 'You already have a seat in this session.' using errcode = 'P0001';
  end if;

  insert into public.bookings (session_id, student_id, status, hold_expires_at, amount)
  values (p_session, v_student, 'held', now() + public.hold_window(), v_session.price)
  returning id into v_booking;

  update public.sessions
     set seats_booked = seats_booked + 1
   where id = p_session;

  return v_booking;
end;
$$;

/**
 * Mark a held booking paid. Service role only — it is called from the Razorpay
 * webhook after the signature is verified, never from the browser.
 */
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

/**
 * Student-initiated cancellation. 24h or more before the start gives credits
 * back; under 24h gives nothing (spec §7). The rule lives here so the refund
 * policy cannot drift between the UI and the server.
 */
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
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found or v_booking.student_id <> auth.uid() then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if v_booking.status not in ('held', 'confirmed') then
    raise exception 'That booking cannot be cancelled.' using errcode = 'P0001';
  end if;

  select * into v_session from public.sessions where id = v_booking.session_id for update;

  if v_booking.status = 'confirmed' and v_session.start_at - now() >= interval '24 hours' then
    insert into public.credit_ledger (user_id, amount, reason, booking_id)
    values (v_booking.student_id, v_booking.amount, 'Cancelled 24h+ before the session', p_booking);
    v_refunded := true;
  end if;

  update public.bookings set status = 'cancelled_by_student', hold_expires_at = null
   where id = p_booking;

  update public.sessions set seats_booked = greatest(seats_booked - 1, 0)
   where id = v_booking.session_id;

  return case when v_refunded then 'credited' else 'no_refund' end;
end;
$$;

/** Mentor cancels: everyone is refunded in credits and the mentor takes a strike. */
create or replace function public.cancel_session(p_session uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions%rowtype;
  v_is_admin boolean := public.is_admin();
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

  insert into public.credit_ledger (user_id, amount, reason, booking_id)
  select b.student_id, b.amount, coalesce(p_reason, 'Mentor cancelled the session'), b.id
    from public.bookings b
   where b.session_id = p_session and b.status = 'confirmed';

  insert into public.notifications (user_id, type, title, body, link)
  select b.student_id, 'session_cancelled', 'A session was cancelled',
         v_session.title || ' — your credits are back in your wallet.', '/my-sessions'
    from public.bookings b
   where b.session_id = p_session and b.status in ('held', 'confirmed');

  update public.bookings set status = 'cancelled_by_mentor', hold_expires_at = null
   where session_id = p_session and status in ('held', 'confirmed');

  update public.sessions set status = 'cancelled', seats_booked = 0 where id = p_session;

  -- Cancelling 48h+ ahead is courteous, not a breach.
  if v_session.start_at - now() < interval '48 hours' and not v_is_admin then
    update public.mentor_profiles
       set strikes = strikes + 1,
           status = case when strikes + 1 >= 3 then 'suspended'::mentor_status else status end
     where user_id = v_session.mentor_id;
  end if;
end;
$$;

-- ============================================================ scheduled ====
-- Called by Vercel Cron through /api/cron/*, with the service-role client.

/** Releases seats whose payment window closed. */
create or replace function public.release_expired_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_released int;
begin
  with expired as (
    update public.bookings
       set status = 'cancelled_auto', hold_expires_at = null
     where status = 'held' and hold_expires_at < now()
    returning session_id
  ), regrouped as (
    select session_id, count(*) n from expired group by session_id
  )
  update public.sessions s
     set seats_booked = greatest(s.seats_booked - r.n, 0)
    from regrouped r
   where s.id = r.session_id;

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

/** Group sessions that never reached min_seats are cancelled 6h out (spec §7). */
create or replace function public.auto_cancel_under_minimum()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare r record; v_count int := 0;
begin
  for r in
    select id from public.sessions
     where status = 'scheduled'
       and type = 'group'
       and start_at between now() and now() + interval '6 hours'
       and seats_booked < min_seats
  loop
    insert into public.credit_ledger (user_id, amount, reason, booking_id)
    select b.student_id, b.amount, 'Session cancelled — not enough students', b.id
      from public.bookings b where b.session_id = r.id and b.status = 'confirmed';

    insert into public.notifications (user_id, type, title, body, link)
    select b.student_id, 'session_cancelled', 'A session was cancelled',
           'Not enough students joined. Your credits are back in your wallet.', '/my-sessions'
      from public.bookings b where b.session_id = r.id and b.status in ('held', 'confirmed');

    update public.bookings set status = 'cancelled_auto', hold_expires_at = null
     where session_id = r.id and status in ('held', 'confirmed');
    update public.sessions set status = 'cancelled', seats_booked = 0 where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

/** Closes sessions 15 minutes after they end and asks students to rate them. */
create or replace function public.complete_finished_sessions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  with done as (
    update public.sessions
       set status = 'completed'
     where status in ('scheduled', 'live') and end_at + interval '15 minutes' < now()
    returning id, mentor_id
  ), attended as (
    update public.bookings b
       set status = 'attended'
      from done d
     where b.session_id = d.id and b.status = 'confirmed'
    returning b.student_id, b.session_id
  ), asked as (
    insert into public.notifications (user_id, type, title, body, link)
    select a.student_id, 'rate_session', 'How was your session?',
           'Leave a rating so other students know what to expect.', '/my-sessions'
      from attended a
    returning 1
  )
  update public.mentor_profiles m
     set sessions_completed = m.sessions_completed + d.n
    from (select mentor_id, count(*) n from done group by mentor_id) d
   where m.user_id = d.mentor_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ====================================================== rating rollup =======
create or replace function public.refresh_mentor_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.mentor_profiles m
     set rating_avg = coalesce(agg.avg_rating, 0),
         rating_count = coalesce(agg.n, 0)
    from (
      select avg(rating)::numeric(3,2) avg_rating, count(*) n
        from public.reviews where mentor_id = coalesce(new.mentor_id, old.mentor_id)
    ) agg
   where m.user_id = coalesce(new.mentor_id, old.mentor_id);
  return coalesce(new, old);
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_mentor_rating();

-- A review is only possible if you actually attended, and only once.
create or replace function public.leave_review(
  p_booking uuid, p_rating smallint, p_comment text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings%rowtype; v_mentor uuid; v_id uuid;
begin
  select * into v_booking from public.bookings where id = p_booking;
  if not found or v_booking.student_id <> auth.uid() then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if v_booking.status <> 'attended' then
    raise exception 'You can only review a session you attended.' using errcode = 'P0001';
  end if;

  select mentor_id into v_mentor from public.sessions where id = v_booking.session_id;

  insert into public.reviews (booking_id, session_id, student_id, mentor_id, rating, comment)
  values (p_booking, v_booking.session_id, auth.uid(), v_mentor, p_rating, p_comment)
  returning id into v_id;
  return v_id;
end;
$$;

-- ============================================= match score (spec §8 S1) =====
/**
 * Near-peer relevance. A mentor one tier above the student scores highest:
 * someone who made exactly the jump the student is trying to make.
 */
create or replace function public.match_score(p_student uuid, p_mentor uuid)
returns int language sql stable security definer set search_path = public as $$
  select (
      case when s.languages && m.languages then 3 else 0 end
    + case when s.home_state is not null and s.home_state = m.home_state then 2 else 0 end
    + case
        when s.college_tier is null or m.college_tier is null then 0
        when s.college_tier = m.college_tier then 2
        when (s.college_tier, m.college_tier) in
             (('tier3','tier2'), ('tier2','tier1')) then 2
        else 0
      end
    + case when s.first_gen_graduate and m.first_gen_graduate then 2 else 0 end
    + 2 * (
        select count(*) from unnest(s.goals) g
         where (g in ('internship','job','skills','college_life','career_choice')
                and 'first_job' = any(m.tracks))
            or (g = 'abroad' and 'abroad' = any(m.tracks))
      )
    + least((m.rating_avg * 2)::int, 10)
  )::int
  from public.profiles s, public.mentor_profiles m
  where s.id = p_student and m.user_id = p_mentor;
$$;

/** The matched list behind the onboarding quiz, with the reasons shown. */
create or replace function public.matched_mentors(p_limit int default 5)
returns table (
  mentor_id uuid, score int,
  same_language boolean, same_state boolean, tier_step boolean, first_gen boolean
)
language sql stable security definer set search_path = public as $$
  select m.user_id,
         public.match_score(auth.uid(), m.user_id),
         s.languages && m.languages,
         s.home_state is not null and s.home_state = m.home_state,
         s.college_tier = m.college_tier
           or (s.college_tier, m.college_tier) in (('tier3','tier2'), ('tier2','tier1')),
         s.first_gen_graduate and m.first_gen_graduate
    from public.mentor_profiles m
    join public.profiles s on s.id = auth.uid()
   where m.status = 'approved'
   order by 2 desc, m.rating_avg desc
   limit greatest(p_limit, 1);
$$;
