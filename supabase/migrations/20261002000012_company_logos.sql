-- YoursMentor.in — company logos on mentor cards
--
-- Saying where you work is a statement of fact, and showing the company's mark
-- alongside it is ordinary nominative use. The two real problems were never
-- legal ones:
--
--   * a third-party logo service means one request per mentor from the
--     student's browser — nine on a directory page — which costs them data and
--     tells that service exactly who they are browsing
--   * we would be hotlinking someone else's CDN on every page load
--
-- Both go away if we fetch each logo once, server-side, and serve it from our
-- own storage afterwards. A domain is all the mentor supplies; nothing is
-- uploaded by hand and no mentor can put an arbitrary image on their card.

alter table public.mentor_profiles
  add column company_domain text
    check (
      company_domain is null
      or company_domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    );

comment on column public.mentor_profiles.company_domain is
  'Bare domain of the employer, e.g. phonepe.com. The logo is fetched once and
   cached in the company-logos bucket; the card falls back to a monogram when
   this is null or nothing could be fetched.';

-- The mentor owns this field, like the rest of their profile.
grant update (company_domain) on public.mentor_profiles to authenticated;

-- Public, because a logo on a public mentor card has to be readable by
-- anonymous visitors. Written only by the service role from the cache route.
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

create policy "anyone can view company logos"
  on storage.objects for select
  using (bucket_id = 'company-logos');

-- The directory carries the domain through so cards can render the logo.
drop view if exists public.mentor_directory;
create or replace view public.mentor_directory
with (security_invoker = true) as
select
  m.user_id as id, p.name, p.avatar_url, m.headline, m.company, m.company_domain,
  m.college_line, m.college_tier, m.home_state, m.languages, m.first_gen_graduate,
  m.tracks, m.topics, m.breakthrough_story, m.price_1on1, m.session_1on1_minutes,
  m.trial_offer, m.rating_avg, m.rating_count, m.sessions_completed, m.country
from public.mentor_profiles m
join public.profiles p on p.id = m.user_id
where m.status = 'approved'
  and p.status = 'active'
  and p.deleted_at is null;

grant select on public.mentor_directory to anon, authenticated;
