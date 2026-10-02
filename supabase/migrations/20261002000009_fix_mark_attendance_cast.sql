-- YoursMentor.in — fix the enum cast in mark_attendance
--
-- The CASE produced `text`, and Postgres will not assign text to a
-- booking_status column:
--
--   column "status" is of type booking_status but expression is of type text
--
-- So marking attendance failed with a 400 every time. The function compiled
-- fine and only fell over when the branch actually ran — which is why it took
-- an end-to-end run against a real session to surface.

create or replace function public.mark_attendance(p_booking uuid, p_attended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  s public.sessions%rowtype;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;

  select * into s from public.sessions where id = b.session_id;
  if s.mentor_id <> auth.uid() and not public.is_admin() then
    raise exception 'That is not your session.' using errcode = '42501';
  end if;
  if s.start_at > now() then
    raise exception 'The session has not started yet.' using errcode = 'P0001';
  end if;
  if b.status not in ('confirmed', 'attended', 'no_show_student') then
    raise exception 'That booking cannot be marked.' using errcode = 'P0001';
  end if;

  update public.bookings
     set status = (case
                     when p_attended then 'attended'
                     else 'no_show_student'
                   end)::booking_status
   where id = p_booking;
end;
$$;
