-- YoursMentor.in — coupons, plans and admin audit
--
-- None of this is in the original spec; it comes from wanting an admin panel
-- that can actually run the business. Three things:
--
--   coupons          discount codes, with the redemption rules in the database
--   plans            monthly passes (spec §8 lists these as a later item)
--   admin_actions    an append-only log of who did what

-- ---------------------------------------------------------------- enums ----
create type discount_kind as enum ('percent', 'flat');
create type coupon_scope as enum ('any', 'group_only', 'one_on_one_only', 'first_booking');

-- -------------------------------------------------------------- coupons ----
create table public.coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique
                      check (code = upper(code) and char_length(code) between 3 and 24),
  description       text,

  kind              discount_kind not null default 'percent',
  -- percent: 1-100. flat: rupees off.
  value             int not null check (value > 0),
  -- A percent coupon can be capped so 50% off never costs more than ₹100.
  max_discount      int check (max_discount is null or max_discount > 0),
  min_amount        int not null default 0 check (min_amount >= 0),

  scope             coupon_scope not null default 'any',

  -- Null means unlimited.
  max_redemptions         int check (max_redemptions is null or max_redemptions > 0),
  max_redemptions_per_user int not null default 1 check (max_redemptions_per_user > 0),
  times_redeemed    int not null default 0 check (times_redeemed >= 0),

  starts_at         timestamptz not null default now(),
  expires_at        timestamptz,
  active            boolean not null default true,

  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint percent_within_range check (kind <> 'percent' or value between 1 and 100),
  constraint coupon_window_ordered check (expires_at is null or expires_at > starts_at),
  constraint redemptions_within_cap check (
    max_redemptions is null or times_redeemed <= max_redemptions
  )
);

create index coupons_lookup_idx on public.coupons (code) where active;

create table public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  booking_id  uuid references public.bookings (id) on delete set null,
  amount_off  int not null check (amount_off >= 0),
  created_at  timestamptz not null default now()
);
create index coupon_redemptions_user_idx on public.coupon_redemptions (coupon_id, user_id);

-- bookings needs to remember which coupon paid for part of it.
alter table public.bookings
  add column coupon_id uuid references public.coupons (id) on delete set null,
  add column discount_applied int not null default 0 check (discount_applied >= 0);

-- ---------------------------------------------------------------- plans ----
create table public.plans (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  description     text,
  price           int not null check (price >= 0),
  /** Group seats included per cycle. Null means unlimited. */
  group_sessions  int check (group_sessions is null or group_sessions >= 0),
  one_on_ones     int not null default 0 check (one_on_ones >= 0),
  duration_days   int not null default 30 check (duration_days > 0),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  plan_id            uuid not null references public.plans (id),
  status             text not null default 'active'
                       check (status in ('active', 'cancelled', 'expired')),
  started_at         timestamptz not null default now(),
  expires_at         timestamptz not null,
  group_remaining    int,
  one_on_one_remaining int not null default 0,
  razorpay_payment_id text,
  created_at         timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id, status);

-- -------------------------------------------------------- admin actions ----
/** Append-only. Who suspended whom, who issued which refund, and when. */
create table public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index admin_actions_recent_idx on public.admin_actions (created_at desc);

create trigger coupons_touch before update on public.coupons
  for each row execute function public.touch_updated_at();

-- ======================================================= coupon logic ======
/**
 * Works out what a coupon takes off a given booking, or raises with a message
 * the student can read. All the rules live here so the checkout page and the
 * payment route cannot disagree about what a code is worth.
 */
create or replace function public.preview_coupon(p_code text, p_booking uuid)
returns table (coupon_id uuid, amount_off int, description text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  b public.bookings%rowtype;
  s public.sessions%rowtype;
  v_user uuid := auth.uid();
  v_off int;
  v_used int;
begin
  select * into b from public.bookings where id = p_booking and student_id = v_user;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;

  select * into s from public.sessions where id = b.session_id;

  select * into c from public.coupons where code = upper(trim(p_code));
  if not found or not c.active then
    raise exception 'That code is not valid.' using errcode = 'P0001';
  end if;
  if now() < c.starts_at then
    raise exception 'That code is not active yet.' using errcode = 'P0001';
  end if;
  if c.expires_at is not null and now() > c.expires_at then
    raise exception 'That code has expired.' using errcode = 'P0001';
  end if;
  if c.max_redemptions is not null and c.times_redeemed >= c.max_redemptions then
    raise exception 'That code has been fully claimed.' using errcode = 'P0001';
  end if;
  if b.amount < c.min_amount then
    raise exception 'That code needs a booking of at least ₹%.', c.min_amount
      using errcode = 'P0001';
  end if;

  if c.scope = 'group_only' and s.type <> 'group' then
    raise exception 'That code only works on ₹99 group sessions.' using errcode = 'P0001';
  end if;
  if c.scope = 'one_on_one_only' and s.type <> 'one_on_one' then
    raise exception 'That code only works on 1:1 sessions.' using errcode = 'P0001';
  end if;
  if c.scope = 'first_booking' and exists (
      select 1 from public.bookings
       where student_id = v_user and id <> p_booking
         and status in ('confirmed', 'attended')
  ) then
    raise exception 'That code is for your first booking only.' using errcode = 'P0001';
  end if;

  select count(*) into v_used from public.coupon_redemptions
   where coupon_id = c.id and user_id = v_user;
  if v_used >= c.max_redemptions_per_user then
    raise exception 'You have already used that code.' using errcode = 'P0001';
  end if;

  v_off := case
    when c.kind = 'percent' then (b.amount * c.value) / 100
    else c.value
  end;
  if c.max_discount is not null then
    v_off := least(v_off, c.max_discount);
  end if;
  -- Never discount below zero, and never below what is actually owed.
  v_off := greatest(0, least(v_off, b.amount));

  return query select c.id, v_off, coalesce(c.description, c.code);
end;
$$;

revoke execute on function public.preview_coupon(text, uuid) from public, anon;
grant execute on function public.preview_coupon(text, uuid) to authenticated;

-- ------------------------------------------------------------------ RLS ----
alter table public.coupons             enable row level security;
alter table public.coupon_redemptions  enable row level security;
alter table public.plans               enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.admin_actions       enable row level security;

-- Coupons are never listed publicly: a student types a code they were given,
-- and preview_coupon answers. Browsing every live discount is not a feature.
create policy "admins manage coupons" on public.coupons for all using (public.is_admin());

create policy "users read their own redemptions"
  on public.coupon_redemptions for select using (auth.uid() = user_id);
create policy "admins read every redemption"
  on public.coupon_redemptions for select using (public.is_admin());

create policy "active plans are public" on public.plans for select using (active);
create policy "admins manage plans" on public.plans for all using (public.is_admin());

create policy "users read their own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);
create policy "admins read every subscription"
  on public.subscriptions for select using (public.is_admin());

create policy "admins read the action log"
  on public.admin_actions for select using (public.is_admin());

-- Clients never write any of this; the admin API does, with the service role.
revoke insert, update, delete on public.coupons from authenticated, anon;
revoke insert, update, delete on public.coupon_redemptions from authenticated, anon;
revoke insert, update, delete on public.plans from authenticated, anon;
revoke insert, update, delete on public.subscriptions from authenticated, anon;
revoke insert, update, delete on public.admin_actions from authenticated, anon;

revoke update on public.bookings from authenticated;
