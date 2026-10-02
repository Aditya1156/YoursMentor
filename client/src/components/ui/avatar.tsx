import { cn } from '@/lib/utils'

const SIZES = { sm: 'size-9', md: 'size-12', lg: 'size-16', xl: 'size-20' } as const

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function Avatar({
  name,
  src,
  size = 'md',
  online,
  className,
}: {
  name: string
  src?: string
  size?: keyof typeof SIZES
  online?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          className={cn(SIZES[size], 'rounded-full object-cover')}
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            SIZES[size],
            'flex items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-foreground'
          )}
        >
          {initials(name)}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-surface bg-success"
          title="Active today"
        />
      )}
    </div>
  )
}
