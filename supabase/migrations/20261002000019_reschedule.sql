-- YoursMentor.in — rescheduling a 1:1, with both sides agreeing
--
-- A booked time stops suiting someone. Today the only way out is to cancel,
-- which costs the student their seat and the mentor the booking, and inside 24
-- hours it costs the student their money too. A student who needs the same help
-- a day earlier has no way to say so.
--
-- So either side may propose a new time, and the session only moves when the
-- other side accepts. Nobody's calendar is rewritten without their agreement,
-- which is the whole point: a reschedule is a negotiation between two named
-- people, not a booking.
--
-- 1:1 only. A group room has up to fifteen students and "both sides agree" has
-- no meaning there — moving it is the mentor's decision, and the students who
-- cannot make the new time need refunding, which is cancel_session().

create type reschedule_status as enum ('pending', 'accepted', 'declined', 'withdrawn');

create table public.reschedule_requests (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions (id) on delete cascade,
  requested_by   uuid not null references public.profiles (id) on delete cascade,
  proposed_start timestamptz not null,
  proposed_end   timestamptz not null,
  reason         text check (char_length(reason) <= 500),
  status         reschedule_status not null default 'pending',
  responded_by   uuid references public.profiles (id) on delete set null,
  responded_at   timestamptz,
  created_at     timestamptz not null default now(),

  constraint reschedule_time_ordered check (proposed_end > proposed_start)
);

-- One open proposal per session. Two people proposing different times at once
-- would leave nobody knowing which one they are agreeing to.
create unique index reschedule_one_pending_per_session
  on public.reschedule_requests (session_id)
  where status = 'pending';

create index reschedule_session_idx
  on public.reschedule_requests (session_id, created_at desc);

alter table public.reschedule_requests enable row level security;

-- Readable by the two people it concerns. Written only through the functions
-- below, so there is no insert or update policy at all.
create policy "participants read reschedule requests"
  on public.reschedule_requests for select
  using (
    public.owns_session(session_id)
    or public.has_seat_on(session_id)
    or public.is_admin()
  );

-- ============================================================ propose =======
/**
 * Proposes a new time for a 1:1. Either the mentor or the student may call it.
 *
 * Deliberately does NOT go through available_slots(). That function enforces a
 * 12-hour lead time and the mentor's published weekly windows, which are the
 * right rules for a stranger booking a public slot and the wrong ones here —
 * the student in the example needs help today, and the mentor is being asked
 * directly rather than having their calendar taken. What still has to hold is
 * that the time is real: in the future, and not on top of something else the
 * mentor has already agreed to.
 */
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

  -- Keep the agreed length; only the start is being negotiated.
  v_end := p_start_at + (v_session.end_at - v_session.start_at);

  if p_start_at < now() + interval '30 minutes' then
    raise exception 'Pick a time at least 30 minutes from now.' using errcode = 'P0001';
  end if;
  if p_start_at > now() + interval '60 days' then
    raise exception 'Pick a time within the next 60 days.' using errcode = 'P0001';
  end if;

  -- The mentor cannot be in two places at once. Their other sessions count;
  -- this one does not, since it is the thing being moved.
  if exists (
    select 1 from public.sessions s
     where s.mentor_id = v_session.mentor_id
       and s.id <> p_session
       and s.status in ('scheduled', 'live')
       and tstzrange(s.start_at, s.end_at) && tstzrange(p_start_at, v_end)
  ) then
    raise exception 'The mentor already has something booked then.' using errcode = 'P0001';
  end if;

  -- Replace your own open proposal rather than stacking another on top; the
  -- partial unique index would refuse the insert anyway.
  update public.reschedule_requests
     set status = 'withdrawn', responded_at = now()
   where session_id = p_session and status = 'pending';

  insert into public.reschedule_requests (
    session_id, requested_by, proposed_start, proposed_end, reason
  )
  values (p_session, v_caller, p_start_at, v_end, nullif(trim(p_reason), ''))
  returning id into v_request;

  -- Tell the other side. For a 1:1 there is exactly one of them.
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
      case when v_is_mentor then '/my-sessions' else '/mentor/sessions' end
    );
  end if;

  return v_request;
end;
$$;

revoke execute on function public.request_reschedule(uuid, timestamptz, text) from public, anon;
grant execute on function public.request_reschedule(uuid, timestamptz, text) to authenticated;

-- ============================================================ respond ======
/**
 * Accepts or declines an open proposal. Only the side that did not make it may
 * answer — otherwise "both agree" means nothing.
 *
 * Declining is the "continue as planned" case: the request closes and the
 * session keeps the time it already had.
 */
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

  -- The responder must be the counterpart: mentor if a student proposed it,
  -- the booked student if the mentor did.
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
            'Your session is still on as booked.', '/my-sessions');
    return 'declined';
  end if;

  -- Re-check the clash at the moment of acceptance, not just when it was
  -- proposed: the mentor may have taken another booking in between.
  if v_req.proposed_start <= now() then
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
          '/my-sessions');

  return 'accepted';
end;
$$;

revoke execute on function public.respond_to_reschedule(uuid, boolean) from public, anon;
grant execute on function public.respond_to_reschedule(uuid, boolean) to authenticated;

-- ============================================================ withdraw =====
/** Takes back your own proposal before the other side has answered. */
create or replace function public.withdraw_reschedule(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_req public.reschedule_requests%rowtype;
begin
  select * into v_req from public.reschedule_requests where id = p_request for update;
  if not found then
    raise exception 'That request no longer exists.' using errcode = 'P0002';
  end if;
  if v_req.requested_by <> auth.uid() then
    raise exception 'That is not your request.' using errcode = '42501';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'That request was already %.', v_req.status using errcode = 'P0001';
  end if;

  update public.reschedule_requests
     set status = 'withdrawn', responded_at = now()
   where id = p_request;
end;
$$;

revoke execute on function public.withdraw_reschedule(uuid) from public, anon;
grant execute on function public.withdraw_reschedule(uuid) to authenticated;

-- ============================================================ read =========
/**
 * The open proposal on a session, if any, with who made it — so each side can
 * be shown either "waiting for them" or "accept or keep the original".
 */
create or replace function public.pending_reschedule(p_session uuid)
returns table (
  id uuid,
  proposed_start timestamptz,
  proposed_end timestamptz,
  reason text,
  requested_by uuid,
  requested_by_name text,
  mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.proposed_start, r.proposed_end, r.reason, r.requested_by,
         p.name, r.requested_by = auth.uid()
    from public.reschedule_requests r
    join public.profiles p on p.id = r.requested_by
   where r.session_id = p_session
     and r.status = 'pending'
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

grant select on public.reschedule_requests to authenticated;
