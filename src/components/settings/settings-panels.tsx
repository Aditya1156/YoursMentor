'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Check, Download, KeyRound, Loader2, Mail, Trash2, Undo2, UserCog,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, Field, Input, PasswordInput } from '@/components/ui/input'
import { ErrorBanner } from '@/components/auth/error-banner'
import { AvatarUpload } from '@/components/shared/avatar-upload'
import { createClient } from '@/lib/supabase/client'
import { TIER_LABEL } from '@/lib/types'
import { passwordField } from '@/lib/validation'

const LANGUAGES = [
  'Hindi','English','Bengali','Marathi','Telugu','Tamil','Gujarati','Kannada',
  'Malayalam','Odia','Punjabi','Assamese','Urdu',
]
const GOALS = [
  { v: 'internship', label: 'Land an internship' },
  { v: 'job', label: 'Get my first job' },
  { v: 'abroad', label: 'Study abroad' },
  { v: 'skills', label: 'Build real skills' },
  { v: 'college_life', label: 'Survive college' },
  { v: 'career_choice', label: 'Choose a direction' },
]
const TIERS = ['tier1', 'tier2', 'tier3', 'other'] as const

interface Profile {
  name: string
  college: string
  collegeTier: string
  branch: string
  graduationYear: number | null
  homeState: string
  languages: string[]
  firstGenGraduate: boolean
  goals: string[]
}
interface Prefs { reminders: boolean; summaries: boolean; product_news: boolean }

export function SettingsPanels({
  email, isGoogleOnly, isMentor = false, avatarUrl, profile, emailPreferences,
  deletionRequestedAt,
}: {
  email: string
  isGoogleOnly: boolean
  /** Mentors keep the learning fields, but they stop being the headline. */
  isMentor?: boolean
  avatarUrl?: string
  profile: Profile
  emailPreferences: Prefs
  deletionRequestedAt: string | null
}) {
  const router = useRouter()
  const [p, setP] = useState(profile)
  const [prefs, setPrefs] = useState(emailPreferences)
  const [busy, setBusy] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [confirmDelete, setConfirmDelete] = useState('')
  const [deleting, setDeleting] = useState(false)

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }))
  const toggle = (k: 'languages' | 'goals', v: string) =>
    setP((x) => ({
      ...x,
      [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v],
    }))

  const flash = (what: string) => {
    setSaved(what)
    setTimeout(() => setSaved(null), 2500)
  }

  async function saveProfile() {
    setBusy('profile'); setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('profiles').update({
      name: p.name.trim(),
      college: p.college.trim() || null,
      college_tier: p.collegeTier || null,
      branch: p.branch.trim() || null,
      graduation_year: p.graduationYear || null,
      home_state: p.homeState.trim() || null,
      languages: p.languages,
      first_gen_graduate: p.firstGenGraduate,
      goals: p.goals,
    }).eq('id', user!.id)
    setBusy(null)
    if (e) { setError(e.message); return }
    flash('profile'); router.refresh()
  }

  async function savePrefs(next: Prefs) {
    setPrefs(next)
    setBusy('prefs'); setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: e } = await supabase
      .from('profiles').update({ email_preferences: next }).eq('id', user!.id)
    setBusy(null)
    if (e) { setError(e.message); return }
    flash('prefs')
  }

  async function changePassword() {
    setError(null)
    const parsed = passwordField.safeParse(pw.next)
    if (!parsed.success) { setError(parsed.error.issues[0]!.message); return }
    if (pw.next !== pw.confirm) { setError('Those passwords do not match.'); return }

    setBusy('password')
    const { error: e } = await createClient().auth.updateUser({ password: pw.next })
    setBusy(null)
    if (e) { setError(e.message); return }
    setPw({ next: '', confirm: '' })
    flash('password')
  }

  async function requestDeletion() {
    setBusy('delete'); setError(null)
    const { data, error: e } = await createClient().rpc('request_account_deletion')
    setBusy(null)
    if (e) { setError(e.message); setDeleting(false); return }
    flash('delete')
    router.refresh()
    return data
  }

  async function undoDeletion() {
    setBusy('undo')
    await createClient().rpc('cancel_account_deletion')
    setBusy(null)
    router.refresh()
  }

  const purgeOn = deletionRequestedAt
    ? new Date(new Date(deletionRequestedAt).getTime() + 30 * 864e5)
    : null

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {deletionRequestedAt && (
        <Card className="border-danger bg-danger-soft p-5">
          <h2 className="flex items-center gap-2 text-base text-danger">
            <AlertTriangle className="size-4" aria-hidden /> This account is scheduled for deletion
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Everything is removed for good on{' '}
            <strong className="text-foreground">
              {purgeOn?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>
            . Until then you can change your mind.
          </p>
          <Button className="mt-4" disabled={busy === 'undo'} onClick={undoDeletion}>
            {busy === 'undo' ? <Loader2 className="animate-spin" aria-hidden /> : <Undo2 aria-hidden />}
            Keep my account
          </Button>
        </Card>
      )}

      {/* ---------------------------------------------------------- profile */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base">
            <UserCog className="size-4 text-subtle-foreground" aria-hidden /> Your details
          </h2>
          {saved === 'profile' && <Badge tone="green"><Check aria-hidden /> Saved</Badge>}
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          {isMentor
            ? 'Your account details. What students see is on your mentor profile above.'
            : 'These drive your matches, so keeping them current changes who you see.'}
        </p>

        <AvatarUpload name={p.name} currentUrl={avatarUrl} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required>
            <Input id="name" value={p.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email" hint="Changing this is not supported yet.">
            <Input id="email" value={email} disabled />
          </Field>
          <Field label="College" htmlFor="college">
            <Input id="college" value={p.college} onChange={(e) => set('college', e.target.value)} />
          </Field>
          <Field label="Branch" htmlFor="branch">
            <Input id="branch" value={p.branch} onChange={(e) => set('branch', e.target.value)} />
          </Field>
          <Field label="Graduation year" htmlFor="year">
            <Input id="year" type="number" min={2000} max={2100}
                   value={p.graduationYear ?? ''}
                   onChange={(e) => set('graduationYear', Number(e.target.value) || null)} />
          </Field>
          <Field label="Home state" htmlFor="state">
            <Input id="state" value={p.homeState} onChange={(e) => set('homeState', e.target.value)} />
          </Field>
        </div>

        <Field label="College tier" htmlFor="tier">
          <div className="flex flex-wrap gap-2" id="tier">
            {TIERS.map((t) => (
              <Pill key={t} on={p.collegeTier === t} onClick={() => set('collegeTier', t)}>
                {TIER_LABEL[t]}
              </Pill>
            ))}
          </div>
        </Field>

        <Field label="Languages" htmlFor="langs">
          <div className="flex flex-wrap gap-2" id="langs">
            {LANGUAGES.map((l) => (
              <Pill key={l} on={p.languages.includes(l)} onClick={() => toggle('languages', l)}>
                {l}
              </Pill>
            ))}
          </div>
        </Field>

        {!isMentor && (
        <Field label="What you are working towards" htmlFor="goals">
          <div className="flex flex-wrap gap-2" id="goals">
            {GOALS.map((g) => (
              <Pill key={g.v} on={p.goals.includes(g.v)} onClick={() => toggle('goals', g.v)}>
                {g.label}
              </Pill>
            ))}
          </div>
        </Field>
        )}

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
          <Checkbox checked={p.firstGenGraduate}
                    onChange={(e) => set('firstGenGraduate', e.target.checked)} />
          <span>I am the first in my family to go to college.</span>
        </label>

        <Button className="self-start" disabled={busy === 'profile'} onClick={saveProfile}>
          {busy === 'profile' && <Loader2 className="animate-spin" aria-hidden />}
          Save changes
        </Button>
      </Card>

      {/* ------------------------------------------------------------ email */}
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-subtle-foreground" aria-hidden /> Emails
          </h2>
          {saved === 'prefs' && <Badge tone="green"><Check aria-hidden /> Saved</Badge>}
        </div>

        {([
          { k: 'reminders' as const, label: 'Session reminders',
            hint: '24 hours before, and again 15 minutes before with the join link' },
          { k: 'summaries' as const, label: 'Session summaries',
            hint: "Your mentor's notes and next steps after a session" },
          { k: 'product_news' as const, label: 'New mentors and features',
            hint: 'Occasional. Off by default.' },
        ]).map((o) => (
          <label key={o.k} className="flex cursor-pointer items-start gap-2.5">
            <Checkbox checked={prefs[o.k]}
                      onChange={(e) => savePrefs({ ...prefs, [o.k]: e.target.checked })} />
            <span className="text-sm">
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </span>
          </label>
        ))}

        <p className="mt-1 rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Booking confirmations, cancellations and refunds are always sent. They are
          records of something you paid for, not marketing.
        </p>
      </Card>

      {/* --------------------------------------------------------- password */}
      {!isGoogleOnly && (
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-subtle-foreground" aria-hidden /> Password
            </h2>
            {saved === 'password' && <Badge tone="green"><Check aria-hidden /> Changed</Badge>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="pw1" hint="At least 8 characters.">
              <PasswordInput id="pw1" autoComplete="new-password" value={pw.next}
                             onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </Field>
            <Field label="Confirm" htmlFor="pw2">
              <PasswordInput id="pw2" autoComplete="new-password" value={pw.confirm}
                             onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
          </div>
          <Button variant="outline" className="self-start"
                  disabled={!pw.next || busy === 'password'} onClick={changePassword}>
            {busy === 'password' && <Loader2 className="animate-spin" aria-hidden />}
            Change password
          </Button>
        </Card>
      )}

      {/* ------------------------------------------------------- your data */}
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="flex items-center gap-2 text-base">
          <Download className="size-4 text-subtle-foreground" aria-hidden /> Your data
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Everything we hold about you — profile, bookings, reviews, credits, payments and
          notifications — as a single file.
        </p>
        <Button variant="outline" className="self-start" asChild>
          <a href="/api/me/export" download>
            <Download aria-hidden /> Download my data
          </a>
        </Button>
      </Card>

      {/* ----------------------------------------------------------- danger */}
      {!deletionRequestedAt && (
        <Card className="flex flex-col gap-3 border-danger/40 p-5">
          <h2 className="flex items-center gap-2 text-base text-danger">
            <Trash2 className="size-4" aria-hidden /> Delete my account
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your profile comes down straight away. Everything is erased for good after 30
            days, and you can change your mind at any point before that. Download your data
            first if you want a copy.
          </p>

          {deleting ? (
            <>
              <Field label={`Type DELETE to confirm`} htmlFor="confirm">
                <Input id="confirm" value={confirmDelete} placeholder="DELETE"
                       onChange={(e) => setConfirmDelete(e.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" disabled={confirmDelete !== 'DELETE' || busy === 'delete'}
                        onClick={requestDeletion}>
                  {busy === 'delete' && <Loader2 className="animate-spin" aria-hidden />}
                  Delete my account
                </Button>
                <Button variant="ghost" onClick={() => { setDeleting(false); setConfirmDelete('') }}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setDeleting(true)}>
              Delete my account
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}

function Pill({
  on, onClick, children,
}: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
        on ? 'border-primary bg-primary text-primary-foreground'
           : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted'
      }`}
    >
      {children}
    </button>
  )
}
