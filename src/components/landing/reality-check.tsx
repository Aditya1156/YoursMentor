import { ArrowDown, Building2, CircleDollarSign, Users } from 'lucide-react'
import { Reveal } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'

/**
 * Three problems, each answered in place.
 *
 * The earlier version was three identical white cards with a "Traditional
 * Market" badge repeated on every one, which said the same thing three times
 * and left the reader to work out which half was the complaint and which was
 * the answer. Here the card is split: the top is what the market offers,
 * muted and struck through at the price, and the bottom is ours, in full
 * contrast. An arrow sits on the seam so the eye knows which way to read.
 */
const PROBLEMS = [
  {
    icon: CircleDollarSign,
    title: 'Expensive industry "gurus"',
    body: '₹5,000–₹10,000 a month, on subscription, for recycled pre-recorded lectures and no real feedback on your work.',
    price: '₹10,000/mo',
    answer: '₹99 a session',
    answerNote: 'No lock-in, no bundle. You pay for the session you turn up to.',
  },
  {
    icon: Building2,
    title: 'Big-college detachment',
    body: 'Top-tier seniors who never sat through mass recruitment, or sent 400 cold emails to land one interview.',
    price: 'Advice from a different life',
    answer: 'Seniors who did it off-campus',
    answerNote: 'From Tier-2 and Tier-3 colleges, one to three steps ahead of you.',
  },
  {
    icon: Users,
    title: 'The network void',
    body: 'No active alumni on campus. Nobody to ask for a referral, a resume read, or an honest number on salary.',
    price: 'Zero warm intros',
    answer: 'A network, on demand',
    answerNote: 'Verified seniors in Bangalore, Hyderabad, Pune — and abroad.',
  },
]

export function RealityCheck() {
  return (
    <section className="relative py-14 md:py-16">
      <div
        aria-hidden
        className="bg-dots fade-edges pointer-events-none absolute inset-0 opacity-70"
      />
      <div className="container-page relative">
      <Reveal>
        <SectionHeading
          eyebrow="The reality check"
          title="Why standard tech mentorship is broken for us"
          description="Students from non-metro colleges don't need ivory-tower advice. They need tactical, empathetic playbooks that work off-campus."
        />
      </Reveal>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PROBLEMS.map(({ icon: Icon, title, body, price, answer, answerNote }, i) => (
          <Reveal key={title} delay={i * 90}>
            <article className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
              {/* what you are offered today */}
              <div className="flex flex-1 flex-col gap-2.5 bg-danger-soft/50 p-5 pb-8">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-danger/10">
                  <Icon className="size-4 text-danger" aria-hidden />
                </span>
                <h3 className="text-base leading-snug">{title}</h3>
                <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {body}
                </p>
                <p className="mt-auto pt-2 text-xs font-bold text-danger line-through decoration-danger/50">
                  {price}
                </p>
              </div>


              {/* what we do instead */}
              <div className="relative border-t border-border bg-surface p-5">
                <span
                  aria-hidden
                  className="absolute -top-3.5 left-5 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-foreground"
                >
                  <ArrowDown className="size-3.5" />
                </span>
                <p className="mt-2 text-base font-extrabold text-primary">{answer}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {answerNote}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
      </div>
    </section>
  )
}
