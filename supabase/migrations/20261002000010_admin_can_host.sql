-- YoursMentor.in — let admins host sessions too
--
-- An admin could approve mentors and refund bookings but could not run a
-- session themselves: sessions.mentor_id references mentor_profiles, the
-- insert policy required an *approved* profile owned by the caller, and an
-- admin has no mentor profile at all. So "I want to take a class myself" was
-- impossible.
--
-- The fix treats the two as what they are. `role` is about platform powers;
-- a mentor profile is about being listed and bookable. An admin who teaches
-- is both. Rather than inventing a parallel kind of session, an admin gets a
-- real mentor profile and every existing surface — availability, the session
-- form, attendance, earnings, the directory — works unchanged.

/**
 * Gives the calling admin an approved mentor profile, so they can be booked
 * like anyone else. Idempotent: calling it twice returns the same row.
 *
 * Definer, because status is deliberately not writable by clients — an
 * applicant who could set it would approve themselves. The admin check is on
 * the caller's own role, read from the database rather than trusted from the
 * request.
 */
create or replace function public.ensure_host_profile(
  p_headline text default null,
  p_price int default 199
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_name text;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  select name into v_name from public.profiles where id = v_admin;

  insert into public.mentor_profiles (
    user_id, headline, breakthrough_story, linkedin_url, price_1on1, status, tracks
  )
  values (
    v_admin,
    coalesce(nullif(trim(p_headline), ''), 'Session host at YoursMentor.in'),
    'Runs sessions and classes on YoursMentor.in.',
    'https://yoursmentor.in',
    greatest(99, least(p_price, 499)),
    'approved',
    array['first_job']::track[]
  )
  on conflict (user_id) do update
    set status = 'approved'
  returning user_id into v_admin;

  return v_admin;
end;
$$;

revoke execute on function public.ensure_host_profile(text, int) from public, anon;
grant execute on function public.ensure_host_profile(text, int) to authenticated;

-- ---- sessions: admins may create and edit for any host ---------------------
-- Running the platform means sometimes scheduling a room on a mentor's behalf
-- — a rescheduled class, a session a mentor asked support to set up.
create policy "admins create sessions"
  on public.sessions for insert
  with check (public.is_admin());

-- "admins manage sessions" already covers UPDATE. The existing column grants
-- still apply, so even an admin cannot hand-edit seats_booked or status
-- through the client; those move through the booking functions.

-- ---- availability: admins may manage any mentor's hours --------------------
create policy "admins manage any availability"
  on public.availability_rules for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins manage any blocked dates"
  on public.blocked_dates for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- a list of who can host, for the admin session form -------------------
/**
 * Approved hosts, for the picker when an admin creates a session for someone
 * else. A plain select on mentor_profiles would work, but this keeps the
 * shape stable and the admin check in one place.
 */
create or replace function public.hostable_mentors()
returns table (user_id uuid, name text, headline text, is_self boolean)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, p.name, m.headline, m.user_id = auth.uid()
    from public.mentor_profiles m
    join public.profiles p on p.id = m.user_id
   where m.status = 'approved'
     and public.is_admin()
   order by (m.user_id = auth.uid()) desc, p.name;
$$;

revoke execute on function public.hostable_mentors() from public, anon;
grant execute on function public.hostable_mentors() to authenticated;
