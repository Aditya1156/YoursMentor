'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/auth/error-banner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const TIERS = [
  { value: 'tier1', label: 'Tier 1', hint: 'IIT, NIT, BITS, IIIT' },
  { value: 'tier2', label: 'Tier 2', hint: 'State or well-known private' },
  { value: 'tier3', label: 'Tier 3', hint: 'Affiliated or lesser-known private' },
  { value: 'other', label: 'Not sure', hint: 'We will work it out' },
]

const STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi NCR','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand',
  'West Bengal','Other',
]

const LANGUAGES = [
  'Hindi','English','Bengali','Marathi','Telugu','Tamil','Gujarati','Kannada',
  'Malayalam','Odia','Punjabi','Assamese','Urdu',
]

const GOALS = [
  { value: 'internship', label: 'Land an internship' },
  { value: 'job', label: 'Get my first job' },
  { value: 'abroad', label: 'Study abroad' },
  { value: 'skills', label: 'Build real skills' },
  { value: 'college_life', label: 'Survive college' },
  { value: 'career_choice', label: 'Choose a direction' },
]

interface Answers {
  college: string
  collegeTier: string
  branch: string
  graduationYear: string
  homeState: string
  languages: string[]
  firstGenGraduate: boolean | null
  goals: string[]
  worry: string
}

const EMPTY: Answers = {
  college: '', collegeTier: '', branch: '', graduationYear: '',
  homeState: '', languages: [], firstGenGraduate: null, goals: [], worry: '',
}

/**
 * S1 — the matching quiz. One question per screen, because the audience is on
 * a phone and a seven-field form reads as work. Everything except the free-text
 * worry feeds match_score() in the database.
 */
export function OnboardingQuiz({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [a, setA] = useState<Answers>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) =>
    setA((prev) => ({ ...prev, [k]: v }))
  const toggle = (k: 'languages' | 'goals', v: string) =>
    setA((prev) => ({
      ...prev,
      [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v],
    }))

  const steps = [
    {
      title: `Where do you study, ${initialName}?`,
      hint: 'This is how we find seniors from colleges like yours.',
      valid: a.college.trim().length >= 2 && !!a.collegeTier,
      body: (
        <div className="flex flex-col gap-4">
          <Input
            placeholder="College name"
            value={a.college}
            onChange={(e) => set('college', e.target.value)}
            aria-label="College name"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {TIERS.map((t) => (
              <Choice
                key={t.value}
                selected={a.collegeTier === t.value}
                onClick={() => set('collegeTier', t.value)}
                title={t.label}
                hint={t.hint}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'What are you studying, and when do you finish?',
      valid: a.branch.trim().length >= 2 && /^\d{4}$/.test(a.graduationYear),
      body: (
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Branch, e.g. Computer Science"
            value={a.branch}
            onChange={(e) => set('branch', e.target.value)}
            aria-label="Branch"
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Graduation year, e.g. 2027"
            min={2000}
            max={2100}
            value={a.graduationYear}
            onChange={(e) => set('graduationYear', e.target.value)}
            aria-label="Graduation year"
          />
        </div>
      ),
    },
    {
      title: 'Where are you from?',
      hint: 'Mentors from your home state understand the context you are in.',
      valid: !!a.homeState,
      body: (
        <div className="grid gap-2 sm:grid-cols-2">
          {STATES.map((s) => (
            <Choice key={s} selected={a.homeState === s} onClick={() => set('homeState', s)} title={s} />
          ))}
        </div>
      ),
    },
    {
      title: 'Which languages are you most comfortable in?',
      hint: 'Pick as many as you like. You will be matched with mentors who speak them.',
      valid: a.languages.length > 0,
      body: (
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Pill key={l} selected={a.languages.includes(l)} onClick={() => toggle('languages', l)}>
              {l}
            </Pill>
          ))}
        </div>
      ),
    },
    {
      title: 'Are you the first in your family to go to college?',
      hint: 'No wrong answer. It helps us find someone who has been where you are.',
      valid: a.firstGenGraduate !== null,
      body: (
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice selected={a.firstGenGraduate === true} onClick={() => set('firstGenGraduate', true)} title="Yes, I am" />
          <Choice selected={a.firstGenGraduate === false} onClick={() => set('firstGenGraduate', false)} title="No, I am not" />
        </div>
      ),
    },
    {
      title: 'What are you trying to do right now?',
      hint: 'Pick everything that applies.',
      valid: a.goals.length > 0,
      body: (
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Pill key={g.value} selected={a.goals.includes(g.value)} onClick={() => toggle('goals', g.value)}>
              {g.label}
            </Pill>
          ))}
        </div>
      ),
    },
    {
      title: 'What worries you most about all this?',
      hint: 'Optional, and only your mentor sees it. Plain words are fine.',
      valid: true,
      body: (
        <textarea
          value={a.worry}
          onChange={(e) => set('worry', e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="e.g. Everyone in my class already has an internship and I have nothing on my resume."
          aria-label="Your biggest worry"
          className="w-full rounded-[var(--radius-sm)] border border-border bg-surface p-3.5 text-sm leading-relaxed placeholder:text-[var(--ink-300)]"
        />
      ),
    },
  ]

  const current = steps[step]!
  const last = step === steps.length - 1

  async function finish() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      setError('Your session expired. Please sign in again.')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        college: a.college.trim(),
        college_tier: a.collegeTier,
        branch: a.branch.trim(),
        graduation_year: Number(a.graduationYear),
        home_state: a.homeState,
        languages: a.languages,
        first_gen_graduate: a.firstGenGraduate,
        goals: a.goals,
        onboarding_complete: true,
      })
      .eq('id', user.id)

    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.push('/dashboard?matched=1')
    router.refresh()
  }

  return (
    <div className="container-page max-w-xl py-8 md:py-12">
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Question {step + 1} of {steps.length}</span>
          <span>About 2 minutes</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
          />
        </div>
      </div>

      <Card className="p-5 sm:p-7">
        <h1 className="text-xl sm:text-2xl">{current.title}</h1>
        {current.hint && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{current.hint}</p>
        )}
        <div className="mt-5">{current.body}</div>
        {error && <div className="mt-4"><ErrorBanner>{error}</ErrorBanner></div>}
      </Card>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft aria-hidden /> Back
        </Button>

        {last ? (
          <Button size="lg" disabled={busy} onClick={finish}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            See my matches
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={!current.valid}
            onClick={() => setStep((s) => s + 1)}
          >
            Next <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}

function Choice({
  selected, onClick, title, hint,
}: { selected: boolean; onClick: () => void; title: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-[var(--radius-md)] border p-3.5 text-left transition-colors',
        selected ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-muted'
      )}
    >
      <span className="block text-sm font-bold">{title}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
    </button>
  )
}

function Pill({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-[var(--radius-pill)] border px-3.5 py-2 text-sm font-semibold transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-surface text-muted-foreground hover:bg-surface-muted'
      )}
    >
      {children}
    </button>
  )
}
