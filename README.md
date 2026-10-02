# YoursMentor.in

> *Know What to Do Next.*

Students from Tier-2 and Tier-3 Indian colleges book **₹99 group sessions** or short
**1:1 calls** with near-peer mentors — people one to three steps ahead, from similar
college tiers, home states and languages. Video happens inside the site.

Two tracks at launch: **First Job / Internship** and **Going Abroad**.

## Stack

Next.js 16 (app router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres, Auth,
Storage) · deployed on Vercel.

## Running it

```bash
npm install
cp .env.example .env.local     # fill in your Supabase project
npm run dev                    # http://localhost:3000
```

```bash
npm run gate                   # typecheck + lint + build + database tests
npm run db:test                # migrations and booking engine against a local Postgres
```

`db:test` needs `postgresql@16` on PATH. It applies every migration to a throwaway
cluster and runs 27 cases covering seat holds, refunds, auto-cancellation, reviews,
contact masking and the 18+ gate.

## Where things are

```
src/app/          routes (app router), design tokens
src/components/   ui/ · layout/ · shared/ · auth/ · landing/
src/lib/          supabase clients, session helpers, validation
src/proxy.ts      session refresh and route guards
supabase/         migrations and database tests
docs/             the product spec
```

[`PROJECT.md`](PROJECT.md) is the engineering brief: stack decisions, the design system,
how the booking engine works and what is still to build. Read it before changing anything.

## Notes for contributors

- **Seats and money never move through a table write.** `bookings`, `payments` and
  `credit_ledger` grant no INSERT or UPDATE to `authenticated`. The client calls
  `hold_seat()`, `cancel_booking()` or `leave_review()` and Postgres decides.
- **Amber means ₹99 group, blue means paid 1:1.** Pick a button variant by what it books,
  never by how it looks.
- The platform is **18+ only** for now. That is enforced in the form, by a check
  constraint, and in the proxy — all three on purpose.

Built by Aditya — [@refactorslife](https://youtube.com/@refactorslife).
