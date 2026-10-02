import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, List } from '@/components/legal/legal-page'
import { LEGAL, RULES, legalDetailsComplete } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Terms of use',
  description:
    'The agreement between you and YoursMentor.in: what we do, what mentors promise, what we do not guarantee.',
}
// No per-person content: prerendered and cached rather than built per visitor.
export const revalidate = 3600

export default function Page() {
  return (
    <LegalPage
      title="Terms of use"
      intro="The agreement between you and us. Short, and in plain words, because terms nobody reads protect nobody."
    >
      <Section heading="What YoursMentor.in is">
        <p>
          We are a <strong>marketplace</strong>. We introduce students to mentors who are a
          few steps ahead of them, handle the booking, the payment and the video call, and
          take a {RULES.commissionPercent}% commission on what a mentor earns.
        </p>
        <p>
          <strong>Mentors are not our employees.</strong> They set their own prices, their
          own hours and decide what advice to give. We check that a mentor is who they say
          they are before listing them; we do not supervise what they say in a session.
        </p>
        <p>
          By creating an account you agree to these terms, our{' '}
          <Link href="/privacy">privacy policy</Link> and our{' '}
          <Link href="/code-of-conduct">code of conduct</Link>.
        </p>
      </Section>

      <Section heading="Who can use it">
        <List
          items={[
            <>
              You must be <strong>{RULES.minimumAge} or older</strong>. We confirm this at
              sign-up and will close accounts that are not.
            </>,
            <>One account per person, with real details. An account in a false name may be
              suspended without refund.</>,
            <>You are responsible for anything done from your account, so do not share the
              password.</>,
          ]}
        />
      </Section>

      <Section heading="Booking and paying">
        <List
          items={[
            <>
              A seat is <strong>held for {RULES.holdMinutes} minutes</strong> while you pay.
              If payment does not complete in that time the seat goes back to the room.
            </>,
            <>Prices shown include all taxes. Payment is processed by Razorpay; we never see
              your card or UPI details.</>,
            <>
              A ₹99 group session needs {RULES.groupMinimumSeats} students. Below that it is
              cancelled automatically and everyone is refunded in full.
            </>,
            <>
              Cancellation and refunds are set out in full in our{' '}
              <Link href="/refund-policy">refund policy</Link>, which forms part of these
              terms.
            </>,
          ]}
        />
      </Section>

      <Section heading="What we do not promise">
        <p>
          We are honest about this because the alternative is a promise we cannot keep. A
          mentor shares what worked for them. That is useful, and it is not a guarantee.
        </p>
        <List
          items={[
            <><strong>No outcome is guaranteed.</strong> Nobody on this platform can promise
              you a job, an interview, an offer, an admission or a visa, and any mentor who
              does is breaking our rules — please report it.</>,
            <>Advice is personal opinion, not professional, legal, financial, immigration or
              medical advice. Check anything that matters before acting on it.</>,
            <>We do not guarantee the platform is always available. Video calls depend on
              your connection as much as ours.</>,
          ]}
        />
      </Section>

      <Section heading="Rules that get accounts closed">
        <p>
          The <Link href="/code-of-conduct">code of conduct</Link> has the full list. The
          ones that end an account immediately:
        </p>
        <List
          items={[
            <><strong>Taking payment off the platform</strong>, or asking a student to. It
              removes every protection the student has, including refunds.</>,
            <>Harassment, threats, discrimination, or anything sexual directed at another
              user.</>,
            <>Lying about your employer, college or experience.</>,
            <>Recording a session without the other person&rsquo;s agreement. We do not
              record; neither should you.</>,
            <>Sharing anybody&rsquo;s contact details or personal information without
              permission.</>,
          ]}
        />
        <p>
          We may suspend an account while we look into a report. Where we close an account
          for breaking these rules, unspent credit is refunded unless it was obtained
          dishonestly.
        </p>
      </Section>

      <Section heading="If you are a mentor">
        <List
          items={[
            <>You must be able to back up the employer, role and college on your profile. We
              verify before listing and may ask again later.</>,
            <>
              You keep <strong>{100 - RULES.commissionPercent}%</strong> of each
              session&rsquo;s price. We keep {RULES.commissionPercent}% and bear the payment
              fees out of it.
            </>,
            <>
              Cancelling less than {RULES.mentorStrikeHours} hours before a session gives you
              a strike. {RULES.strikesToSuspension} strikes suspends your profile. Students
              are refunded in full either way.
            </>,
            <>You are responsible for your own tax on what you earn here.</>,
            <>Do not share material you do not have the right to share — slides, question
              banks or internal documents from your employer.</>,
          ]}
        />
      </Section>

      <Section heading="Your content">
        <p>
          What you write stays yours. By posting a review, a profile or a session
          description you allow us to show it on the platform and in material about the
          platform. A review cannot be edited or deleted once posted, including by us —
          otherwise a mentor could pressure a student into softening one. If a review breaks
          the code of conduct, report it and an admin will remove it.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          Nothing here limits liability for fraud, for death or injury caused by negligence,
          or anything else that cannot be limited under Indian law.
        </p>
        <p>
          Beyond that, where we are liable to you our liability is limited to{' '}
          <strong>what you paid us for the session the claim is about</strong>. We are not
          liable for a decision you took on a mentor&rsquo;s advice, nor for what a mentor
          says in a session.
        </p>
      </Section>

      <Section heading="Ending it">
        <p>
          You can close your account whenever you like from <Link href="/settings">
          Settings</Link>, and we will not keep you for a notice period. We may close yours
          for a serious or repeated breach of these terms, and we will tell you why.
        </p>
      </Section>

      <Section heading="Law and disputes">
        <p>
          These terms are governed by the laws of India.
          {legalDetailsComplete ? (
            <> Disputes go to the courts of {LEGAL.jurisdiction}.</>
          ) : (
            <> The courts with jurisdiction will be named here before we begin taking
              payments.</>
          )}
        </p>
        <p>
          Please email <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>{' '}
          before anything formal. Almost everything is a misunderstanding we can fix in a
          day.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We will email you before a change that materially affects you takes effect.
          Continuing to use the platform afterwards means you accept the new version.
        </p>
      </Section>
    </LegalPage>
  )
}
