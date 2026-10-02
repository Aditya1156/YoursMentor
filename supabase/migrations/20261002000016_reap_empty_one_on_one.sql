-- YoursMentor.in — give a mentor their time back
--
-- Found by walking the 1:1 flow end to end. A 1:1 session exists only because
-- somebody booked it, so when that one seat goes away the session is an empty
-- room — but it stays 'scheduled', and available_slots() excludes any time
-- covered by a scheduled session. The slot was therefore blocked forever.
--
-- The abandoned-checkout case is worse than the cancellation case: a student
-- who taps "Book", reaches the payment page and wanders off has their hold
-- expire on its own, and nobody is left to notice that the mentor just lost
-- that half hour for good. A mentor with a popular profile could quietly lose
-- most of their week to people who never paid.
--
-- A trigger rather than an edit to cancel_booking(), because the seat is
-- released from three places already (student cancels, hold expires, admin
-- refunds) and any future fourth would have to remember this too.

create or replace function public.reap_empty_one_on_one()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'one_on_one'
     and new.status = 'scheduled'
     and new.seats_booked = 0
     and old.seats_booked > 0
  then
    -- Before, not after, so there is no second UPDATE to recurse into.
    new.status := 'cancelled';

    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.mentor_id,
      'session_cancelled',
      'A 1:1 booking was cancelled',
      'Your ' || to_char(new.start_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM')
        || ' slot is open again.',
      '/mentor/sessions'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists reap_empty_one_on_one on public.sessions;
create trigger reap_empty_one_on_one
  before update of seats_booked on public.sessions
  for each row
  execute function public.reap_empty_one_on_one();

comment on function public.reap_empty_one_on_one is
  'A 1:1 with nobody in it is cancelled, so available_slots() stops treating the
   mentor''s time as taken. Group rooms are left alone: an empty group session is
   a real session waiting for students, and auto_cancel_under_minimum() decides
   its fate on its own schedule.';
