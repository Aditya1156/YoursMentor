"""
/rate/[bookingId] and /report — the two dead links, now pages.

Both were linked from live surfaces and 404'd: the rating link in the
session-completed notification, and the Report button inside the call.

  python3 scripts/smoke/rate-and-report.py        (dev server on :3000)
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
    b = base64.b64encode(json.dumps(sess, separators=(",", ":")).encode()).decode()
    n = f"sb-{REF}-auth-token"
    CH = 3180
    if len(b) <= CH:
        return f"{n}=base64-{b}"
    parts = [b[i:i + CH] for i in range(0, len(b), CH)]
    return "; ".join(f'{n}.{i}={"base64-" + p if i == 0 else p}' for i, p in enumerate(parts))


def page(path, jar):
    """Rendered page as readable text.

    React separates interpolated values with HTML comment markers, so a raw-HTML
    substring search for "rated this 5 out of 5" fails on
    "rated this <!-- -->5<!-- --> out of 5". Stripping tags and comments first
    tests what a person actually reads.
    """
    raw = subprocess.run(["curl", "-s", "-H", f"Cookie: {jar}", APP + path],
                         capture_output=True, text=True, timeout=60).stdout
    import re as _re
    txt = _re.sub(r"<!--.*?-->", "", raw, flags=_re.S)
    txt = _re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", txt, flags=_re.S)
    txt = _re.sub(r"<[^>]+>", " ", txt)
    txt = txt.replace("&rsquo;", "\u2019").replace("&amp;", "&").replace("&nbsp;", " ")
    return _re.sub(r"\s+", " ", txt)


def raw(path, jar):
    """Unmodified HTML, for things that live in attributes such as aria-label."""
    return subprocess.run(["curl", "-s", "-H", f"Cookie: {jar}", APP + path],
                          capture_output=True, text=True, timeout=60).stdout


def status(path, jar):
    return subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-H", f"Cookie: {jar}", APP + path],
        capture_output=True, text=True, timeout=60).stdout.strip()


stamp = int(time.time())
m_email, s_email = f"rrm{stamp}@gmail.com", f"rrs{stamp}@gmail.com"
st, u = call("/auth/v1/admin/users", "POST", {
    "email": m_email, "password": PW, "email_confirm": True,
    "user_metadata": {"name": "Rate Mentor", "role": "mentor", "date_of_birth": "1998-01-01"}})
mentor = u["id"]
st, u = call("/auth/v1/admin/users", "POST", {
    "email": s_email, "password": PW, "email_confirm": True,
    "user_metadata": {"name": "Rate Student", "role": "student", "date_of_birth": "2002-01-01"}})
student = u["id"]
call("/rest/v1/mentor_profiles", "POST", {
    "user_id": mentor, "headline": "SDE-2 at Swiggy", "breakthrough_story": "t",
    "linkedin_url": "https://x.com/a", "price_1on1": 199, "session_1on1_minutes": 30,
    "college_tier": "tier3", "home_state": "Goa", "languages": ["English"],
    "tracks": ["first_job"], "topics": ["t"], "status": "approved"}, prefer="return=minimal")
call(f"/rest/v1/profiles?id=eq.{student}", "PATCH",
     {"onboarding_complete": True}, prefer="return=minimal")
s_sess = signin(s_email)
S = s_sess["access_token"]
s_jar = cookies(s_sess)

# A session in the past with the seat marked attended — what the cron produces.
start = datetime.now(timezone.utc) + timedelta(days=1)
st, sess = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one", "title": "Resume teardown",
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
print("/rate — before the session has happened")
print("=" * 70)
html = page(f"/rate/{bk}", s_jar)
ok("the page exists (was a 404)", status(f"/rate/{bk}", s_jar) == "200",
   status(f"/rate/{bk}", s_jar))
ok("it shows the mentor and session", "Rate Mentor" in html and "Resume teardown" in html)
ok("but refuses to rate a session not yet attended", "not ready to rate yet" in html)

# Move it to the past and mark attendance, as a real session would.
past = datetime.now(timezone.utc) - timedelta(hours=2)
call(f"/rest/v1/sessions?id=eq.{sid}", "PATCH",
     {"start_at": past.isoformat(), "end_at": (past + timedelta(minutes=30)).isoformat()},
     prefer="return=minimal")
call(f"/rest/v1/bookings?id=eq.{bk}", "PATCH", {"status": "attended"}, prefer="return=minimal")

print()
print("=" * 70)
print("/rate — after attending")
print("=" * 70)
html = page(f"/rate/{bk}", s_jar)
ok("the form is offered", "How was your session" in html)
# The scale words are on each star's aria-label until one is hovered, so this
# one has to look at the markup rather than the visible text.
ok("stars carry words, not bare numbers",
   "Changed what I do next" in raw(f"/rate/{bk}", s_jar))
ok("the comment is marked optional", "(optional)" in html)
ok("it says where the comment appears", "under your first name" in html)

st, before = call(f"/rest/v1/mentor_profiles?id=eq.{mentor}&select=rating_avg,rating_count"
                  if False else f"/rest/v1/mentor_profiles?user_id=eq.{mentor}&select=rating_avg,rating_count")
st, r = call("/rest/v1/rpc/leave_review", "POST",
             {"p_booking": bk, "p_rating": 5,
              "p_comment": "Tore my resume apart and showed exactly why ATS was dropping it."},
             bearer=S, key=PUB)
ok("the review posts", st == 200 and isinstance(r, str), msg(r) if st != 200 else "")
st, after = call(f"/rest/v1/mentor_profiles?user_id=eq.{mentor}&select=rating_avg,rating_count")
ok("the mentor's rating rolled up",
   after[0]["rating_count"] == before[0]["rating_count"] + 1
   and float(after[0]["rating_avg"]) == 5.0,
   f'{before[0]["rating_avg"]}/{before[0]["rating_count"]} -> {after[0]["rating_avg"]}/{after[0]["rating_count"]}')

html = page(f"/rate/{bk}", s_jar)
ok("a second visit says it is already rated", "already rated this 5 out of 5" in html)
st, r = call("/rest/v1/rpc/leave_review", "POST",
             {"p_booking": bk, "p_rating": 1, "p_comment": "changed my mind"},
             bearer=S, key=PUB)
ok("and a second review is refused by the database", st >= 400, msg(r))

print()
print("=" * 70)
print("/rate — somebody else's booking")
print("=" * 70)
st, u = call("/auth/v1/admin/users", "POST", {
    "email": f"rro{stamp}@gmail.com", "password": PW, "email_confirm": True,
    "user_metadata": {"name": "Nosy", "role": "student", "date_of_birth": "2002-01-01"}})
nosy = u["id"]
call(f"/rest/v1/profiles?id=eq.{nosy}", "PATCH",
     {"onboarding_complete": True}, prefer="return=minimal")
n_sess = signin(f"rro{stamp}@gmail.com")
n_jar = cookies(n_sess)
code = status(f"/rate/{bk}", n_jar)
ok("an unrelated student is bounced", code in ("307", "302", "303"), code)
st, r = call("/rest/v1/rpc/leave_review", "POST",
             {"p_booking": bk, "p_rating": 1}, bearer=n_sess["access_token"], key=PUB)
ok("and cannot review it via the API either", st >= 400, msg(r))

print()
print("=" * 70)
print("/report — the Report button inside the call")
print("=" * 70)
code = status(f"/report?type=session&id={sid}", s_jar)
ok("the page exists (was a 404)", code == "200", code)
html = page(f"/report?type=session&id={sid}", s_jar)
ok("it names what is being reported", "Resume teardown" in html and "Rate Mentor" in html)
ok("offers the off-platform-payment reason", "Asked me for money outside the platform" in html)
ok("offers the move-to-WhatsApp reason", "WhatsApp" in html)
ok("says the reported person is not told who filed it", "never told who filed it" in html)
ok("points at 112 for an emergency", "112" in html)

html_user = page(f"/report?type=user&id={mentor}", s_jar)
ok("reporting a person names them", "Rate Mentor" in html_user)

st, _ = call("/rest/v1/reports", "POST", {
    "reporter_id": student, "target_type": "session", "target_id": sid,
    "reason": "Pushed me to WhatsApp, Telegram or a personal number",
    "details": "Asked for my number in the first two minutes.",
}, prefer="return=minimal")
ok("a report can be filed", st in (200, 201), st)
st, mine = call("/rest/v1/reports?select=id,status", bearer=S, key=PUB)
ok("the reporter can see their own", len(mine) >= 1, f"{len(mine)}")
st, theirs = call("/rest/v1/reports?select=id", bearer=n_sess["access_token"], key=PUB)
ok("another student cannot see it", len(theirs) == 0, f"{len(theirs)}")
st, r = call("/rest/v1/reports", "POST", {
    "reporter_id": nosy, "target_type": "session", "target_id": sid, "reason": "forged",
}, bearer=S, key=PUB, prefer="return=minimal")
ok("a report cannot be filed in someone else's name", st >= 400, msg(r))

code = status(f"/report?type=session&id={sid}", "")
ok("a signed-out visitor is sent to sign in", code in ("307", "302", "303"), code)

for uid in (mentor, student, nosy):
    call(f"/auth/v1/admin/users/{uid}", "DELETE")

print()
print("=" * 70)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 70)
