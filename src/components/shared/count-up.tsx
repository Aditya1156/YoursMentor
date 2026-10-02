'use client'

import { useEffect, useRef } from 'react'

/**
 * Counts up once, when it scrolls into view.
 *
 * The running number is written straight to the DOM node. Holding it in React
 * state would re-render this component sixty times a second for the length of
 * the animation, which is a lot of work for a decorative number — and on the
 * low-end Android phones most of our students use, it is the kind of thing
 * that makes a page feel cheap.
 *
 * The final value is rendered server-side and sits in an aria-label, so the
 * markup is correct before any JavaScript runs and a screen reader is never
 * read a running total.
 */
export function CountUp({
  to,
  duration = 1200,
  prefix = '',
  suffix = '',
}: {
  to: number
  duration?: number
  prefix?: string
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const numberRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    const out = numberRef.current
    if (!el || !out) return
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    let frame = 0
    const render = (n: number) => {
      out.textContent = `${prefix}${n.toLocaleString('en-IN')}${suffix}`
    }
    render(0)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          // easeOutCubic: quick off the mark, then settles.
          render(Math.round(to * (1 - Math.pow(1 - t, 3))))
          if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.4 }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [to, duration, prefix, suffix])

  const final = `${prefix}${to.toLocaleString('en-IN')}${suffix}`

  return (
    <span ref={ref} aria-label={final}>
      <span ref={numberRef} aria-hidden>
        {final}
      </span>
    </span>
  )
}
