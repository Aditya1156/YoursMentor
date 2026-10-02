'use client'

import { useState } from 'react'
import { Check, Copy, Tablet, X } from 'lucide-react'

/**
 * Brings a tablet into the same call as a writing surface.
 *
 * The tablet signs in as the same person — the session cookie is what carries
 * the account, so there is no pairing code to invent and nothing new to trust.
 * It joins with a companion token: no camera, no microphone, data only. That
 * is what stops one person appearing twice in the grid and echoing themselves.
 *
 * The QR is drawn from a public chart endpoint rather than a bundled library;
 * it is one image, requested only when the panel is open.
 */
export function CompanionInvite({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  // The origin only exists in the browser, so it is read when the dialog is
  // opened rather than in an effect. An effect would mean a render pass whose
  // only job is to fill in a string nobody can see yet.
  function show() {
    setUrl(`${window.location.origin}/room/${sessionId}?device=companion`)
    setOpen(true)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard refused; the link is on screen to read */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
      >
        <Tablet className="size-3.5" aria-hidden /> Use a tablet
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Connect a tablet"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base">Write from your tablet</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Open this on a tablet you are already signed in on. It joins the
                  whiteboard only — no second camera or microphone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 text-subtle-foreground hover:bg-surface-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(url)}`}
                alt=""
                width={220}
                height={220}
                className="mx-auto mt-4 rounded-[var(--radius-md)] border border-border"
              />
            )}

            <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-muted p-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[0.6875rem] text-muted-foreground">
                {url}
              </code>
              <button
                type="button"
                onClick={copy}
                className="flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <p className="mt-3 text-[0.6875rem] leading-relaxed text-subtle-foreground">
              A stylus works best. The tablet draws on the same board everyone in the
              session is looking at.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
