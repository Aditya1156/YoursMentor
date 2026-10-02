import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ₹1,299 — never show paise, students read whole rupees. */
export function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

/** "Sat, 19 Oct · 4:00 PM IST" in the viewer's own timezone. */
export function formatSessionTime(iso: string, timeZone?: string) {
  const d = new Date(iso)
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const day = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: zone,
  })
  const time = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone,
  })
  const abbr =
    new Intl.DateTimeFormat('en-IN', { timeZone: zone, timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName')?.value ?? ''
  return `${day} · ${time} ${abbr}`.trim()
}
