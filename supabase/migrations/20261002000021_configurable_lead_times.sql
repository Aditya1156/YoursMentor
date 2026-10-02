-- YoursMentor.in — lead times in one place, instead of four
--
-- "It is 10:45 and I cannot pick 10:47." Correct, and in two places at once:
-- request_reschedule() refuses anything under thirty minutes out, and the
-- datetime input would not even offer it. available_slots() has the same
-- problem an order of magnitude bigger — nothing under twelve hours out is
-- bookable at all, so no same-day session can be created through the UI either.
--
-- Those numbers are right for strangers and wrong for testing, and they were
-- buried in two function bodies and one React component, so changing them meant
-- finding them. They now live in one table.
--
-- The values below are set for testing. The notes column records what each one
-- should be before real students arrive, and the whole point of the table is
-- that getting there is an UPDATE rather than a migration.

create table public.platform_settings (
  key        text primary key,
  value      text not null,
  note       text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.platform_settings enable row level security;

-- Readable by everyone: the UI has to be able to tell someone what the floor is
-- before they pick a time, and none of it is sensitive.
create policy "anyone reads platform settings"
  on public.platform_settings for select using (true);

grant select on public.platform_settings to anon, authenticated;

insert into public.platform_settings (key, value, note) values
  ('booking_lead_time', '15 minutes',
   'How far ahead a public 1:1 slot must be to appear in available_slots(). '
   'Set to 12 hours before launch so nobody books a mentor who is asleep.'),
  ('reschedule_lead_time', '2 minutes',
   'How far ahead a proposed new time must be. Set to 30 minutes before launch '
   'so the other side has a chance to see the request and answer it.');

/**
 * One setting as an interval, falling back to a safe default if the row is
 * missing or unparseable — a typo in this table must not be able to take
 * booking down.
 */
create or replace function public.setting_interval(p_key text, p_default interval)
returns interval
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_raw text;
begin
  select value into v_raw from public.platform_settings where key = p_key;
  if v_raw is null then
    return p_default;
  end if;
  begin
    return v_raw::interval;
  exception when others then
    return p_default;
  end;
end;
$$;

grant execute on function public.setting_interval(text, interval) to anon, authenticated;

/** Admin-only writer, so the values can be changed without a deploy. */
create or replace function public.set_platform_setting(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.platform_settings where key = p_key) then
    raise exception 'Unknown setting %', p_key using errcode = 'P0002';
  end if;
  -- Fail here rather than at booking time if it is not a valid interval.
  perform p_value::interval;
  update public.platform_settings
     set value = p_value, updated_at = now(), updated_by = auth.uid()
   where key = p_key;
end;
$$;

revoke execute on function public.set_platform_setting(text, text) from public, anon;
grant execute on function public.set_platform_setting(text, text) to authenticated;

-- ---- available_slots(): read the floor instead of hardcoding 12 hours ------
create or replace function public.available_slots(
  p_mentor uuid,
  p_from date default current_date,
  p_days int default 14
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select p_from as from_date,
           p_from + (greatest(least(p_days, 60), 1) || ' days')::interval as to_date
  ),
  days as (
    select d::date as day
      from bounds, generate_series(bounds.from_date, bounds.to_date, interval '1 day') d
  ),
  rules as (
    select r.day_of_week, r.start_time, r.end_time, r.timezone
      from public.availability_rules r
      join public.mentor_profiles m on m.user_id = r.mentor_id
     where r.mentor_id = p_mentor and m.status = 'approved'
  ),
  raw as (
    select
      ((d.day + r.start_time) at time zone r.timezone)
        + (n * interval '30 minutes') as starts_at,
      ((d.day + r.start_time) at time zone r.timezone)
        + ((n + 1) * interval '30 minutes') as ends_at
    from days d
    join rules r on r.day_of_week = extract(dow from d.day)
    cross join lateral generate_series(
      0,
      greatest(0, (extract(epoch from (r.end_time - r.start_time)) / 1800)::int - 1)
    ) n
    where not exists (
      select 1 from public.blocked_dates bd
       where bd.mentor_id = p_mentor and bd.date = d.day
    )
  )
  select raw.starts_at, raw.ends_at
    from raw
   where raw.starts_at >
         now() + public.setting_interval('booking_lead_time', interval '12 hours')
     and not exists (
       select 1 from public.sessions s
        where s.mentor_id = p_mentor
          and s.status in ('scheduled', 'live')
          and tstzrange(s.start_at, s.end_at) && tstzrange(raw.starts_at, raw.ends_at)
     )
   order by raw.starts_at;
$$;

grant execute on function public.available_slots(uuid, date, int) to anon, authenticated;

-- ---- request_reschedule(): same, and say the real number in the error ------
create or replace function public.request_reschedule(
  p_session uuid,
  p_start_at timestamptz,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller  uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_is_mentor boolean;
  v_is_student boolean;
  v_end     timestamptz;
  v_other   uuid;
  v_request uuid;
  v_name    text;
  v_floor   interval;
begin
  if v_caller is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;

  select * into v_session from public.sessions where id = p_session for update;
  if not found then
    raise exception 'Session not found.' using errcode = 'P0002';
  end if;

  if v_session.type <> 'one_on_one' then
    raise exception
      'Group sessions cannot be rescheduled this way. Cancel it so everyone is refunded.'
      using errcode = 'P0001';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'That session is not open to changes.' using errcode = 'P0001';
  end if;
  if v_session.start_at <= now() then
    raise exception 'That session has already started.' using errcode = 'P0001';
  end if;

  v_is_mentor := v_session.mentor_id = v_caller;
  select exists (
    select 1 from public.bookings
     where session_id = p_session and student_id = v_caller
       and status in ('held', 'confirmed')
  ) into v_is_student;

  if not (v_is_mentor or v_is_student) then
    raise exception 'That is not your session.' using errcode = '42501';
  end if;

  v_end := p_start_at + (v_session.end_at - v_session.start_at);
  v_floor := public.setting_interval('reschedule_lead_time', interval '30 minutes');

  if p_start_at < now() + v_floor then
    raise exception 'Pick a time at least % from now.',
      -- "2 minutes", "30 minutes", "1 hour" — whatever the setting says.
      trim(both ' ' from to_char(extract(epoch from v_floor) / 60, '999999')) || ' minutes'
      using errcode = 'P0001';
  end if;
  if p_start_at > now() + interval '60 days' then
    raise exception 'Pick a time within the next 60 days.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.sessions s
     where s.mentor_id = v_session.mentor_id
       and s.id <> p_session
       and s.status in ('scheduled', 'live')
       and tstzrange(s.start_at, s.end_at) && tstzrange(p_start_at, v_end)
  ) then
    raise exception 'The mentor already has something booked then.' using errcode = 'P0001';
  end if;

  update public.reschedule_requests
     set status = 'withdrawn', responded_at = now()
   where session_id = p_session and status = 'pending';

  insert into public.reschedule_requests (
    session_id, requested_by, proposed_start, proposed_end, reason
  )
  values (p_session, v_caller, p_start_at, v_end, nullif(trim(p_reason), ''))
  returning id into v_request;

  if v_is_mentor then
    select student_id into v_other from public.bookings
     where session_id = p_session and status in ('held', 'confirmed') limit 1;
  else
    v_other := v_session.mentor_id;
  end if;

  select name into v_name from public.profiles where id = v_caller;

  if v_other is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_other, 'reschedule_requested',
      coalesce(v_name, 'Someone') || ' asked to move your session',
      'New time: ' ||
        to_char(p_start_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM') ||
        '. You can accept it or keep the original.',
      '/notifications'
    );
  end if;

  return v_request;
end;
$$;

revoke execute on function public.request_reschedule(uuid, timestamptz, text) from public, anon;
grant execute on function public.request_reschedule(uuid, timestamptz, text) to authenticated;

comment on table public.platform_settings is
  'Values that want changing without a deploy. Currently set for testing; the
   note on each row says what it should be before real students arrive.';
