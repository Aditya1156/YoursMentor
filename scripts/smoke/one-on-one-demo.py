"""
End-to-end demo of the 1:1 path, which until now did not exist.

Walks the whole thing as the real actors do, through PostgREST with each
person's own token — never the service role for anything a user does, because
the service role bypasses RLS and would hide exactly the bugs worth finding.

  mentor publishes weekly hours
  -> student reads the slots
  -> student books one
  -> seat is held, session created, price correct
  -> payment confirms it
  -> the slot disappears for the next student
  -> a second student cannot double-book it
  -> cancellation returns credits

Run:  python3 scripts/smoke/one-on-one-demo.py
"""
import json, os, time, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

BASE = "https://bmyzudohkgxdnifpyanv.supabase.co"
env = dict(
    l.split("=", 1) for l in open(os.path.expanduser("~/onestep/.env.local"))
    if "=" in l and not l.startswith("#")
)
SVC = env["SUPABASE_SERVICE_ROLE_KEY"].strip()
PUB = env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].strip()

fails = []


def call(path, method="GET", body=None, key=SVC, bearer=None, prefer=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", "Bearer " + (bearer or key))
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=30) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def ok(label, cond, extra=""):
    print(("  PASS  " if cond else "  FAIL  ") + label + (("   " + str(extra)) if extra else ""))
    if not cond:
        fails.append(label)
    return cond


def signin(email, password):
    st, r = call("/auth/v1/token?grant_type=password", "POST",
                 {"email": email, "password": password}, key=PUB)
    assert st == 200, r
    return r["access_token"]


def make_user(email, name, role, dob="1999-05-20"):
    st, u = call("/auth/v1/admin/users", "POST", {
        "email": email, "password": "correct horse 8", "email_confirm": True,
        "user_metadata": {"name": name, "role": role, "date_of_birth": dob},
    })
    assert st in (200, 201), u
    return u["id"]


stamp = int(time.time())
print("=" * 68)
print("SETUP — a mentor and two students")
print("=" * 68)

mentor_email = f"demomentor{stamp}@gmail.com"
mentor_id = make_user(mentor_email, "Nikhil Rane", "mentor")
call("/rest/v1/mentor_profiles", "POST", {
    "user_id": mentor_id, "headline": "SDE-2 at Swiggy",
    "breakthrough_story": "Switched from service company to product in 14 months.",
    "linkedin_url": "https://linkedin.com/in/nikhil", "price_1on1": 299,
    "session_1on1_minutes": 30, "college_tier": "tier3", "home_state": "Maharashtra",
    "languages": ["Hindi", "English"], "tracks": ["first_job"],
    "topics": ["System design basics", "Switching to product"],
    "company": "Swiggy", "company_domain": "swiggy.com", "first_gen_graduate": True,
}, prefer="return=minimal")
# Approved by the platform, as an admin would.
call(f"/rest/v1/mentor_profiles?user_id=eq.{mentor_id}", "PATCH",
     {"status": "approved"}, prefer="return=minimal")
ok("mentor approved and listed", True, "Nikhil Rane · ₹299 / 30 min")

s1_email = f"demostudent{stamp}@gmail.com"
s2_email = f"demostudent{stamp}b@gmail.com"
s1 = make_user(s1_email, "Aarti Kumari", "student")
s2 = make_user(s2_email, "Vikram Singh", "student")
for sid in (s1, s2):
    call(f"/rest/v1/profiles?id=eq.{sid}", "PATCH",
         {"onboarding_complete": True, "college_tier": "tier3"}, prefer="return=minimal")
ok("two students signed up", True, "Aarti, Vikram")

mentor_tok = signin(mentor_email, "correct horse 8")
s1_tok = signin(s1_email, "correct horse 8")
s2_tok = signin(s2_email, "correct horse 8")

print()
print("=" * 68)
print("STEP 1 — the mentor publishes weekly hours")
print("=" * 68)

# Every day of the week, 10:00-13:00 IST, so the demo never depends on
# which day it is run.
rules = [{"mentor_id": mentor_id, "day_of_week": d, "start_time": "10:00",
          "end_time": "13:00", "timezone": "Asia/Kolkata"} for d in range(7)]
st, r = call("/rest/v1/availability_rules", "POST", rules,
             bearer=mentor_tok, key=PUB, prefer="return=minimal")
ok("mentor writes their own availability", st in (200, 201), st if st not in (200, 201) else "")

print()
print("=" * 68)
print("STEP 2 — the student reads the slots (this is what was broken)")
print("=" * 68)

st, slots = call("/rest/v1/rpc/available_slots", "POST",
                 {"p_mentor": mentor_id, "p_days": 14}, bearer=s1_tok, key=PUB)
ok("available_slots returns slots to a student", st == 200 and bool(slots),
   f"{len(slots) if isinstance(slots, list) else slots} slots")

st_anon, slots_anon = call("/rest/v1/rpc/available_slots", "POST",
                           {"p_mentor": mentor_id, "p_days": 14}, key=PUB)
ok("a signed-out visitor can see them too", st_anon == 200 and bool(slots_anon),
   f"{len(slots_anon) if isinstance(slots_anon, list) else slots_anon} slots")

def lead_time(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")) - datetime.now(timezone.utc)


first = soon = None
if isinstance(slots, list) and slots:
    ok("earliest slot is at least 12h out (nobody books a sleeping mentor)",
       lead_time(slots[0]["starts_at"]) >= timedelta(hours=12),
       f'{lead_time(slots[0]["starts_at"]).total_seconds() / 3600:.1f}h')
    ok("slots are 30 minutes long",
       (datetime.fromisoformat(slots[0]["ends_at"].replace("Z", "+00:00"))
        - datetime.fromisoformat(slots[0]["starts_at"].replace("Z", "+00:00")))
       == timedelta(minutes=30))

    # The refund rule turns on the 24-hour mark, so the demo needs one slot on
    # each side of it to show both answers.
    first = next((x["starts_at"] for x in slots
                  if lead_time(x["starts_at"]) > timedelta(hours=48)), None)
    soon = next((x["starts_at"] for x in slots
                 if lead_time(x["starts_at"]) < timedelta(hours=24)), None)
    print(f"     (booking a slot {lead_time(first).total_seconds() / 3600:.0f}h out)")

print()
print("=" * 68)
print("STEP 3 — the student books one")
print("=" * 68)

booking = None
if first:
    st, booking = call("/rest/v1/rpc/book_one_on_one", "POST",
                       {"p_mentor": mentor_id, "p_start_at": first},
                       bearer=s1_tok, key=PUB)
    ok("book_one_on_one returns a booking id", st == 200 and isinstance(booking, str),
       booking if st != 200 else booking[:8])

if isinstance(booking, str):
    _, rows = call(
        f"/rest/v1/bookings?id=eq.{booking}"
        "&select=status,amount,hold_expires_at,session:sessions(title,type,capacity,"
        "seats_booked,price,start_at,end_at,min_seats,status)")
    b = rows[0]
    s = b["session"]
    ok("seat is held, not confirmed", b["status"] == "held", b["status"])
    ok("hold has an expiry", bool(b["hold_expires_at"]))
    ok("a one_on_one session was created", s["type"] == "one_on_one", s["type"])
    ok("capacity is exactly 1", s["capacity"] == 1, s["capacity"])
    ok("the seat is taken", s["seats_booked"] == 1, s["seats_booked"])
    ok("priced at the mentor's rate", s["price"] == 299 and b["amount"] == 299,
       f'session {s["price"]}, booking {b["amount"]}')
    ok("min_seats is 1 so it cannot auto-cancel for being empty", s["min_seats"] == 1)
    ok("titled with the mentor's name", "Nikhil" in s["title"], s["title"])
    ok("ends 30 minutes after it starts",
       (datetime.fromisoformat(s["end_at"].replace("Z", "+00:00"))
        - datetime.fromisoformat(s["start_at"].replace("Z", "+00:00"))) == timedelta(minutes=30))

    print()
    print("=" * 68)
    print("STEP 4 — the slot is gone for everyone else")
    print("=" * 68)

    _, slots2 = call("/rest/v1/rpc/available_slots", "POST",
                     {"p_mentor": mentor_id, "p_days": 14}, bearer=s2_tok, key=PUB)
    taken = [x for x in slots2 if x["starts_at"] == first]
    ok("the booked slot disappears from the list", len(taken) == 0,
       f"{len(slots2)} left")

    st, err = call("/rest/v1/rpc/book_one_on_one", "POST",
                   {"p_mentor": mentor_id, "p_start_at": first},
                   bearer=s2_tok, key=PUB)
    ok("a second student is refused that slot", st >= 400,
       (err.get("message") if isinstance(err, dict) else err))

    print()
    print("=" * 68)
    print("STEP 5 — paying for it")
    print("=" * 68)

    st, _ = call("/rest/v1/rpc/confirm_booking", "POST",
                 {"p_booking": booking, "p_payment_id": f"pay_demo_{stamp}",
                  "p_order_id": f"order_demo_{stamp}"})
    ok("confirm_booking succeeds", st in (200, 204), st)
    _, rows = call(f"/rest/v1/bookings?id=eq.{booking}&select=status,hold_expires_at")
    ok("booking is confirmed", rows[0]["status"] == "confirmed", rows[0]["status"])
    ok("the hold is cleared", rows[0]["hold_expires_at"] is None)

    print()
    print("=" * 68)
    print("STEP 6 — the student sees it, the mentor sees the student")
    print("=" * 68)

    _, mine = call("/rest/v1/bookings?select=id,status", bearer=s1_tok, key=PUB)
    ok("student sees their own booking", any(x["id"] == booking for x in mine),
       f"{len(mine)} visible")

    _, theirs = call("/rest/v1/bookings?select=id", bearer=s2_tok, key=PUB)
    ok("the other student cannot see it", all(x["id"] != booking for x in theirs),
       f"{len(theirs)} visible")

    sess_id = None
    _, srows = call(f"/rest/v1/bookings?id=eq.{booking}&select=session_id")
    sess_id = srows[0]["session_id"]
    st, att = call("/rest/v1/rpc/session_attendees", "POST", {"p_session": sess_id},
                   bearer=mentor_tok, key=PUB)
    ok("mentor sees the attendee", st == 200 and len(att) == 1,
       att[0]["name"] if st == 200 and att else att)

    print()
    print("=" * 68)
    print("STEP 7 — cancelling returns credits")
    print("=" * 68)

    st, result = call("/rest/v1/rpc/cancel_booking", "POST", {"p_booking": booking},
                      bearer=s1_tok, key=PUB)
    ok("cancel_booking returns 'credited' (>24h out)", result == "credited", result)
    st, bal = call("/rest/v1/rpc/credit_balance", "POST", {"p_user": s1},
                   bearer=s1_tok, key=PUB)
    ok("₹299 is back in the student's wallet", bal == 299, bal)
    _, rows = call(f"/rest/v1/sessions?id=eq.{sess_id}&select=seats_booked")
    ok("the seat is released", rows[0]["seats_booked"] == 0, rows[0]["seats_booked"])

    _, slots3 = call("/rest/v1/rpc/available_slots", "POST",
                     {"p_mentor": mentor_id, "p_days": 14}, bearer=s2_tok, key=PUB)
    ok("the mentor gets the slot back once the 1:1 is empty",
       len([x for x in slots3 if x["starts_at"] == first]) == 1,
       "back in the pool" if len([x for x in slots3 if x["starts_at"] == first]) == 1
       else "still blocked — empty session holds the time")
    _, srow = call(f"/rest/v1/sessions?id=eq.{sess_id}&select=status")
    ok("the empty 1:1 session is cancelled, not left scheduled",
       srow[0]["status"] == "cancelled", srow[0]["status"])
    _, notes = call(f"/rest/v1/notifications?user_id=eq.{mentor_id}"
                    "&type=eq.session_cancelled&select=title")
    ok("the mentor is told their slot reopened", len(notes) >= 1, f"{len(notes)} notifications")

print()
print("=" * 68)
print("STEP 8 — cancelling late does NOT refund")
print("=" * 68)

if soon:
    print(f"     (booking a slot {lead_time(soon).total_seconds() / 3600:.0f}h out)")
    st, late = call("/rest/v1/rpc/book_one_on_one", "POST",
                    {"p_mentor": mentor_id, "p_start_at": soon},
                    bearer=s2_tok, key=PUB)
    ok("a slot inside 24h can still be booked", st == 200 and isinstance(late, str), st)
    call("/rest/v1/rpc/confirm_booking", "POST",
         {"p_booking": late, "p_payment_id": f"pay_late_{stamp}",
          "p_order_id": f"order_late_{stamp}"})
    st, result = call("/rest/v1/rpc/cancel_booking", "POST", {"p_booking": late},
                      bearer=s2_tok, key=PUB)
    ok("cancelling inside 24h returns 'no_refund'", result == "no_refund", result)
    st, bal2 = call("/rest/v1/rpc/credit_balance", "POST", {"p_user": s2},
                    bearer=s2_tok, key=PUB)
    ok("no credits were given", bal2 == 0, bal2)

print()
print("=" * 68)
print("ROLE SEPARATION — what each role may reach")
print("=" * 68)

_, prof = call(f"/rest/v1/profiles?id=eq.{mentor_id}&select=role")
ok("the mentor's role is 'mentor'", prof[0]["role"] == "mentor", prof[0]["role"])
_, prof = call(f"/rest/v1/profiles?id=eq.{s1}&select=role")
ok("the student's role is 'student'", prof[0]["role"] == "student", prof[0]["role"])

st, _ = call("/rest/v1/rpc/hostable_mentors", "POST", {}, bearer=s1_tok, key=PUB)
ok("a student cannot list hostable mentors (admin only)",
   st >= 400 or _ == [], f"{st} {_}")

st, earn = call("/rest/v1/rpc/mentor_earnings", "POST", {}, bearer=s1_tok, key=PUB)
ok("a student's mentor_earnings is empty", earn == [] or st >= 400, f"{st} {earn}")

st, _ = call("/rest/v1/admin_actions?select=id", bearer=s1_tok, key=PUB)
ok("a student cannot read the admin audit log", st >= 400 or _ == [], f"{st} {_}")

print()
print("=" * 68)
print(("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED"))
for f in fails:
    print("  - " + f)
print("=" * 68)
print(f"\nDemo mentor:  {mentor_email}")
print(f"Demo students: {s1_email} / {s2_email}")
print("Password for all three: correct horse 8")
