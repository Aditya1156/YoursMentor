# YoursMentor.in

<p align="center">
  <img src="public/brand/logo-horizontal.png" alt="YoursMentor.in" width="380" />
</p>

<p align="center">
  <strong><em>Know What to Do Next.</em></strong><br />
  Near-peer mentorship platform connecting students from Tier-2 and Tier-3 Indian colleges with mentors 1–3 steps ahead.
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16.2_(App_Router)-000000?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-PostgreSQL_16-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="https://livekit.io"><img src="https://img.shields.io/badge/LiveKit-WebRTC-black?style=flat-square" alt="LiveKit" /></a>
</p>

---

## 🎯 Overview

Students in Tier-2 and Tier-3 engineering and degree colleges across India face a persistent guidance gap: lack of active alumni networks, opaque off-campus placement practices, and overpriced commercial counseling.

**YoursMentor.in** levels the playing field by connecting students with **near-peer mentors** — seniors who graduated from similar colleges, speak regional languages, and recently navigated the exact transitions students are facing today.

### Core Tracks
- **Track 1: First Job & Tech Internship** — Roadmap guidance, project critiques, resume reviews, cold outreach strategies, DSA/system design prep, and mock technical interviews.
- **Track 2: Going Abroad** — MS/PhD application strategies, GRE/IELTS prep, university shortlisting, funding/scholarships navigation, and Statement of Purpose (SOP) reviews.

### Session Formats
1. **₹99 Cohort Group Sessions** — Ultra-affordable, high-density live sessions (max 10–20 students) diving deep into specific tactical topics.
2. **1:1 Deep Dive Mentorship** — Private video sessions booked directly from a mentor's live 14-day availability calendar.
3. **In-Platform WebRTC Video** — Low-bandwidth, low-latency live calls powered by LiveKit, engineered specifically for hostel rooms on mobile data.

---

## ⚡ Key Architectural & Engineering Highlights

### 1. Zero-Direct-Write Booking Engine
Seats and financial transactions never move through standard client-level table inserts or updates.
- Sensitive tables (`bookings`, `payments`, `credit_ledger`) grant **zero `INSERT` or `UPDATE` privileges** to `authenticated` users.
- State transitions are strictly controlled via PostgreSQL `SECURITY DEFINER` stored procedures:
  - `hold_seat()`: Atomically holds a seat using `SELECT ... FOR UPDATE` with capacity checks.
  - `book_one_on_one()`: Serializes slot acquisition using PostgreSQL transaction-level advisory locks (`pg_advisory_xact_lock`), eliminating double-booking races.
  - `cancel_booking()`: Automates the 24-hour refund threshold into platform credits.
  - `leave_review()`: Enforces that only verified attendees can review a completed session once.

### 2. High Concurrency & Seat Contention Safety
- Concurrent student checkouts are serialized directly inside Postgres.
- In race condition stress tests (e.g. 12 concurrent requests racing for 3 remaining seats), the database reliably grants exactly 3 holds and rejects 9 with descriptive errors.
- Abandoned checkouts automatically release seats after a 10-minute hold window. Empty 1:1 sessions are automatically reaped and their calendar slots restored.

### 3. Strict Triple-Layer 18+ Verification
Compliance with Indian digital service safety standards is enforced across three distinct boundaries:
1. **Client Layer:** Immediate feedback via Zod schema validation on date of birth.
2. **Database Layer:** `adult_needs_dob` table `CHECK` constraint on `public.profiles`.
3. **Edge Proxy Layer:** Next.js route proxy (`src/proxy.ts`) gates unconfirmed profiles at `/complete-profile` before accessing any protected route.

### 4. Privacy, DPDP Safeguards & Anti-Circumvention
- **Chat Masking:** Real-time database triggers mask phone numbers, emails, and external social handles typed in session chat.
- **Privacy-Preserving Asset Proxying:** Mentor company logos are fetched server-side and cached in Supabase Storage, preventing third-party tracker leakage and external CDN hotlinks.
- **Clear Disclaimers:** Track 2 enforces mandatory legal/visa disclaimer banners across all booking surfaces.

### 5. Role-Based Navigation & Experience
Dynamic headers and route guards deliver customized experiences for each user type:
- **Visitors:** Discovery feed, mentor directory, onboarding, and "Become a Mentor" landing pages.
- **Students:** Active bookings, personal refund credit wallet, notifications, and session history.
- **Mentors:** Host console, calendar slot publisher, payout earnings ledger, and attendee rosters.
- **Admins:** Host approval pipeline, session management, and dispute mediation.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Route Handlers) |
| **UI Library** | [React 19](https://react.dev/), [Radix UI Primitives](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/) with `@theme inline` design tokens |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 16, Row Level Security, Supabase Auth, Storage) |
| **Live Video** | [LiveKit](https://livekit.io/) React Components & WebRTC Server SDK |
| **Payments** | [Razorpay](https://razorpay.com/) (UPI, Netbanking, Cards) + Internal Credit Ledger |
| **Validation** | [Zod](https://zod.dev/) |
| **Testing** | [Vitest](https://vitest.dev/), Python smoke suites, and native PostgreSQL migration test harness |

---

## 📁 Repository Structure

```
├── docs/                   # Product specifications, research documents, and design notes
│   ├── MASTER_PROMPT.md    # Comprehensive product specification
│   └── build-guide.pdf     # Video SDK benchmarks, DPDP/GST notes, and unit economics
├── public/                 # Static assets, branding graphics, and icons
├── scripts/                # Administrative utilities and integration tests
│   ├── make-admin.sh       # Secure CLI script to elevate a user role
│   └── smoke/              # End-to-end multi-role Python smoke tests
├── src/
│   ├── app/                # Next.js App Router (pages, layout, tokens, API routes)
│   │   ├── (admin)/        # Admin dashboard and moderation console
│   │   ├── (auth)/         # Authentication screens (sign-in, sign-up, password reset)
│   │   ├── (mentor)/       # Mentor portal, availability scheduler, and earnings
│   │   ├── api/            # Route handlers (LiveKit tokens, cron tasks, webhooks)
│   │   ├── booking/        # 1:1 and group booking flows
│   │   ├── checkout/       # Razorpay checkout and credit application
│   │   ├── mentors/        # Searchable mentor directory & profile pages
│   │   ├── room/           # LiveKit video conference room
│   │   ├── tokens.css      # WCAG AA verified design system tokens
│   │   └── globals.css     # Global CSS and Tailwind directives
│   ├── components/         # Reusable UI component library
│   │   ├── ui/             # Radix-based primitives (Button, Card, Accordion, etc.)
│   │   ├── layout/         # Dynamic role-aware navigation and footer
│   │   ├── shared/         # Mentor cards, session cards, brand wordmarks
│   │   ├── auth/           # Form controllers for authentication
│   │   └── landing/        # Landing page sections, hero, interactive FAQ
│   ├── lib/                # Shared utilities, session helpers, validations
│   │   ├── supabase/       # Browser client, Server client, and Admin service-role client
│   │   ├── session.ts      # Authentication session parser and role router
│   │   ├── validation.ts   # Zod validation schemas
│   │   └── types.ts        # TypeScript data contracts
│   └── proxy.ts            # Route guards, session refresh, and adult verification
└── supabase/
    ├── migrations/         # 17 sequential SQL migrations (DDL, triggers, RLS, functions)
    ├── tests/              # Isolated local Postgres transactional test suite
    └── push.sh             # Production migration deployment script
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher
- **PostgreSQL 16**: Required if running local database tests (`brew install postgresql@16` on macOS)
- **Supabase CLI** (optional, for remote deployments): `brew install supabase/tap/supabase`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aditya1156/YoursMentor.git
   cd YoursMentor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` and populate the values:
   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Anon / Publishable API Key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (*Server-only, bypasses RLS*) |
   | `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Public Key ID |
   | `RAZORPAY_KEY_ID` | Razorpay Secret Key ID |
   | `RAZORPAY_KEY_SECRET` | Razorpay API Secret |
   | `RAZORPAY_WEBHOOK_SECRET` | Secret for verifying payment webhook signatures |
   | `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit Cloud WebSocket URL (`wss://...`) |
   | `LIVEKIT_API_KEY` | LiveKit Project API Key |
   | `LIVEKIT_API_SECRET` | LiveKit Secret Key (*Used to sign JWT join tokens*) |
   | `CRON_SECRET` | Secret bearer token for Vercel Cron routes |
   | `NEXT_PUBLIC_SITE_URL` | Base URL of the deployment (e.g. `http://localhost:3000`) |

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

The codebase maintains strict quality gating:

```bash
# Run typechecking
npm run typecheck

# Run linter
npm run lint

# Run database migration & transactional test suite (requires local postgresql@16)
npm run db:test

# Run full CI quality gate (typecheck + lint + build + db tests)
npm run gate
```

### Database Integration Test Suite
The database test suite (`./supabase/tests/run.sh`) spins up an isolated temporary Postgres instance in `/tmp/ymp`, applies every migration sequentially from scratch, and executes 44 transactional test assertions verifying:
- Atomicity of seat holds and releases
- Capacity constraints under high concurrency
- Automated credit refund ledger on 24h+ cancellations
- Automatic cancellation of under-subscribed group cohorts (6h before start)
- Contact masking triggers for phone, email, and social handles
- Anti-tampering privileges (preventing clients from modifying seat counts, roles, or approvals)

---

## 🎨 Design System & Accessibility

All design tokens are defined in [`src/app/tokens.css`](src/app/tokens.css) and wired into Tailwind CSS v4 via `@theme inline`.

- **WCAG AA Compliance:** Every text/background combination has been verified to meet or exceed WCAG AA contrast standards (minimum 4.5:1 for body copy, 3:1 for large display text).
- **Semantic CTA Conventions:**
  - **Amber (`--cta-group`):** Exclusively signifies ₹99 Group Sessions.
  - **Brand Blue (`--cta-1on1` / `--primary`):** Exclusively signifies 1:1 booking paths and standard primary actions.
  *Students are able to distinguish cohort vs. 1:1 actions purely by visual weight and color.*
- **Mobile-First Responsive Layout:** Calibrated specifically for low-end Android viewports (down to 360px) and varying network conditions.

---

## ⏱️ Background Cron Jobs

Background routines run through `/api/cron/*` endpoints, scheduled via `vercel.json` and secured with timing-safe constant-time `CRON_SECRET` verification:

| Route | Frequency | Purpose |
|---|---|---|
| `/api/cron/release-holds` | Every 5 minutes | Reclaims expired seat holds from abandoned checkouts |
| `/api/cron/complete-sessions` | Every 15 minutes | Transitions past sessions to completed; prepares payouts and review prompts |
| `/api/cron/auto-cancel` | Hourly | Automatically cancels and refunds cohort sessions failing minimum seat requirements |
| `/api/cron/purge-accounts` | Daily at 03:00 | Securely purges scheduled deletion requests in compliance with DPDP |

---

## 🛡️ Contributor Rules & Invariants

When contributing to YoursMentor.in, adhere strictly to these core rules:
1. **Never write directly to transactional tables:** Do not add `INSERT` or `UPDATE` queries targeting `bookings`, `payments`, or `credit_ledger`. All mutations must go through database-level functions.
2. **Preserve the 18+ invariant:** Any new user onboarding flow must collect and persist date of birth to satisfy the `adult_needs_dob` check constraint.
3. **Use semantic tokens:** Avoid raw hex colors or arbitrary pixel radiuses; always use tokens from `tokens.css`.
4. **Clean quality gate:** All PRs must pass `npm run gate` without errors or warnings.

---

## 👤 Author & Acknowledgments

- **Lead Developer & Creator:** Aditya — [@refactorslife](https://youtube.com/@refactorslife)
- Built with passion for empowering students across Bharat.
