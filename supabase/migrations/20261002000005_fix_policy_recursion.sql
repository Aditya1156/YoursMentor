-- YoursMentor.in — break the RLS recursion between sessions and bookings
--
-- The previous policies referenced each other:
--
--   sessions."students see sessions they booked"  reads bookings
--   bookings."mentors read bookings on their sessions"  reads sessions
--
-- Evaluating either one re-entered the other, and Postgres stopped it with
-- "infinite recursion detected in policy for relation sessions" — a 500 on
-- every read of the table, including for anonymous visitors.
--
-- The fix is to go through `security definer` helpers. A definer function runs
-- with the owner's rights, so the query inside it does not re-trigger RLS, and
-- the cycle is cut. Each helper is still scoped to auth.uid(), so it answers
-- only about the caller and cannot be used to read someone else's rows.

create or replace function public.owns_session(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions
    where id = p_session and mentor_id = auth.uid()
  );
$$;

create or replace function public.has_seat_on(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings
    where session_id = p_session and student_id = auth.uid()
  );
$$;

/** A confirmed seat, which is what the session chat requires. */
create or replace function public.has_confirmed_seat_on(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings
    where session_id = p_session
      and student_id = auth.uid()
      and status in ('confirmed', 'attended')
  );
$$;

revoke execute on function public.owns_session(uuid) from public;
revoke execute on function public.has_seat_on(uuid) from public;
revoke execute on function public.has_confirmed_seat_on(uuid) from public;
grant execute on function public.owns_session(uuid) to authenticated, anon;
grant execute on function public.has_seat_on(uuid) to authenticated, anon;
grant execute on function public.has_confirmed_seat_on(uuid) to authenticated, anon;

-- ---- sessions: stop reading bookings directly ------------------------------
drop policy if exists "students see sessions they booked" on public.sessions;
create policy "students see sessions they booked"
  on public.sessions for select
  using (public.has_seat_on(id));

-- ---- bookings: stop reading sessions directly ------------------------------
drop policy if exists "mentors read bookings on their sessions" on public.bookings;
create policy "mentors read bookings on their sessions"
  on public.bookings for select
  using (public.owns_session(session_id));

-- ---- chat: same cycle, through both tables ---------------------------------
drop policy if exists "session participants read the chat" on public.chat_messages;
create policy "session participants read the chat"
  on public.chat_messages for select
  using (
    public.owns_session(session_id)
    or public.has_confirmed_seat_on(session_id)
  );

drop policy if exists "session participants post to the chat" on public.chat_messages;
create policy "session participants post to the chat"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and (
      public.owns_session(session_id)
      or public.has_confirmed_seat_on(session_id)
    )
  );
