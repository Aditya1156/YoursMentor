import { BadgeCheck, Mic, Users, Video } from 'lucide-react'

/**
 * The product, drawn rather than photographed.
 *
 * Stock photos of students would be strangers pretending to be our users, and
 * we have no real session screenshots yet. This is an honest abstraction of
 * the thing itself — a room with a mentor and students in it — built from
 * markup so it costs nothing to load, scales to any screen and inherits the
 * theme. Replace it with a real screenshot once there are sessions worth
 * showing.
 */
export function HeroVisual() {
  const students = ['Rohan', 'Sneha', 'Arjun', 'Fatima', 'Vikram']

  return (
    <div className="relative mx-auto max-w-md">
      <div
        className="float-slow rounded-[var(--radius-xl)] border border-border bg-surface p-3 shadow-[var(--shadow-pop)]"
        aria-hidden
      >
        {/* the mentor tile */}
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)]"
          style={{ background: 'var(--brand-gradient-deep)' }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/15 text-2xl font-extrabold text-white backdrop-blur">
              PS
            </span>
            <span className="flex items-center gap-1 text-sm font-bold text-white">
              Priya Sharma <BadgeCheck className="size-4 text-[var(--cyan-300)]" />
            </span>
            <span className="text-xs text-white/75">SDE at PhonePe · Ex-Tier 3</span>
          </div>

          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-danger px-2.5 py-1 text-[0.6875rem] font-bold text-white">
            <span className="size-1.5 rounded-full bg-white" /> Live
          </span>
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-[var(--radius-pill)] bg-black/35 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur">
            <Users className="size-3" /> 6 / 15
          </span>
        </div>

        {/* the student strip */}
        <div className="mt-2 grid grid-cols-5 gap-2">
          {students.map((s, i) => (
            <div
              key={s}
              className="flex aspect-square items-center justify-center rounded-[var(--radius-md)] bg-surface-muted text-xs font-bold text-primary-soft-foreground"
              style={{ opacity: 1 - i * 0.12 }}
            >
              {s.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>

        {/* the controls */}
        <div className="mt-2 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-surface-muted py-2.5">
          {[Mic, Video].map((Icon, i) => (
            <span key={i} className="flex size-8 items-center justify-center rounded-full bg-surface">
              <Icon className="size-3.5 text-muted-foreground" />
            </span>
          ))}
          <span className="flex h-8 items-center rounded-[var(--radius-pill)] bg-danger px-3 text-[0.6875rem] font-bold text-white">
            Leave
          </span>
        </div>
      </div>

      {/* floating proof points */}
      <div
        className="float-slower absolute -left-6 top-10 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 shadow-[var(--shadow-raised)]"
        aria-hidden
      >
        <p className="text-[0.625rem] font-semibold text-muted-foreground">Seat price</p>
        <p className="text-base font-extrabold text-accent">₹99</p>
      </div>

      <div
        className="float-slow absolute -right-4 bottom-16 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 shadow-[var(--shadow-raised)]"
        aria-hidden
      >
        <p className="text-[0.625rem] font-semibold text-muted-foreground">Mentor earns</p>
        <p className="text-base font-extrabold text-success">₹742 / hr</p>
      </div>
    </div>
  )
}
