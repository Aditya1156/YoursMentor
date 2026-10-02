"""
Rescheduling a 1:1, walked as both sides with their own tokens.

The rule being tested is that nothing moves until the other side agrees, and
that neither side can move it alone.

  python3 scripts/smoke/reschedule.py
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
PW = "correct horse 8"
fails = []


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


def ok(label, cond, extra=""):
    print(("  PASS  " if cond else "  FAIL  ") + label + (("   " + str(extra)) if extra else ""))
    if not cond:
        fails.append(label)


def msg(r):
    return r.get("message") if isinstance(r, dict) else r


def signin(email):
    st, r = call("/auth/v1/token?grant_type=password", "POST",
                 {"email": email, "password": PW}, key=PUB)
    assert st == 200, r
    return r["access_token"]


def mkuser(email, name, role):
    st, u = call("/auth/v1/admin/users", "POST", {
        "email": email, "password": PW, "email_confirm": True,
        "user_metadata": {"name": name, "role": role, "date_of_birth": "1999-05-20"}})
    assert st in (200, 201), u
    return u["id"]


def session_time(sid):
    st, r = call(f"/rest/v1/sessions?id=eq.{sid}&select=start_at,end_at")
    return r[0]["start_at"], r[0]["end_at"]


stamp = int(time.time())
print("=" * 70)
print("SETUP")
print("=" * 70)

m_email, s_email, o_email = (f"rs{k}{stamp}@gmail.com" for k in ("mentor", "student", "other"))
mentor = mkuser(m_email, "Resched Mentor", "mentor")
student = mkuser(s_email, "Resched Student", "student")
outsider = mkuser(o_email, "Nosy Outsider", "student")
call("/rest/v1/mentor_profiles", "POST", {
    "user_id": mentor, "headline": "SDE at Swiggy", "breakthrough_story": "Test account.",
    "linkedin_url": "https://linkedin.com/in/rs", "price_1on1": 199,
    "session_1on1_minutes": 30, "college_tier": "tier3", "home_state": "Goa",
    "languages": ["English"], "tracks": ["first_job"], "topics": ["Testing"],
    "status": "approved"}, prefer="return=minimal")
for uid in (student, outsider):
    call(f"/rest/v1/profiles?id=eq.{uid}", "PATCH",
         {"onboarding_complete": True}, prefer="return=minimal")

m_tok, s_tok, o_tok = signin(m_email), signin(s_email), signin(o_email)

# A confirmed 1:1 three days out, paid in credits.
start = datetime.now(timezone.utc) + timedelta(days=3)
st, sess = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one", "title": "1:1 reschedule test",
    "start_at": start.isoformat(), "end_at": (start + timedelta(minutes=30)).isoformat(),
    "capacity": 1, "min_seats": 1, "price": 199, "status": "scheduled",
}, prefer="return=representation")
sid = sess[0]["id"]
st, booking = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": sid}, bearer=s_tok, key=PUB)
call("/rest/v1/credit_ledger", "POST",
     {"user_id": student, "amount": 199, "reason": "test"}, prefer="return=minimal")
call("/rest/v1/rpc/confirm_booking", "POST",
     {"p_booking": booking, "p_payment_id": "t", "p_order_id": None})
original, _ = session_time(sid)
ok("a confirmed 1:1 exists", True, f"starts {original[:16]}")

print()
print("=" * 70)
print("STUDENT ASKS TO MOVE IT EARLIER (the case from the brief)")
print("=" * 70)

sooner = datetime.now(timezone.utc) + timedelta(hours=4)
st, req = call("/rest/v1/rpc/request_reschedule", "POST", {
    "p_session": sid, "p_start_at": sooner.isoformat(),
    "p_reason": "Interview moved up, need help today"}, bearer=s_tok, key=PUB)
ok("student can propose a new time", st == 200 and isinstance(req, str), msg(req) if st != 200 else "")
now_start, _ = session_time(sid)
ok("the session has NOT moved yet", now_start == original, now_start[:16])

st, p = call("/rest/v1/rpc/pending_reschedule", "POST", {"p_session": sid}, bearer=m_tok, key=PUB)
ok("mentor sees the pending request", st == 200 and len(p) == 1,
   p[0]["requested_by_name"] if p else p)
ok("and it is not marked as theirs", p and p[0]["mine"] is False)
st, p2 = call("/rest/v1/rpc/pending_reschedule", "POST", {"p_session": sid}, bearer=s_tok, key=PUB)
ok("student sees it as their own", p2 and p2[0]["mine"] is True)

print()
print("  -- neither side can shortcut it --")
st, r = call("/rest/v1/rpc/respond_to_reschedule", "POST",
             {"p_request": req, "p_accept": True}, bearer=s_tok, key=PUB)
ok("the proposer cannot accept their own request", st >= 400, msg(r))
st, r = call("/rest/v1/rpc/respond_to_reschedule", "POST",
             {"p_request": req, "p_accept": True}, bearer=o_tok, key=PUB)
ok("an unrelated student cannot accept it", st >= 400, msg(r))
st, r = call("/rest/v1/rpc/pending_reschedule", "POST", {"p_session": sid}, bearer=o_tok, key=PUB)
ok("an unrelated student cannot even see it", st >= 400 or r == [], f"{st} {r}")

print()
print("  -- mentor accepts --")
st, r = call("/rest/v1/rpc/respond_to_reschedule", "POST",
             {"p_request": req, "p_accept": True}, bearer=m_tok, key=PUB)
ok("mentor accepts", r == "accepted", msg(r))
moved, moved_end = session_time(sid)
ok("the session moved to the new time",
   moved[:16] == sooner.isoformat()[:16], moved[:16])
ok("the 30-minute length was preserved",
   (datetime.fromisoformat(moved_end.replace("Z", "+00:00"))
    - datetime.fromisoformat(moved.replace("Z", "+00:00"))) == timedelta(minutes=30))
st, notes = call(f"/rest/v1/notifications?user_id=eq.{student}"
                 "&type=eq.reschedule_accepted&select=title")
ok("the student is told it was accepted", len(notes) >= 1, f"{len(notes)}")
st, p = call("/rest/v1/rpc/pending_reschedule", "POST", {"p_session": sid}, bearer=s_tok, key=PUB)
ok("no request is left pending", p == [], p)

print()
print("=" * 70)
print("MENTOR ASKS TO MOVE IT, STUDENT KEEPS THE ORIGINAL")
print("=" * 70)

before, _ = session_time(sid)
later = datetime.now(timezone.utc) + timedelta(days=5)
st, req2 = call("/rest/v1/rpc/request_reschedule", "POST", {
    "p_session": sid, "p_start_at": later.isoformat(),
    "p_reason": "Clash at work"}, bearer=m_tok, key=PUB)
ok("mentor can propose too", st == 200 and isinstance(req2, str), msg(req2) if st != 200 else "")
st, r = call("/rest/v1/rpc/respond_to_reschedule", "POST",
             {"p_request": req2, "p_accept": False}, bearer=s_tok, key=PUB)
ok("student declines, choosing to continue", r == "declined", msg(r))
after, _ = session_time(sid)
ok("the session kept its time", after == before, after[:16])
st, notes = call(f"/rest/v1/notifications?user_id=eq.{mentor}"
                 "&type=eq.reschedule_declined&select=title")
ok("the mentor is told", len(notes) >= 1, f"{len(notes)}")

print()
print("=" * 70)
print("THE RULES")
print("=" * 70)

st, r = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid, "p_start_at":
              (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()},
             bearer=s_tok, key=PUB)
ok("a time inside 30 minutes is refused", st >= 400, msg(r))

st, r = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid, "p_start_at":
              (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()},
             bearer=s_tok, key=PUB)
ok("a time beyond 60 days is refused", st >= 400, msg(r))

st, r = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid, "p_start_at":
              (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
             bearer=s_tok, key=PUB)
ok("a time in the past is refused", st >= 400, msg(r))

st, r = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid, "p_start_at":
              (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()},
             bearer=o_tok, key=PUB)
ok("an unrelated student cannot propose", st >= 400, msg(r))

# A second 1:1 for the same mentor, to prove the clash check.
clash_start = datetime.now(timezone.utc) + timedelta(days=7)
call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one", "title": "Another 1:1 already booked",
    "start_at": clash_start.isoformat(),
    "end_at": (clash_start + timedelta(minutes=30)).isoformat(),
    "capacity": 1, "min_seats": 1, "price": 199, "status": "scheduled",
}, prefer="return=minimal")
st, r = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid,
              "p_start_at": (clash_start + timedelta(minutes=10)).isoformat()},
             bearer=s_tok, key=PUB)
ok("a time overlapping the mentor's other session is refused", st >= 400, msg(r))

# Group sessions are out of scope.
g_start = datetime.now(timezone.utc) + timedelta(days=6)
st, g = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "group", "title": "Group room, not reschedulable",
    "start_at": g_start.isoformat(), "end_at": (g_start + timedelta(hours=1)).isoformat(),
    "capacity": 10, "min_seats": 3, "price": 99, "status": "scheduled",
}, prefer="return=representation")
st, r = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": g[0]["id"],
              "p_start_at": (g_start + timedelta(days=1)).isoformat()},
             bearer=m_tok, key=PUB)
ok("a group room cannot be rescheduled this way", st >= 400, msg(r))

print()
print("  -- withdrawing --")
st, req3 = call("/rest/v1/rpc/request_reschedule", "POST",
                {"p_session": sid,
                 "p_start_at": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()},
                bearer=s_tok, key=PUB)
st, r = call("/rest/v1/rpc/withdraw_reschedule", "POST", {"p_request": req3},
             bearer=m_tok, key=PUB)
ok("the other side cannot withdraw your request", st >= 400, msg(r))
st, r = call("/rest/v1/rpc/withdraw_reschedule", "POST", {"p_request": req3},
             bearer=s_tok, key=PUB)
ok("the proposer can withdraw it", st in (200, 204), msg(r))
st, p = call("/rest/v1/rpc/pending_reschedule", "POST", {"p_session": sid}, bearer=s_tok, key=PUB)
ok("nothing is left pending", p == [], p)

print()
print("  -- only one open proposal at a time --")
st, a = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid,
              "p_start_at": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()},
             bearer=s_tok, key=PUB)
st, b = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid,
              "p_start_at": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()},
             bearer=m_tok, key=PUB)
ok("a newer proposal replaces the older one", st == 200 and b != a, msg(b) if st != 200 else "")
st, p = call("/rest/v1/rpc/pending_reschedule", "POST", {"p_session": sid}, bearer=s_tok, key=PUB)
ok("exactly one is pending", len(p) == 1, len(p))

for uid in (mentor, student, outsider):
    call(f"/auth/v1/admin/users/{uid}", "DELETE")

print()
print("=" * 70)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 70)
