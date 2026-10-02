-- YoursMentor.in — make the column restrictions real
--
-- The earlier migrations did:
--
--   revoke update (status, strikes, …) on public.mentor_profiles from authenticated;
--
-- which quietly did nothing. Supabase grants `authenticated` UPDATE on the
-- whole table through default privileges, and in Postgres a table-level grant
-- already covers every column — revoking a single column does not carve a hole
-- in it. The privileges survived, so:
--
--   * a mentor could set their own mentor_profiles.status to 'approved' and
--     appear in the directory without anyone reviewing them, since the RLS
--     policy lets them edit their own row
--   * a mentor could clear their own strikes, or write their own rating
--   * a mentor could set sessions.seats_booked and sell seats that do not exist
--
-- The only way column privileges bite is to revoke UPDATE on the table and
-- then grant it back on the columns that really are theirs to change.

-- ---- mentor_profiles -------------------------------------------------------
revoke update on public.mentor_profiles from authenticated;

grant update (
  headline, story, breakthrough_story,
  current_position, company, country,
  college, college_tier, college_line, home_state,
  languages, first_gen_graduate,
  tracks, topics,
  linkedin_url, id_proof_url,
  price_1on1, session_1on1_minutes, trial_offer,
  upi_id,
  updated_at
) on public.mentor_profiles to authenticated;

-- status, rejection_reason, strikes, rating_avg, rating_count and
-- sessions_completed are deliberately absent: admins set them through
-- /api/admin/mentors with the service role, and the rating columns are written
-- by the refresh_mentor_rating trigger.

-- ---- sessions --------------------------------------------------------------
revoke update on public.sessions from authenticated;

grant update (
  title, description, track, topic,
  start_at, end_at,
  capacity, min_seats, price,
  fallback_meet_url, mentor_notes,
  updated_at
) on public.sessions to authenticated;

-- mentor_id, type, seats_booked, status and livekit_room stay out of reach.
-- Seat counts move only through hold_seat() and cancel_booking(); status moves
-- only through cancel_session() and the cron functions; livekit_room is ours.

-- ---- profiles --------------------------------------------------------------
-- Same trap: `role` and `status` are on a table the user is allowed to edit, so
-- without this a student could make themselves an admin.
revoke update on public.profiles from authenticated;

grant update (
  name, avatar_url,
  date_of_birth, is_adult_confirmed, accepted_terms_at,
  college, college_tier, branch, graduation_year,
  home_state, languages, first_gen_graduate, goals,
  onboarding_complete,
  updated_at
) on public.profiles to authenticated;

-- `role` and `status` are not grantable to the user. A student becomes a mentor
-- through the application flow, which sets role via the service role, and
-- suspension is an admin action.

-- ---- the rest are read-only to clients anyway, but be explicit -------------
revoke insert, update, delete on public.bookings from authenticated, anon;
revoke insert, update, delete on public.payments from authenticated, anon;
revoke insert, update, delete on public.credit_ledger from authenticated, anon;
revoke insert, update, delete on public.payouts from authenticated, anon;
revoke update, delete on public.reviews from anon;

-- ---- becoming a mentor applicant -------------------------------------------
/**
 * The application form used to do `update profiles set role = 'mentor'` from
 * the browser, which only worked because `role` was grantable. It is not any
 * more, and it should not be: the same path would have let anyone set
 * role = 'admin' and walk into the admin panel.
 *
 * This is the narrow replacement. It can only ever set 'mentor', only on the
 * caller's own row, and only from 'student'.
 */
create or replace function public.become_mentor_applicant()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;

  update public.profiles
     set role = 'mentor'
   where id = auth.uid()
     and role = 'student';
end;
$$;

revoke execute on function public.become_mentor_applicant() from public, anon;
grant execute on function public.become_mentor_applicant() to authenticated;
