-- YoursMentor.in — coupons could never be previewed
--
-- Both coupon preview functions declare an OUT parameter called coupon_id and
-- then query coupon_redemptions, which has a column of the same name:
--
--   select count(*) into v_used from public.coupon_redemptions
--    where coupon_id = c.id and user_id = v_user;
--
-- Postgres cannot tell which one is meant and raises 42702, "column reference
-- coupon_id is ambiguous". It compiles; it fails only when the line runs, which
-- is every time anybody enters a code. preview_coupon() has been broken this way
-- since coupons were written, and nothing noticed because no screen ever called
-- it — the admin panel creates coupons and students had nowhere to type one.
--
-- Both are fixed the same way: alias the table.

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

  -- Aliased, so coupon_id can only mean the column.
  select count(*) into v_used
    from public.coupon_redemptions cr
   where cr.coupon_id = c.id and cr.user_id = v_user;
  if v_used >= c.max_redemptions_per_user then
    raise exception 'You have already used that code.' using errcode = 'P0001';
  end if;

  v_off := case when c.kind = 'percent' then (p_amount * c.value) / 100 else c.value end;
  if c.max_discount is not null then
    v_off := least(v_off, c.max_discount);
  end if;
  v_off := greatest(0, least(v_off, p_amount));

  return query select c.id, v_off, c.description;
end;
$$;

revoke execute on function public.preview_coupon_for_amount(text, int) from public, anon;
grant execute on function public.preview_coupon_for_amount(text, int) to authenticated;

-- The original, booking-scoped version, with the same alias. Identical in every
-- other respect to migration 7.
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

  select count(*) into v_used
    from public.coupon_redemptions cr
   where cr.coupon_id = c.id and cr.user_id = v_user;
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
