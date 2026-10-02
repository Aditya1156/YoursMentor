"""
The notifications page, checked as the mentor who was asked to move a session.

Reproduces the reported problem: a student reschedules, the mentor gets a
notification, and the mentor needs to accept it from the notifications panel.

  python3 scripts/smoke/notifications.py        (needs the dev server on :3000)
"""
import base64, json, os, re, subprocess, time, urllib.request, urllib.error
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


def page(path, jar):
    return subprocess.run(["curl", "-s", "-H", f"Cookie: {jar}", APP + path],
                          capture_output=True, text=True, timeout=60).stdout


def mkuser(email, name, role):
    st, u = call("/auth/v1/admin/users", "POST", {
        "email": email, "password": PW, "email_confirm": True,
        "user_metadata": {"name": name, "role": role, "date_of_birth": "1999-05-20"}})
    assert st in (200, 201), u
    return u["id"]


stamp = int(time.time())
m_email, s_email = f"ntmentor{stamp}@gmail.com", f"ntstudent{stamp}@gmail.com"
mentor = mkuser(m_email, "Notify Mentor", "mentor")
student = mkuser(s_email, "Notify Student", "student")
call("/rest/v1/mentor_profiles", "POST", {
    "user_id": mentor, "headline": "SDE at Swiggy", "breakthrough_story": "Test.",
    "linkedin_url": "https://linkedin.com/in/nt", "price_1on1": 199,
    "session_1on1_minutes": 30, "college_tier": "tier3", "home_state": "Goa",
    "languages": ["English"], "tracks": ["first_job"], "topics": ["Testing"],
    "status": "approved"}, prefer="return=minimal")
call(f"/rest/v1/profiles?id=eq.{student}", "PATCH",
     {"onboarding_complete": True}, prefer="return=minimal")
s_sess, m_sess = signin(s_email), signin(m_email)
s_tok = s_sess["access_token"]

start = datetime.now(timezone.utc) + timedelta(days=3)
st, sess = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one", "title": "Mock interview practice",
    "start_at": start.isoformat(), "end_at": (start + timedelta(minutes=30)).isoformat(),
    "capacity": 1, "min_seats": 1, "price": 199, "status": "scheduled",
}, prefer="return=representation")
sid = sess[0]["id"]
st, bk = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": sid}, bearer=s_tok, key=PUB)
call("/rest/v1/credit_ledger", "POST",
     {"user_id": student, "amount": 199, "reason": "test"}, prefer="return=minimal")
call("/rest/v1/rpc/confirm_booking", "POST",
     {"p_booking": bk, "p_payment_id": "t", "p_order_id": None})

print("=" * 70)
print("the student reschedules, exactly as reported")
print("=" * 70)
sooner = datetime.now(timezone.utc) + timedelta(hours=5)
st, req = call("/rest/v1/rpc/request_reschedule", "POST", {
    "p_session": sid, "p_start_at": sooner.isoformat(),
    "p_reason": "Interview got moved to tomorrow"}, bearer=s_tok, key=PUB)
ok("student proposed a new time", st == 200, req if st != 200 else "")

m_jar = cookies(m_sess)
html = page("/notifications", m_jar)

print()
print("=" * 70)
print("the MENTOR's notifications page")
print("=" * 70)
ok("page renders (not the placeholder)",
   "Notifications" in html and "Week 4" not in html and "Placeholder" not in html)
ok("says a request needs an answer", "request needs your answer" in html,
   re.search(r"\d+ requests? needs? your answer", html).group(0)
   if re.search(r"\d+ requests? needs? your answer", html) else "not found")
ok("'Needs your answer' section present", "Needs your answer" in html)
ok("names who asked", "Notify Student" in html)
ok("names the session", "Mock interview practice" in html)
ok("shows the reason", "Interview got moved to tomorrow" in html)
ok("has an Accept button", "Accept" in html)
ok("has a keep-original button", "Keep the original time" in html)
ok("the notification itself is listed", "asked to move your session" in html)
ok("unread is marked", ">New<" in html)

print()
print("=" * 70)
print("the STUDENT's page shows the other half")
print("=" * 70)
s_jar = cookies(s_sess)
shtml = page("/notifications", s_jar)
ok("student sees 'Waiting on them'", "Waiting on them" in shtml)
ok("student is NOT asked to answer their own request",
   "Needs your answer" not in shtml)
ok("student can withdraw", "Withdraw" in shtml)

print()
print("=" * 70)
print("the mentor accepts, from the notifications page")
print("=" * 70)
st, r = call("/rest/v1/rpc/respond_to_reschedule", "POST",
             {"p_request": req, "p_accept": True},
             bearer=m_sess["access_token"], key=PUB)
ok("accept succeeds", r == "accepted", r)
st, rows = call(f"/rest/v1/sessions?id=eq.{sid}&select=start_at")
ok("the session moved", rows[0]["start_at"][:13] == sooner.isoformat()[:13],
   rows[0]["start_at"][:16])
html2 = page("/notifications", m_jar)
ok("the request is gone from 'Needs your answer'",
   "Needs your answer" not in html2)
ok("mentor page now says up to date or unread only",
   "needs your answer" not in html2)

print()
print("=" * 70)
print("marking read")
print("=" * 70)
st, n = call("/rest/v1/rpc/mark_all_notifications_read", "POST", {},
             bearer=m_sess["access_token"], key=PUB)
ok("mark_all_notifications_read works", st == 200, f"{n} marked")
st, rows = call(f"/rest/v1/notifications?user_id=eq.{mentor}&read=eq.false&select=id")
ok("no unread left for the mentor", len(rows) == 0, f"{len(rows)} unread")
st, r = call("/rest/v1/rpc/mark_notification_read",
             "POST", {"p_notification": "00000000-0000-0000-0000-000000000000"},
             bearer=s_tok, key=PUB)
ok("marking a notification that is not yours is a no-op", st in (200, 204), st)

for uid in (mentor, student):
    call(f"/auth/v1/admin/users/{uid}", "DELETE")

print()
print("=" * 70)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 70)
