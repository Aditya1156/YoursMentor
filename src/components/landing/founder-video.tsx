import Link from 'next/link'
import { Film, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Reveal } from '@/components/shared/reveal'
import { YouTubeEmbed } from '@/components/shared/youtube-embed'

/**
 * The founder section, with a real video from the channel the audience already
 * follows. Set NEXT_PUBLIC_FOUNDER_VIDEO_ID to a video id; without it this
 * falls back to the quote alone rather than showing a broken player.
 */
export function FounderVideo({ videoId }: { videoId?: string }) {
  return (
    <section className="container-page py-14 md:py-20">
      <Card className="overflow-hidden bg-primary-soft p-5 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-2 lg:items-center">
          <Reveal>
            {videoId ? (
              <YouTubeEmbed id={videoId} title="Why I built YoursMentor.in" />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface text-center">
                <Film className="size-7 text-subtle-foreground" aria-hidden />
                <p className="text-sm font-semibold">Founder video goes here</p>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Set <code className="font-mono">NEXT_PUBLIC_FOUNDER_VIDEO_ID</code> to a
                  video from @refactorslife and it appears, click-to-load.
                </p>
              </div>
            )}
          </Reveal>

          <Reveal delay={100}>
            <Quote className="size-7 text-primary opacity-40" aria-hidden />
            <blockquote className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-ink-700">
              <p>
                &ldquo;I graduated from a private engineering college where mass recruiters
                offered 3.25 LPA, and teachers told us off-campus FAANG or Tier-1 product
                jobs were only for IITians. It was a complete lie.&rdquo;
              </p>
              <p>
                &ldquo;YoursMentor was built for every student sitting in a hostel room
                right now who feels anxious, left out or invisible. You don&rsquo;t need a
                ₹50,000 bootcamp. You need a senior who walked that exact road to say:{' '}
                <em className="font-semibold not-italic text-foreground">
                  here is the step I took. You can do this too.
                </em>
                &rdquo;
              </p>
            </blockquote>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  A
                </span>
                <span className="text-sm">
                  <span className="block font-bold leading-tight">Aditya</span>
                  <a
                    href="https://youtube.com/@refactorslife"
                    target="_blank" rel="noopener noreferrer"
                    className="block text-xs font-semibold text-primary hover:underline"
                  >
                    @refactorslife
                  </a>
                </span>
              </div>
              <Button asChild className="ml-auto">
                <Link href="/join">Find your senior today</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </Card>
    </section>
  )
}
