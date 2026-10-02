import { cn } from '@/lib/utils'

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: 'center' | 'left'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className
      )}
    >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="text-2xl sm:text-3xl md:text-[2rem]">{title}</h2>
      {description && (
        <p
          className={cn(
            'text-sm leading-relaxed text-muted-foreground',
            align === 'center' && 'max-w-2xl'
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
