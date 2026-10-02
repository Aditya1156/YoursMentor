"""
"Start now" — the way to hold a real call without waiting for a booked time.

Checks that it asks rather than assumes, that only the other side can answer,
that accepting makes the room genuinely joinable (a LiveKit token is issued),
and that the thirty-minute reschedule floor is back and still enforced.

  python3 scripts/smoke/start-now.py        (dev server on :3000 for the token)
"""
import base64, json, os, subprocess, time, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

BASE = "https://bmyzudohkgxdnifpyanv.supabase.co"
REF = "bmyzudohkgxdnifpyanv"
APP = os.environ.get("APP_URL", "http://localhost:3000")
env = dict(
    l.split("=", 1) for l in open(os.path.expanduser("~/onestep/.env.local"))
    if "=" in l and not l.startswith("#"))
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
    return r


def cookies(sess):
    b64 = base64.b64encode(json.dumps(sess, separators=(",", ":")).encode()).decode()
    n = f"sb-{REF}-auth-token"
    CH = 3180
    if len(b64) <= CH:
        return f"{n}=base64-{b64}"
    parts = [b64[i:i + CH] for i in range(0, len(b64), CH)]
    return "; ".join(f'{n}.{i}={"base64-" + p if i == 0 else p}' for i, p in enumerate(parts))


def mkuser(email, name, role):
    st, u = call("/auth/v1/admin/users", "POST", {
        "email": email, "password": PW, "email_confirm": True,
        "user_metadata": {"name": name, "role": role, "date_of_birth": "1999-05-20"}})
    assert st in (200, 201), u
    return u["id"]


stamp = int(time.time())
m_email, s_email, o_email = (f"sn{k}{stamp}@gmail.com" for k in ("m", "s", "o"))
mentor, student, outsider = (mkuser(m_email, "SN Mentor", "mentor"),
                             mkuser(s_email, "SN Student", "student"),
                             mkuser(o_email, "SN Outsider", "student"))
call("/rest/v1/mentor_profiles", "POST", {
    "user_id": mentor, "headline": "SDE at Swiggy", "breakthrough_story": "t",
    "linkedin_url": "https://x.com/a", "price_1on1": 199, "session_1on1_minutes": 30,
    "college_tier": "tier3", "home_state": "Goa", "languages": ["English"],
    "tracks": ["first_job"], "topics": ["t"], "status": "approved"}, prefer="return=minimal")
for uid in (student, outsider):
    call(f"/rest/v1/profiles?id=eq.{uid}", "PATCH",
         {"onboarding_complete": True}, prefer="return=minimal")
m_sess, s_sess, o_sess = signin(m_email), signin(s_email), signin(o_email)
M, S, O = (x["access_token"] for x in (m_sess, s_sess, o_sess))

# A 1:1 booked for three days' time — nowhere near joinable.
start = datetime.now(timezone.utc) + timedelta(days=3)
st, sess = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one", "title": "Mock interview",
    "start_at": start.isoformat(), "end_at": (start + timedelta(minutes=30)).isoformat(),
    "capacity": 1, "min_seats": 1, "price": 199, "status": "scheduled",
}, prefer="return=representation")
sid = sess[0]["id"]
st, bk = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": sid}, bearer=S, key=PUB)
call("/rest/v1/credit_ledger", "POST",
     {"user_id": student, "amount": 199, "reason": "t"}, prefer="return=minimal")
call("/rest/v1/rpc/confirm_booking", "POST",
     {"p_booking": bk, "p_payment_id": "t", "p_order_id": None})
print("=" * 70)
print("SETUP")
print("=" * 70)
ok("a 1:1 is booked three days out", True, start.strftime("%d %b %H:%M UTC"))


def token(sess_cookie, session_id):
    out = subprocess.run(
        ["curl", "-s", "-X", "POST", "-H", f"Cookie: {sess_cookie}",
         "-H", "Content-Type: application/json", "-d", '{"device":"primary"}',
         f"{APP}/api/sessions/{session_id}/token"],
        capture_output=True, text=True, timeout=60).stdout
    try:
        return json.loads(out)
    except Exception:
        return {"raw": out[:120]}


m_jar, s_jar = cookies(m_sess), cookies(s_sess)
pre = token(s_jar, sid)
ok("the room is NOT joinable yet", "token" not in pre, pre.get("error") or pre)

print()
print("=" * 70)
print("THE STUDENT ASKS TO START NOW")
print("=" * 70)
st, req = call("/rest/v1/rpc/request_start_now", "POST", {"p_session": sid},
               bearer=S, key=PUB)
ok("student can ask", st == 200 and isinstance(req, str), msg(req) if st != 200 else "")

st, row = call(f"/rest/v1/sessions?id=eq.{sid}&select=start_at")
ok("the session has NOT moved just from asking", row[0]["start_at"][:10] == start.isoformat()[:10],
   row[0]["start_at"][:16])

st, p = call("/rest/v1/rpc/my_pending_reschedules", "POST", {}, bearer=M, key=PUB)
ok("mentor sees it waiting", st == 200 and len(p) == 1 and p[0]["kind"] == "start_now",
   p[0]["kind"] if p else p)
st, mine = call("/rest/v1/rpc/my_sent_reschedules", "POST", {}, bearer=S, key=PUB)
ok("student sees it as sent", len(mine) == 1 and mine[0]["kind"] == "start_now")
st, stat = call("/rest/v1/rpc/start_now_status", "POST", {"p_request": req}, bearer=S, key=PUB)
ok("status polls as pending", stat and stat[0]["status"] == "pending", stat)

print()
print("  -- nobody can shortcut it --")
st, r = call("/rest/v1/rpc/accept_start_now", "POST", {"p_request": req}, bearer=S, key=PUB)
ok("the asker cannot accept their own", st >= 400, msg(r))
st, r = call("/rest/v1/rpc/accept_start_now", "POST", {"p_request": req}, bearer=O, key=PUB)
ok("an outsider cannot accept", st >= 400, msg(r))

print()
print("=" * 70)
print("THE MENTOR ACCEPTS — the room opens")
print("=" * 70)
st, returned = call("/rest/v1/rpc/accept_start_now", "POST", {"p_request": req},
                    bearer=M, key=PUB)
ok("accept returns the session id", returned == sid, returned)
st, row = call(f"/rest/v1/sessions?id=eq.{sid}&select=start_at,end_at,status")
moved = datetime.fromisoformat(row[0]["start_at"].replace("Z", "+00:00"))
delta = (datetime.now(timezone.utc) - moved).total_seconds()
ok("the session is now starting", 0 < delta < 180, f"{delta:.0f}s ago")
ok("still 30 minutes long",
   (datetime.fromisoformat(row[0]["end_at"].replace("Z", "+00:00")) - moved)
   == timedelta(minutes=30))
ok("still 'scheduled'", row[0]["status"] == "scheduled", row[0]["status"])

st_tok = token(s_jar, sid)
ok("STUDENT gets a LiveKit token now", "token" in st_tok,
   st_tok.get("error") or "issued")
mt_tok = token(m_jar, sid)
ok("MENTOR gets a LiveKit token now", "token" in mt_tok,
   mt_tok.get("error") or "issued")
if "token" in st_tok:
    payload = json.loads(base64.urlsafe_b64decode(st_tok["token"].split(".")[1] + "==").decode())
    ok("both land in the same room",
       payload["video"]["room"] == f"session_{sid}", payload["video"]["room"][:24])

st, notes = call(f"/rest/v1/notifications?user_id=eq.{student}"
                 "&type=eq.start_now_accepted&select=link")
ok("the asker is notified with the room link",
   len(notes) >= 1 and notes[0]["link"] == f"/room/{sid}",
   notes[0]["link"] if notes else notes)

print()
print("=" * 70)
print("DECLINING, AND LAPSING")
print("=" * 70)
far = datetime.now(timezone.utc) + timedelta(days=4)
st, s2 = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one", "title": "Second 1:1",
    "start_at": far.isoformat(), "end_at": (far + timedelta(minutes=30)).isoformat(),
    "capacity": 1, "min_seats": 1, "price": 199, "status": "scheduled",
}, prefer="return=representation")
sid2 = s2[0]["id"]
st, bk2 = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": sid2}, bearer=S, key=PUB)
call("/rest/v1/credit_ledger", "POST",
     {"user_id": student, "amount": 199, "reason": "t"}, prefer="return=minimal")
call("/rest/v1/rpc/confirm_booking", "POST",
     {"p_booking": bk2, "p_payment_id": "t2", "p_order_id": None})

st, req2 = call("/rest/v1/rpc/request_start_now", "POST", {"p_session": sid2},
                bearer=M, key=PUB)
ok("the mentor can ask too", st == 200 and isinstance(req2, str), msg(req2) if st != 200 else "")
st, _ = call("/rest/v1/rpc/decline_start_now", "POST", {"p_request": req2}, bearer=S, key=PUB)
st, stat = call("/rest/v1/rpc/start_now_status", "POST", {"p_request": req2}, bearer=M, key=PUB)
ok("declining closes it", stat and stat[0]["status"] == "declined", stat)
st, row = call(f"/rest/v1/sessions?id=eq.{sid2}&select=start_at")
ok("a declined ask leaves the booked time alone",
   row[0]["start_at"][:10] == far.isoformat()[:10], row[0]["start_at"][:16])

st, req3 = call("/rest/v1/rpc/request_start_now", "POST", {"p_session": sid2},
                bearer=M, key=PUB)
call(f"/rest/v1/reschedule_requests?id=eq.{req3}", "PATCH",
     {"expires_at": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()},
     prefer="return=minimal")
st, stat = call("/rest/v1/rpc/start_now_status", "POST", {"p_request": req3}, bearer=M, key=PUB)
ok("a lapsed ask reads as expired", stat and stat[0]["status"] == "expired", stat)
st, p = call("/rest/v1/rpc/my_pending_reschedules", "POST", {}, bearer=S, key=PUB)
ok("and stops being listed", all(x["request_id"] != req3 for x in p), len(p))
st, r = call("/rest/v1/rpc/accept_start_now", "POST", {"p_request": req3}, bearer=S, key=PUB)
ok("a lapsed ask cannot be accepted", st >= 400, msg(r))

print()
print("=" * 70)
print("THE 30-MINUTE RESCHEDULE FLOOR IS BACK")
print("=" * 70)
st, srow = call("/rest/v1/platform_settings?select=value&key=eq.reschedule_lead_time")
ok("reschedule_lead_time is 30 minutes", srow[0]["value"] == "30 minutes", srow[0]["value"])
st, brow = call("/rest/v1/platform_settings?select=value&key=eq.booking_lead_time")
ok("booking_lead_time is 12 hours", brow[0]["value"] == "12 hours", brow[0]["value"])
now_min = datetime.now(timezone.utc).replace(second=0, microsecond=0)
st, r = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid2, "p_start_at": (now_min + timedelta(minutes=5)).isoformat()},
             bearer=S, key=PUB)
ok("5 minutes out is refused again", st >= 400, msg(r))
st, r = call("/rest/v1/rpc/request_reschedule", "POST",
             {"p_session": sid2, "p_start_at": (now_min + timedelta(minutes=30)).isoformat()},
             bearer=S, key=PUB)
ok("exactly 30 minutes is accepted (minute boundary holds)",
   st == 200 and isinstance(r, str), msg(r) if st != 200 else "")

for uid in (mentor, student, outsider):
    call(f"/auth/v1/admin/users/{uid}", "DELETE")

print()
print("=" * 70)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 70)
