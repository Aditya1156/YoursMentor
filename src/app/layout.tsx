import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yoursmentor.in'),
  title: {
    default: 'YoursMentor.in — Know What to Do Next.',
    template: '%s · YoursMentor.in',
  },
  description:
    'YoursMentor.in connects students from Tier-2 and Tier-3 colleges with near-peer mentors who were exactly where they are. ₹99 group sessions and affordable 1:1 guidance.',
  openGraph: {
    type: 'website',
    siteName: 'YoursMentor.in',
    title: 'YoursMentor.in — Know What to Do Next.',
    description:
      'Book ₹99 group sessions and 1:1 calls with seniors from Tier-2 and Tier-3 colleges who already did what you are trying to do.',
    images: ['/brand/og-mark.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0069EE',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
