-- YoursMentor.in — "Start now", and the lead times put back
--
-- Lowering the reschedule floor to two minutes was the wrong fix. A mentor is
-- not available at two minutes' notice, so an interface that lets a student
-- book that is lying to them — it makes a promise the other person has no way
-- of keeping. The floors go back to what they were: thirty minutes to move a
-- session, twelve hours for a stranger to take a public slot.
--
-- What was actually wanted is a different question. Not "schedule this very
-- soon" but "are you free right this second" — which only one person can
-- answer, and only now. So it is asked directly: one side presses Start now,
-- the other sees it and either joins or does not, and the request goes stale by
-- itself after five minutes rather than sitting there misleading anybody.
--
-- The lead time does not apply, and that is not an exception sneaked through.
-- A floor exists so somebody is not committed to a time they have not seen; a
-- Start now is two people agreeing in the moment, with the agreement being the
-- thing that opens the room.

-- ---- the floors, restored --------------------------------------------------
update public.platform_settings
   set value = '30 minutes', updated_at = now()
 where key = 'reschedule_lead_time';

update public.platform_settings
   set value = '12 hours', updated_at = now()
 where key = 'booking_lead_time';

-- The minute-boundary handling in request_reschedule() stays. It is not what
-- allowed quick rescheduling — it is why "at least 30 minutes" accepts the
-- thirty-minute mark instead of refusing it over a few hundred milliseconds.

-- ---- Start now ------------------------------------------------------------
-- Carried on the same table as reschedules: the one-open-request-per-session
-- index, the participant checks and the notification plumbing all apply
-- unchanged, and a session cannot be having both conversations at once.

alter table public.reschedule_requests
  add column kind text not null default 'reschedule'
    check (kind in ('reschedule', 'start_now')),
  add column expires_at timestamptz;

comment on column public.reschedule_requests.expires_at is
  'Start now requests only. "Are you free this second" stops being a real
   question very quickly, so it lapses rather than waiting for an answer.';

/**
 * Asks the other person to begin the session immediately.
 *
 * Either side may ask. The session is not moved here — nothing changes until
 * the other person says yes, exactly as with a reschedule.
 */
create or replace function public.request_start_now(p_session uuid)
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
  v_other   uuid;
  v_request uuid;
  v_name    text;
begin
  if v_caller is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;

  select * into v_session from public.sessions where id = p_session for update;
  if not found then
    raise exception 'Session not found.' using errcode = 'P0002';
  end if;
  if v_session.type <> 'one_on_one' then
    raise exception 'Only a 1:1 can be started early.' using errcode = 'P0001';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'That session is not open.' using errcode = 'P0001';
  end if;

  v_is_mentor := v_session.mentor_id = v_caller;
  select exists (
    select 1 from public.bookings
     where session_id = p_session and student_id = v_caller and status = 'confirmed'
  ) into v_is_student;

  if not (v_is_mentor or v_is_student) then
    raise exception 'That is not your session.' using errcode = '42501';
  end if;

  -- Somebody has to have paid, or there is nobody on the other end to ask.
  if not exists (
    select 1 from public.bookings
     where session_id = p_session and status = 'confirmed'
  ) then
    raise exception 'Nobody has a confirmed seat on this session yet.'
      using errcode = 'P0001';
  end if;

  -- Clear anything already open, including a stale Start now from earlier.
  update public.reschedule_requests
     set status = 'withdrawn', responded_at = now()
   where session_id = p_session and status = 'pending';

  insert into public.reschedule_requests (
    session_id, requested_by, proposed_start, proposed_end, kind, expires_at
  )
  values (
    p_session, v_caller,
    date_trunc('minute', now()),
    date_trunc('minute', now()) + (v_session.end_at - v_session.start_at),
    'start_now',
    now() + interval '5 minutes'
  )
  returning id into v_request;

  if v_is_mentor then
    select student_id into v_other from public.bookings
     where session_id = p_session and status = 'confirmed' limit 1;
  else
    v_other := v_session.mentor_id;
  end if;

  select name into v_name from public.profiles where id = v_caller;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_other, 'start_now_requested',
    coalesce(v_name, 'Someone') || ' wants to start the session now',
    'They are online and ready. Join and the room opens straight away.',
    '/notifications'
  );

  return v_request;
end;
$$;

revoke execute on function public.request_start_now(uuid) from public, anon;
grant execute on function public.request_start_now(uuid) to authenticated;

/**
 * Agrees to start now, which moves the session to this minute and makes the
 * room joinable immediately. Returns the session id so the caller can go
 * straight there.
 */
create or replace function public.accept_start_now(p_request uuid)
returns uuid
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
  v_length  interval;
begin
  select * into v_req from public.reschedule_requests where id = p_request for update;
  if not found then
    raise exception 'That request no longer exists.' using errcode = 'P0002';
  end if;
  if v_req.kind <> 'start_now' then
    raise exception 'That is not a start-now request.' using errcode = 'P0001';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'That request was already %.', v_req.status using errcode = 'P0001';
  end if;
  if v_req.expires_at is not null and v_req.expires_at < now() then
    update public.reschedule_requests
       set status = 'withdrawn', responded_at = now() where id = p_request;
    raise exception 'That request has lapsed. Ask them again.' using errcode = 'P0001';
  end if;
  if v_req.requested_by = v_caller then
    raise exception 'The other person has to accept this, not you.' using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = v_req.session_id for update;

  v_allowed := v_session.mentor_id = v_caller
    or exists (
      select 1 from public.bookings
       where session_id = v_req.session_id and student_id = v_caller
         and status = 'confirmed'
    );
  if not v_allowed then
    raise exception 'That is not your session.' using errcode = '42501';
  end if;

  v_length := v_session.end_at - v_session.start_at;

  -- Backdate by a minute so the room's "opens 10 minutes before" window is
  -- already open when they arrive, rather than by a hair's breadth not.
  update public.sessions
     set start_at = now() - interval '1 minute',
         end_at   = now() - interval '1 minute' + v_length,
         updated_at = now()
   where id = v_req.session_id;

  update public.reschedule_requests
     set status = 'accepted', responded_by = v_caller, responded_at = now()
   where id = p_request;

  select name into v_name from public.profiles where id = v_caller;
  insert into public.notifications (user_id, type, title, body, link)
  values (v_req.requested_by, 'start_now_accepted',
          coalesce(v_name, 'They') || ' is joining now',
          'The room is open.', '/room/' || v_req.session_id);

  return v_req.session_id;
end;
$$;

revoke execute on function public.accept_start_now(uuid) from public, anon;
grant execute on function public.accept_start_now(uuid) to authenticated;

/** Declines, or withdraws your own. Either way the question closes. */
create or replace function public.decline_start_now(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.reschedule_requests%rowtype;
  v_name text;
begin
  select * into v_req from public.reschedule_requests where id = p_request for update;
  if not found or v_req.status <> 'pending' then
    return;   -- already closed; nothing to say
  end if;

  if v_req.requested_by <> auth.uid()
     and not exists (
       select 1 from public.sessions s
        where s.id = v_req.session_id and s.mentor_id = auth.uid())
     and not exists (
       select 1 from public.bookings b
        where b.session_id = v_req.session_id and b.student_id = auth.uid()
          and b.status = 'confirmed')
  then
    raise exception 'That is not your session.' using errcode = '42501';
  end if;

  update public.reschedule_requests
     set status = 'declined', responded_by = auth.uid(), responded_at = now()
   where id = p_request;

  if v_req.requested_by <> auth.uid() then
    select name into v_name from public.profiles where id = auth.uid();
    insert into public.notifications (user_id, type, title, body, link)
    values (v_req.requested_by, 'start_now_declined',
            coalesce(v_name, 'They') || ' cannot start right now',
            'Your session is still on at its booked time.', '/my-sessions');
  end if;
end;
$$;

revoke execute on function public.decline_start_now(uuid) from public, anon;
grant execute on function public.decline_start_now(uuid) to authenticated;

/**
 * What the requester polls while waiting. Returns the request's state and, once
 * accepted, the session to walk into.
 */
create or replace function public.start_now_status(p_request uuid)
returns table (status text, session_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select
    -- A lapsed request is still 'pending' in the column until something
    -- touches it; the caller is told the truth.
    case when r.status = 'pending' and r.expires_at is not null and r.expires_at < now()
         then 'expired' else r.status::text end,
    r.session_id
    from public.reschedule_requests r
   where r.id = p_request
     and (
       r.requested_by = auth.uid()
       or public.owns_session(r.session_id)
       or public.has_seat_on(r.session_id)
     );
$$;

revoke execute on function public.start_now_status(uuid) from public, anon;
grant execute on function public.start_now_status(uuid) to authenticated;

-- ---- the two listing functions, now aware of kind and expiry --------------
-- Dropped rather than replaced: adding a column to a returns-table signature
-- changes the row type, which CREATE OR REPLACE will not do.
drop function if exists public.my_pending_reschedules();
drop function if exists public.my_sent_reschedules();
drop function if exists public.pending_reschedule(uuid);

create or replace function public.my_pending_reschedules()
returns table (
  request_id uuid,
  session_id uuid,
  session_title text,
  current_start timestamptz,
  proposed_start timestamptz,
  proposed_end timestamptz,
  reason text,
  requested_by_name text,
  i_am_mentor boolean,
  kind text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, s.id, s.title, s.start_at, r.proposed_start, r.proposed_end,
         r.reason, p.name, s.mentor_id = auth.uid(), r.kind
    from public.reschedule_requests r
    join public.sessions s on s.id = r.session_id
    join public.profiles p on p.id = r.requested_by
   where r.status = 'pending'
     and (r.expires_at is null or r.expires_at > now())
     and r.requested_by <> auth.uid()
     and s.status = 'scheduled'
     and (
       s.mentor_id = auth.uid()
       or exists (
         select 1 from public.bookings b
          where b.session_id = s.id
            and b.student_id = auth.uid()
            and b.status in ('held', 'confirmed')
       )
     )
   order by r.created_at desc;
$$;

create or replace function public.my_sent_reschedules()
returns table (
  request_id uuid,
  session_id uuid,
  session_title text,
  current_start timestamptz,
  proposed_start timestamptz,
  reason text,
  kind text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, s.id, s.title, s.start_at, r.proposed_start, r.reason, r.kind
    from public.reschedule_requests r
    join public.sessions s on s.id = r.session_id
   where r.status = 'pending'
     and (r.expires_at is null or r.expires_at > now())
     and r.requested_by = auth.uid()
     and s.status = 'scheduled'
   order by r.created_at desc;
$$;

revoke execute on function public.my_pending_reschedules() from public, anon;
revoke execute on function public.my_sent_reschedules() from public, anon;
grant execute on function public.my_pending_reschedules() to authenticated;
grant execute on function public.my_sent_reschedules() to authenticated;

create or replace function public.pending_reschedule(p_session uuid)
returns table (
  id uuid,
  proposed_start timestamptz,
  proposed_end timestamptz,
  reason text,
  requested_by uuid,
  requested_by_name text,
  mine boolean,
  kind text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.proposed_start, r.proposed_end, r.reason, r.requested_by,
         p.name, r.requested_by = auth.uid(), r.kind
    from public.reschedule_requests r
    join public.profiles p on p.id = r.requested_by
   where r.session_id = p_session
     and r.status = 'pending'
     and (r.expires_at is null or r.expires_at > now())
     and (
       public.owns_session(p_session)
       or public.has_seat_on(p_session)
       or public.is_admin()
     )
   order by r.created_at desc
   limit 1;
$$;

revoke execute on function public.pending_reschedule(uuid) from public, anon;
grant execute on function public.pending_reschedule(uuid) to authenticated;
