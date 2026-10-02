# Production readiness

Checked against the [Supabase production checklist][sb] and the Next.js
security guidance ([Arcjet's][aj], [Next's own headers docs][nx]). Everything
below is either verified against this project or named as outstanding — nothing
is listed as done because it is usually done.

[sb]: https://supabase.com/docs/guides/platform/going-into-prod
[aj]: https://arcjet.com/learn/web-security/application-framework-security
[nx]: https://nextjs.org/docs/app/guides/content-security-policy

## Done

| Item | Evidence |
| --- | --- |
| RLS on every table | 20/20 public tables, each with policies. `scripts/smoke/*` read as real users, never the service role, so a missing policy fails a test. |
| Money moves only in the database | `hold_seat`, `confirm_booking`, `cancel_booking` are `security definer`. Proven under concurrency: 12 students racing for 3 seats granted exactly 3. |
| Server-only functions are not reachable by clients | `confirm_booking`, `auto_cancel_under_minimum`, `release_expired_holds`, `complete_finished_sessions` are `service_role` only. A student gets 403, anon gets 401. |
| Column-level writes | `UPDATE` is revoked on `profiles`, `mentor_profiles` and `sessions`, then granted back column by column, so a mentor cannot approve themselves and a student cannot become an admin. |
| Webhook signatures | Razorpay HMAC verified with a timing-safe comparison. |
| Cron authentication | Bearer token, constant-time compare. All four routes return 401 without it. |
| Security headers | HSTS, `nosniff`, `DENY` framing, `strict-origin-when-cross-origin`, and a Permissions-Policy that allows camera/microphone/display-capture **for our own origin only**. `x-powered-by` removed. |
| Private URLs stay private | `/room/*` is `no-referrer` and `noindex`; `/admin/*` and `/mentor/*` are `noindex`. |
| Role separation | Each role gets its own navigation and its own home; student pages reject mentors and admins. Covered by `scripts/smoke/nav-by-role.py` and `landing-redirect.py`. |
| Contact masking | Phone numbers and emails typed into chat are replaced by a trigger before the row is written. |
| Data subject rights | Export and deletion are self-service; deletion is soft, then purged after 30 days. |

## Outstanding, in the order it matters

1. **Rotate the Supabase service-role key.** It has been pasted into a chat
   transcript, it bypasses RLS entirely, and it is deployed to production. Then
   update `vercel env`. Nothing else on this list comes close.
2. **Rotate the Razorpay key secret**, and use `rzp_test_` keys until launch.
3. **Change the admin password.** The current one was generated during
   development and is in a transcript.
4. **Turn on MFA** on the Supabase and Vercel accounts. Both hold everything.
5. **Enforce SSL** in Supabase: Database → Settings → SSL Configuration.
6. **Set up SMTP.** Supabase's shared sender is rate-limited and lands in spam,
   and no application email is sent at all yet — a mentor is not told a student
   asked to reschedule unless they open the site.
7. **Backups.** Daily backups exist on the current plan; Point-in-Time Recovery
   needs Pro. Worth it once real bookings exist, because the failure mode is
   losing a day of other people's money.
8. **Review the Performance Advisor** in the Supabase dashboard after real
   traffic. One index is already known to be missing:
   `reschedule_requests.requested_by`, which `my_sent_reschedules()` filters on.
   It does not matter at current volume.
9. **Content-Security-Policy.** Drafted below, deliberately not enabled.

## The CSP, and why it is not on yet

Next.js needs either `'unsafe-inline'` for scripts — which gives away most of
what a CSP is for — or a per-request nonce threaded through the middleware. A
nonce policy that is subtly wrong does not fail in CI; it fails in a student's
browser, on a page that takes payments and runs WebRTC. So it wants a session in
a real browser with the console open before it goes near production.

What it has to allow, which is the part that is easy to get wrong:

```
default-src 'self';
script-src 'self' 'nonce-<per-request>' https://checkout.razorpay.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://i.ytimg.com;
media-src 'self' blob:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co
            wss://*.livekit.cloud https://*.livekit.cloud
            https://api.razorpay.com https://lumberjack.razorpay.com;
frame-src 'self' https://api.razorpay.com https://www.youtube-nocookie.com;
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

Notes on the awkward entries:

- `wss://*.livekit.cloud` — without it every call fails to signal, and the
  symptom is a room that connects and shows nobody.
- `blob:` in `img-src`, `media-src` and `worker-src` — LiveKit uses blob URLs for
  tracks and spawns workers; omitting these breaks video with no useful error.
- `checkout.razorpay.com` in `script-src` and `api.razorpay.com` in `frame-src` —
  Razorpay Checkout injects a script and opens an iframe.
- `'unsafe-inline'` stays in `style-src`. Tailwind and `next/font` inject inline
  styles, and style injection is a far smaller risk than script injection.

## Before real students

Not security, but they are launch blockers and belong next to this list:

- Fill in `src/lib/legal.ts` — entity, address, grievance officer, jurisdiction.
  Razorpay's merchant review checks the entity matches the account, and the DPDP
  Act requires a reachable grievance contact.
- Create the `support@` and `grievance@` mailboxes the policy pages promise, with
  the response times they promise.
- Delete the seeded demo mentors and the test credit.
- Recording is not built. The room says "nothing is recorded", which is true.
