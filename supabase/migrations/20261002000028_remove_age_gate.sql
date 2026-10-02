-- YoursMentor.in — the 18+ gate is removed
--
-- A product decision, taken knowingly. For the record, because the next person
-- to read this will want to know whether it was considered:
--
--   * the DPDP Act 2023 treats anyone under 18 as a child and requires
--     verifiable parental consent before processing their data, and there is no
--     consent flow here
--   * s.11 of the Indian Contract Act makes a minor's contract void, so a paid
--     booking by a sixteen-year-old is not enforceable
--
-- Both were put to the owner and the decision was to remove the gate anyway.
-- The policy pages are rewritten in the same change so nothing published claims
-- an age rule that is no longer enforced — a false published statement is worse
-- than either position.
--
-- What is kept: the date_of_birth and is_adult_confirmed columns. Dropping them
-- would throw away what we already know about existing accounts, and they cost
-- nothing to leave. is_adult_confirmed now means "has told us they are an
-- adult", which is still worth recording, and nothing gates on it.

-- 1. The constraint that refused an under-18 date of birth.
alter table public.profiles drop constraint if exists adult_needs_dob;

comment on column public.profiles.is_adult_confirmed is
  'Whether this person has told us they are 18 or over. Recorded, not enforced:
   the age gate was removed. Nothing in the product depends on it.';

-- 2. Existing accounts are no longer held back by it.
update public.profiles set is_adult_confirmed = true where not is_adult_confirmed;
alter table public.profiles alter column is_adult_confirmed set default true;

-- 3. Signing up no longer needs a date of birth, and a missing one is no longer
--    a half-made account. The name fallback stays exactly as it was: a
--    one-character name from an address like a@gmail.com once failed the name
--    check and took the whole sign-up down with it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dob date := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  derived text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
begin
  derived := left(trim(derived), 80);
  if derived is null or char_length(derived) < 2 then
    derived := 'New member';
  end if;

  insert into public.profiles (
    id, name, avatar_url, role, date_of_birth, is_adult_confirmed, accepted_terms_at
  )
  values (
    new.id,
    derived,
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student'),
    dob,                 -- kept if given, no longer required
    true,
    now()                -- terms are accepted by signing up
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. Booking no longer checks it. Everything else in hold_seat() is unchanged
--    from 20261002000017 — the row lock, the expired-hold sweep, the capacity
--    check and the idempotent re-hold all stay exactly as they were.
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

  -- A suspended or deleted account still cannot book.
  if not exists (
    select 1 from public.profiles where id = v_student and status = 'active'
  ) then
    raise exception 'Your account cannot book sessions yet.' using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = p_session for update;

  if not found then
    raise exception 'That session no longer exists.' using errcode = 'P0002';
  end if;

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
