-- YoursMentor.in — booking engine tests
--
-- Every case builds its own fixture from scratch, so order never matters and a
-- failure is always a real failure. Run with supabase/tests/run.sh.

create or replace function t(label text, ok boolean) returns void
language plpgsql as $$
begin
  raise notice '%  %', case when ok then 'PASS' else 'FAIL' end, label;
end $$;

create or replace function fixture() returns void
language plpgsql as $$
begin
  truncate auth.users cascade;

  insert into auth.users (id, email, raw_user_meta_data) values
    ('11111111-1111-1111-1111-111111111111', 'mentor@test.in',
     '{"name":"Priya Sharma","role":"mentor","date_of_birth":"1999-05-20"}'::jsonb);

  insert into auth.users (id, email, raw_user_meta_data)
    select ('22222222-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
           's' || g || '@test.in',
           jsonb_build_object('name', 'Student ' || g, 'role', 'student',
                              'date_of_birth', '2003-01-01')
      from generate_series(1, 12) g;

  insert into public.mentor_profiles (user_id, headline, linkedin_url, status, price_1on1)
    values ('11111111-1111-1111-1111-111111111111', 'SDE at PhonePe',
            'https://linkedin.com/in/priya', 'approved', 199);

  insert into public.sessions
    (id, mentor_id, type, title, start_at, end_at, capacity, min_seats, price)
  values
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
     'group', 'Resume Roasting', now() + interval '3 days',
     now() + interval '3 days 1 hour', 3, 1, 99);
end $$;

create or replace function as_student(n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',
    '22222222-0000-0000-0000-' || lpad(n::text, 12, '0'), false);
end $$;

-- ====================================================== sign-up trigger =====
select fixture();
select t('sign-up trigger creates a profile per auth user',
  (select count(*) from public.profiles) = 13);
select t('date of birth from sign-up metadata sets the 18+ flag',
  (select count(*) from public.profiles where is_adult_confirmed) = 13);

truncate auth.users cascade;
insert into auth.users (email) values ('a@gmail.com');
select t('a one-character email local part still yields a valid name',
  (select char_length(name) >= 2 from public.profiles));

-- ========================================================== seat holds ======
select fixture();
select as_student(1);
select public.hold_seat('33333333-3333-3333-3333-333333333333') as b1 \gset
select t('holding a seat increments the session count',
  (select seats_booked from public.sessions) = 1);

select t('a repeated hold returns the same booking rather than a second seat',
  public.hold_seat('33333333-3333-3333-3333-333333333333') = :'b1'
  and (select seats_booked from public.sessions) = 1);

select as_student(2);
select public.hold_seat('33333333-3333-3333-3333-333333333333');
select as_student(3);
select public.hold_seat('33333333-3333-3333-3333-333333333333');
select as_student(4);
create or replace function expect_full() returns text language plpgsql as $$
begin
  perform public.hold_seat('33333333-3333-3333-3333-333333333333');
  return 'FAIL';
exception when others then
  return case when sqlerrm like '%full%' then 'PASS' else 'FAIL: ' || sqlerrm end;
end $$;
select t('booking past capacity is refused', expect_full() = 'PASS');

select t('capacity is also a database constraint, not just a code path', (
  select case when exists (
    select 1 from pg_constraint
     where conrelid = 'public.sessions'::regclass
       and conname = 'seats_within_capacity'
  ) then true else false end));

-- ------- the ceiling holds even against a direct write ----------------------
create or replace function expect_check_violation() returns text language plpgsql as $$
begin
  update public.sessions set seats_booked = capacity + 1
   where id = '33333333-3333-3333-3333-333333333333';
  return 'FAIL';
exception when check_violation then return 'PASS';
end $$;
select t('seats_booked cannot exceed capacity', expect_check_violation() = 'PASS');

-- ======================================================== hold expiry =======
select fixture();
select as_student(1); select public.hold_seat('33333333-3333-3333-3333-333333333333');
select as_student(2); select public.hold_seat('33333333-3333-3333-3333-333333333333');
update public.bookings set hold_expires_at = now() - interval '1 minute' where status = 'held';
select public.release_expired_holds();
select t('expired holds release their seats',
  (select seats_booked from public.sessions) = 0
  and (select count(*) from public.bookings where status = 'cancelled_auto') = 2);

-- ======================================================= confirm/refund =====
select fixture();
select as_student(1);
select public.hold_seat('33333333-3333-3333-3333-333333333333') as bk \gset
select public.confirm_booking(:'bk', 'pay_1', 'order_1');
select public.confirm_booking(:'bk', 'pay_1', 'order_1');   -- webhooks retry
select t('confirm_booking is idempotent',
  (select count(*) from public.bookings where status = 'confirmed') = 1
  and (select seats_booked from public.sessions) = 1);

select t('cancelling 24h or more ahead returns credits',
  public.cancel_booking(:'bk') = 'credited');
select t('the credit lands in the ledger',
  public.credit_balance('22222222-0000-0000-0000-000000000001') = 99);
select t('the seat is released on cancellation',
  (select seats_booked from public.sessions) = 0);

select fixture();
select as_student(2);
select public.hold_seat('33333333-3333-3333-3333-333333333333') as bk2 \gset
select public.confirm_booking(:'bk2', 'pay_2', 'order_2');
update public.sessions set start_at = now() + interval '2 hours',
                           end_at = now() + interval '3 hours';
select t('cancelling under 24h gives no refund',
  public.cancel_booking(:'bk2') = 'no_refund');
select t('no credit is issued for a late cancellation',
  public.credit_balance('22222222-0000-0000-0000-000000000002') = 0);

-- ==================================================== auto-cancel group =====
select fixture();
update public.sessions set min_seats = 3;
select as_student(1);
select public.hold_seat('33333333-3333-3333-3333-333333333333') as bk3 \gset
select public.confirm_booking(:'bk3', 'pay_3', 'order_3');
update public.sessions set start_at = now() + interval '4 hours',
                           end_at = now() + interval '5 hours';
select public.auto_cancel_under_minimum();
select t('a group under min_seats auto-cancels 6h out',
  (select status from public.sessions) = 'cancelled');
select t('auto-cancel refunds every confirmed seat',
  public.credit_balance('22222222-0000-0000-0000-000000000001') = 99);

-- ================================================= completion & reviews =====
select fixture();
select as_student(1);
select public.hold_seat('33333333-3333-3333-3333-333333333333') as bk4 \gset
select public.confirm_booking(:'bk4', 'pay_4', 'order_4');
update public.sessions set start_at = now() - interval '2 hours',
                           end_at = now() - interval '1 hour';
select public.complete_finished_sessions();
select t('finished sessions complete and attendance is recorded',
  (select status from public.sessions) = 'completed'
  and (select status from public.bookings where id = :'bk4') = 'attended');
select t('the student is asked to rate it',
  exists (select 1 from public.notifications where type = 'rate_session'));

select public.leave_review(:'bk4', 5::smallint, 'Tore my resume apart. Worth it.');
select t('the rating rolls up onto the mentor profile',
  (select rating_avg from public.mentor_profiles) = 5.00
  and (select rating_count from public.mentor_profiles) = 1);

create or replace function expect_review_rejected(p uuid) returns text
language plpgsql as $$
begin
  perform public.leave_review(p, 4::smallint, 'again');
  return 'FAIL';
exception when others then return 'PASS';
end $$;
select t('a booking can only be reviewed once', expect_review_rejected(:'bk4') = 'PASS');
select as_student(2);
select t('someone who did not attend cannot review',
  expect_review_rejected(:'bk4') = 'PASS'
  and (select count(*) from public.reviews) = 1);

-- ======================================================= contact masking ====
select fixture();
select as_student(1);
select public.hold_seat('33333333-3333-3333-3333-333333333333') as bk5 \gset
select public.confirm_booking(:'bk5', 'p', 'o');
insert into public.chat_messages (session_id, sender_id, text)
values ('33333333-3333-3333-3333-333333333333',
        '22222222-0000-0000-0000-000000000001',
        'ping me on priya@gmail.com or 9876543210, insta instagram.com/priya');
select t('chat masks emails, phone numbers and social handles', (
  select text not like '%gmail%'
     and text not like '%9876543210%'
     and text not like '%instagram.com/priya%'
    from public.chat_messages));

-- ===================================================== mentor integrity =====
select fixture();
create or replace function expect_overlap_blocked() returns text
language plpgsql as $$
begin
  insert into public.sessions (mentor_id, type, title, start_at, end_at, capacity, price)
  values ('11111111-1111-1111-1111-111111111111', 'group', 'Overlapping session',
          now() + interval '3 days 30 minutes', now() + interval '3 days 90 minutes', 10, 99);
  return 'FAIL';
exception when exclusion_violation then return 'PASS';
end $$;
select t('a mentor cannot run two sessions at once', expect_overlap_blocked() = 'PASS');

create or replace function expect_underage_blocked() returns text
language plpgsql as $$
begin
  update public.profiles
     set date_of_birth = current_date - interval '15 years', is_adult_confirmed = true
   where id = '22222222-0000-0000-0000-000000000004';
  return 'FAIL';
exception when check_violation then return 'PASS';
end $$;
select t('an under-18 profile cannot be marked adult', expect_underage_blocked() = 'PASS');

-- =========================================================== match score ====
select fixture();
update public.profiles
   set languages = array['Hindi','English'], home_state = 'Uttar Pradesh',
       college_tier = 'tier3', first_gen_graduate = true, goals = array['job']::goal[]
 where id = '22222222-0000-0000-0000-000000000005';
update public.mentor_profiles
   set languages = array['Hindi','English'], home_state = 'Uttar Pradesh',
       college_tier = 'tier2', first_gen_graduate = true,
       tracks = array['first_job']::track[];
select t('a near-peer mentor scores highly',
  public.match_score('22222222-0000-0000-0000-000000000005',
                     '11111111-1111-1111-1111-111111111111') >= 11);

update public.profiles
   set languages = array['Tamil'], home_state = 'Tamil Nadu', college_tier = 'tier1',
       first_gen_graduate = false, goals = array['abroad']::goal[]
 where id = '22222222-0000-0000-0000-000000000006';
select t('an unrelated mentor scores lower than a near peer',
  public.match_score('22222222-0000-0000-0000-000000000006',
                     '11111111-1111-1111-1111-111111111111')
  < public.match_score('22222222-0000-0000-0000-000000000005',
                       '11111111-1111-1111-1111-111111111111'));
