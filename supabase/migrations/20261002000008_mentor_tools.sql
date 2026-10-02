-- YoursMentor.in — the functions the mentor surfaces need
--
-- Attendance, earnings and 1:1 slot generation. All three touch things a
-- client is not allowed to write directly, so they are definer functions that
-- check the caller is the mentor in question.

-- ====================================================== attendance =========
/**
 * Mentors mark who actually turned up. Only the session's own mentor can,
 * only after the session has started, and only on a confirmed or attended
 * booking — so this cannot be used to retroactively rewrite a cancellation.
 *
 * A no-show counts as used (spec §7): the student is not refunded, and the
 * mentor still earns. That is the rule the booking page states, so it has to
 * be the rule here.
 */
create or replace function public.mark_attendance(p_booking uuid, p_attended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  s public.sessions%rowtype;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;

  select * into s from public.sessions where id = b.session_id;
  if s.mentor_id <> auth.uid() and not public.is_admin() then
    raise exception 'That is not your session.' using errcode = '42501';
  end if;
  if s.start_at > now() then
    raise exception 'The session has not started yet.' using errcode = 'P0001';
  end if;
  if b.status not in ('confirmed', 'attended', 'no_show_student') then
    raise exception 'That booking cannot be marked.' using errcode = 'P0001';
  end if;

  update public.bookings
     set status = case when p_attended then 'attended' else 'no_show_student' end
   where id = p_booking;
end;
$$;

revoke execute on function public.mark_attendance(uuid, boolean) from public, anon;
grant execute on function public.mark_attendance(uuid, boolean) to authenticated;

-- ========================================================= earnings ========
/**
 * What a mentor has earned, per completed session.
 *
 * Earnings follow attendance, not bookings: a seat that was refunded earns
 * nothing, and a no-show still earns, because the mentor showed up. The
 * platform share comes from the commission argument so a change in the rate
 * never silently rewrites history — the caller passes what was agreed.
 */
create or replace function public.mentor_earnings(p_commission int default 25)
returns table (
  session_id uuid,
  title text,
  start_at timestamptz,
  session_type session_type,
  seats_paid int,
  gross int,
  platform_fee int,
  net int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.title,
    s.start_at,
    s.type,
    count(b.id)::int,
    (count(b.id) * s.price)::int,
    ((count(b.id) * s.price * p_commission) / 100)::int,
    (count(b.id) * s.price - (count(b.id) * s.price * p_commission) / 100)::int
  from public.sessions s
  join public.bookings b
    on b.session_id = s.id
   and b.status in ('attended', 'no_show_student')
  where s.mentor_id = auth.uid()
    and s.status = 'completed'
  group by s.id, s.title, s.start_at, s.type
  order by s.start_at desc;
$$;

revoke execute on function public.mentor_earnings(int) from public, anon;
grant execute on function public.mentor_earnings(int) to authenticated;

-- ==================================================== 1:1 slot picker =====
/**
 * Turns a mentor's weekly availability into bookable 1:1 slots.
 *
 * Generated rather than stored, because availability is a rule and slots are
 * its consequence — storing both means they drift. Spec §7: slots are 30
 * minutes, at least 12 hours out, minus blocked dates and anything already
 * booked.
 *
 * Availability is written in the mentor's own timezone, so each slot is built
 * as a local wall-clock time in that zone and then converted. That is what
 * makes a mentor in Germany work without a special case.
 */
create or replace function public.available_slots(
  p_mentor uuid,
  p_from date default current_date,
  p_days int default 14
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select p_from as from_date,
           p_from + (greatest(least(p_days, 60), 1) || ' days')::interval as to_date
  ),
  days as (
    select d::date as day
      from bounds, generate_series(bounds.from_date, bounds.to_date, interval '1 day') d
  ),
  rules as (
    select r.day_of_week, r.start_time, r.end_time, r.timezone
      from public.availability_rules r
      join public.mentor_profiles m on m.user_id = r.mentor_id
     where r.mentor_id = p_mentor and m.status = 'approved'
  ),
  raw as (
    select
      ((d.day + r.start_time) at time zone r.timezone)
        + (n * interval '30 minutes') as starts_at,
      ((d.day + r.start_time) at time zone r.timezone)
        + ((n + 1) * interval '30 minutes') as ends_at
    from days d
    join rules r on r.day_of_week = extract(dow from d.day)
    cross join lateral generate_series(
      0,
      greatest(0, (extract(epoch from (r.end_time - r.start_time)) / 1800)::int - 1)
    ) n
    where not exists (
      select 1 from public.blocked_dates bd
       where bd.mentor_id = p_mentor and bd.date = d.day
    )
  )
  select raw.starts_at, raw.ends_at
    from raw
   -- At least 12 hours out, so nobody books a mentor who is asleep.
   where raw.starts_at > now() + interval '12 hours'
     and not exists (
       select 1 from public.sessions s
        where s.mentor_id = p_mentor
          and s.status in ('scheduled', 'live')
          and tstzrange(s.start_at, s.end_at) && tstzrange(raw.starts_at, raw.ends_at)
     )
   order by raw.starts_at;
$$;

grant execute on function public.available_slots(uuid, date, int) to authenticated, anon;

-- ============================================ a mentor's own attendees =====
/**
 * The attendee list for a session, which the mentor needs to mark attendance
 * and write notes. The bookings policy already allows a mentor to read
 * bookings on their own sessions; this just joins the names on.
 */
create or replace function public.session_attendees(p_session uuid)
returns table (
  booking_id uuid,
  student_id uuid,
  name text,
  college text,
  avatar_url text,
  status booking_status
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.student_id, p.name, p.college, p.avatar_url, b.status
    from public.bookings b
    join public.profiles p on p.id = b.student_id
    join public.sessions s on s.id = b.session_id
   where b.session_id = p_session
     and (s.mentor_id = auth.uid() or public.is_admin())
     and b.status in ('confirmed', 'attended', 'no_show_student')
   order by p.name;
$$;

revoke execute on function public.session_attendees(uuid) from public, anon;
grant execute on function public.session_attendees(uuid) to authenticated;
