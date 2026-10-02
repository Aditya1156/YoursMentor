import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, ShieldAlert, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { LegalPage, Section, List } from '@/components/legal/legal-page'
import { LEGAL, RULES, legalDetailsComplete } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Contact and grievance officer',
  description:
    'How to reach YoursMentor.in, and the grievance officer appointed under the DPDP Act and the IT Rules.',
}
// No per-person content: prerendered and cached rather than built per visitor.
export const revalidate = 3600

export default function Page() {
  return (
    <LegalPage
      title="Contact us"
      intro="A real person reads these. If something went wrong with a booking or a session, this is the fastest way to get it put right."
    >
      <Section heading="General and support">
        <Card className="flex items-start gap-3 p-4">
          <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <a
              href={`mailto:${LEGAL.supportEmail}`}
              className="text-sm font-bold text-primary hover:underline"
            >
              {LEGAL.supportEmail}
            </a>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Bookings, refunds, payments, anything that is not working. We reply within
              3 working days, usually the same day. Write from the address on your account
              so we can find you.
            </p>
          </div>
        </Card>
      </Section>

      <Section heading="Grievance officer">
        <p>
          Appointed under the Digital Personal Data Protection Act, 2023 and the
          Information Technology (Intermediary Guidelines) Rules, 2021. Write here about
          your personal data, a decision you disagree with, or anything support did not
          resolve.
        </p>
        <Card className="flex items-start gap-3 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <div>
            <a
              href={`mailto:${LEGAL.grievanceEmail}`}
              className="text-sm font-bold text-primary hover:underline"
            >
              {LEGAL.grievanceEmail}
            </a>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {legalDetailsComplete ? (
                <>
                  Grievance officer: <strong>{LEGAL.grievanceOfficer}</strong>.{' '}
                </>
              ) : (
                <>
                  The name of our grievance officer will be published here before we begin
                  taking payments.{' '}
                </>
              )}
              Acknowledged within 48 hours and resolved within 30 days, as the Act requires.
            </p>
          </div>
        </Card>
        <p>
          If we do not resolve it to your satisfaction you may complain to the{' '}
          <strong>Data Protection Board of India</strong>.
        </p>
      </Section>

      <Section heading="Something urgent during a session">
        <p>
          Use the <strong>Report</strong> button inside the session — it works while the call
          is running — or the <Link href="/report">report form</Link> afterwards. The person
          you report is never told who reported them.
        </p>
        <p>
          <strong>If you are in immediate danger, call 112.</strong> We can suspend an
          account; we cannot respond to an emergency.
        </p>
      </Section>

      <Section heading="Before you write to us">
        <p>Some things are faster to do yourself:</p>
        <List
          items={[
            <>
              <strong>Cancel a booking</strong> — <Link href="/my-sessions">My sessions</Link>.
              More than {RULES.studentRefundHours} hours ahead and the credit is returned
              instantly.
            </>,
            <>
              <strong>Change the time</strong> — ask to reschedule from the same page. The
              mentor accepts the new time or keeps the old one.
            </>,
            <>
              <strong>Download your data, or delete your account</strong> —{' '}
              <Link href="/settings">Settings</Link>.
            </>,
          ]}
        />
      </Section>

      <Section heading="Who we are">
        {legalDetailsComplete ? (
          <>
            <p>
              <strong>{LEGAL.entity}</strong>
              <br />
              {LEGAL.address}
              {LEGAL.gstin && (
                <>
                  <br />
                  GSTIN: {LEGAL.gstin}
                </>
              )}
            </p>
          </>
        ) : (
          <Card className="flex items-start gap-3 p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-subtle-foreground" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">
              We are not yet accepting payments. Our registered entity name and address will
              be published here before we do, and will match the account our payment
              provider holds. Until then, {LEGAL.supportEmail} reaches us.
            </p>
          </Card>
        )}
        <p>
          YoursMentor.in was started by Aditya, who makes{' '}
          <a href="https://youtube.com/@refactorslife" rel="noopener noreferrer">
            @refactorslife
          </a>{' '}
          on YouTube.
        </p>
      </Section>
    </LegalPage>
  )
}
