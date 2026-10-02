import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[var(--radius-pill)] font-semibold leading-none [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted text-muted-foreground',
        indigo: 'bg-primary-soft text-primary-soft-foreground',
        amber: 'bg-accent-soft text-accent-soft-foreground',
        green: 'bg-success-soft text-success',
        sky: 'bg-info-soft text-info',
        danger: 'bg-danger-soft text-danger',
        outline: 'border border-border bg-surface text-muted-foreground',
      },
      size: {
        sm: 'px-2 py-1 text-[0.6875rem]',
        md: 'px-2.5 py-1.5 text-xs',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}
