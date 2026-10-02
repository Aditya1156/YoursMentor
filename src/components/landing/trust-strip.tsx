/**
 * A marquee of the colleges our students actually come from.
 *
 * Deliberately college names as text, not company logos: using a recruiter's
 * logo would imply a relationship we do not have. These are the kinds of
 * places our audience studies, which is the point being made.
 *
 * Duplicated once and translated by -50%, so the loop is seamless with no JS.
 * aria-hidden on the copy, so a screen reader hears the list once.
 */
const COLLEGES = [
  'AKTU Lucknow', 'VTU Belagavi', 'Galgotias University', 'ABES Engineering',
  'Bundelkhand Institute', 'MAKAUT Kolkata', 'Anna University', 'RGPV Bhopal',
  'SPPU Pune', 'JNTU Hyderabad', 'BPUT Odisha', 'KIIT Bhubaneswar',
]

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-surface py-6">
      <p className="container-page eyebrow mb-3 text-center">
        Students from colleges like these
      </p>
      <div className="marquee relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <ul className="marquee-track flex w-max items-center gap-10">
          {[0, 1].map((copy) => (
            COLLEGES.map((c) => (
              <li
                key={`${copy}-${c}`}
                aria-hidden={copy === 1 || undefined}
                className="whitespace-nowrap text-sm font-bold text-subtle-foreground"
              >
                {c}
              </li>
            ))
          ))}
        </ul>
      </div>
    </section>
  )
}
