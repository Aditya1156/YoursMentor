'use client'

import * as React from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('text-sm font-semibold text-foreground', className)} {...props}>
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      )}
    </label>
  )
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      'h-11 w-full rounded-[var(--radius-sm)] border bg-surface px-3.5 text-sm text-foreground transition-colors',
      'placeholder:text-[var(--ink-300)] disabled:cursor-not-allowed disabled:opacity-60',
      invalid ? 'border-danger' : 'border-border hover:border-[var(--ink-300)]',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, ...props }, ref) => {
  const [shown, setShown] = React.useState(false)
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={shown ? 'text' : 'password'}
        className={cn('pr-11', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[var(--radius-sm)] p-2 text-subtle-foreground hover:text-foreground"
        aria-label={shown ? 'Hide password' : 'Show password'}
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
})
PasswordInput.displayName = 'PasswordInput'

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      'mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px] border-border accent-[var(--primary)]',
      className
    )}
    {...props}
  />
))
Checkbox.displayName = 'Checkbox'

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p className="flex items-start gap-1.5 text-xs font-medium text-danger">
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

/** Label + control + error, wired to each other for screen readers. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  )
}

export function FormAlert({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'success'
  children: React.ReactNode
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-[var(--radius-sm)] px-3.5 py-3 text-sm font-medium',
        tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'
      )}
    >
      {children}
    </div>
  )
}
