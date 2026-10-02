-- YoursMentor.in — make the card back work for anonymous visitors
--
-- mentor_directory is a security_invoker view, so everything inside it runs
-- with the caller's rights. The two lateral subqueries added for the card back
-- therefore returned nothing to the people who need them most:
--
--   * the attendee count reads public.bookings, which anon cannot see at all
--   * the latest review joins the author's row in public.profiles, which anon
--     can only read for approved mentors — never for a student
--
-- So a signed-out visitor browsing the directory saw a card back with the
-- session title but no attendance and no review. Verifying with the service
-- role hid it completely, because that bypasses RLS.
--
-- The fix is not to loosen the policies. An attendee count and one review with
-- a first name are safe to publish about an approved mentor; the underlying
-- tables are not. So each is a definer function returning exactly that much,
-- and the view keeps invoker rights everywhere else.

/** How many people actually turned up. Approved mentors only. */
create or replace function public.session_attendee_count(p_session uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.bookings b
    join public.sessions s on s.id = b.session_id
    join public.mentor_profiles m on m.user_id = s.mentor_id
   where b.session_id = p_session
     and b.status = 'attended'
     and m.status = 'approved';
$$;

/**
 * The most recent written review for an approved mentor, with the author's
 * first name only. A review is about the mentor; a student's full name does
 * not need to be on a public card to make the point.
 */
create or replace function public.latest_mentor_review(p_mentor uuid)
returns table (comment text, rating smallint, author text)
language sql
stable
security definer
set search_path = public
as $$
  select r.comment, r.rating, split_part(rp.name, ' ', 1)
    from public.reviews r
    join public.profiles rp on rp.id = r.student_id
    join public.mentor_profiles m on m.user_id = r.mentor_id
   where r.mentor_id = p_mentor
     and r.comment is not null
     and m.status = 'approved'
   order by r.created_at desc
   limit 1;
$$;

grant execute on function public.session_attendee_count(uuid) to anon, authenticated;
grant execute on function public.latest_mentor_review(uuid) to anon, authenticated;

drop view if exists public.mentor_directory;
create or replace view public.mentor_directory
with (security_invoker = true) as
select
  m.user_id as id, p.name, p.avatar_url, m.headline, m.company, m.company_domain,
  m.college_line, m.college_tier, m.home_state, m.languages, m.first_gen_graduate,
  m.tracks, m.topics, m.breakthrough_story, m.price_1on1, m.session_1on1_minutes,
  m.trial_offer, m.rating_avg, m.rating_count, m.sessions_completed, m.country,
  last_session.title    as last_session_title,
  last_session.start_at as last_session_at,
  public.session_attendee_count(last_session.id) as last_session_attendees,
  next_session.title    as next_session_title,
  next_session.start_at as next_session_at,
  latest_review.comment as latest_review,
  latest_review.rating  as latest_review_rating,
  latest_review.author  as latest_review_author
from public.mentor_profiles m
join public.profiles p on p.id = m.user_id

left join lateral (
  select s.id, s.title, s.start_at
    from public.sessions s
   where s.mentor_id = m.user_id and s.status = 'completed'
   order by s.start_at desc
   limit 1
) last_session on true

left join lateral (
  select s.title, s.start_at
    from public.sessions s
   where s.mentor_id = m.user_id
     and s.status = 'scheduled'
     and s.start_at > now()
   order by s.start_at asc
   limit 1
) next_session on true

left join lateral public.latest_mentor_review(m.user_id) latest_review on true

where m.status = 'approved'
  and p.status = 'active'
  and p.deleted_at is null;

grant select on public.mentor_directory to anon, authenticated;
