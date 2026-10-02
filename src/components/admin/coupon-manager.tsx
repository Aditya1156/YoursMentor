'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Power, PowerOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/auth/error-banner'
import type { CouponRow } from '@/lib/queries/admin'
import { cn, formatINR } from '@/lib/utils'

const SCOPES = [
  { value: 'any', label: 'Any booking' },
  { value: 'group_only', label: '₹99 group only' },
  { value: 'one_on_one_only', label: '1:1 only' },
  { value: 'first_booking', label: 'First booking only' },
]

export function CouponManager({ initial }: { initial: CouponRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({
    code: '', description: '', kind: 'percent' as 'percent' | 'flat',
    value: '', maxDiscount: '', minAmount: '', scope: 'any',
    maxRedemptions: '', maxPerUser: '1', expiresAt: '',
  })

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy('create')
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    setBusy(null)
    if (!res.ok) {
      setError((await res.json()).error ?? 'Could not create that coupon.')
      return
    }
    setOpen(false)
    setF({ ...f, code: '', description: '', value: '', maxDiscount: '' })
    router.refresh()
  }

  async function toggle(id: string, active: boolean) {
    setBusy(id)
    await fetch('/api/admin/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    })
    setBusy(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {!open ? (
        <Button className="self-start" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> New coupon
        </Button>
      ) : (
        <Card className="p-5">
          <form onSubmit={create} className="flex flex-col gap-4">
            {error && <ErrorBanner>{error}</ErrorBanner>}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" htmlFor="code" required hint="Letters and digits, 3 to 24.">
                <Input id="code" value={f.code} placeholder="FIRST50"
                       onChange={(e) => set('code', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Internal description" htmlFor="desc">
                <Input id="desc" value={f.description} placeholder="Launch week, YouTube"
                       onChange={(e) => set('description', e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Type" htmlFor="kind">
                <div className="flex gap-1 rounded-[var(--radius-sm)] bg-surface-muted p-1" id="kind">
                  {(['percent', 'flat'] as const).map((k) => (
                    <button key={k} type="button" onClick={() => set('kind', k)}
                      aria-pressed={f.kind === k}
                      className={cn(
                        'flex-1 rounded-[var(--radius-sm)] py-1.5 text-xs font-bold transition-colors',
                        f.kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      )}>
                      {k === 'percent' ? '% off' : '₹ off'}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={f.kind === 'percent' ? 'Percent off' : 'Rupees off'}
                     htmlFor="value" required>
                <Input id="value" type="number" min={1} max={f.kind === 'percent' ? 100 : 4999}
                       value={f.value} onChange={(e) => set('value', e.target.value)} />
              </Field>
              {f.kind === 'percent' && (
                <Field label="Cap the discount at" htmlFor="cap" hint="Optional, in rupees.">
                  <Input id="cap" type="number" min={1} value={f.maxDiscount}
                         onChange={(e) => set('maxDiscount', e.target.value)} />
                </Field>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Applies to" htmlFor="scope">
                <select id="scope" value={f.scope} onChange={(e) => set('scope', e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm">
                  {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Minimum booking" htmlFor="min" hint="₹, optional">
                <Input id="min" type="number" min={0} value={f.minAmount}
                       onChange={(e) => set('minAmount', e.target.value)} />
              </Field>
              <Field label="Total uses" htmlFor="max" hint="Blank = unlimited">
                <Input id="max" type="number" min={1} value={f.maxRedemptions}
                       onChange={(e) => set('maxRedemptions', e.target.value)} />
              </Field>
              <Field label="Uses per student" htmlFor="per">
                <Input id="per" type="number" min={1} value={f.maxPerUser}
                       onChange={(e) => set('maxPerUser', e.target.value)} />
              </Field>
            </div>

            <Field label="Expires" htmlFor="exp" hint="Optional. Blank means it runs until you switch it off.">
              <Input id="exp" type="date" value={f.expiresAt}
                     onChange={(e) => set('expiresAt', e.target.value)} />
            </Field>

            <div className="flex gap-2">
              <Button type="submit" disabled={busy === 'create'}>
                {busy === 'create' && <Loader2 className="animate-spin" aria-hidden />}
                Create coupon
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {initial.length > 0 && (
        <Card className="divide-y divide-border-subtle">
          {initial.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt) < new Date()
            const exhausted = c.maxRedemptions != null && c.timesRedeemed >= c.maxRedemptions
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-[var(--radius-sm)] bg-surface-muted px-2 py-0.5 font-mono text-sm font-bold">
                      {c.code}
                    </code>
                    <Badge tone={c.kind === 'percent' ? 'indigo' : 'amber'}>
                      {c.kind === 'percent' ? `${c.value}% off` : `${formatINR(c.value)} off`}
                      {c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ''}
                    </Badge>
                    {c.scope !== 'any' && (
                      <Badge tone="neutral">
                        {SCOPES.find((s) => s.value === c.scope)?.label}
                      </Badge>
                    )}
                    {!c.active ? <Badge tone="neutral">Off</Badge>
                      : expired ? <Badge tone="danger">Expired</Badge>
                      : exhausted ? <Badge tone="danger">Fully claimed</Badge>
                      : <Badge tone="green">Live</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.timesRedeemed} used
                    {c.maxRedemptions ? ` of ${c.maxRedemptions}` : ''}
                    {' · '}{c.maxPerUser} per student
                    {c.minAmount > 0 && ` · min ${formatINR(c.minAmount)}`}
                    {c.expiresAt && ` · until ${new Date(c.expiresAt).toLocaleDateString('en-IN')}`}
                    {c.description && ` · ${c.description}`}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={busy === c.id}
                        onClick={() => toggle(c.id, !c.active)}>
                  {busy === c.id ? <Loader2 className="animate-spin" aria-hidden />
                    : c.active ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                  {c.active ? 'Switch off' : 'Switch on'}
                </Button>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
