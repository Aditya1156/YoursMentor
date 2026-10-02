# MASTER PROMPT — OneStep (Near-Peer Mentorship Platform)

> Placeholders resolved 2026-10-02. Design tokens in Section 4 are derived from
> the approved UI/UX designs and implemented in `client/src/styles/tokens.css`.

> **How to use this file**
> 1. Put this file in the root of the repo as `CLAUDE.md` (or `docs/MASTER_PROMPT.md` and point `CLAUDE.md` to it).
> 2. Fill every `{{PLACEHOLDER}}` (name, theme colours, fonts, logo) before starting.
> 3. Build **one page at a time** using the "Prompt template per page" in Section 12.
> 4. After each page is done, tick it in Section 11 and commit.

---

## 1. Product in one paragraph

OneStep connects students from Tier-2/3 colleges with **near-peer mentors**: people just 1–3 steps ahead of them, from similar backgrounds (college tier, home state, language, first-generation graduate). Students book **affordable group sessions (₹99)** or short **1:1 sessions**, pay online, and join a video call inside the website. Two tracks at launch:

- **Track 1 – First Job / Internship** (skills, resume, interviews, college life, career choices)
- **Track 2 – Going Abroad** (mentors who moved abroad from middle-class backgrounds; experience only, no visa/legal advice)

Tagline idea: *"Learn from someone who was where you are — one step ahead."*

---

## 2. V1 scope decisions (team of 3–4 friends, 1 month)

These decisions simplify V1. Do **not** build the deferred items.

| Area | V1 decision | Deferred to V2 |
|---|---|---|
| Mentors | Invite-only. Mentors are people we know. Admin approves manually after reviewing LinkedIn URL + optional college/company ID image. | PAN/ID KYC, video interview, automated verification |
| Age | **18+ only** at launch (checkbox + date of birth at signup). | Under-18 with verifiable parental consent (DPDP) |
| Auth | Email + password, Google login. Email verification. | Phone OTP (costs money) |
| Payments | Razorpay Checkout in **test mode** first, then live. Platform collects the full amount. | Razorpay Route automatic split payouts |
| Mentor payouts | **Manual** UPI/bank transfer by admin, tracked in Admin → Payouts. | Automatic payouts |
| Video | **LiveKit Cloud free tier** embedded in Session Room. Fallback: admin can attach a Google Meet link (company account) to a session. | Self-host / paid plan |
| Calendar | Attach an **.ics file** to booking emails (no API approval needed). | Google Calendar API sync |
| Notifications | **Email** (Resend free tier) + **in-app notifications**. | WhatsApp utility templates, SMS |
| File uploads | Cloudinary free tier (profile photos, optional ID image). | — |
| Languages | UI in English; mentors tagged by languages they speak. | Kannada/Hindi UI |
| Programs, community, college dashboard, mobile app | Not in V1 | V2+ |

**Hard rules (never break):**
- Never store card/bank details. Razorpay handles payments; we store only IDs.
- All sessions happen on-platform or via a company-owned link. No mentor personal links.
- Mask phone numbers and emails typed in chat (regex) — keep contact on-platform.
- Mentors share experience only. No medical, legal, visa or immigration advice. Show this notice on Track 2 pages.
- No ad pixels / tracking scripts in V1.

---

## 3. Tech stack (all free tiers)

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + React Router + TanStack Query + React Hook Form + Zod |
| UI components | shadcn/ui (Radix) — themed with our tokens |
| Backend | Node.js 20 + Express + TypeScript |
| Database | MongoDB Atlas (free M0) + Mongoose |
| Auth | JWT (access token 15 min in memory + refresh token in httpOnly cookie), bcrypt, Google OAuth (passport-google-oauth20) |
| Video | LiveKit Cloud (free Build tier) — `livekit-server-sdk` on backend, `@livekit/components-react` on frontend |
| Payments | Razorpay Checkout + webhooks (`razorpay` npm) |
| Email | Resend (`resend` npm) + React Email templates |
| Uploads | Cloudinary (signed uploads) |
| Jobs | node-cron (reminders, auto-cancel, auto-complete) |
| Hosting | Frontend: Vercel. Backend: Render free web service. |
| Monitoring | Sentry free tier (optional) |

### Folder structure

```
/client
  /src
    /app          (router, providers, layout)
    /pages        (one folder per page, see Section 8)
    /components   (ui/, layout/, shared/)
    /features     (auth/, mentors/, bookings/, sessions/, payments/, admin/)
    /lib          (api client, utils, constants)
    /styles       (tokens.css, globals.css)
/server
  /src
    /config       (env, db, cors)
    /models
    /routes
    /controllers
    /services     (livekit, razorpay, email, cloudinary, notifications)
    /middleware   (auth, role, validate, rateLimit, error)
    /jobs
    /utils
/docs
```

### Environment variables (`.env.example`)

```
# server
PORT=
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=
RESEND_API_KEY=
EMAIL_FROM=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PLATFORM_COMMISSION_PERCENT=25

# client
VITE_API_URL=
VITE_RAZORPAY_KEY_ID=
VITE_LIVEKIT_URL=
```

---

## 4. Design system (FILL FROM OUR YOUTUBE THEME)

> Replace every placeholder. All colours must be defined as CSS variables in `tokens.css` and mapped in `tailwind.config`. Support light + dark mode.

| Token | Value |
|---|---|
| Brand name / logo | OneStep / `client/src/components/shared/logo.tsx` (inline SVG, swap when final file lands) |
| Primary colour | `#2E2A9E` indigo-700 — 1:1 bookings and every non-₹99 primary action |
| Secondary / accent | `#B8780A` amber-500 — reserved for ₹99 group sessions only |
| Background (light / dark) | `#F7F8FC` / `#0D0E1C` (dark provisional — no dark comp exists yet) |
| Text (light / dark) | `#14152E` / `#F1F2F9`; body copy `#5A5E7D` / `#A3A7C0` |
| Success / warning / danger | `#1F8A4C` / `#B8780A` / `#C5372C` |
| Heading font | Plus Jakarta Sans 700/800, `letter-spacing: -0.02em` |
| Body font | Plus Jakarta Sans 400/500/600 |
| Corner radius | 8px buttons · 10px inner panels · 14px cards · 18px hero band · pill badges |
| Style keywords | Clean, trustworthy, dense-but-airy, non-elitist. Not playful. |

**The one brand rule that is semantic, not decorative:** amber is the ₹99 group path,
indigo is the paid 1:1 path. Pick a button variant for what it books, never for looks.
Enforced by the `group` / `primary` variants in `components/ui/button.tsx`.

**UI rules:**
- **Mobile-first.** Design at 360px width first; most users are on Android phones with mobile data.
- Fast and light: lazy-load routes, compress images, no heavy animations.
- Simple English, short sentences. Buttons say what happens ("Book seat · ₹99").
- Every list has loading skeletons, an empty state with a helpful action, and an error state with retry.
- Accessible: labels on inputs, focus states, contrast AA, keyboard navigation.
- Show prices including all charges. No hidden fees.

---

## 5. Roles and permissions

| Role | Can do |
|---|---|
| Visitor | View public pages, mentor directory, mentor profiles, session list |
| Student | Everything a visitor can + book/pay, join sessions, rate, report, manage profile |
| Mentor (pending) | Complete mentor application, edit profile; cannot be listed or take bookings |
| Mentor (approved) | Set availability, create group sessions, run sessions, write notes, view earnings |
| Admin | Approve/reject/suspend mentors, manage users, bookings, refunds, reports, payouts |

A user has one `role`. A student who wants to mentor applies via "Become a mentor" → role becomes `mentor` with `mentorStatus: pending`.

---

## 6. Data models (Mongoose)

```
User {
  name, email (unique), passwordHash?, googleId?, avatarUrl,
  role: 'student' | 'mentor' | 'admin',
  dateOfBirth, isAdultConfirmed: boolean,
  emailVerified: boolean,
  college, collegeTier: 'tier1'|'tier2'|'tier3'|'other', branch, graduationYear,
  homeState, languages: [string], firstGenGraduate: boolean,
  goals: ['internship','job','abroad','skills','college_life','career_choice'],
  onboardingComplete: boolean,
  status: 'active'|'suspended',
  createdAt, updatedAt
}

MentorProfile {
  userId (ref User, unique),
  headline, story (max 1000 chars), currentRole, company?, country,
  college, collegeTier, homeState, languages, firstGenGraduate,
  tracks: ['first_job','abroad'], topics: [string],
  linkedinUrl, idProofUrl?,
  price1on1 (₹, 99–499), session1on1Minutes: 30,
  mentorStatus: 'pending'|'approved'|'rejected'|'suspended',
  rejectionReason?,
  upiId? (for manual payouts),
  ratingAvg, ratingCount, sessionsCompleted, strikes: number,
  createdAt, updatedAt
}

AvailabilityRule {
  mentorId, dayOfWeek (0–6), startTime 'HH:mm', endTime 'HH:mm', timezone
}
BlockedDate { mentorId, date }

Session {
  mentorId, type: 'one_on_one'|'group',
  title, description, track, topic,
  startAt (UTC), endAt (UTC),
  capacity (1 for 1:1, 5–15 for group), seatsBooked,
  minSeats (group, default 3),
  price (₹),
  status: 'scheduled'|'live'|'completed'|'cancelled',
  livekitRoomName, fallbackMeetUrl?,
  mentorNotes? (summary + next steps),
  createdAt, updatedAt
}

Booking {
  sessionId, studentId,
  status: 'held'|'confirmed'|'cancelled_by_student'|'cancelled_by_mentor'|
          'cancelled_auto'|'no_show_student'|'attended'|'refunded',
  holdExpiresAt, amount,
  razorpayOrderId, razorpayPaymentId?,
  paidWith: 'razorpay'|'credits',
  createdAt, updatedAt
}

Payment { bookingId, studentId, amount, razorpayOrderId, razorpayPaymentId, status: 'created'|'paid'|'failed'|'refunded', rawWebhook }

CreditLedger { userId, amount (+/-), reason, bookingId?, createdAt }   // balance = sum

Review { sessionId, bookingId, studentId, mentorId, rating 1–5, comment, createdAt }

Report { reporterId, targetType: 'user'|'session'|'message', targetId, reason, details, status: 'open'|'reviewing'|'closed', adminNote, createdAt }

Payout { mentorId, periodStart, periodEnd, amount, status: 'pending'|'paid', paidAt?, reference? }

Notification { userId, type, title, body, link, read: boolean, createdAt }

ChatMessage { sessionId, senderId, text (masked), createdAt }
```

Indexes: `User.email`, `MentorProfile.mentorStatus + tracks + languages`, `Session.mentorId + startAt`, `Booking.sessionId + studentId (unique)`.

---

## 7. Business rules

**Booking**
1. Student opens a session/slot → "Book" → backend creates Booking `held` (10-min hold) + Razorpay order.
2. Razorpay success → verify signature + webhook `payment.captured` → Booking `confirmed`, `seatsBooked++`.
3. Hold expires unpaid → job releases the seat.
4. 1:1 slots are generated from AvailabilityRule minus booked sessions minus BlockedDate, in 30-min blocks, at least 12h in the future.

**Cancellation & refunds (show on checkout and Refund Policy page)**

| Situation | Result |
|---|---|
| Student cancels ≥ 24h before | Full refund to credits (or original method if requested via support) |
| Student cancels < 24h | No refund |
| Mentor cancels | Full refund to credits + email apology; mentor +1 strike |
| Mentor no-show after 10 min | Student reports → admin refunds; mentor +1 strike |
| Group below `minSeats` 6h before | Auto-cancel, all refunded to credits |
| 3 strikes | Mentor auto-suspended, admin notified |

**Session room access**
- Join button enabled from **10 min before** start until end time.
- Backend issues a LiveKit token only if user is the session mentor or has a `confirmed` booking. Token TTL = session length + 15 min.
- Mentor role in LiveKit can mute/remove participants.

**After session**
- Job marks session `completed` at endAt + 15 min.
- Students get "Rate your session" notification.
- Mentor writes a short summary + next steps (shown to attendees).
- Mentor earning = price × attended seats × (1 − commission%). Added to next Payout.

**Pricing defaults**
- Group seat: ₹99. 1:1 (30 min): mentor sets ₹99–499.
- Platform commission: 25% (env var).

---

## 8. Pages — full specification

Format for each page: **Route · Access · Purpose · Sections · Data/API · States · Acceptance criteria**.

### PUBLIC

#### P1. Landing page
- **Route:** `/` · **Access:** everyone
- **Purpose:** explain the idea in 5 seconds and get a signup or booking.
- **Sections:**
  1. Navbar: logo, Mentors, Group Sessions, Become a Mentor, Login, "Get started" button. Mobile hamburger.
  2. Hero: headline (e.g. "Get guidance from seniors who were exactly where you are"), sub-line, two CTAs: "Find a mentor" / "Join a ₹99 group session". Visual: mentor faces or illustration.
  3. The problem: 3 cards — "Expensive mentors (₹5–10k/month)", "Big-company mentors don't get your situation", "No seniors to ask at your college".
  4. How it works: 3 steps — Take a 2-min quiz → Get matched with a relatable mentor → Join a session from your phone.
  5. Two tracks: First Job/Internship · Going Abroad (cards linking to filtered directory).
  6. Featured mentors (6 approved mentors, highest rated) with background tags.
  7. Upcoming group sessions (next 4).
  8. Pricing strip: ₹99 group seat, 1:1 from ₹99.
  9. Testimonials (placeholder until real ones).
  10. FAQ accordion (8 questions incl. refunds, safety, who are mentors).
  11. Founder note + YouTube channel link ("Started by Aditya from @refactorslife").
  12. Footer: About, Become a Mentor, Terms, Privacy, Refund Policy, Code of Conduct, Contact/Grievance, social links.
- **Data/API:** `GET /api/public/featured-mentors`, `GET /api/sessions?upcoming=true&limit=4`
- **Acceptance:** Lighthouse mobile performance ≥ 85; works at 360px; all CTAs route correctly.

#### P2. Mentor directory
- **Route:** `/mentors` · **Access:** everyone
- **Sections:** search box; filters (track, topic, language, home state, college tier, first-gen, price range, country); sort (recommended, rating, price); mentor cards (photo, name, headline, tags, rating, "from ₹X"); pagination or infinite scroll.
- **Data/API:** `GET /api/mentors?track=&topic=&language=&state=&tier=&firstGen=&minPrice=&maxPrice=&country=&sort=&page=`
- **States:** skeleton cards; empty → "No mentors match. Clear filters" button.
- **Acceptance:** filters reflected in URL query; back button keeps filters.

#### P3. Mentor profile
- **Route:** `/mentors/:id` · **Access:** everyone (booking requires login)
- **Sections:** header (photo, name, headline, verified badge, rating, sessions done); "My journey" story; background tags (college tier, state, languages, first-gen); topics; upcoming group sessions by this mentor; 1:1 slot picker (next 14 days, user's timezone); reviews list; "Report profile" link.
- **Data/API:** `GET /api/mentors/:id`, `GET /api/mentors/:id/slots?from=&to=`, `GET /api/mentors/:id/reviews`
- **Acceptance:** picking a slot while logged out → login → returns to the same slot.

#### P4. Group sessions list
- **Route:** `/sessions` · **Access:** everyone
- **Sections:** filters (track, topic, language, date); session cards (title, mentor, date/time, seats left, ₹99, "Book seat").
- **Data/API:** `GET /api/sessions?type=group&upcoming=true&...`
- **Acceptance:** full sessions show "Full" and disable booking.

#### P5. Session detail (public)
- **Route:** `/sessions/:id` · **Access:** everyone
- **Sections:** title, description, mentor mini-card, time (local), duration, seats left, what you'll learn, refund rule summary, "Book seat · ₹99".
- **Data/API:** `GET /api/sessions/:id`

#### P6. Become a mentor
- **Route:** `/become-a-mentor` · **Access:** everyone
- **Sections:** why mentor (earn, give back, flexible), who we look for ("1–3 steps ahead of students"), how it works, earnings example, expectations + code of conduct summary, CTA "Apply" → signup as mentor.

#### P7. About / Our story
- **Route:** `/about` · founder story, mission, team (3–4 friends), YouTube link.

#### P8. Legal & help pages
- **Routes:** `/terms`, `/privacy`, `/refund-policy`, `/code-of-conduct`, `/contact`
- **Contact page:** form (name, email, topic, message) → `POST /api/contact`; shows grievance contact email.
- **Privacy page must say:** what we collect, why, how long we keep it, how to delete account, 18+ only in V1, no selling of data.
- **Note:** content drafted by us; reviewed by a lawyer before public launch.

#### P9. 404 / error page
- Friendly message, links to Home and Mentors.

### AUTH

#### A1. Sign up
- **Route:** `/signup?role=student|mentor`
- **Fields:** name, email, password (min 8), date of birth, checkbox "I am 18 or older", checkbox "I agree to Terms & Privacy". Or "Continue with Google" (then ask DOB + 18+ on next screen).
- **Rules:** DOB must give age ≥ 18 else show "We're only open to 18+ right now." Send verification email.
- **API:** `POST /api/auth/signup`, `GET /api/auth/google`
- **After:** student → `/onboarding`; mentor → `/mentor/apply`.

#### A2. Login
- **Route:** `/login` · email + password, Google, "Forgot password?" · rate-limited (5 tries / 15 min).
- **API:** `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- **After:** redirect to `returnTo` or role dashboard.

#### A3. Verify email
- **Route:** `/verify-email?token=` · success / expired (resend button).
- **API:** `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`

#### A4. Forgot / reset password
- **Routes:** `/forgot-password`, `/reset-password?token=`
- **API:** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

### STUDENT

#### S1. Onboarding quiz
- **Route:** `/onboarding` · **Access:** student, onboarding incomplete
- **Steps (one question per screen, progress bar):** college name + tier · branch + graduation year · home state · languages · first-gen graduate? · goals (multi-select) · biggest worry right now (free text, optional).
- **API:** `PATCH /api/me/onboarding` → returns top 5 matched mentors.
- **Match score (simple V1):** +3 same language, +2 same home state, +2 same/similar college tier (mentor tier one step above or same), +2 first-gen match, +2 per matching goal/track, + rating bonus. Show "Why this match" tags.
- **After:** `/dashboard`.

#### S2. Student dashboard
- **Route:** `/dashboard` · **Access:** student
- **Sections:** greeting; next session card (countdown + Join button when open); "Your matches" carousel; upcoming group sessions for your goals; credits balance; quick links (My sessions, Edit profile).
- **API:** `GET /api/me/dashboard`

#### S3. Checkout
- **Route:** `/checkout/:bookingId` · **Access:** student
- **Sections:** session summary; price; "Use credits" toggle if balance; refund policy summary; "Pay ₹X" (Razorpay modal); 10-min hold countdown.
- **API:** `POST /api/bookings` (creates hold + order) → `POST /api/payments/verify` → webhook `POST /api/webhooks/razorpay`
- **States:** hold expired → "Seat released, try again".
- **Acceptance:** payment success shows S4; failed payment keeps hold until expiry; double-click safe (idempotent).

#### S4. Booking confirmed
- **Route:** `/booking/:id/confirmed` · success message, session time, "Add to calendar" (.ics download), what to prepare, link to My sessions.

#### S5. My sessions
- **Route:** `/my-sessions` · tabs Upcoming / Past / Cancelled
- **Actions:** Join (when open), Cancel (with rule shown), Rate (past, unrated), View mentor notes, Report.
- **API:** `GET /api/me/bookings?status=`, `POST /api/bookings/:id/cancel`

#### S6. Session room
- **Route:** `/room/:sessionId` · **Access:** mentor of session or confirmed student, within join window
- **Layout:** video grid (LiveKit components), controls (mic, camera, **audio-only mode**, leave), side panel: chat (masked contacts), participant list, "Report" button. Mentor extra: mute/remove participant, "End session".
- **Pre-join screen:** camera/mic check, name shown, safety reminder ("Keep contact on the platform").
- **Fallback:** if `fallbackMeetUrl` set, show "Join via Google Meet" button instead.
- **API:** `POST /api/sessions/:id/token`, `GET/POST /api/sessions/:id/chat`
- **Acceptance:** works on Chrome Android over 4G; denied users see a clear message.

#### S7. Rate session
- **Route:** modal or `/rate/:bookingId` · stars (1–5), comment, "Did the mentor show up?" yes/no (no → creates report).
- **API:** `POST /api/reviews`

#### S8. Profile & settings
- **Route:** `/settings` · edit profile fields, change password, email preferences, **Download my data** (JSON), **Delete my account** (confirm; soft-delete then purge after 30 days).
- **API:** `GET/PATCH /api/me`, `GET /api/me/export`, `DELETE /api/me`

### MENTOR

#### M1. Mentor application
- **Route:** `/mentor/apply` · **Access:** mentor (pending/rejected)
- **Steps:** About you (headline, story) · Background (college, tier, state, languages, first-gen, current role, company, country) · Tracks & topics · Links (LinkedIn required, ID image optional via Cloudinary) · Pricing (1:1 price) · Payout UPI ID · Agree to Code of Conduct.
- **API:** `PUT /api/mentor/application`, `POST /api/uploads/sign`
- **After submit:** status page "Under review — usually within 48h".

#### M2. Mentor dashboard
- **Route:** `/mentor` · **Access:** approved mentor
- **Sections:** today's/next sessions with Join; stats (sessions done, rating, this month's earnings); pending notes to write; quick actions (Set availability, Create group session).
- **API:** `GET /api/mentor/dashboard`

#### M3. Availability
- **Route:** `/mentor/availability` · weekly grid (day × time ranges), timezone selector, blocked dates calendar, preview of generated slots.
- **API:** `GET/PUT /api/mentor/availability`, `POST/DELETE /api/mentor/blocked-dates`

#### M4. Create / edit group session
- **Route:** `/mentor/sessions/new`, `/mentor/sessions/:id/edit`
- **Fields:** title, description, track, topic, date, start time, duration (45/60/90), capacity (5–15), min seats (default 3), price (default ₹99).
- **Rules:** cannot edit time/price after first booking; can cancel (triggers refunds + strike unless ≥ 48h before).
- **API:** `POST /api/mentor/sessions`, `PATCH /api/mentor/sessions/:id`, `POST /api/mentor/sessions/:id/cancel`

#### M5. Mentor sessions
- **Route:** `/mentor/sessions` · tabs Upcoming / Past · attendee list per session · write notes (summary + next steps) · mark no-shows.
- **API:** `GET /api/mentor/sessions`, `PATCH /api/mentor/sessions/:id/notes`, `POST /api/mentor/sessions/:id/attendance`

#### M6. Earnings
- **Route:** `/mentor/earnings` · per-session earnings table, monthly total, payout history (status from admin), UPI ID edit.
- **API:** `GET /api/mentor/earnings`, `GET /api/mentor/payouts`

#### M7. Edit public profile
- **Route:** `/mentor/profile` · same fields as application (except status), live preview of public profile.

### ADMIN

#### AD1. Admin dashboard
- **Route:** `/admin` · KPIs: users, approved mentors, sessions this week, bookings, revenue, open reports, pending mentor applications.
- **API:** `GET /api/admin/stats`

#### AD2. Mentor approvals
- **Route:** `/admin/mentors` · tabs Pending / Approved / Rejected / Suspended · review application (LinkedIn link, ID image) · Approve / Reject (reason) / Suspend · triggers email.
- **API:** `GET /api/admin/mentors?status=`, `POST /api/admin/mentors/:id/approve|reject|suspend`

#### AD3. Users
- **Route:** `/admin/users` · search, view profile, suspend/reactivate.

#### AD4. Sessions & bookings
- **Route:** `/admin/bookings` · filter by date/status · refund to credits or to original payment (Razorpay refund API) · attach fallback Meet link to a session.

#### AD5. Reports
- **Route:** `/admin/reports` · open/reviewing/closed · view context · actions: warn, add strike, suspend, refund, close with note.

#### AD6. Payouts (manual)
- **Route:** `/admin/payouts` · generate payout list for a date range (per mentor: completed sessions × attended seats × share) · mark as paid with UPI reference · export CSV.

### SHARED COMPONENTS
- Navbar (role-aware), mobile bottom nav for logged-in users (Home, Sessions, Mentors, Profile)
- Notification bell + dropdown (`GET /api/notifications`, `PATCH /api/notifications/:id/read`)
- Report modal (used on profiles, sessions, chat)
- Mentor card, Session card, Slot picker, Rating stars, Empty state, Error state, Skeletons
- Protected route + role guard
- Toasts for success/error

---

## 9. Emails (Resend + React Email)

Welcome + verify email · Password reset · Booking confirmed (with .ics) · Reminder 24h before · Reminder 15 min before (join link) · Session cancelled (who/why/refund) · Rate your session · Mentor: new booking · Mentor: application approved/rejected · Mentor: payout marked paid · Admin: new mentor application, new report.

Every email: plain-language subject, one clear button, footer with "Manage email preferences".

---

## 10. Security & quality checklist (every page)

- Validate all input with Zod on client **and** server.
- Role check on every protected API route.
- Rate-limit auth, booking, contact, report endpoints.
- Verify Razorpay signature and webhook secret; make payment handlers idempotent.
- Helmet, CORS limited to `CLIENT_URL`, httpOnly secure cookies.
- Never log passwords, tokens or full payment payloads in production.
- Write at least: unit tests for slot generation, match score, refund rules; API tests for auth, booking, payments webhook.
- Mobile check at 360px before marking any page done.

---

## 11. 4-week build plan (page-wise, team of 4)

Dev roles (rename with your team): **Dev A** – public pages & design system · **Dev B** – auth & student pages · **Dev C** – mentor pages & booking engine · **Dev D** – payments, video, admin, emails.

### Week 1 — Foundation
- [ ] Repo, monorepo setup, lint/prettier, env, deploy pipelines (Vercel + Render) — **Dev D**
- [x] Design tokens from the approved designs, base components, layout, navbar, footer — **Dev A**
- [ ] User model, auth API (signup, login, refresh, logout, Google, verify, reset) — **Dev B**
- [ ] A1–A4 auth pages — **Dev B**
- [ ] MentorProfile model + M1 Mentor application + uploads — **Dev C**
- [x] P1 Landing (static data first) — **Dev A**

### Week 2 — Discovery & profiles
- [ ] AD1 + AD2 admin approvals (needed to get mentors live) — **Dev D**
- [ ] P2 Mentor directory + filters API — **Dev A**
- [ ] P3 Mentor profile — **Dev A**
- [ ] S1 Onboarding quiz + match score — **Dev B**
- [ ] M3 Availability + slot generation (with tests) — **Dev C**
- [ ] M7 Edit profile — **Dev C**

### Week 3 — Booking, payments, video
- [ ] Session/Booking models, hold logic, cron jobs — **Dev C**
- [ ] M4 Create group session, P4 + P5 session pages — **Dev C / Dev A**
- [ ] S3 Checkout + Razorpay (test mode) + webhook + S4 confirmed — **Dev D**
- [ ] S6 Session room with LiveKit + chat masking + report — **Dev D**
- [ ] S2 Student dashboard, S5 My sessions, cancel flow + credits — **Dev B**

### Week 4 — Finish, safety, launch
- [ ] M2 Mentor dashboard, M5 sessions + notes + attendance, M6 earnings — **Dev C**
- [ ] S7 Rate session, S8 settings (export + delete) — **Dev B**
- [ ] AD3–AD6 admin (users, bookings/refunds, reports, payouts) — **Dev D**
- [ ] All emails + in-app notifications — **Dev D**
- [ ] P6–P9 remaining public + legal pages, FAQ — **Dev A**
- [ ] Full mobile QA, Lighthouse, security checklist, seed 10 real mentors — **All**
- [ ] Soft launch: 10 mentors, first ₹99 group sessions promoted on YouTube/Instagram — **All**

---

## 12. Prompt template per page (paste into Claude Code)

```
Read CLAUDE.md fully. We are building page <ID> "<Page name>" from Section 8.

Do:
1. List the files you will create or change.
2. Build the backend routes/models it needs (Section 6–7), with Zod validation and role checks.
3. Build the page with our design tokens (Section 4), mobile-first at 360px, with loading, empty and error states.
4. Add tests for any business logic touched.
5. Do not build anything listed as deferred in Section 2.
6. When done, give me: what was built, how to test it manually, and any open questions.
```

For a fix or change:

```
Read CLAUDE.md. On page <ID>, change <what> because <why>. Keep everything else as is. Show me the diff summary and how to test.
```

---

## 13. Definition of done (per page)

- [ ] Matches the spec in Section 8 and the design tokens
- [ ] Works at 360px and desktop
- [ ] Loading, empty, error states present
- [ ] API protected by role and validated
- [ ] Tests pass; no console errors
- [ ] Reviewed by one other teammate
- [ ] Ticked in Section 11

---

## 14. Deferred to V2 (do not build now)

Under-18 users with verifiable parental consent · PAN/ID KYC and automated verification · Razorpay Route automatic payouts · WhatsApp/SMS reminders · Phone OTP login · Google Calendar API sync · Monthly subscription plans · Structured programs · Community/Q&A · College partner dashboard · Kannada/Hindi UI · Native mobile app · Recording of sessions.

---

## 15. Open items to fill before starting

- [x] Platform name: **OneStep**
- [ ] Domain: {{DOMAIN}}
- [x] Theme tokens (Section 4) — implemented in `client/src/styles/tokens.css`
- [ ] Team names for Dev A–D (Section 11)
- [ ] Support/grievance email: {{SUPPORT_EMAIL}}
- [ ] Razorpay account (business KYC) for live mode
- [ ] LiveKit, Resend, Cloudinary, MongoDB Atlas, Google OAuth accounts created
- [ ] Lawyer review of Terms, Privacy, Refund Policy before public launch
