-- YoursMentor.in — account settings, data export and deletion
--
-- Spec §8 S8 and the DPDP duties in §10: a person must be able to see what we
-- hold, take a copy of it, and have it deleted. None of that existed.
--
-- Deletion is soft then purged, as the spec asks. Hard-deleting immediately
-- would take a mentor's completed sessions and their students' booking history
-- with it, and a mistaken tap would be unrecoverable. Thirty days is long
-- enough to undo and short enough to be a real deletion.

alter table public.profiles
  add column email_preferences jsonb not null default
    '{"reminders": true, "summaries": true, "product_news": false}'::jsonb,
  add column deleted_at timestamptz;

-- The owner may change their own preferences; deleted_at is not theirs to set.
grant update (email_preferences) on public.profiles to authenticated;

create index profiles_pending_purge_idx on public.profiles (deleted_at)
  where deleted_at is not null;

-- A deleted account disappears from every public surface immediately, even
-- though the row survives for the grace period.
drop view if exists public.mentor_directory;
create or replace view public.mentor_directory
with (security_invoker = true) as
select
  m.user_id as id, p.name, p.avatar_url, m.headline, m.company, m.college_line,
  m.college_tier, m.home_state, m.languages, m.first_gen_graduate, m.tracks,
  m.topics, m.breakthrough_story, m.price_1on1, m.session_1on1_minutes,
  m.trial_offer, m.rating_avg, m.rating_count, m.sessions_completed, m.country
from public.mentor_profiles m
join public.profiles p on p.id = m.user_id
where m.status = 'approved'
  and p.status = 'active'
  and p.deleted_at is null;

grant select on public.mentor_directory to anon, authenticated;

-- ===================================================== export =============
/**
 * Everything we hold about the caller, as one JSON document.
 *
 * Definer so it can read across tables the user can only see parts of, and
 * scoped hard to auth.uid() — there is no argument, so there is nothing to
 * tamper with. Internal columns (password hashes, token versions, raw webhook
 * payloads) are deliberately absent: the duty is to show someone their data,
 * not to hand them our plumbing.
 */
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'profile', (
      select to_jsonb(p) - 'deleted_at'
        from public.profiles p where p.id = v_user
    ),
    'mentor_profile', (
      select to_jsonb(m) - 'id_proof_url'
        from public.mentor_profiles m where m.user_id = v_user
    ),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'booked_at', b.created_at, 'status', b.status, 'amount', b.amount,
        'session', jsonb_build_object('title', s.title, 'starts_at', s.start_at)
      ))
      from public.bookings b
      join public.sessions s on s.id = b.session_id
      where b.student_id = v_user
    ), '[]'::jsonb),
    'sessions_hosted', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', s.title, 'starts_at', s.start_at, 'status', s.status,
        'seats_booked', s.seats_booked
      ))
      from public.sessions s where s.mentor_id = v_user
    ), '[]'::jsonb),
    'reviews_written', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rating', r.rating, 'comment', r.comment, 'written_at', r.created_at
      ))
      from public.reviews r where r.student_id = v_user
    ), '[]'::jsonb),
    'credits', jsonb_build_object(
      'balance', public.credit_balance(v_user),
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'amount', c.amount, 'reason', c.reason, 'at', c.created_at
        ))
        from public.credit_ledger c where c.user_id = v_user
      ), '[]'::jsonb)
    ),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'amount', pay.amount, 'status', pay.status, 'at', pay.created_at
      ))
      from public.payments pay where pay.student_id = v_user
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', n.title, 'body', n.body, 'at', n.created_at
      ))
      from public.notifications n where n.user_id = v_user
    ), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ===================================================== deletion ===========
/**
 * Marks the caller's account for deletion.
 *
 * Refuses while a paid seat is still coming up: deleting then would take the
 * booking with it, and the student would be out of pocket with nothing to
 * show. Cancel the booking first and the credits are returned, which is the
 * outcome they actually want.
 */
create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_upcoming int;
begin
  if v_user is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;

  select count(*) into v_upcoming
    from public.bookings b
    join public.sessions s on s.id = b.session_id
   where b.student_id = v_user
     and b.status = 'confirmed'
     and s.start_at > now();

  if v_upcoming > 0 then
    raise exception
      'You have % upcoming % still booked. Cancel them first — you will get the credits back.',
      v_upcoming, case when v_upcoming = 1 then 'session' else 'sessions' end
      using errcode = 'P0001';
  end if;

  -- A mentor cannot vanish from under students who have paid for a seat.
  if exists (
    select 1 from public.sessions s
     where s.mentor_id = v_user and s.status = 'scheduled'
       and s.start_at > now() and s.seats_booked > 0
  ) then
    raise exception
      'You have upcoming sessions with students booked. Cancel them first so everyone is refunded.'
      using errcode = 'P0001';
  end if;

  update public.profiles
     set deleted_at = now(), status = 'suspended'
   where id = v_user;

  -- Stop a half-deleted mentor from appearing in the directory.
  update public.mentor_profiles
     set status = 'suspended'
   where user_id = v_user;

  return now() + interval '30 days';
end;
$$;

revoke execute on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

/** Undo, during the grace period. */
create or replace function public.cancel_account_deletion()
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
     set deleted_at = null, status = 'active'
   where id = auth.uid() and deleted_at is not null;
end;
$$;

revoke execute on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

/**
 * Removes accounts whose grace period has run out. Called by the cron with
 * the service role. Deleting the auth user cascades to the profile and
 * everything hanging off it.
 */
create or replace function public.purge_deleted_accounts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  with gone as (
    delete from auth.users u
     using public.profiles p
     where p.id = u.id
       and p.deleted_at is not null
       and p.deleted_at < now() - interval '30 days'
    returning u.id
  )
  select count(*) into v_count from gone;
  return v_count;
end;
$$;

revoke execute on function public.purge_deleted_accounts() from public, anon, authenticated;
