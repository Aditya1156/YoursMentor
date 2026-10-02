'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]',
      interactive &&
        'transition-shadow hover:shadow-[var(--shadow-raised)] focus-within:shadow-[var(--shadow-raised)]',
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}
