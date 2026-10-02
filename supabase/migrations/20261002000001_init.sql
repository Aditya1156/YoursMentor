-- YoursMentor — initial schema
-- Profiles, mentor profiles and the enums the rest of the product hangs off.
-- Bookings, sessions, payments and credits land in later migrations as their
-- pages are built (docs/MASTER_PROMPT.md §11).

-- ---------------------------------------------------------------- enums ----
create type user_role as enum ('student', 'mentor', 'admin');
create type account_status as enum ('active', 'suspended');
create type college_tier as enum ('tier1', 'tier2', 'tier3', 'other');
create type mentor_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type track as enum ('first_job', 'abroad');
create type goal as enum (
  'internship', 'job', 'abroad', 'skills', 'college_life', 'career_choice'
);

-- ------------------------------------------------------------- profiles ----
-- One row per auth.users row. Supabase Auth owns credentials, email
-- confirmation and password reset; this table owns everything about the person.
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  name                text not null check (char_length(name) between 2 and 80),
  avatar_url          text,
  role                user_role not null default 'student',
  status              account_status not null default 'active',

  -- V1 is 18+ only (spec §2). Under-18 needs a real DPDP parental-consent
  -- flow, so the constraint is enforced here rather than trusted to the form.
  date_of_birth       date,
  is_adult_confirmed  boolean not null default false,
  accepted_terms_at   timestamptz,

  college             text,
  college_tier        college_tier,
  branch              text,
  graduation_year     int check (graduation_year between 1980 and 2100),
  home_state          text,
  languages           text[] not null default '{}',
  first_gen_graduate  boolean,
  goals               goal[] not null default '{}',

  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Nobody can be marked an adult without a date of birth that says so.
  constraint adult_needs_dob check (
    not is_adult_confirmed
    or (date_of_birth is not null and date_of_birth <= (current_date - interval '18 years'))
  )
);

comment on constraint adult_needs_dob on public.profiles is
  'V1 is 18+ only. Enforced in the database so no client path can bypass it.';

-- -------------------------------------------------------- mentor profiles ---
create table public.mentor_profiles (
  user_id               uuid primary key references public.profiles (id) on delete cascade,
  headline              text not null check (char_length(headline) <= 120),
  story                 text check (char_length(story) <= 1000),

  -- The designs make this its own quoted block on every mentor card, so it is
  -- a field in its own right rather than the first line of the story.
  breakthrough_story    text check (char_length(breakthrough_story) <= 280),

  -- `current_role` is a reserved word in Postgres; this is the mentor's job.
  current_position      text,
  company               text,
  country               text not null default 'India',

  college               text,
  college_tier          college_tier,
  college_line          text,
  home_state            text,
  languages             text[] not null default '{}',
  first_gen_graduate    boolean not null default false,

  tracks                track[] not null default '{}',
  topics                text[] not null default '{}',

  linkedin_url          text not null,
  id_proof_url          text,

  price_1on1            int not null default 199 check (price_1on1 between 99 and 499),
  session_1on1_minutes  int not null default 30,
  -- Introductory ₹99 1:1, which renders the amber CTA in the directory.
  trial_offer           boolean not null default false,

  status                mentor_status not null default 'pending',
  rejection_reason      text,
  upi_id                text,

  rating_avg            numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  rating_count          int not null default 0 check (rating_count >= 0),
  sessions_completed    int not null default 0 check (sessions_completed >= 0),
  strikes               int not null default 0 check (strikes >= 0),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Directory filters: track, language, tier, price — all on approved mentors.
create index mentor_profiles_discovery_idx
  on public.mentor_profiles (status, college_tier, price_1on1);
create index mentor_profiles_tracks_idx on public.mentor_profiles using gin (tracks);
create index mentor_profiles_languages_idx on public.mentor_profiles using gin (languages);
create index mentor_profiles_topics_idx on public.mentor_profiles using gin (topics);

-- --------------------------------------------------------------- triggers ---
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger mentor_profiles_touch
  before update on public.mentor_profiles
  for each row execute function public.touch_updated_at();

-- A profile row must exist for every auth user, created the moment they sign
-- up. Reads name, role and the 18+ answers out of the sign-up metadata, so a
-- confirmation email opened on another device still lands a complete profile.
-- The adult_needs_dob constraint still rejects an under-18 date, whatever the
-- metadata claims.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dob date := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  is_adult boolean := dob is not null
    and dob <= (current_date - interval '18 years');
  derived text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
begin
  -- profiles.name requires 2 to 80 characters. A Google account with no
  -- display name, or an address like a@gmail.com, would otherwise derive a
  -- one-character name, trip the constraint, and fail the whole sign-up.
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
    case when is_adult then dob end,
    is_adult,
    case when is_adult then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ RLS ----
alter table public.profiles enable row level security;
alter table public.mentor_profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles ------------------------------------------------------------------
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "admins read every profile"
  on public.profiles for select
  using (public.is_admin());

-- A mentor's name and photo are public, but only for approved mentors.
create policy "approved mentor profiles are public"
  on public.profiles for select
  using (
    exists (
      select 1 from public.mentor_profiles m
      where m.user_id = profiles.id and m.status = 'approved'
    )
  );

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admins update any profile"
  on public.profiles for update
  using (public.is_admin());

-- mentor_profiles -----------------------------------------------------------
create policy "approved mentors are public"
  on public.mentor_profiles for select
  using (status = 'approved');

create policy "mentors read their own application"
  on public.mentor_profiles for select
  using (auth.uid() = user_id);

create policy "admins read every application"
  on public.mentor_profiles for select
  using (public.is_admin());

create policy "mentors create their own application"
  on public.mentor_profiles for insert
  with check (auth.uid() = user_id);

create policy "mentors edit their own application"
  on public.mentor_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins manage applications"
  on public.mentor_profiles for update
  using (public.is_admin());

-- A mentor must never be able to approve themselves or clear their own
-- strikes. Those columns are writable only by the service role and admins.
revoke update (status, rejection_reason, strikes, rating_avg, rating_count, sessions_completed)
  on public.mentor_profiles from authenticated;

-- ------------------------------------------------------------- storage -----
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Mentor ID proofs are private: only the mentor and admins ever see them.
insert into storage.buckets (id, name, public)
values ('mentor-documents', 'mentor-documents', false)
on conflict (id) do nothing;

create policy "anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users manage their own avatar"
  on storage.objects for all
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "mentors upload their own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'mentor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "mentors read their own documents"
  on storage.objects for select
  using (
    bucket_id = 'mentor-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admins read every mentor document"
  on storage.objects for select
  using (bucket_id = 'mentor-documents' and public.is_admin());
