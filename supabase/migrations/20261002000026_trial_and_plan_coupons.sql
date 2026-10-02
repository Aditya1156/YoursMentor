-- YoursMentor.in — a one-day trial, and coupons on plans
--
-- Two things. A new account gets one day with one group session included, so
-- somebody can see what this is before deciding; and a coupon can discount a
-- plan, not just a booking.
--
-- The trial is granted by its own trigger rather than inside handle_new_user().
-- That function already broke signup once, when a one-character name from an
-- address like a@gmail.com failed the name check and took the whole sign-up down
-- with it. Nothing about a promotional trial is worth that risk, so this one
-- swallows its own failures: if the trial cannot be granted, the account is still
-- created and the person can still pay.

insert into public.plans (code, name, description, price, group_sessions, one_on_ones, duration_days)
values ('trial', 'Free trial',
        'One group session, free, for your first day. No card, nothing to cancel.',
        0, 1, 0, 1)
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      group_sessions = excluded.group_sessions,
      one_on_ones = excluded.one_on_ones,
      duration_days = excluded.duration_days,
      active = true;

-- ============================================================= granting =====
/**
 * Gives a brand-new account its trial.
 *
 * Students only: a mentor is here to be paid, and an admin has no use for it.
 * Once per account, which the partial unique index on subscriptions already
 * guarantees, and the exception block means a failure here can never stop
 * somebody signing up.
 */
create or replace function public.grant_signup_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_plan public.plans%rowtype;
begin
  if new.role <> 'student' then
    return new;
  end if;

  begin
    select * into v_plan from public.plans where code = 'trial' and active;
    if not found then
      return new;
    end if;

    insert into public.subscriptions (
      user_id, plan_id, status, expires_at,
      group_remaining, one_on_one_remaining, razorpay_payment_id
    )
    values (
      new.id, v_plan.id, 'active',
      now() + make_interval(days => v_plan.duration_days),
      v_plan.group_sessions, v_plan.one_on_ones, 'signup_trial'
    );

    insert into public.notifications (user_id, type, title, body, link)
    values (new.id, 'trial_started', 'Your first session is free',
            'One ₹99 group session is on us, for the next 24 hours. Book it and the '
            || 'seat is yours even if the session itself is later in the week.',
            '/sessions');
  exception when others then
    -- A promotion must never be the reason an account cannot be created.
    null;
  end;

  return new;
end;
$$;

drop trigger if exists profiles_grant_trial on public.profiles;
create trigger profiles_grant_trial
  after insert on public.profiles
  for each row
  execute function public.grant_signup_trial();

-- ---- upgrading out of the trial --------------------------------------------
/**
 * start_subscription(), with one change: buying a real plan while on the trial
 * replaces it rather than extending it.
 *
 * Extending was wrong in a small but real way — a trial with its session unused
 * would have handed a new Pod subscriber five sessions instead of four, and
 * thirty-one days instead of thirty. Renewing Pod with Pod still extends, which
 * is the behaviour somebody paying twice expects.
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
  v_old_code text;
  v_id uuid;
begin
  select * into v_plan from public.plans where code = p_plan_code and active;
  if not found then
    raise exception 'No such plan: %', p_plan_code using errcode = 'P0002';
  end if;

  select s.* into v_existing from public.subscriptions s
   where s.user_id = p_user and s.status = 'active' and s.expires_at > now()
   for update;

  if found then
    select code into v_old_code from public.plans where id = v_existing.plan_id;

    if v_old_code = 'trial' then
      -- A trial is a sample, not a balance to carry over.
      update public.subscriptions
         set plan_id = v_plan.id,
             expires_at = now() + make_interval(days => v_plan.duration_days),
             group_remaining = v_plan.group_sessions,
             one_on_one_remaining = v_plan.one_on_ones,
             razorpay_payment_id = p_payment_ref
       where id = v_existing.id
      returning id into v_id;
    else
      update public.subscriptions
         set plan_id = v_plan.id,
             expires_at = v_existing.expires_at + make_interval(days => v_plan.duration_days),
             group_remaining = coalesce(group_remaining, 0) + coalesce(v_plan.group_sessions, 0),
             one_on_one_remaining = one_on_one_remaining + v_plan.one_on_ones,
             razorpay_payment_id = coalesce(p_payment_ref, razorpay_payment_id)
       where id = v_existing.id
      returning id into v_id;
    end if;
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

  -- The trial announces itself from its own trigger; no need to say it twice.
  if v_plan.price > 0 then
    insert into public.notifications (user_id, type, title, body, link)
    values (p_user, 'subscription_started', v_plan.name || ' is active',
            coalesce(v_plan.group_sessions::text, 'Unlimited') || ' group sessions'
            || case when v_plan.one_on_ones > 0
                    then ' and ' || v_plan.one_on_ones || ' 1:1 calls' else '' end
            || ' are included this month.',
            '/dashboard');
  end if;

  return v_id;
end;
$$;

revoke execute on function public.start_subscription(uuid, text, text) from public, anon, authenticated;
grant execute on function public.start_subscription(uuid, text, text) to service_role;

-- ============================================================== coupons =====
/**
 * What a coupon takes off a given amount.
 *
 * preview_coupon() is tied to a booking — it reads the session to apply
 * group_only and one_on_one_only scopes. A plan has no session, so this is the
 * amount-only version, and it refuses the session-specific scopes rather than
 * silently ignoring them: a code meant for ₹99 group rooms should not quietly
 * discount a ₹499 subscription.
 */
create or replace function public.preview_coupon_for_amount(p_code text, p_amount int)
returns table (coupon_id uuid, amount_off int, description text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_user uuid := auth.uid();
  v_off int;
  v_used int;
begin
  if v_user is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;

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
  if p_amount < c.min_amount then
    raise exception 'That code needs a spend of at least ₹%.', c.min_amount
      using errcode = 'P0001';
  end if;
  if c.scope in ('group_only', 'one_on_one_only') then
    raise exception 'That code only works on sessions, not on a plan.'
      using errcode = 'P0001';
  end if;

  select count(*) into v_used from public.coupon_redemptions
   where coupon_id = c.id and user_id = v_user;
  if v_used >= c.max_redemptions_per_user then
    raise exception 'You have already used that code.' using errcode = 'P0001';
  end if;

  v_off := case
    when c.kind = 'percent' then (p_amount * c.value) / 100
    else c.value
  end;
  if c.max_discount is not null then
    v_off := least(v_off, c.max_discount);
  end if;
  -- Never more than the price, and never negative.
  v_off := greatest(0, least(v_off, p_amount));

  return query select c.id, v_off, c.description;
end;
$$;

revoke execute on function public.preview_coupon_for_amount(text, int) from public, anon;
grant execute on function public.preview_coupon_for_amount(text, int) to authenticated;

/**
 * Records that a coupon was used for a subscription. Service role: the server
 * calls it once it has taken the discounted amount, and
 * coupon_redemptions.booking_id stays null because there is no booking.
 */
create or replace function public.redeem_coupon_for_plan(
  p_coupon uuid,
  p_user uuid,
  p_amount_off int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.coupon_redemptions (coupon_id, user_id, amount_off)
  values (p_coupon, p_user, p_amount_off);

  update public.coupons
     set times_redeemed = times_redeemed + 1
   where id = p_coupon;
end;
$$;

revoke execute on function public.redeem_coupon_for_plan(uuid, uuid, int)
  from public, anon, authenticated;
grant execute on function public.redeem_coupon_for_plan(uuid, uuid, int) to service_role;

comment on function public.grant_signup_trial is
  'One day, one group session, students only. Swallows its own errors: a
   promotion must never stop an account being created.';
