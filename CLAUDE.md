# OneStep — near-peer mentorship platform

**The full spec lives in [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md). Read it before
building any page.** This file holds only what the spec leaves open, what has been
decided since, and where things live.

Background reading: [`docs/build-guide.pdf`](docs/build-guide.pdf) — the original research
doc the spec was written from (video SDK comparison, DPDP/GST notes, cost model).

---

## What this is

Students from Tier-2/3 Indian colleges book **₹99 group sessions** or short **1:1
sessions** with near-peer mentors — people 1–3 steps ahead, from similar college tiers,
home states and languages. Video happens inside the site. Two tracks: **First Job /
Internship** and **Going Abroad**.

Audience assumption that drives every decision: an Android phone on mobile data in a
hostel room, not a MacBook on campus wifi.

---

## Commands

```bash
npm install            # once, at the repo root (npm workspaces)
npm run dev            # client on :5173, proxies /api to :4000
npm run dev:server     # API on :4000
npm run build          # both workspaces
npm run typecheck      # both workspaces
npm run test           # server tests (vitest)
```

Without `MONGODB_URI`, the API starts a temporary in-memory MongoDB — fine for local
work, and everything is lost on restart. Set a real Atlas URI in `.env` to keep data.
Google sign-in returns 503 until `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set;
email links print to the server console until `RESEND_API_KEY` is set.

---

## Layout

```
/client/src
  /app          router, providers, root layout
  /pages        one folder per page from spec §8
  /components   ui/ (primitives) · layout/ (navbar, footer) · shared/ (domain cards)
  /features     auth/, mentors/, bookings/, sessions/, payments/, admin/
  /lib          types.ts, utils.ts, mock-data.ts (delete when APIs land)
  /styles       tokens.css ← the design system, globals.css
/server/src     config/ models/ routes/ controllers/ services/ middleware/ jobs/
/docs           MASTER_PROMPT.md, build-guide.pdf
```

---

## Design system

Everything is in [`client/src/styles/tokens.css`](client/src/styles/tokens.css). Tokens
are CSS custom properties exposed to Tailwind through `@theme inline`.

**Never hardcode a colour, radius or font.** Use the semantic token
(`bg-surface`, `text-muted-foreground`, `rounded-[var(--radius-lg)]`).

**The brand rule:** amber (`--cta-group`) means ₹99 group session. Indigo
(`--cta-1on1`, also `--primary`) means paid 1:1 and every other primary action. Choose
`<Button variant="group">` vs `<Button variant="primary">` based on what the button
books, not on how it looks. A student should be able to tell the two paths apart
without reading.

Section labels use the `.eyebrow` utility. Page bodies sit inside `.container-page`
(16px gutter at 360px, 1240px max).

---

## Decisions taken beyond the spec

| Decision | Why |
|---|---|
| **Tailwind v4** with `@tailwindcss/vite` and CSS-first `@theme`, no `tailwind.config.js` | Spec §3 said "mapped in tailwind.config"; v4 replaced that file with `@theme` in CSS. shadcn/ui supports v4. Same outcome, less config. |
| Radix primitives written directly into `components/ui/` rather than `npx shadcn add` | No `tailwind.config.js` for the CLI to patch, and we only need five primitives. Same Radix underneath. |
| `breakthroughStory` is a first-class `MentorProfile` field | The designs make it a distinct quoted block on every mentor card, not part of the bio. Needs its own field and char limit. |
| `trialOffer` flag on a mentor | The designs show a "Book ₹99 Trial" amber CTA on one mentor. Needs a flag, not a price check. |
| Credits chip in the navbar | Spec §6 has `CreditLedger` but never surfaces the balance. The designs put it in the navbar. |
| Footer carries all nine legal/track links in one slim row | Designs show a slim footer; spec §8 P1.12 lists more links than it shows. Both satisfied. |
| `bcryptjs` instead of `bcrypt` | Pure JS, no native build step. Same algorithm, no node-gyp on anyone's machine. |
| Refresh revocation via a `tokenVersion` counter on `User` | Spec §6 has no token collection. A counter gives logout-everywhere and reset-invalidates-sessions without one. |
| Auth Zod rules duplicated in `client/src/lib/validation.ts` and `server/src/schemas/` | A shared workspace would remove the drift risk but costs build complexity at V1 size. **Change both together.** |
| `/complete-signup` page (not in spec §8) | Google never returns a date of birth, so a Google signup has to stop somewhere to collect DOB + the 18+ confirmation. Spec §8 A1 asks for this screen without naming a route. |
| Dev server falls back to an in-memory MongoDB when `MONGODB_URI` is unset | `npm run dev:server` works offline before anyone has an Atlas account. Refuses to start in production without a real URI. |

## Where the designs and the spec disagree, the designs win

Log the divergence in the table above and keep going. Do not silently follow the spec
over an approved comp.

---

## Hard rules (from spec §2 — never break)

- Never store card or bank details. Razorpay holds them; we keep IDs only.
- All sessions on-platform or on a company-owned link. Never a mentor's personal link.
- Mask phone numbers and emails typed in chat.
- Mentors share experience only — no medical, legal, visa or immigration advice.
  Track 2 pages must show this notice.
- No ad pixels or tracking scripts in V1.
- 18+ only at launch. Under-18 needs a real DPDP parental-consent flow — V2.

## Quality bar (spec §10 and §13 — every page)

Zod on client *and* server · role check on every protected route · loading, empty and
error states on every list · works at 360px · tests for slot generation, match score and
refund rules · no console errors.

---

## Status

| | |
|---|---|
| Done | Monorepo scaffold · design tokens · base components · navbar + footer · mentor card · session card · **P1 Landing** · User model · **auth API** · **A1–A4 auth pages** · protected routes |
| Placeholder | Every other route renders a stub naming its spec ID and week — see `app/router.tsx` |
| Mock data | `lib/mock-data.ts` stands in for `GET /api/public/featured-mentors` and `GET /api/sessions`. Delete it when those land. |
| Tests | 37 passing (`npm run test --workspace=server`): age maths, JWT/one-time tokens, and the auth API end to end |
| Next | Spec §11 Week 1 — MentorProfile model, M1 mentor application, Cloudinary uploads |
