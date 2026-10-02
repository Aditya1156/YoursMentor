-- YoursMentor.in — Pod and Pro, the monthly plans
--
-- The plans and subscriptions tables were written in migration 7 and nothing has
-- ever read them. The shape turned out to be right: a plan carries how many
-- group seats and how many 1:1s it includes per cycle, and a subscription
-- carries what is left of each.
--
-- The ₹99 one-off stays. It is the product the landing page sells and the one a
-- stranger tries first; a subscription only means the seat is already paid for
-- before they click. Changing that is a row in `plans`, not a migration.
--
-- Where the allowance is spent matters. It would have been tempting to put it in
-- hold_seat(), which every booking already goes through — but that function is
-- the one piece of this system proven to behave under concurrency, and a seat
-- that is held but not yet paid for is exactly the state the hold exists to
-- represent. So holding a seat is unchanged, and the allowance is spent at
-- checkout, in place of money, alongside credits and Razorpay.

insert into public.plans (code, name, description, price, group_sessions, one_on_ones, duration_days)
values
  ('pod', 'Pod',
   'Four ₹99 group sessions a month, and your pod to turn up with.',
   199, 4, 0, 30),
  ('pro', 'Pro',
   'Everything in Pod, plus two 1:1 calls a month and priority matching.',
   499, 4, 2, 30)
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      group_sessions = excluded.group_sessions,
      one_on_ones = excluded.one_on_ones,
      duration_days = excluded.duration_days,
      active = true;

-- A person has at most one live subscription. Two overlapping ones would make
-- "how many sessions do I have left" unanswerable.
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status = 'active';

create index if not exists subscriptions_user_idx
  on public.subscriptions (user_id, expires_at desc);

-- ============================================================= reading ======
/**
 * The caller's live subscription, or nothing. Expiry is judged here rather than
 * trusted from the status column, because nothing runs at midnight to flip it.
 */
create or replace function public.my_subscription()
returns table (
  subscription_id uuid,
  plan_code text,
  plan_name text,
  price int,
  expires_at timestamptz,
  group_remaining int,
  one_on_one_remaining int
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, p.code, p.name, p.price, s.expires_at,
         s.group_remaining, s.one_on_one_remaining
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
   where s.user_id = auth.uid()
     and s.status = 'active'
     and s.expires_at > now()
   order by s.expires_at desc
   limit 1;
$$;

revoke execute on function public.my_subscription() from public, anon;
grant execute on function public.my_subscription() to authenticated;

-- ============================================================ starting ======
/**
 * Begins a subscription. Called by the server once it has been paid for, so the
 * caller is trusted on that point and this is service_role only — the same
 * division as confirm_booking().
 *
 * Renewing while one is still live extends it and tops the allowance back up
 * rather than stacking a second subscription, which is what the partial unique
 * index would refuse anyway.
 */
create or replace function public.start_subscription(
  p_user uuid,
  p_plan_code text,
  p_payment_ref text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.plans%rowtype;
  v_existing public.subscriptions%rowtype;
  v_id uuid;
begin
  select * into v_plan from public.plans where code = p_plan_code and active;
  if not found then
    raise exception 'No such plan: %', p_plan_code using errcode = 'P0002';
  end if;

  select * into v_existing from public.subscriptions
   where user_id = p_user and status = 'active' and expires_at > now()
   for update;

  if found then
    update public.subscriptions
       set plan_id = v_plan.id,
           expires_at = v_existing.expires_at + make_interval(days => v_plan.duration_days),
           group_remaining = coalesce(group_remaining, 0) + coalesce(v_plan.group_sessions, 0),
           one_on_one_remaining = one_on_one_remaining + v_plan.one_on_ones,
           razorpay_payment_id = coalesce(p_payment_ref, razorpay_payment_id)
     where id = v_existing.id
    returning id into v_id;
  else
    insert into public.subscriptions (
      user_id, plan_id, status, expires_at,
      group_remaining, one_on_one_remaining, razorpay_payment_id
    )
    values (
      p_user, v_plan.id, 'active',
      now() + make_interval(days => v_plan.duration_days),
      v_plan.group_sessions, v_plan.one_on_ones, p_payment_ref
    )
    returning id into v_id;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, 'subscription_started', v_plan.name || ' is active',
          case
            when v_plan.one_on_ones > 0 then
              coalesce(v_plan.group_sessions::text, 'Unlimited') || ' group sessions and '
              || v_plan.one_on_ones || ' 1:1 calls are included this month.'
            else
              coalesce(v_plan.group_sessions::text, 'Unlimited')
              || ' group sessions are included this month.'
          end,
          '/dashboard');

  return v_id;
end;
$$;

revoke execute on function public.start_subscription(uuid, text, text) from public, anon, authenticated;
grant execute on function public.start_subscription(uuid, text, text) to service_role;

/** Stops renewing. The remaining allowance stays usable until it expires. */
create or replace function public.cancel_my_subscription()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;
  update public.subscriptions
     set status = 'cancelled'
   where user_id = auth.uid() and status = 'active';
end;
$$;

revoke execute on function public.cancel_my_subscription() from public, anon;
grant execute on function public.cancel_my_subscription() to authenticated;

-- ============================================================ spending =====
/**
 * Uses one included session to pay for a held booking.
 *
 * Returns true if the allowance covered it. The row is locked first: two tabs
 * confirming two seats against a last remaining session would otherwise both
 * read 1, both decrement, and leave the count at 0 having given away two.
 *
 * A cancelled-but-unexpired subscription still spends, because the student paid
 * for those sessions and cancelling only stops the renewal.
 */
create or replace function public.spend_subscription_seat(p_booking uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_type session_type;
  v_sub public.subscriptions%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking;
  if not found or v_booking.status <> 'held' then
    return false;
  end if;

  select s.type into v_type from public.sessions s where s.id = v_booking.session_id;

  select * into v_sub from public.subscriptions
   where user_id = v_booking.student_id
     and status in ('active', 'cancelled')
     and expires_at > now()
   order by expires_at desc
   limit 1
   for update;

  if not found then
    return false;
  end if;

  if v_type = 'group' then
    -- A null allowance means unlimited, which no current plan uses but the
    -- column was written to allow.
    if v_sub.group_remaining is not null then
      if v_sub.group_remaining <= 0 then
        return false;
      end if;
      update public.subscriptions
         set group_remaining = group_remaining - 1
       where id = v_sub.id;
    end if;
  else
    if v_sub.one_on_one_remaining <= 0 then
      return false;
    end if;
    update public.subscriptions
       set one_on_one_remaining = one_on_one_remaining - 1
     where id = v_sub.id;
  end if;

  return true;
end;
$$;

revoke execute on function public.spend_subscription_seat(uuid) from public, anon, authenticated;
grant execute on function public.spend_subscription_seat(uuid) to service_role;

/** Puts a session back if a booking paid for by allowance is cancelled. */
create or replace function public.refund_subscription_seat(p_booking uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_type session_type;
  v_sub public.subscriptions%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking;
  if not found then
    return false;
  end if;

  select s.type into v_type from public.sessions s where s.id = v_booking.session_id;

  select * into v_sub from public.subscriptions
   where user_id = v_booking.student_id
     and expires_at > now()
   order by expires_at desc
   limit 1
   for update;

  if not found then
    return false;
  end if;

  if v_type = 'group' then
    update public.subscriptions
       set group_remaining = coalesce(group_remaining, 0) + 1
     where id = v_sub.id and group_remaining is not null;
  else
    update public.subscriptions
       set one_on_one_remaining = one_on_one_remaining + 1
     where id = v_sub.id;
  end if;

  return true;
end;
$$;

revoke execute on function public.refund_subscription_seat(uuid) from public, anon, authenticated;
grant execute on function public.refund_subscription_seat(uuid) to service_role;

comment on function public.spend_subscription_seat is
  'Pays for a held booking out of the caller''s plan allowance. service_role
   only: the server decides the order of allowance, then credits, then Razorpay.';
