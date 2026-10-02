'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Fades and lifts its children when they scroll into view.
 *
 * The visible/hidden state is a DOM attribute written directly, not React
 * state. Reveal has no business re-rendering its subtree to play an
 * animation, and an effect that writes to the DOM is what effects are
 * actually for — using state here would cascade a render through every
 * revealed card on the page.
 *
 * The attribute is absent until the observer attaches, and the CSS only hides
 * on `data-visible="false"`. So with JavaScript off, for a crawler, or if
 * hydration fails, everything stays visible — the usual failure mode of
 * scroll animations is a permanently blank page.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
  className,
  sheen = false,
}: {
  children: ReactNode
  as?: ElementType
  /** Stagger, in milliseconds. Keep a group's total under ~300ms. */
  delay?: number
  className?: string
  sheen?: boolean
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    el.dataset.visible = 'false'
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.visible = 'true'
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
      className={cn('reveal', sheen && 'sheen', className)}
    >
      {children}
    </Tag>
  )
}
