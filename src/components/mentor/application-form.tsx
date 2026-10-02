'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, FileUp, Loader2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, Field, Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/auth/error-banner'
import { AvatarUpload } from '@/components/shared/avatar-upload'
import { createClient } from '@/lib/supabase/client'
import { TIER_LABEL, TRACK_LONG, type Track } from '@/lib/types'
import type { MentorApplication } from '@/lib/queries/mentor'
import { cn, formatINR } from '@/lib/utils'

const LANGUAGES = [
  'Hindi','English','Bengali','Marathi','Telugu','Tamil','Gujarati','Kannada',
  'Malayalam','Odia','Punjabi','Assamese','Urdu',
]
const TIERS = ['tier1', 'tier2', 'tier3', 'other'] as const
const TRACKS: Track[] = ['first_job', 'abroad']

const MAX_UPLOAD = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function MentorApplicationForm({
  initial, name = 'You', avatarUrl,
}: {
  initial: MentorApplication
  name?: string
  avatarUrl?: string
}) {
  const router = useRouter()
  const [a, setA] = useState(initial)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof MentorApplication>(k: K, v: MentorApplication[K]) =>
    setA((p) => ({ ...p, [k]: v }))
  const toggleIn = <K extends 'languages' | 'tracks' | 'topics'>(k: K, v: string) =>
    setA((p) => ({
      ...p,
      [k]: (p[k] as string[]).includes(v)
        ? (p[k] as string[]).filter((x) => x !== v)
        : [...(p[k] as string[]), v],
    }))

  async function upload(file: File) {
    setError(null)
    if (!ACCEPTED.includes(file.type)) {
      setError('Upload a JPG, PNG, WebP or PDF.')
      return
    }
    if (file.size > MAX_UPLOAD) {
      setError('That file is over 5MB. Please upload a smaller one.')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUploading(false)
      setError('Your session expired. Please sign in again.')
      return
    }

    // The storage policy keys on the first path segment being the user id, so
    // nobody can read or overwrite anyone else's document.
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${user.id}/id-proof-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('mentor-documents')
      .upload(path, file, { upsert: true, contentType: file.type })

    setUploading(false)
    if (uploadError) {
      setError(uploadError.message)
      return
    }
    set('idProofUrl', path)
  }

  const required =
    a.headline.trim().length >= 8 &&
    a.breakthroughStory.trim().length >= 20 &&
    a.collegeTier !== '' &&
    a.languages.length > 0 &&
    a.tracks.length > 0 &&
    /^https?:\/\/(www\.)?linkedin\.com\//i.test(a.linkedinUrl.trim()) &&
    a.price1on1 >= 99 && a.price1on1 <= 499 &&
    agreed

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      setError('Your session expired. Please sign in again.')
      return
    }

    const row = {
      user_id: user.id,
      headline: a.headline.trim(),
      story: a.story.trim() || null,
      breakthrough_story: a.breakthroughStory.trim(),
      current_position: a.currentPosition.trim() || null,
      company: a.company.trim() || null,
      country: a.country.trim() || 'India',
      college: a.college.trim() || null,
      college_tier: a.collegeTier || null,
      college_line: a.collegeLine.trim() || null,
      home_state: a.homeState.trim() || null,
      languages: a.languages,
      first_gen_graduate: a.firstGenGraduate,
      tracks: a.tracks,
      topics: a.topics,
      linkedin_url: a.linkedinUrl.trim(),
      id_proof_url: a.idProofUrl || null,
      price_1on1: a.price1on1,
      upi_id: a.upiId.trim() || null,
    }

    // `status` is revoked from `authenticated`, so an applicant cannot approve
    // themselves — a fresh row defaults to 'pending'.
    const { error: saveError } = await supabase
      .from('mentor_profiles')
      .upsert(row, { onConflict: 'user_id' })

    // `profiles.role` is not writable by clients — setting it from the browser
    // would be the same path an attacker uses to become an admin. This
    // function can only ever move student -> mentor, on your own row.
    if (!saveError) {
      await supabase.rpc('become_mentor_applicant')
    }

    setBusy(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    router.push('/apply-to-mentor')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Section title="About you" hint="This is what students read first.">
        <div>
          <p className="mb-2 text-sm font-semibold">Your photo</p>
          <AvatarUpload name={name} currentUrl={avatarUrl} size="lg" />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Students pick mentors who look like someone they could actually talk to. A
            plain photo of your face does more than anything else on this page.
          </p>
        </div>

        <Field label="Headline" htmlFor="headline" required
               hint="e.g. Software Engineer at PhonePe">
          <Input id="headline" value={a.headline} maxLength={120}
                 onChange={(e) => set('headline', e.target.value)} />
        </Field>

        <Field
          label="The breakthrough story"
          htmlFor="breakthrough"
          required
          hint="One or two sentences on the thing you cracked. This is the quote on your card, so make it specific."
        >
          <textarea
            id="breakthrough"
            rows={3}
            maxLength={280}
            value={a.breakthroughStory}
            onChange={(e) => set('breakthroughStory', e.target.value)}
            placeholder="Cracked off-campus SDE-1 after 120 rejections. Let us fix your cold outreach."
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-sm leading-relaxed"
          />
        </Field>

        <Field label="Your longer journey" htmlFor="story"
               hint="Optional. What you were up against and what actually changed it.">
          <textarea
            id="story" rows={5} maxLength={1000} value={a.story}
            onChange={(e) => set('story', e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-sm leading-relaxed"
          />
        </Field>
      </Section>

      <Section title="Your background" hint="This is what the matching runs on.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current role" htmlFor="role">
            <Input id="role" value={a.currentPosition}
                   onChange={(e) => set('currentPosition', e.target.value)} />
          </Field>
          <Field label="Company or university" htmlFor="company">
            <Input id="company" value={a.company}
                   onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label="Your college" htmlFor="college">
            <Input id="college" value={a.college}
                   onChange={(e) => set('college', e.target.value)} />
          </Field>
          <Field label="Home state" htmlFor="state">
            <Input id="state" value={a.homeState}
                   onChange={(e) => set('homeState', e.target.value)} />
          </Field>
        </div>

        <Field label="College tier" htmlFor="tier" required>
          <div className="flex flex-wrap gap-2" id="tier">
            {TIERS.map((t) => (
              <Pill key={t} selected={a.collegeTier === t} onClick={() => set('collegeTier', t)}>
                {TIER_LABEL[t]}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label="How students should see your path" htmlFor="line"
               hint="e.g. Ex-Tier 3 College (UPTU, Lucknow)">
          <Input id="line" value={a.collegeLine}
                 onChange={(e) => set('collegeLine', e.target.value)} />
        </Field>

        <Field label="Languages you can mentor in" htmlFor="langs" required>
          <div className="flex flex-wrap gap-2" id="langs">
            {LANGUAGES.map((l) => (
              <Pill key={l} selected={a.languages.includes(l)}
                    onClick={() => toggleIn('languages', l)}>{l}</Pill>
            ))}
          </div>
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
          <Checkbox checked={a.firstGenGraduate}
                    onChange={(e) => set('firstGenGraduate', e.target.checked)} />
          <span>I am the first in my family to go to college.</span>
        </label>
      </Section>

      <Section title="What you can help with">
        <Field label="Tracks" htmlFor="tracks" required>
          <div className="flex flex-col gap-2" id="tracks">
            {TRACKS.map((t) => (
              <button
                key={t} type="button" onClick={() => toggleIn('tracks', t)}
                aria-pressed={a.tracks.includes(t)}
                className={cn(
                  'rounded-[var(--radius-md)] border p-3.5 text-left text-sm font-semibold transition-colors',
                  a.tracks.includes(t)
                    ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-muted'
                )}
              >
                {TRACK_LONG[t]}
              </button>
            ))}
          </div>
        </Field>

        {a.tracks.includes('abroad') && (
          <p className="rounded-[var(--radius-sm)] bg-accent-soft px-3.5 py-2.5 text-xs leading-relaxed text-accent-soft-foreground">
            Track 2 is peer experience only. You must not give visa, immigration or legal
            advice — this notice is shown to students too.
          </p>
        )}

        <Field label="Topics" htmlFor="topics"
               hint="Comma separated. These become the tags on your card.">
          <Input
            id="topics"
            defaultValue={a.topics.join(', ')}
            placeholder="Off-Campus Referrals, DSA in Java, Cold DM Strategy"
            onBlur={(e) =>
              set('topics', e.target.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8))
            }
          />
        </Field>
      </Section>

      <Section title="Verification" hint="Checked by a person. Never shown to students.">
        <Field label="LinkedIn profile" htmlFor="linkedin" required>
          <Input id="linkedin" type="url" value={a.linkedinUrl}
                 placeholder="https://linkedin.com/in/yourname"
                 onChange={(e) => set('linkedinUrl', e.target.value)} />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">College or company ID</span>
          {a.idProofUrl ? (
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-success bg-success-soft p-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-success">
                <Check className="size-4" aria-hidden /> Document uploaded
              </span>
              <Button variant="ghost" size="sm" onClick={() => set('idProofUrl', '')}>
                <Trash2 aria-hidden /> Remove
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-muted p-6 text-center hover:bg-surface">
              {uploading ? (
                <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              ) : (
                <FileUp className="size-5 text-subtle-foreground" aria-hidden />
              )}
              <span className="text-sm font-semibold">
                {uploading ? 'Uploading…' : 'Upload an offer letter, college ID or employee ID'}
              </span>
              <span className="text-xs text-muted-foreground">JPG, PNG, WebP or PDF, up to 5MB</span>
              <input
                type="file" className="sr-only" accept={ACCEPTED.join(',')}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f) }}
              />
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            Stored privately. Only you and our review team can open it.
          </p>
        </div>
      </Section>

      <Section title="Pricing and payout">
        <Field label="Your 1:1 price" htmlFor="price" required
               hint="Between ₹99 and ₹499 for 30 minutes. You keep 75%.">
          <Input id="price" type="number" min={99} max={499} value={a.price1on1}
                 onChange={(e) => set('price1on1', Number(e.target.value))} />
        </Field>
        <p className="rounded-[var(--radius-sm)] bg-surface-muted px-3.5 py-2.5 text-xs text-muted-foreground">
          You earn <strong className="text-foreground">{formatINR(Math.round(a.price1on1 * 0.75))}</strong>{' '}
          per 1:1, and <strong className="text-foreground">{formatINR(Math.round(99 * 0.75 * 10))}</strong>{' '}
          from a full ₹99 room of 10 students.
        </p>
        <Field label="UPI ID for payouts" htmlFor="upi"
               hint="Payouts are made by hand each cycle in V1.">
          <Input id="upi" value={a.upiId} placeholder="yourname@upi"
                 onChange={(e) => set('upiId', e.target.value)} />
        </Field>
      </Section>

      <Card className="p-4">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            I agree to the{' '}
            <Link href="/code-of-conduct" className="font-semibold text-primary hover:underline">
              Code of Conduct
            </Link>
            . I will keep all contact on the platform, share experience rather than medical,
            legal or visa advice, and treat every student with respect whatever their college
            or English.
          </span>
        </label>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Badge tone="neutral">Reviewed within 48 hours</Badge>
        <Button type="submit" size="lg" disabled={!required || busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          Submit application
        </Button>
      </div>
    </form>
  )
}

function Section({
  title, hint, children,
}: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-base">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </Card>
  )
}

function Pill({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={selected}
      className={cn(
        'rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-sm font-semibold transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted'
      )}
    >
      {children}
    </button>
  )
}
