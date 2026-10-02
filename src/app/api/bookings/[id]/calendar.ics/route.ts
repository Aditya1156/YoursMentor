import { createClient } from '@/lib/supabase/server'

/** Spec §2 defers the Google Calendar API to V2, so booking emails and the
 *  confirmation page hand out an .ics file instead. No API approval needed. */
const fold = (line: string) =>
  line.match(/.{1,73}/g)?.join('\r\n ') ?? line

const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

const stamp = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // RLS keeps this to the caller's own bookings.
  const { data } = await supabase
    .from('bookings')
    .select('id, status, sessions!inner(title, description, start_at, end_at, id)')
    .eq('id', id)
    .maybeSingle()

  if (!data) return new Response('Not found', { status: 404 })

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const s = (data as any).sessions
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yoursmentor.in'
  const cancelled = ['cancelled_by_student', 'cancelled_by_mentor', 'cancelled_auto']
    .includes(data.status)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YoursMentor.in//Sessions//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${cancelled ? 'CANCEL' : 'PUBLISH'}`,
    'BEGIN:VEVENT',
    `UID:${data.id}@yoursmentor.in`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(s.start_at)}`,
    `DTEND:${stamp(s.end_at)}`,
    fold(`SUMMARY:${esc(s.title)}`),
    fold(`DESCRIPTION:${esc(s.description ?? 'Your YoursMentor.in session.')}\\n\\nJoin from ${site}/my-sessions`),
    fold(`URL:${site}/sessions/${s.id}`),
    'LOCATION:Online — yoursmentor.in',
    `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your session starts in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="yoursmentor-session.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
