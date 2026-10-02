/**
 * Backdrop for every auth screen. The form used to sit on flat white, which
 * made a card with a border look like it was floating in nothing. Same
 * surfaces as the landing page, so signing in feels like the same product.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-wash relative min-h-[calc(100dvh-4rem)] overflow-hidden">
      <div
        aria-hidden
        className="bg-grid fade-edges pointer-events-none absolute inset-0 opacity-70"
      />
      <div className="aurora relative" />
      <div className="relative">{children}</div>
    </div>
  )
}
