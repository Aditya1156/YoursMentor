"""
The policy pages must say what the product does.

A refund policy that promises something cancel_booking() does not do is worse
than no policy, because a student can hold you to it — and a Razorpay reviewer
reads the page, not the migration. This checks every number in src/lib/legal.ts
against the SQL and the rendered pages.

  python3 scripts/smoke/legal-matches-code.py
"""
import re, subprocess, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
APP = "http://localhost:3000"
fails = []


def ok(label, cond, extra=""):
    print(("  PASS  " if cond else "  FAIL  ") + label + (("   " + str(extra)) if extra else ""))
    if not cond:
        fails.append(label)


legal = (ROOT / "src/lib/legal.ts").read_text()


def rule(name):
    m = re.search(rf"{name}:\s*(\d+)", legal)
    return int(m.group(1)) if m else None


sql = "\n".join(p.read_text() for p in sorted((ROOT / "supabase/migrations").glob("*.sql")))

print("=" * 66)
print("the numbers on the pages vs the rules in the database")
print("=" * 66)

ok("student refund window is 24h in cancel_booking()",
   rule("studentRefundHours") == 24 and "interval '24 hours'" in sql,
   f'legal.ts says {rule("studentRefundHours")}h')

ok("mentor strike window is 48h in cancel_session()",
   rule("mentorStrikeHours") == 48 and "interval '48 hours'" in sql,
   f'legal.ts says {rule("mentorStrikeHours")}h')

ok("3 strikes suspends, as in the strikes trigger",
   rule("strikesToSuspension") == 3 and "strikes + 1 >= 3" in sql,
   f'legal.ts says {rule("strikesToSuspension")}')

ok("seat hold is 10 minutes in hold_window()",
   rule("holdMinutes") == 10 and "interval '10 minutes'" in sql,
   f'legal.ts says {rule("holdMinutes")}min')

ok("deletion grace is 30 days in purge_deleted_accounts()",
   rule("deletionGraceDays") == 30 and "interval '30 days'" in sql,
   f'legal.ts says {rule("deletionGraceDays")} days')

ok("commission is 25% in mentor_earnings()",
   rule("commissionPercent") == 25 and "p_commission int default 25" in sql,
   f'legal.ts says {rule("commissionPercent")}%')

ok("minimum age 18 matches the signup check",
   rule("minimumAge") == 18 and "18 years" in sql,
   f'legal.ts says {rule("minimumAge")}')

ok("group minimum of 3 matches the sessions default",
   rule("groupMinimumSeats") == 3 and "min_seats          int not null default 3" in sql,
   f'legal.ts says {rule("groupMinimumSeats")}')

print()
print("=" * 66)
print("the pages actually print those numbers")
print("=" * 66)


def text(path):
    raw = subprocess.run(["curl", "-s", APP + path], capture_output=True, text=True,
                         timeout=60).stdout
    t = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", t)


refunds = text("/refund-policy")
ok("refund page states the 24-hour window", "24 hours" in refunds)
ok("refund page says credit, not a card reversal",
   "YoursMentor credit" in refunds and "rather than reversed" in refunds)
ok("refund page offers a real bank reversal on request",
   "back in your bank" in refunds and "7 working days" in refunds)
ok("refund page covers mentor no-show", "did not turn up" in refunds)
ok("refund page covers under-filled group sessions", "3 students to run" in refunds)

privacy = text("/privacy")
ok("privacy page states 18+", "18 or older" in privacy)
ok("privacy page says video is not recorded", "not recorded" in privacy)
ok("privacy page states the 30-day deletion", "30 days" in privacy)
ok("privacy page names the processors",
   all(n in privacy for n in ("Supabase", "Vercel", "Razorpay", "LiveKit")))
ok("privacy page says we never see card details", "never see your card" in privacy)
ok("privacy page explains chat masking", "automatically" in privacy and "replaced" in privacy)

terms = text("/terms")
ok("terms state the commission", "25%" in terms)
ok("terms state the mentor's share", "75%" in terms)
ok("terms refuse to guarantee outcomes", "No outcome is guaranteed" in terms)
ok("terms forbid off-platform payment", "off the platform" in terms)

conduct = text("/code-of-conduct")
ok("conduct page points at 112", "112" in conduct)
ok("conduct page promises reporter anonymity", "never told who reported" in conduct)

contact = text("/contact")
ok("contact page names a grievance route", "grievance" in contact.lower())
ok("contact page acknowledges within 48h / 30 days",
   "48 hours" in contact and "30 days" in contact)

print()
print("=" * 66)
print("unfilled operator details are stated, not faked")
print("=" * 66)
complete = "entity: null" not in legal
if not complete:
    for p, t in (("/privacy", privacy), ("/terms", terms), ("/contact", contact),
                 ("/refund-policy", refunds)):
        ok(f"{p} says payments are not live yet rather than inventing an entity",
           "not yet accepting payments" in t)
else:
    ok("operator details are filled in", True, "entity set")

print()
print("=" * 66)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 66)
sys.exit(1 if fails else 0)
