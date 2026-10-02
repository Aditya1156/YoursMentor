"""
Sets up a 1:1 you can actually join, right now, for testing the live call.

Two things in the normal flow make a same-minute test impossible, both of them
correct in production and both in the way here:

  * available_slots() only offers slots at least 12 hours out, so nothing you
    can book through the UI is joinable today
  * the room needs a CONFIRMED seat, and with Razorpay switched off the only
    way to confirm one is to cover the whole price in credits

So this creates the session directly, grants the student exactly enough
credits, and confirms through the same confirm_booking() the webhook uses.

Usage:  python3 scripts/smoke/live-call-setup.py [minutes_from_now]
"""
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

BASE = "https://bmyzudohkgxdnifpyanv.supabase.co"
env = dict(
    l.split("=", 1) for l in open(os.path.expanduser("~/onestep/.env.local"))
    if "=" in l and not l.startswith("#")
)
SVC = env["SUPABASE_SERVICE_ROLE_KEY"].strip()
PUB = env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].strip()
PW = "correct horse 8"
START_IN = int(sys.argv[1]) if len(sys.argv) > 1 else 5


def call(p, m="GET", b=None, key=SVC, bearer=None, prefer=None):
    r = urllib.request.Request(BASE + p, method=m)
    r.add_header("apikey", key)
    r.add_header("Authorization", "Bearer " + (bearer or key))
    r.add_header("Content-Type", "application/json")
    if prefer:
        r.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(
                r, json.dumps(b).encode() if b is not None else None, timeout=30) as x:
            raw = x.read().decode()
            return x.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


stamp = int(time.time())

# ---- the mentor: a real approved profile, so every mentor screen works -----
m_email = f"livementor{stamp}@gmail.com"
st, u = call("/auth/v1/admin/users", "POST", {
    "email": m_email, "password": PW, "email_confirm": True,
    "user_metadata": {"name": "Test Mentor", "role": "mentor",
                      "date_of_birth": "1998-03-10"}})
mentor = u["id"]
call("/rest/v1/mentor_profiles", "POST", {
    "user_id": mentor, "headline": "SDE-2 at Swiggy · test account",
    "breakthrough_story": "Exists so the live call can be tested.",
    "linkedin_url": "https://linkedin.com/in/test", "price_1on1": 199,
    "session_1on1_minutes": 30, "college_tier": "tier3", "home_state": "Maharashtra",
    "languages": ["Hindi", "English"], "tracks": ["first_job"],
    "topics": ["Live call test"], "status": "approved",
}, prefer="return=minimal")

# ---- the student -----------------------------------------------------------
s_email = f"livestudent{stamp}@gmail.com"
st, u = call("/auth/v1/admin/users", "POST", {
    "email": s_email, "password": PW, "email_confirm": True,
    "user_metadata": {"name": "Test Student", "role": "student",
                      "date_of_birth": "2003-07-22"}})
student = u["id"]
call(f"/rest/v1/profiles?id=eq.{student}", "PATCH",
     {"onboarding_complete": True, "college_tier": "tier3"}, prefer="return=minimal")

# ---- a session starting in a few minutes ----------------------------------
start = datetime.now(timezone.utc) + timedelta(minutes=START_IN)
end = start + timedelta(minutes=30)
st, sess = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one",
    "title": "1:1 live call test", "description": "Checking video, screen share and the board.",
    "track": "first_job", "start_at": start.isoformat(), "end_at": end.isoformat(),
    "capacity": 1, "min_seats": 1, "price": 199, "status": "scheduled",
}, prefer="return=representation")
session_id = sess[0]["id"]

# ---- the student books it and pays entirely in credits --------------------
st, tok = call("/auth/v1/token?grant_type=password", "POST",
               {"email": s_email, "password": PW}, key=PUB)
T = tok["access_token"]
st, booking = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": session_id},
                   bearer=T, key=PUB)
call("/rest/v1/credit_ledger", "POST", {
    "user_id": student, "amount": 199, "reason": "Test credit for the live call demo",
}, prefer="return=minimal")
st, _ = call("/rest/v1/rpc/confirm_booking", "POST", {
    "p_booking": booking, "p_payment_id": f"test_credits_{stamp}", "p_order_id": None})

st, rows = call(f"/rest/v1/bookings?id=eq.{booking}&select=status")
confirmed = rows[0]["status"] == "confirmed"

local_start = start.astimezone()
print("=" * 70)
print("A 1:1 live call is ready" if confirmed else "SETUP FAILED — seat not confirmed")
print("=" * 70)
print(f"  session        {session_id}")
print(f"  starts         {local_start:%H:%M:%S} local  (in {START_IN} min)")
print(f"  room opens     {(local_start - timedelta(minutes=10)):%H:%M:%S}  (10 min before)")
print(f"  room closes    {(local_start + timedelta(minutes=45)):%H:%M:%S}  (15 min after end)")
print(f"  seat           {rows[0]['status']}  (paid with credits, Razorpay not needed)")
print()
print("  Open these in two different browsers, or one normal + one incognito:")
print(f"    MENTOR   http://localhost:3000/room/{session_id}")
print(f"             {m_email}  /  {PW}")
print(f"    STUDENT  http://localhost:3000/room/{session_id}")
print(f"             {s_email}  /  {PW}")
print()
print("  Tablet as a second screen (same account as either side):")
print(f"    http://localhost:3000/room/{session_id}?device=companion")
print()
print("  Clean up afterwards:")
print(f"    python3 scripts/smoke/live-call-setup.py --delete {mentor} {student}")
print("=" * 70)
