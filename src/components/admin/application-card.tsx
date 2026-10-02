'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink, FileText, Loader2, RotateCcw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { TIER_LABEL, TRACK_LABEL, type Track } from '@/lib/types'
import { formatINR } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ApplicationCard({ application: r }: { application: any }) {
  const router = useRouter()
  const p = r.profiles ?? {}
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [docUrl, setDocUrl] = useState<string | null>(null)

  async function act(action: string) {
    setError(null)
    setBusy(action)
    const res = await fetch(`/api/admin/mentors/${r.user_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    setBusy(null)
    if (!res.ok) {
      setError((await res.json()).error ?? 'That did not work.')
      return
    }
    setRejecting(false)
    router.refresh()
  }

  /** ID proofs live in a private bucket, so viewing one needs a signed URL. */
  async function openDoc() {
    setError(null)
    const { data, error: signError } = await createClient()
      .storage.from('mentor-documents').createSignedUrl(r.id_proof_url, 120)
    if (signError || !data) {
      setError('Could not open that document.')
      return
    }
    setDocUrl(data.signedUrl)
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Avatar name={p.name ?? 'Applicant'} src={p.avatar_url} size="lg" />
          <div className="min-w-0">
            <h2 className="text-base font-bold">{p.name}</h2>
            <p className="text-sm font-semibold text-primary">{r.headline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[r.current_position, r.company, r.country].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <Badge tone={
          r.status === 'approved' ? 'green'
          : r.status === 'rejected' ? 'danger'
          : r.status === 'suspended' ? 'danger' : 'amber'
        }>
          {r.status}
          {r.strikes > 0 ? ` · ${r.strikes} strikes` : ''}
        </Badge>
      </div>

      {r.breakthrough_story && (
        <p className="mt-3 rounded-[var(--radius-md)] bg-surface-muted p-3 text-[0.8125rem] leading-relaxed">
          &ldquo;{r.breakthrough_story}&rdquo;
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {r.college_tier && <Badge tone="indigo">{TIER_LABEL[r.college_tier as keyof typeof TIER_LABEL]}</Badge>}
        {r.home_state && <Badge tone="neutral">{r.home_state}</Badge>}
        {r.first_gen_graduate && <Badge tone="amber">First-gen</Badge>}
        {(r.tracks ?? []).map((t: Track) => <Badge key={t} tone="green">{TRACK_LABEL[t]}</Badge>)}
        <Badge tone="outline">{formatINR(r.price_1on1)} / 1:1</Badge>
        {r.upi_id && <Badge tone="outline">UPI set</Badge>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden /> LinkedIn
          </a>
        </Button>
        {r.id_proof_url ? (
          <Button variant="outline" size="sm" onClick={openDoc}>
            <FileText aria-hidden /> {docUrl ? 'Open ID again' : 'View ID proof'}
          </Button>
        ) : (
          <Badge tone="danger">No ID uploaded</Badge>
        )}
      </div>

      {error && <div className="mt-3"><ErrorBanner>{error}</ErrorBanner></div>}

      {rejecting && (
        <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-md)] bg-danger-soft p-3">
          <label htmlFor={`reason-${r.user_id}`} className="text-xs font-bold text-danger">
            Why? The applicant reads this verbatim.
          </label>
          <textarea
            id={`reason-${r.user_id}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="The uploaded ID does not match the claimed employer."
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface p-2.5 text-sm"
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-4">
        {r.status !== 'approved' && (
          <Button size="sm" disabled={!!busy} onClick={() => act(r.status === 'suspended' ? 'reinstate' : 'approve')}>
            {busy === 'approve' || busy === 'reinstate'
              ? <Loader2 className="animate-spin" aria-hidden />
              : r.status === 'suspended' ? <RotateCcw aria-hidden /> : <Check aria-hidden />}
            {r.status === 'suspended' ? 'Reinstate' : 'Approve'}
          </Button>
        )}
        {r.status === 'pending' && (
          rejecting ? (
            <>
              <Button variant="danger" size="sm" disabled={!reason.trim() || !!busy}
                      onClick={() => act('reject')}>
                {busy === 'reject' && <Loader2 className="animate-spin" aria-hidden />}
                Confirm rejection
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setRejecting(true)}>
              <X aria-hidden /> Reject
            </Button>
          )
        )}
        {r.status === 'approved' && (
          <Button variant="outline" size="sm" disabled={!!busy} onClick={() => act('suspend')}>
            {busy === 'suspend' && <Loader2 className="animate-spin" aria-hidden />}
            Suspend
          </Button>
        )}
      </div>
    </Card>
  )
}
