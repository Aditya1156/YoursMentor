-- YoursMentor.in — measure the lead time from the start of the minute
--
-- With the floor at two minutes, picking a time exactly two minutes away was
-- still refused. At 10:45:30 a person picks 10:47 — the only thing a
-- datetime-local input lets them express, since it has no seconds — and that is
-- one minute thirty from now, which is under two.
--
-- So the comparison was right and the units were wrong: a floor expressed in
-- whole minutes was being checked against a clock carrying seconds and
-- milliseconds. The user experiences it as the first offerable time being
-- rejected, which is indistinguishable from the feature being broken.
--
-- Truncating now() to the minute makes the two agree. At 10:45:30 the threshold
-- becomes 10:45:00 + 2 minutes = 10:47:00, and 10:47 is accepted — which is what
-- someone looking at the clock expects.

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
  v_mins    int;
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
  v_mins := greatest(1, round(extract(epoch from v_floor) / 60)::int);

  -- From the top of the current minute, because that is the finest a person can
  -- actually pick.
  if p_start_at < date_trunc('minute', now()) + v_floor then
    raise exception 'Pick a time at least % from now.',
      case when v_mins = 1 then '1 minute'
           when v_mins < 60 then v_mins || ' minutes'
           when v_mins = 60 then '1 hour'
           else round(v_mins / 60.0, 1) || ' hours'
      end
      using errcode = 'P0001';
  end if;

  -- A past time is still a past time, floor or no floor.
  if p_start_at <= date_trunc('minute', now()) then
    raise exception 'That time has already passed.' using errcode = 'P0001';
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

-- respond_to_reschedule() refuses a proposal whose time has passed while it sat
-- waiting. With a two-minute floor that window is small and easy to cross, and
-- "that time has already passed" on a time that has not quite passed would be
-- the same off-by-seconds confusion from the other end.
create or replace function public.respond_to_reschedule(
  p_request uuid,
  p_accept boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller  uuid := auth.uid();
  v_req     public.reschedule_requests%rowtype;
  v_session public.sessions%rowtype;
  v_allowed boolean;
  v_name    text;
begin
  if v_caller is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;

  select * into v_req from public.reschedule_requests where id = p_request for update;
  if not found then
    raise exception 'That request no longer exists.' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'That request was already %.', v_req.status using errcode = 'P0001';
  end if;
  if v_req.requested_by = v_caller then
    raise exception 'The other person has to accept this, not you.' using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = v_req.session_id for update;

  v_allowed := v_session.mentor_id = v_caller
    or exists (
      select 1 from public.bookings
       where session_id = v_req.session_id and student_id = v_caller
         and status in ('held', 'confirmed')
    );
  if not v_allowed then
    raise exception 'That is not your session.' using errcode = '42501';
  end if;

  if not p_accept then
    update public.reschedule_requests
       set status = 'declined', responded_by = v_caller, responded_at = now()
     where id = p_request;

    select name into v_name from public.profiles where id = v_caller;
    insert into public.notifications (user_id, type, title, body, link)
    values (v_req.requested_by, 'reschedule_declined',
            coalesce(v_name, 'They') || ' kept the original time',
            'Your session is still on as booked.', '/notifications');
    return 'declined';
  end if;

  -- Judged on the minute, like the proposal was.
  if v_req.proposed_start < date_trunc('minute', now()) then
    raise exception 'That time has already passed. Ask for another one.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.sessions s
     where s.mentor_id = v_session.mentor_id
       and s.id <> v_req.session_id
       and s.status in ('scheduled', 'live')
       and tstzrange(s.start_at, s.end_at)
           && tstzrange(v_req.proposed_start, v_req.proposed_end)
  ) then
    raise exception 'The mentor has since booked something else then.'
      using errcode = 'P0001';
  end if;

  update public.sessions
     set start_at = v_req.proposed_start,
         end_at   = v_req.proposed_end,
         updated_at = now()
   where id = v_req.session_id;

  update public.reschedule_requests
     set status = 'accepted', responded_by = v_caller, responded_at = now()
   where id = p_request;

  select name into v_name from public.profiles where id = v_caller;
  insert into public.notifications (user_id, type, title, body, link)
  values (v_req.requested_by, 'reschedule_accepted',
          coalesce(v_name, 'They') || ' accepted the new time',
          'Your session now starts ' ||
            to_char(v_req.proposed_start at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM') || '.',
          '/notifications');

  return 'accepted';
end;
$$;

revoke execute on function public.respond_to_reschedule(uuid, boolean) from public, anon;
grant execute on function public.respond_to_reschedule(uuid, boolean) to authenticated;

-- available_slots() lands on :00 and :30 only, so with a 15-minute floor the
-- next bookable slot can still be up to 45 minutes out. For testing a session
-- minutes away, create it from the mentor's session form, which has no floor —
-- the grid is what the public directory offers, not a limit on what can exist.
comment on function public.available_slots is
  'Public 1:1 slots on a 30-minute grid, no sooner than the booking_lead_time
   setting. The grid means the earliest offer can be a further 29 minutes out.';
