# YoursMentor.in — near-peer mentorship platform

> *Know What to Do Next.*

**The product spec lives in [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md). Read it
before building any page.** This file holds the stack as actually built, what the spec
leaves open, and what has been decided since.

Background: [`docs/build-guide.pdf`](docs/build-guide.pdf) — the research doc the spec
came from (video SDK comparison, DPDP/GST notes, cost model).

---

## What this is

Students from Tier-2/3 Indian colleges book **₹99 group sessions** or short **1:1
sessions** with near-peer mentors — people 1–3 steps ahead, from similar college tiers,
home states and languages. Video happens inside the site. Two tracks: **First Job /
Internship** and **Going Abroad**.

Audience assumption behind every decision: an Android phone on mobile data in a hostel
room, not a MacBook on campus wifi.

---

## Stack

Next.js 16 (app router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres +
Auth + Storage) · Zod · deployed on Vercel.

**This replaces the spec's §3 stack** (Vite + Express + MongoDB + hand-rolled JWT). The
reasons are in the decisions table below. Where §3 and this file disagree, this file wins.

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
npm run build
npm run gate       # all four
```

`.env.local` holds the Supabase URL and publishable key (gitignored). The
`SUPABASE_SERVICE_ROLE_KEY` is still blank — needed from Week 3 for Razorpay webhooks,
LiveKit tokens and cron jobs.

---

## Layout

```
src/
  app/
    layout.tsx, page.tsx, globals.css, tokens.css ← the design system
    (auth)/     signup · signin · reset · update-password · complete-profile
    auth/       callback (PKCE, Google) · confirm (email links)
    <route>/    one folder per page from spec §8
  components/
    ui/         button, badge, card, accordion, avatar, input
    layout/     navbar (server) + navbar-client, footer
    shared/     logo, mentor-card, session-card, section-heading, states
    auth/       one form per auth screen
    landing/    landing-sections, faq
  lib/
    supabase/   client (browser) · server (RSC/actions) · admin (service role)
    session.ts  getSessionUser(), homeFor()
    utils.ts · types.ts · validation.ts · mock-data.ts
  proxy.ts      session refresh + route guards (Next 16's middleware)
supabase/migrations/
```

---

## Design system

All tokens are in [`src/app/tokens.css`](src/app/tokens.css) as CSS custom properties,
exposed to Tailwind through `@theme inline`.

**Never hardcode a colour, radius or font.** Use the semantic token (`bg-surface`,
`text-muted-foreground`, `rounded-[var(--radius-lg)]`).

Brand assets live in `public/brand/`: `mark.png` (the YM figure), `wordmark.png`,
`logo-horizontal.png` and `logo-stacked.png`. The navbar and footer use the mark plus a
live-text wordmark — "yours" in navy, "mentor.in" in brand blue — so it stays crisp and
reflows at 360px. Use the raster lockups for emails and social cards.

**The brand rule:** amber (`--cta-group`) means ₹99 group session. Blue (`--cta-1on1`,
also `--primary`) means paid 1:1 and every other primary action. Choose
`<Button variant="group">` vs `<Button variant="primary">` by what the button books, not
by how it looks. A student should tell the two paths apart without reading.

Section labels use `.eyebrow`. Page bodies sit inside `.container-page` (16px gutter at
360px, 1240px max).

**Every colour pair in the token set is verified against WCAG AA** (4.5:1 for text, 3:1
for large/secondary). If you add a token, check it before shipping — three values were
already pulled back for failing: the brand amber, its hover, and the success green.

---

## Auth and the 18+ gate

Supabase Auth owns credentials, email confirmation, password reset and Google OAuth.
`public.profiles` owns everything about the person, one row per `auth.users` row, created
by the `handle_new_user()` trigger.

V1 is **18+ only** (spec §2). That is enforced in three places, deliberately:

1. `dateOfBirthField` in `lib/validation.ts` — so the user hears about it immediately.
2. The `adult_needs_dob` **check constraint** on `public.profiles` — no client path can
   write an under-18 profile, whatever the form allowed.
3. `src/proxy.ts` — parks any account without `is_adult_confirmed` at `/complete-profile`
   before it can reach a protected page.

An **email sign-up** sends its date of birth through Supabase sign-up metadata, which the
trigger writes straight into the profile — so confirming the email on a different device
from the one you signed up on still works. A **Google sign-in** carries no date of birth,
so it is the only path that lands on `/complete-profile`.

---

## Decisions taken beyond the spec

| Decision | Why |
|---|---|
| **Supabase instead of MongoDB + hand-rolled JWT auth** | RattaMaro already runs it, so one mental model across both projects. Postgres fits the booking domain — seat holds, capacity, unique `(session_id, student_id)` — far better than documents. Supabase Auth deletes the auth code we would otherwise own. |
| **Next.js instead of Vite + Express** | One deploy target, matches RattaMaro. Route handlers cover the Razorpay webhook and LiveKit token minting; Vercel Cron covers hold expiry. |
| **Tailwind v4**, `@theme` in CSS, no `tailwind.config.js` | v4 replaced that file. Same outcome, less config. |
| Radix primitives written into `components/ui/` rather than `npx shadcn add` | No `tailwind.config.js` for the CLI to patch, and we need five primitives. Same Radix underneath. |
| `src/lib/supabase/*`, not the quickstart's `utils/supabase/*` | Matches RattaMaro exactly. |
| `breakthrough_story` is its own column | The designs make it a distinct quoted block on every mentor card, not part of the bio. |
| `trial_offer` flag on `mentor_profiles` | The designs show a "Book ₹99 Trial" amber CTA on one mentor. That is a flag, not a price check. |
| Credits chip in the navbar | Spec §6 has a credit ledger but never surfaces the balance. The designs put it in the navbar. |
| **Renamed OneStep → YoursMentor.in**, palette rebuilt from the supplied logo | 2026-10-02. Indigo/amber became blue/navy/cyan + amber, sampled from the artwork's own fills. |
| Amber kept for the ₹99 path after the rebrand | The logo is one blue family, cyan to navy. Two blues cannot tell the group and 1:1 paths apart at a glance on a cheap screen, and that distinction is the pricing model. Reasoning is written into `tokens.css`. |
| Brand amber darkened `#B8780A` → `#9C6408`, success green `#1F8A4C` → `#1A7A43` | White on the original amber was 3.67:1 and the green read 3.90:1 on its own badge — both under AA. The ₹99 button is the product's main CTA. |
| DOB travels in sign-up metadata, not browser storage | A confirmation email is often opened on a different device from the sign-up. Browser storage breaks there; metadata does not. |

## Where the designs and the spec disagree, the designs win

Log the divergence above and keep going. Never silently follow the spec over an approved comp.

---

## Hard rules (spec §2 — never break)

- Never store card or bank details. Razorpay holds them; we keep IDs only.
- All sessions on-platform or on a company-owned link. Never a mentor's personal link.
- Mask phone numbers and emails typed in chat.
- Mentors share experience only — no medical, legal, visa or immigration advice.
  Track 2 pages must show this notice.
- No ad pixels or tracking scripts in V1.
- 18+ only at launch.

## Quality bar (spec §10 and §13 — every page)

Zod on the client **and** a constraint or RLS policy in the database · RLS on every table ·
loading, empty and error states on every list · works at 360px · `npm run gate` clean.

**RLS protects reads. It is not where booking or payment logic lives** — those run
server-side with the service-role client in `lib/supabase/admin.ts`, which bypasses RLS
and must never be imported into a Client Component.

---

## Status

| | |
|---|---|
| Done | Design tokens · base components · navbar + footer · mentor card · session card · **P1 Landing** · initial migration (profiles, mentor_profiles, RLS, storage buckets) · **A1–A4 auth on Supabase** · route guards |
| Not yet applied | The migration has **not** been run against the cloud project — see below |
| Placeholder | Every other route renders a stub naming its spec ID and week |
| Mock data | `lib/mock-data.ts` still feeds the landing page. Replace when the mentors query lands. |
| Next | Spec §11 Week 1 — M1 mentor application + Supabase Storage uploads; then P2 directory |

### Applying the migration

Nothing in `supabase/migrations/` has run against `bmyzudohkgxdnifpyanv` yet. Either:

```bash
npm i -g supabase
supabase link --project-ref bmyzudohkgxdnifpyanv
supabase db push
```

or paste `supabase/migrations/20261002000001_init.sql` into the SQL editor in the
Supabase dashboard. Google sign-in also needs enabling under Authentication → Providers.
