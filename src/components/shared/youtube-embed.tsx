'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'

/**
 * A YouTube facade: poster image plus a play button, and the real iframe only
 * after a click.
 *
 * A bare YouTube embed pulls roughly a megabyte of player JavaScript on page
 * load whether or not anyone watches, and sets cookies before consent. For
 * students on metered mobile data that is a real cost for something most of
 * them will scroll past. The poster comes from YouTube's own thumbnail CDN, so
 * nothing is loaded from Google until the click.
 *
 * `youtube-nocookie.com` keeps it out of the advertising cookie jar, which
 * also keeps the promise in spec §2 that there are no tracking scripts in V1.
 */
export function YouTubeEmbed({
  id,
  title,
  className,
}: {
  id: string
  title: string
  className?: string
}) {
  const [playing, setPlaying] = useState(false)

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-[var(--radius-lg)] border border-border bg-[var(--navy-900)] ${className ?? ''}`}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 size-full cursor-pointer"
          aria-label={`Play: ${title}`}
        >
          <Image
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-[var(--navy-900)]/80 via-transparent to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/95 shadow-[var(--shadow-pop)] transition-transform duration-300 group-hover:scale-110">
              <Play className="ml-1 size-7 fill-[var(--navy-800)] text-[var(--navy-800)]" aria-hidden />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 p-4 text-left">
            <span className="block text-sm font-bold text-white">{title}</span>
            <span className="mt-0.5 block text-xs text-white/75">
              Loads only when you press play
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
