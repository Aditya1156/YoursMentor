-- YoursMentor.in — actually booking a 1:1
--
-- available_slots() has existed since the mentor tools migration and nothing
-- ever called it. The 1:1 tab on a mentor's profile rendered "Slot picker
-- coming next", so the paid path — the one that earns the most per booking —
-- was a dead end for every student who tried it.
--
-- A 1:1 differs from a group room in one important way: the session does not
-- exist until somebody books it. So this creates the session and takes the
-- seat in one transaction. If the seat cannot be taken the insert rolls back
-- with it, and no empty phantom 1:1 is left on a mentor's calendar.

/**
 * Books a 1:1 with a mentor at a slot they published.
 *
 * Returns a booking id, exactly as hold_seat() does, so checkout takes it
 * without caring which of the two paths produced it.
 *
 * The slot is re-derived from available_slots() rather than trusted from the
 * request. A client sends a timestamp; whether that timestamp is inside the
 * mentor's published hours, unblocked, far enough out and not already taken is
 * the database's business. Duplicating the rule logic here would let the two
 * answers drift apart, which is how someone ends up booked at 3am.
 */
create or replace function public.book_one_on_one(
  p_mentor uuid,
  p_start_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student  uuid := auth.uid();
  v_mentor   public.mentor_profiles%rowtype;
  v_name     text;
  v_minutes  int;
  v_end      timestamptz;
  v_needed   int;
  v_have     int;
  v_session  uuid;
begin
  if v_student is null then
    raise exception 'You need to sign in to book.' using errcode = '28000';
  end if;

  select * into v_mentor
    from public.mentor_profiles
   where user_id = p_mentor and status = 'approved';
  if not found then
    raise exception 'That mentor is not taking bookings.' using errcode = 'P0002';
  end if;

  if p_mentor = v_student then
    raise exception 'You cannot book yourself.' using errcode = 'P0001';
  end if;

  -- Two students tapping the same slot in the same instant would both pass the
  -- overlap check and both get a session, because there is no row yet to lock.
  -- This lock is per mentor and lasts to the end of the transaction.
  perform pg_advisory_xact_lock(hashtextextended(p_mentor::text, 0));

  select name into v_name from public.profiles where id = p_mentor;

  v_minutes := coalesce(v_mentor.session_1on1_minutes, 30);
  v_end     := p_start_at + make_interval(mins => v_minutes);

  -- A 45- or 60-minute session spans more than one 30-minute slot and every
  -- one has to be free, or the booking spills past the end of the mentor's
  -- published hours.
  v_needed := ceil(v_minutes::numeric / 30)::int;

  select count(*) into v_have
    from public.available_slots(p_mentor, (p_start_at - interval '1 day')::date, 3) s
   where s.starts_at >= p_start_at
     and s.starts_at <  v_end;

  if v_have < v_needed then
    raise exception 'That slot is no longer free. Pick another one.'
      using errcode = 'P0001';
  end if;

  insert into public.sessions (
    mentor_id, type, title, description, track,
    start_at, end_at, capacity, min_seats, price, status
  )
  values (
    p_mentor, 'one_on_one',
    '1:1 with ' || coalesce(nullif(trim(v_name), ''), 'your mentor'),
    'A private ' || v_minutes || '-minute call.',
    v_mentor.tracks[1],
    p_start_at, v_end, 1, 1, v_mentor.price_1on1, 'scheduled'
  )
  returning id into v_session;

  -- One place decides whether a seat may be taken, for both kinds of session.
  return public.hold_seat(v_session);
end;
$$;

revoke execute on function public.book_one_on_one(uuid, timestamptz) from public, anon;
grant execute on function public.book_one_on_one(uuid, timestamptz) to authenticated;

-- A visitor needs to see the slots before signing in, or the profile page
-- looks broken to the very people deciding whether to join at all.
grant execute on function public.available_slots(uuid, date, int) to anon, authenticated;
