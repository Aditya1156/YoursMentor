-- YoursMentor.in — row-level security for the booking engine
--
-- Shape of the rules: reads are generous where the data is public (scheduled
-- sessions, reviews on approved mentors), tight everywhere else. Writes that
-- move a seat, money or a mentor's standing go through the SECURITY DEFINER
-- functions in the previous migration, so those tables grant no direct INSERT
-- or UPDATE to `authenticated` at all.

alter table public.availability_rules enable row level security;
alter table public.blocked_dates      enable row level security;
alter table public.sessions           enable row level security;
alter table public.bookings           enable row level security;
alter table public.payments           enable row level security;
alter table public.credit_ledger      enable row level security;
alter table public.reviews            enable row level security;
alter table public.reports            enable row level security;
alter table public.payouts            enable row level security;
alter table public.notifications      enable row level security;
alter table public.chat_messages      enable row level security;

-- ------------------------------------------------------- availability ------
create policy "availability of approved mentors is public"
  on public.availability_rules for select
  using (exists (
    select 1 from public.mentor_profiles m
    where m.user_id = availability_rules.mentor_id and m.status = 'approved'
  ));

create policy "mentors manage their own availability"
  on public.availability_rules for all
  using (auth.uid() = mentor_id) with check (auth.uid() = mentor_id);

create policy "mentors manage their own blocked dates"
  on public.blocked_dates for all
  using (auth.uid() = mentor_id) with check (auth.uid() = mentor_id);

create policy "blocked dates are readable for slot generation"
  on public.blocked_dates for select
  using (exists (
    select 1 from public.mentor_profiles m
    where m.user_id = blocked_dates.mentor_id and m.status = 'approved'
  ));

-- ------------------------------------------------------------ sessions -----
create policy "scheduled sessions of approved mentors are public"
  on public.sessions for select
  using (
    status in ('scheduled', 'live', 'completed')
    and exists (
      select 1 from public.mentor_profiles m
      where m.user_id = sessions.mentor_id and m.status = 'approved'
    )
  );

create policy "mentors see all their own sessions"
  on public.sessions for select using (auth.uid() = mentor_id);

create policy "students see sessions they booked"
  on public.sessions for select
  using (exists (
    select 1 from public.bookings b
    where b.session_id = sessions.id and b.student_id = auth.uid()
  ));

create policy "admins see every session"
  on public.sessions for select using (public.is_admin());

-- A mentor creates and edits their own sessions directly; seat counts and
-- status are not theirs to set, so those columns are revoked below.
create policy "approved mentors create their own sessions"
  on public.sessions for insert
  with check (
    auth.uid() = mentor_id
    and exists (
      select 1 from public.mentor_profiles m
      where m.user_id = auth.uid() and m.status = 'approved'
    )
  );

create policy "mentors edit their own scheduled sessions"
  on public.sessions for update
  using (auth.uid() = mentor_id and status = 'scheduled')
  with check (auth.uid() = mentor_id);

create policy "admins manage sessions"
  on public.sessions for update using (public.is_admin());

-- Seat counts move only through hold_seat/cancel_booking; status only through
-- cancel_session and the cron functions. Both run as definer and bypass this.
revoke update (seats_booked, status, livekit_room) on public.sessions from authenticated;

-- ------------------------------------------------------------ bookings -----
create policy "students read their own bookings"
  on public.bookings for select using (auth.uid() = student_id);

create policy "mentors read bookings on their sessions"
  on public.bookings for select
  using (exists (
    select 1 from public.sessions s
    where s.id = bookings.session_id and s.mentor_id = auth.uid()
  ));

create policy "admins read every booking"
  on public.bookings for select using (public.is_admin());

-- No INSERT or UPDATE policy on purpose. hold_seat(), confirm_booking() and
-- cancel_booking() are the only ways a booking row changes.

-- ------------------------------------------------------------ payments -----
create policy "students read their own payments"
  on public.payments for select using (auth.uid() = student_id);
create policy "admins read every payment"
  on public.payments for select using (public.is_admin());
-- Written only by the Razorpay webhook, with the service-role client.

-- ------------------------------------------------------- credit ledger -----
create policy "users read their own credit ledger"
  on public.credit_ledger for select using (auth.uid() = user_id);
create policy "admins read every ledger entry"
  on public.credit_ledger for select using (public.is_admin());
-- Append-only, and only from the booking functions.

-- ------------------------------------------------------------- reviews -----
create policy "reviews of approved mentors are public"
  on public.reviews for select
  using (exists (
    select 1 from public.mentor_profiles m
    where m.user_id = reviews.mentor_id and m.status = 'approved'
  ));

create policy "students read their own reviews"
  on public.reviews for select using (auth.uid() = student_id);

create policy "students edit their own review"
  on public.reviews for update
  using (auth.uid() = student_id) with check (auth.uid() = student_id);

create policy "admins manage reviews"
  on public.reviews for all using (public.is_admin());
-- Inserted through leave_review(), which checks attendance.

-- ------------------------------------------------------------- reports -----
create policy "users file their own reports"
  on public.reports for insert with check (auth.uid() = reporter_id);
create policy "users read their own reports"
  on public.reports for select using (auth.uid() = reporter_id);
create policy "admins manage reports"
  on public.reports for all using (public.is_admin());

-- ------------------------------------------------------------- payouts -----
create policy "mentors read their own payouts"
  on public.payouts for select using (auth.uid() = mentor_id);
create policy "admins manage payouts"
  on public.payouts for all using (public.is_admin());

-- -------------------------------------------------------- notifications ----
create policy "users read their own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "users mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------- session chat -----
-- Chat is visible only to the mentor and the students who actually hold a
-- confirmed seat. Spec §2: contact stays on the platform.
create policy "session participants read the chat"
  on public.chat_messages for select
  using (
    exists (select 1 from public.sessions s
             where s.id = chat_messages.session_id and s.mentor_id = auth.uid())
    or exists (select 1 from public.bookings b
                where b.session_id = chat_messages.session_id
                  and b.student_id = auth.uid()
                  and b.status in ('confirmed', 'attended'))
  );

create policy "session participants post to the chat"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and (
      exists (select 1 from public.sessions s
               where s.id = chat_messages.session_id and s.mentor_id = auth.uid())
      or exists (select 1 from public.bookings b
                  where b.session_id = chat_messages.session_id
                    and b.student_id = auth.uid()
                    and b.status in ('confirmed', 'attended'))
    )
  );

create policy "admins read chat for reports"
  on public.chat_messages for select using (public.is_admin());

-- ====================================================== contact masking =====
/**
 * Spec §2: phone numbers and emails typed into chat are masked. Done as a
 * trigger rather than in the client, because the client is the thing we are
 * guarding against.
 */
create or replace function public.mask_contact_details()
returns trigger language plpgsql as $$
begin
  new.text := regexp_replace(new.text,
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[contact hidden]', 'g');
  -- 10-digit Indian mobiles, with or without +91 and common separators.
  new.text := regexp_replace(new.text,
    '(\+?91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}', '[contact hidden]', 'g');
  -- Any run of 10+ digits, which catches the obvious workarounds.
  new.text := regexp_replace(new.text, '\d[\d\s-]{9,}\d', '[contact hidden]', 'g');
  -- Social handles.
  new.text := regexp_replace(new.text,
    '(?:instagram\.com|t\.me|wa\.me|linkedin\.com/in)/\S+', '[contact hidden]', 'gi');
  return new;
end;
$$;

create trigger chat_messages_mask
  before insert or update on public.chat_messages
  for each row execute function public.mask_contact_details();

-- ====================================================== helper views =======
/** What the mentor directory reads. Keeps the join out of every query. */
create or replace view public.mentor_directory
with (security_invoker = true) as
select
  m.user_id              as id,
  p.name,
  p.avatar_url,
  m.headline,
  m.company,
  m.college_line,
  m.college_tier,
  m.home_state,
  m.languages,
  m.first_gen_graduate,
  m.tracks,
  m.topics,
  m.breakthrough_story,
  m.price_1on1,
  m.session_1on1_minutes,
  m.trial_offer,
  m.rating_avg,
  m.rating_count,
  m.sessions_completed,
  m.country
from public.mentor_profiles m
join public.profiles p on p.id = m.user_id
where m.status = 'approved' and p.status = 'active';

grant select on public.mentor_directory to anon, authenticated;
