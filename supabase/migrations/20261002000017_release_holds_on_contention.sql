-- YoursMentor.in — free expired seats when it actually matters
--
-- The 10-minute hold depends on release_expired_holds() running every five
-- minutes. That is a Pro-plan cron; a Hobby account gets one run a day. So a
-- student who reaches the payment page and wanders off would lock a seat for up
-- to 24 hours, and two of those on a 3-seat room make it look full — and then
-- auto_cancel_under_minimum() cancels the session for never filling, refunding
-- students who did pay.
--
-- Rather than make correctness depend on how often a cron fires, hold_seat()
-- now clears expired holds on the session it is about to touch. The moment of
-- contention is exactly the moment the stale hold is in the way, so the seat is
-- freed precisely when somebody needs it. The cron stays as a backstop for
-- sessions nobody is currently looking at.
--
-- Scoped to the one session, not a global sweep, because this runs inside every
-- booking attempt and must stay cheap.

create or replace function public.release_expired_holds_on(p_session uuid)
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
     where session_id = p_session
       and status = 'held'
       and hold_expires_at < now()
    returning 1
  )
  select count(*) into v_released from expired;

  if v_released > 0 then
    update public.sessions
       set seats_booked = greatest(seats_booked - v_released, 0)
     where id = p_session;
  end if;

  return v_released;
end;
$$;

revoke execute on function public.release_expired_holds_on(uuid) from public, anon, authenticated;

-- hold_seat(), with the sweep added. Everything else is unchanged from
-- 20261002000003; the row lock still serialises competing attempts, and the
-- sweep happens after the lock is taken so two callers cannot both subtract the
-- same expired hold.
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

  -- Under the lock: give back any seat whose payment window has closed, then
  -- re-read, so the capacity check below sees the truth rather than a seat
  -- somebody abandoned hours ago.
  if public.release_expired_holds_on(p_session) > 0 then
    select * into v_session from public.sessions where id = p_session;
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

-- available_slots() has the same blind spot for 1:1s: a session created by an
-- abandoned 1:1 checkout keeps the mentor's time booked until the hold is
-- swept. The reaping trigger cancels it as soon as the seat goes, so this only
-- needs the sweep to happen — which the cron still does daily, and any booking
-- attempt on that session does immediately.
comment on function public.release_expired_holds_on is
  'Frees seats on one session whose payment window has closed. Called by
   hold_seat() under the session row lock, so correctness does not depend on how
   often the cron runs.';
