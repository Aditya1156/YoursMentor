import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, List } from '@/components/legal/legal-page'
import { LEGAL, RULES } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What YoursMentor.in collects, why, who else sees it, and how to take a copy or have it deleted.',
}
// No per-person content: prerendered and cached rather than built per visitor.
export const revalidate = 3600

export default function Page() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="What we hold about you, why we hold it, and how to get a copy or have it deleted. Written to be read rather than to cover us."
    >
      <Section heading="Who this is about">
        <p>
          YoursMentor.in connects students with near-peer mentors. This policy covers both
          sides — students booking sessions and mentors running them — and is written to
          meet the Digital Personal Data Protection Act, 2023.
        </p>
        <p>
          <strong>You must be {RULES.minimumAge} or older to use YoursMentor.in.</strong>{' '}
          We confirm your date of birth at sign-up. We do not yet have a verifiable
          parental-consent process, so until we do we cannot accept accounts from
          under-{RULES.minimumAge}s at all. If you believe a minor has created an account,
          tell us at <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a>{' '}
          and we will remove it.
        </p>
      </Section>

      <Section heading="What we collect, and why">
        <p>Everything here is either given by you or produced by using the product.</p>
        <List
          items={[
            <>
              <strong>To create your account</strong> — name, email address, date of birth.
              The date of birth is used once, to confirm you are {RULES.minimumAge}+, and
              then kept so we can show we checked.
            </>,
            <>
              <strong>To match you with mentors</strong> — college, course, graduating year,
              home state, languages, whether you are the first in your family to go to
              university, and what you are working towards. All optional. Leaving them blank
              means worse matches, not a worse account.
            </>,
            <>
              <strong>To run bookings and payments</strong> — which sessions you booked,
              what you paid, your credit balance, and the Razorpay payment reference.
            </>,
            <>
              <strong>To run the sessions themselves</strong> — attendance, any notes a
              mentor writes, and the reviews you leave.
            </>,
            <>
              <strong>If you are a mentor</strong> — your headline, employer, college,
              pricing, availability, LinkedIn URL, and the identity document you upload for
              verification.
            </>,
            <>
              <strong>A profile photo</strong>, if you upload one. Nothing breaks if you do
              not.
            </>,
          ]}
        />
        <p>
          <strong>We never see your card or UPI details.</strong> Payment is handled
          entirely by Razorpay; we receive a reference and an amount, nothing more.
        </p>
      </Section>

      <Section heading="What other people can see">
        <p>
          <strong>Mentors are public.</strong> If you are a mentor, your name, photo,
          headline, employer, college, languages, topics, price, rating and reviews appear
          in the directory to anyone, signed in or not. That is the point of the listing.
        </p>
        <p>
          <strong>Students are not.</strong> Your profile is not browsable. A mentor sees
          your name, photo, college and what you said you are working towards — and only
          once you have booked a session with them. Other students never see you.
        </p>
        <p>
          A review you write appears on the mentor&rsquo;s card under{' '}
          <strong>your first name only</strong>, never your full name or your college.
        </p>
      </Section>

      <Section heading="Sessions, video and chat">
        <List
          items={[
            <>
              <strong>Video and audio are not recorded.</strong> Calls run through LiveKit
              and are not stored by us in any form. Nobody can replay your session.
            </>,
            <>
              <strong>Chat messages are stored</strong> so an admin can investigate a report.
              Phone numbers and email addresses typed into chat are{' '}
              <strong>automatically replaced</strong> before the message is saved — that is
              a safety measure and it applies to everyone.
            </>,
            <>
              Anything drawn on the shared whiteboard exists only during the call and is not
              saved.
            </>,
          ]}
        />
      </Section>

      <Section heading="Who we share it with">
        <p>
          We do not sell your data and we do not run advertising on it. We use a small
          number of services to operate at all:
        </p>
        <List
          items={[
            <><strong>Supabase</strong> — database, accounts and file storage.</>,
            <><strong>Vercel</strong> — hosting and request logs.</>,
            <><strong>Razorpay</strong> — payments. They collect your card or UPI details
              directly, under their own privacy policy.</>,
            <><strong>LiveKit</strong> — carries the live video and audio, which it does not
              store.</>,
          ]}
        />
        <p>
          We also pass an employer&rsquo;s <em>domain name</em> to a public favicon service
          to fetch company logos for mentor cards. The logo is then cached on our own
          storage, so your browser never contacts that service and it is never told who is
          browsing.
        </p>
        <p>
          We will hand over data if a law or a court requires it. If that happens and we are
          permitted to tell you, we will.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <List
          items={[
            <>While your account is open, we keep your profile and your booking history —
              you need it to see what you have paid for.</>,
            <>
              When you ask us to delete your account it is immediately hidden from
              everywhere on the platform, and permanently erased after{' '}
              <strong>{RULES.deletionGraceDays} days</strong>. The delay is so a mistaken
              tap can be undone, and you can cancel it yourself at any point within it.
            </>,
            <>
              Where a payment record has to be kept for tax or accounting, we keep the
              record of the transaction and not your profile.
            </>,
          ]}
        />
      </Section>

      <Section heading="Your rights, and how to use them">
        <p>Under the DPDP Act you can do all of this yourself, today:</p>
        <List
          items={[
            <>
              <strong>See and correct</strong> what we hold — <Link href="/settings">
              Settings</Link>.
            </>,
            <>
              <strong>Take a copy</strong> — Settings has an export that downloads
              everything we hold about you as a single file, including bookings, payments,
              reviews and credits.
            </>,
            <>
              <strong>Have it deleted</strong> — Settings, and it completes after{' '}
              {RULES.deletionGraceDays} days. We will refuse only while you have an upcoming
              session you have paid for, because deleting then would take the booking with
              it and leave you out of pocket. Cancel that first and the credit comes back.
            </>,
            <>
              <strong>Choose what we email you</strong> — reminders, summaries and product
              news are separate switches in Settings. Session reminders are the one thing we
              would ask you to keep on.
            </>,
          ]}
        />
        <p>
          You can also nominate someone to exercise these rights if you are unable to.
          Email <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a>.
        </p>
      </Section>

      <Section heading="Keeping it safe">
        <p>
          Access to data is enforced in the database itself, per row, not only in the
          application — so a bug in a page cannot expose another person&rsquo;s bookings.
          Passwords are hashed by Supabase and are not visible to us. Payment credentials
          never reach our servers.
        </p>
        <p>
          If we discover a breach affecting you, we will tell you and the Data Protection
          Board as the Act requires. We would rather tell you early and be imprecise than
          wait until we have a tidy story.
        </p>
      </Section>

      <Section heading="Complaints">
        <p>
          Email <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a> and
          our grievance officer will respond within 30 days, usually far sooner. Details are
          on the <Link href="/contact">Contact</Link> page. If you are not satisfied, you
          may complain to the Data Protection Board of India.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If we change this in a way that affects what we do with your data, we will email
          you before it takes effect rather than quietly updating the date at the top.
        </p>
      </Section>
    </LegalPage>
  )
}
