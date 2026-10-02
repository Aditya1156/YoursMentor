import Image from 'next/image'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: { cls: 'size-9', px: 36 },
  md: { cls: 'size-12', px: 48 },
  lg: { cls: 'size-16', px: 64 },
  xl: { cls: 'size-20', px: 80 },
} as const

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
  const { cls, px } = SIZES[size]
  return (
    <div className={cn('relative shrink-0', className)}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          className={cn(cls, 'rounded-full object-cover')}
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            cls,
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
