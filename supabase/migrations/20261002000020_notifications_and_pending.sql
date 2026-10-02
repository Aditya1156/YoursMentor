-- YoursMentor.in — a notifications page that can actually be acted on
--
-- The bell in the navbar counts unread notifications and links to
-- /notifications, which was still a placeholder. So a mentor who was asked to
-- move a session got a badge, clicked it, and landed on a stub — the request
-- was real and waiting, with nowhere to answer it.
--
-- Two things were missing: reading and marking notifications, and a way to find
-- the requests that need an answer. A notification is a historical record and
-- may be read, deleted or missed; what needs answering should be derived from
-- the requests themselves, so the page is right even if the notification was
-- never opened.

-- ---------------------------------------------------------------- marking --
/** Marks one of the caller's notifications read. */
create or replace function public.mark_notification_read(p_notification uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
     set read = true
   where id = p_notification and user_id = auth.uid();
$$;

/** Marks all of them read. */
create or replace function public.mark_all_notifications_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in.' using errcode = '28000';
  end if;
  update public.notifications set read = true
   where user_id = auth.uid() and not read;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.mark_notification_read(uuid) from public, anon;
revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ------------------------------------------------------- what needs an answer
/**
 * Reschedule requests waiting on the caller — the ones somebody else proposed,
 * on sessions the caller is either hosting or has a seat on.
 *
 * Derived from the requests rather than from notifications, so it is correct
 * however the person got here, and stops being listed the moment the request is
 * answered or withdrawn.
 */
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
  i_am_mentor boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, s.id, s.title, s.start_at, r.proposed_start, r.proposed_end,
         r.reason, p.name, s.mentor_id = auth.uid()
    from public.reschedule_requests r
    join public.sessions s on s.id = r.session_id
    join public.profiles p on p.id = r.requested_by
   where r.status = 'pending'
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

revoke execute on function public.my_pending_reschedules() from public, anon;
grant execute on function public.my_pending_reschedules() to authenticated;

/** The same, for things the caller proposed and is waiting on. */
create or replace function public.my_sent_reschedules()
returns table (
  request_id uuid,
  session_id uuid,
  session_title text,
  current_start timestamptz,
  proposed_start timestamptz,
  reason text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, s.id, s.title, s.start_at, r.proposed_start, r.reason
    from public.reschedule_requests r
    join public.sessions s on s.id = r.session_id
   where r.status = 'pending'
     and r.requested_by = auth.uid()
     and s.status = 'scheduled'
   order by r.created_at desc;
$$;

revoke execute on function public.my_sent_reschedules() from public, anon;
grant execute on function public.my_sent_reschedules() to authenticated;

-- The notifications policy already scopes selects to the owner; the read flag
-- moves through the functions above rather than a column grant, so a client
-- cannot mark someone else's notification read.
