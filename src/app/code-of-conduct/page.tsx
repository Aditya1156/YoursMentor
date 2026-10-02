import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, List } from '@/components/legal/legal-page'
import { LEGAL, RULES } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Code of conduct',
  description:
    'How students and mentors are expected to behave on YoursMentor.in, and what happens when they do not.',
}
// No per-person content: prerendered and cached rather than built per visitor.
export const revalidate = 3600

export default function Page() {
  return (
    <LegalPage
      title="Code of conduct"
      intro="Most of this platform is a stranger a few years ahead of you giving half an hour of their evening. These are the rules that keep that worth doing on both sides."
    >
      <Section heading="For everyone">
        <List
          items={[
            <><strong>Turn up, or cancel.</strong> Someone has set the time aside. Cancelling
              is fine; silence is not.</>,
            <><strong>Keep it on the platform.</strong> Payments, bookings and messages stay
              here. It is how we can refund you, and how a report can be investigated.</>,
            <><strong>Nobody is recorded.</strong> We do not record sessions, and you should
              not either without the other person agreeing first.</>,
            <><strong>Do not share someone&rsquo;s details.</strong> Not their number, not
              their email, not a screenshot of them, anywhere.</>,
          ]}
        />
      </Section>

      <Section heading="If you are a mentor">
        <List
          items={[
            <><strong>Be accurate about yourself.</strong> Your employer, role, college and
              years of experience should all survive being checked. Students are choosing you
              on them.</>,
            <><strong>Never promise an outcome.</strong> You cannot guarantee a job, an
              interview, an admission or a visa. Say what worked for you.</>,
            <><strong>Do not sell anything.</strong> No courses, no referrals for money, no
              paid communities, no asking a student to pay you directly. Mentioning your own
              free content is fine.</>,
            <><strong>Do not share what is not yours.</strong> Your employer&rsquo;s internal
              documents, interview question banks under NDA, or paid material you bought.</>,
            <><strong>Stay in your lane.</strong> If a student asks something you do not know
              — visa law, a medical question, a legal one — say so and point them to someone
              qualified.</>,
            <>
              <strong>Cancel early if you must.</strong> Less than{' '}
              {RULES.mentorStrikeHours} hours is a strike;{' '}
              {RULES.strikesToSuspension} strikes suspends your profile.
            </>,
          ]}
        />
      </Section>

      <Section heading="If you are a student">
        <List
          items={[
            <><strong>Come with something specific.</strong> &ldquo;Here is my resume and the
              three roles I am applying for&rdquo; gets you far more than &ldquo;how do I get
              a job&rdquo;.</>,
            <><strong>Rate honestly.</strong> A mentor who was not useful should not keep a
              five-star average, and a mentor who changed your week deserves the opposite.
              Your rating is what the next student relies on.</>,
            <><strong>Do not ask for a referral as a favour</strong> in a first session. Ask
              how to earn one.</>,
            <><strong>Do not ask a mentor to do the work.</strong> They will review your
              resume; they will not write it, sit your assessment or complete your
              assignment.</>,
          ]}
        />
      </Section>

      <Section heading="Never, by anyone">
        <p>These end an account on the first instance:</p>
        <List
          items={[
            <>Harassment, threats, stalking, or abuse of any kind.</>,
            <>Anything sexual directed at another user. Anything at all involving a minor is
              reported to the police as well as removed.</>,
            <>Discrimination or slurs based on caste, religion, region, gender, sexuality,
              disability, or the college someone went to.</>,
            <>Asking for money outside the platform, or any attempt at a scam.</>,
            <>Impersonating someone else, or an employer, or us.</>,
          ]}
        />
      </Section>

      <Section heading="Reporting something">
        <p>
          Use the <Link href="/report">report form</Link>. There is also a{' '}
          <strong>Report</strong> button inside every session, which works mid-call. If
          something feels wrong you do not need to be sure before telling us — that is our
          job.
        </p>
        <p>
          <strong>The person you report is never told who reported them.</strong> An admin
          reads every report. If you paid for a session that was not delivered, you are
          refunded regardless of what else we decide.
        </p>
        <p>
          If you are in immediate danger, contact the police on <strong>112</strong> first.
          We can suspend an account; we cannot respond to an emergency.
        </p>
      </Section>

      <Section heading="What we do about it">
        <List
          items={[
            <><strong>A warning</strong>, for something careless that did no harm.</>,
            <><strong>Removal from the directory</strong>, for a mentor whose sessions keep
              disappointing students.</>,
            <><strong>Suspension</strong> while we look into something serious.</>,
            <><strong>A permanent ban</strong>, with no refund of a mentor&rsquo;s unpaid
              earnings where they obtained them dishonestly.</>,
          ]}
        />
        <p>
          We will tell you what we decided and why. If you think we got it wrong, reply to
          us or write to{' '}
          <a href={`mailto:${LEGAL.grievanceEmail}`}>{LEGAL.grievanceEmail}</a> and a
          different person will look at it.
        </p>
      </Section>
    </LegalPage>
  )
}
