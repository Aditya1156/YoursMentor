import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, List } from '@/components/legal/legal-page'
import { LEGAL, RULES } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Cancellation and refund policy',
  description:
    'When a YoursMentor.in booking is refunded, how refunds are issued, and what happens when a mentor cancels.',
}
// No per-person content: prerendered and cached rather than built per visitor.
export const revalidate = 3600

export default function Page() {
  return (
    <LegalPage
      title="Cancellation and refunds"
      intro="What happens to your money when a session does not. Every rule below is enforced automatically the moment you cancel — none of it depends on someone reading an email first."
    >
      <Section heading="The short version">
        <List
          items={[
            <>
              Cancel <strong>more than {RULES.studentRefundHours} hours</strong> before the
              session and you get the full amount back as YoursMentor credit, immediately.
            </>,
            <>
              Cancel <strong>within {RULES.studentRefundHours} hours</strong> and the money
              is not returned. The mentor has already set that time aside for you.
            </>,
            <>
              If the <strong>mentor cancels</strong>, or too few students join a group
              session, you get the full amount back whatever the notice.
            </>,
            <>Credit does not expire and can be spent on any session on the platform.</>,
          ]}
        />
      </Section>

      <Section heading="How a refund reaches you">
        <p>
          Refunds are issued as <strong>YoursMentor credit</strong> rather than reversed to
          your card or UPI. Credit appears in your account the instant you cancel and is
          applied automatically to your next booking. Your balance is on your{' '}
          <Link href="/dashboard">dashboard</Link>.
        </p>
        <p>
          We do it this way because it is immediate. A card reversal takes five to seven
          working days and carries a gateway fee on every cancellation, which on a ₹99
          session would have to come out of the price.
        </p>
        <p>
          <strong>
            If you would rather have the money back in your bank, email{' '}
            <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> from the
            address on your account.
          </strong>{' '}
          We will reverse it to your original payment method within 7 working days, and we
          will not ask you to justify it.
        </p>
      </Section>

      <Section heading="When you cancel">
        <p>
          Cancel any confirmed booking from <Link href="/my-sessions">My sessions</Link>.
          The outcome depends only on how far ahead the session is:
        </p>
        <List
          items={[
            <>
              <strong>{RULES.studentRefundHours} hours or more before the start</strong> —
              full amount returned as credit, and the seat goes back to the room for
              somebody else.
            </>,
            <>
              <strong>Less than {RULES.studentRefundHours} hours before the start</strong> —
              no refund. By then the mentor has blocked out the time and usually cannot
              fill it.
            </>,
            <>
              <strong>After the session has started</strong> — no refund. If the mentor did
              not turn up, the next section applies instead.
            </>,
          ]}
        />
        <p>
          If what you actually need is a different time, ask to <strong>reschedule</strong>{' '}
          rather than cancelling. You keep the booking, and the mentor either accepts the
          new time or keeps the original. Rescheduling is free.
        </p>
      </Section>

      <Section heading="When the mentor cancels, or does not turn up">
        <p>
          You get the <strong>full amount back as credit</strong>, automatically, with no
          notice requirement and nothing to claim. This is not at our discretion.
        </p>
        <p>
          A mentor who cancels less than {RULES.mentorStrikeHours} hours before a session
          takes a strike. After {RULES.strikesToSuspension} strikes their profile is
          suspended and they no longer appear in the directory.
        </p>
        <p>
          If a mentor joined and left almost immediately, or the session was nothing like
          its description, use the <Link href="/report">report form</Link> or email{' '}
          <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. An admin reads
          every report. Where we agree a session was not delivered we refund in full, and
          on a judgement call we would rather be wrong in the student&rsquo;s favour.
        </p>
      </Section>

      <Section heading="Group sessions that do not fill">
        <p>
          A ₹99 group session needs {RULES.groupMinimumSeats} students to run. If it has
          not reached that shortly before the start it is cancelled automatically and
          everyone who paid is credited in full. You will be notified; there is nothing for
          you to do.
        </p>
      </Section>

      <Section heading="Failed and duplicate payments">
        <p>
          Payments are processed by Razorpay. If money left your account but the booking did
          not confirm, it usually settles within a few minutes — a seat is held for{' '}
          {RULES.holdMinutes} minutes while payment completes. If it does not settle, email{' '}
          <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> with the time
          and amount and we will trace it with Razorpay and return it.
        </p>
        <p>
          Duplicate charges go back to the original payment method, not to credit. You
          should never have to ask twice for the same thing.
        </p>
      </Section>

      <Section heading="What is not refundable">
        <List
          items={[
            <>
              A session you attended and did not find useful. Rate it honestly instead —
              ratings are what warn the next student.
            </>,
            <>A session you missed without cancelling.</>,
            <>Credit already spent on a session that went ahead.</>,
          ]}
        />
      </Section>

      <Section heading="Asking us">
        <p>
          Email <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> from the
          address on your account and we will reply within 3 working days. If the answer
          does not satisfy you, escalate to{' '}
          <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a>, which
          reaches our grievance officer. See <Link href="/contact">Contact</Link>.
        </p>
      </Section>
    </LegalPage>
  )
}
