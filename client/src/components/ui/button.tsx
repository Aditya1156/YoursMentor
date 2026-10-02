import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Brand rule: `group` (amber) is only ever used for ₹99 group sessions,
 * `primary` (indigo) for 1:1 and every other primary action. Do not pick a
 * variant for looks — pick it for what the button books.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-cta-1on1 text-cta-1on1-foreground hover:bg-[var(--cta-1on1-hover)] shadow-[var(--shadow-card)]',
        group:
          'bg-cta-group text-cta-group-foreground hover:bg-[var(--cta-group-hover)] shadow-[var(--shadow-card)]',
        outline:
          'border border-border bg-surface text-foreground hover:bg-surface-muted',
        soft: 'bg-primary-soft text-primary-soft-foreground hover:bg-[var(--indigo-100)]',
        ghost: 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3.5 text-[0.8125rem]',
        md: 'h-11 px-5 text-sm',
        lg: 'h-[3.25rem] px-7 text-[0.9375rem]',
        icon: 'size-10',
      },
      full: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', full: false },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, full }), className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
export { buttonVariants }
