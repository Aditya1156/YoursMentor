-- YoursMentor.in — what a mentor card shows on its back
--
-- The card is getting a flip: the front says who someone is and what they
-- teach, the back says what they have actually been doing. That needs the last
-- session they ran and their most recent written review.
--
-- Both are lateral subqueries in the directory view rather than extra round
-- trips from the page. A card list is nine mentors; fetching a last session
-- and a review each would be eighteen more queries for something the database
-- can answer in one.

drop view if exists public.mentor_directory;
create or replace view public.mentor_directory
with (security_invoker = true) as
select
  m.user_id as id,
  p.name,
  p.avatar_url,
  m.headline,
  m.company,
  m.company_domain,
  m.college_line,
  m.college_tier,
  m.home_state,
  m.languages,
  m.first_gen_graduate,
  m.tracks,
  m.topics,
  m.breakthrough_story,
  m.price_1on1,
  m.session_1on1_minutes,
  m.trial_offer,
  m.rating_avg,
  m.rating_count,
  m.sessions_completed,
  m.country,
  last_session.title      as last_session_title,
  last_session.start_at   as last_session_at,
  last_session.attendees  as last_session_attendees,
  next_session.title      as next_session_title,
  next_session.start_at   as next_session_at,
  latest_review.comment   as latest_review,
  latest_review.rating    as latest_review_rating,
  latest_review.author    as latest_review_author
from public.mentor_profiles m
join public.profiles p on p.id = m.user_id

-- What they last ran, and how many people were in it.
left join lateral (
  select s.title, s.start_at,
         (select count(*) from public.bookings b
           where b.session_id = s.id and b.status = 'attended') as attendees
    from public.sessions s
   where s.mentor_id = m.user_id and s.status = 'completed'
   order by s.start_at desc
   limit 1
) last_session on true

-- What they are running next, so a card can say "booking now".
left join lateral (
  select s.title, s.start_at
    from public.sessions s
   where s.mentor_id = m.user_id
     and s.status = 'scheduled'
     and s.start_at > now()
   order by s.start_at asc
   limit 1
) next_session on true

-- One written review. First names only: a review is about the mentor, and a
-- student's full name does not need to be on a public card to make the point.
left join lateral (
  select r.comment, r.rating, split_part(rp.name, ' ', 1) as author
    from public.reviews r
    join public.profiles rp on rp.id = r.student_id
   where r.mentor_id = m.user_id and r.comment is not null
   order by r.created_at desc
   limit 1
) latest_review on true

where m.status = 'approved'
  and p.status = 'active'
  and p.deleted_at is null;

grant select on public.mentor_directory to anon, authenticated;
