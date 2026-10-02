'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SectionHeading } from '@/components/shared/section-heading'

const FAQS = [
  {
    q: 'What if the mentor doesn’t show up or the session is unhelpful?',
    a: 'If a mentor does not join within 10 minutes, report it from the session page and we refund you in full. Mentors who miss sessions collect strikes and are suspended after three. If a session was genuinely unhelpful, tell us within 48 hours and our team reviews it.',
  },
  {
    q: 'Do I need to install Zoom or Google Meet?',
    a: 'No. Every session runs inside OneStep in your browser — Chrome or Edge on a phone or laptop is enough. There is an audio-only mode for weak mobile data, and we never ask you to move to a mentor’s personal link.',
  },
  {
    q: 'How are mentors vetted on OneStep?',
    a: 'Mentors are invite-only right now. Every applicant is reviewed by a person against their LinkedIn profile and a college or company ID before they can be listed, and each one signs our code of conduct. The verified badge on a profile means a human checked it.',
  },
  {
    q: 'Can I talk to mentors in Hindi or other regional languages?',
    a: 'Yes. Every mentor lists the languages they are comfortable in — Hindi, Kannada, Marathi, Bengali, Urdu, Telugu and more — and you can filter the directory by language before you book.',
  },
  {
    q: 'What does ₹99 actually get me?',
    a: 'A seat in a live group session of up to 15 students with a mentor who has done the thing you are trying to do. You can ask questions by voice or chat, and you get the mentor’s written summary and next steps afterwards.',
  },
  {
    q: 'What is your refund and cancellation policy?',
    a: 'Cancel 24 hours or more before a session and you get the full amount back as OneStep credits. Under 24 hours there is no refund. If the mentor cancels, or a group session does not reach its minimum of 3 students, you are refunded in full automatically.',
  },
  {
    q: 'Who can sign up?',
    a: 'OneStep is open to students aged 18 and over for now. We are building a proper parental-consent flow before we open to younger students, because India’s data protection law requires it.',
  },
  {
    q: 'How do I become a mentor?',
    a: 'Apply from the Become a Mentor page with your LinkedIn and a college or company ID. We review applications within 48 hours. You set your own availability and your 1:1 price between ₹99 and ₹499, and keep 75% of what you earn.',
  },
]

export function Faq() {
  return (
    <section className="container-page py-14 md:py-20">
      <SectionHeading
        eyebrow="Answers Upfront"
        title="Frequently Asked Questions"
        description="Everything you need to know before booking your first session."
      />
      <Accordion
        type="single"
        collapsible
        className="mx-auto mt-8 flex max-w-3xl flex-col gap-2.5"
      >
        {FAQS.map(({ q, a }, i) => (
          <AccordionItem key={q} value={`faq-${i}`}>
            <AccordionTrigger>{q}</AccordionTrigger>
            <AccordionContent>{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
