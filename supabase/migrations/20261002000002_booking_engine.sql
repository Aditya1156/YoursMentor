-- YoursMentor.in — booking engine
-- Availability, sessions, seat holds, bookings, payments, credits, reviews,
-- reports, payouts, notifications and session chat.
--
-- The seat-hold logic lives in the database rather than the app. A seat is a
-- scarce resource with a hard cap, and two students tapping "Reserve" on the
-- last seat at the same moment is the normal case, not the edge case. Doing
-- this in application code means a read-check-write race; doing it here means
-- the row lock and the CHECK constraint settle it.

-- ---------------------------------------------------------------- enums ----
create type session_type as enum ('one_on_one', 'group');
create type session_status as enum ('scheduled', 'live', 'completed', 'cancelled');
create type booking_status as enum (
  'held',                 -- seat reserved, payment window open
  'confirmed',            -- paid
  'attended',
  'no_show_student',
  'cancelled_by_student',
  'cancelled_by_mentor',
  'cancelled_auto',       -- hold expired, or group under minimum seats
  'refunded'
);
create type payment_status as enum ('created', 'paid', 'failed', 'refunded');
create type payout_status as enum ('pending', 'paid');
create type report_status as enum ('open', 'reviewing', 'closed');
create type report_target as enum ('user', 'session', 'message');

-- ------------------------------------------------------------ constants ----
create or replace function public.hold_window()
returns interval language sql immutable as $$ select interval '10 minutes' $$;

create or replace function public.join_window()
returns interval language sql immutable as $$ select interval '10 minutes' $$;

-- --------------------------------------------------------- availability ----
create table public.availability_rules (
  id          uuid primary key default gen_random_uuid(),
  mentor_id   uuid not null references public.mentor_profiles (user_id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  timezone    text not null default 'Asia/Kolkata',
  created_at  timestamptz not null default now(),
  constraint availability_ordered check (end_time > start_time)
);
create index availability_rules_mentor_idx on public.availability_rules (mentor_id, day_of_week);

create table public.blocked_dates (
  mentor_id uuid not null references public.mentor_profiles (user_id) on delete cascade,
  date      date not null,
  reason    text,
  primary key (mentor_id, date)
);

-- -------------------------------------------------------------- sessions ---
create table public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  mentor_id          uuid not null references public.mentor_profiles (user_id) on delete cascade,
  type               session_type not null,
  title              text not null check (char_length(title) between 4 and 140),
  description        text check (char_length(description) <= 2000),
  track              track,
  topic              text,

  -- Always UTC. The client renders in the viewer's zone; abroad mentors make
  -- this non-negotiable.
  start_at           timestamptz not null,
  end_at             timestamptz not null,

  capacity           int not null check (capacity between 1 and 15),
  seats_booked       int not null default 0 check (seats_booked >= 0),
  min_seats          int not null default 3 check (min_seats >= 1),
  price              int not null check (price between 0 and 4999),

  status             session_status not null default 'scheduled',
  livekit_room       text,
  fallback_meet_url  text,
  mentor_notes       text check (char_length(mentor_notes) <= 2000),

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint session_time_ordered check (end_at > start_at),
  -- The cap the whole booking flow leans on.
  constraint seats_within_capacity check (seats_booked <= capacity),
  constraint one_on_one_is_single check (type <> 'one_on_one' or capacity = 1),
  constraint min_seats_within_capacity check (min_seats <= capacity)
);

create index sessions_mentor_start_idx on public.sessions (mentor_id, start_at);
create index sessions_discovery_idx on public.sessions (status, type, start_at)
  where status = 'scheduled';
create index sessions_track_idx on public.sessions (track, start_at);

-- A mentor cannot be in two places at once. btree_gist lets a plain column
-- and a range sit in the same exclusion constraint.
create extension if not exists btree_gist;
alter table public.sessions add constraint mentor_has_no_overlap
  exclude using gist (
    mentor_id with =,
    tstzrange(start_at, end_at) with &&
  ) where (status in ('scheduled', 'live'));

-- -------------------------------------------------------------- bookings ---
create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.sessions (id) on delete cascade,
  student_id          uuid not null references public.profiles (id) on delete cascade,
  status              booking_status not null default 'held',
  hold_expires_at     timestamptz,
  amount              int not null check (amount >= 0),
  credits_applied     int not null default 0 check (credits_applied >= 0),
  razorpay_order_id   text,
  razorpay_payment_id text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- A student holds at most one live seat per session. Cancelled and refunded
-- rows are excluded so they can book again after cancelling.
create unique index bookings_one_live_seat_per_student
  on public.bookings (session_id, student_id)
  where status in ('held', 'confirmed', 'attended', 'no_show_student');

create index bookings_student_idx on public.bookings (student_id, created_at desc);
create index bookings_session_idx on public.bookings (session_id, status);
create index bookings_expiring_holds_idx on public.bookings (hold_expires_at)
  where status = 'held';

-- -------------------------------------------------------------- payments ---
create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings (id) on delete cascade,
  student_id          uuid not null references public.profiles (id) on delete cascade,
  amount              int not null check (amount >= 0),
  status              payment_status not null default 'created',
  razorpay_order_id   text unique,
  razorpay_payment_id text unique,
  raw_webhook         jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);

-- --------------------------------------------------------- credit ledger ---
-- Append-only. The balance is the sum, never a stored counter that can drift.
create table public.credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  amount     int not null check (amount <> 0),   -- positive credit, negative spend
  reason     text not null,
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

create or replace function public.credit_balance(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from public.credit_ledger where user_id = p_user;
$$;

-- --------------------------------------------------------------- reviews ---
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id  uuid not null references public.mentor_profiles (user_id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  comment    text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index reviews_mentor_idx on public.reviews (mentor_id, created_at desc);

-- --------------------------------------------------------------- reports ---
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type report_target not null,
  target_id   uuid not null,
  reason      text not null,
  details     text check (char_length(details) <= 2000),
  status      report_status not null default 'open',
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index reports_open_idx on public.reports (status, created_at desc);

-- --------------------------------------------------------------- payouts ---
create table public.payouts (
  id           uuid primary key default gen_random_uuid(),
  mentor_id    uuid not null references public.mentor_profiles (user_id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  amount       int not null check (amount >= 0),
  status       payout_status not null default 'pending',
  paid_at      timestamptz,
  reference    text,
  created_at   timestamptz not null default now(),
  constraint payout_period_ordered check (period_end >= period_start)
);
create index payouts_mentor_idx on public.payouts (mentor_id, period_start desc);

-- --------------------------------------------------------- notifications ---
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- ---------------------------------------------------------- session chat ---
create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- ---------------------------------------------------------------- touch ----
create trigger sessions_touch before update on public.sessions
  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();
create trigger reports_touch before update on public.reports
  for each row execute function public.touch_updated_at();
