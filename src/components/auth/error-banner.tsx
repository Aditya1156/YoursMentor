import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ErrorBanner({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'success'
  children: React.ReactNode
}) {
  const Icon = tone === 'danger' ? AlertCircle : CheckCircle2
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-[var(--radius-sm)] px-3.5 py-3 text-sm font-medium',
        tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'
      )}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}
