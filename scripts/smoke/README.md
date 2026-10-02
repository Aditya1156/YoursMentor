# Smoke tests against the live project

These exercise the real Supabase project end to end — signup, approval,
booking, attendance, earnings, and the escalation paths that must fail. They
create accounts and then delete them.

```bash
python3 scripts/smoke/booking-flow.py
python3 scripts/smoke/mentor-flow.py
```

They read `.env.local` for the service role key, so they only run locally.
`npm run db:test` is the one to run routinely — it is faster, hermetic, and
covers the same rules against a throwaway Postgres.
