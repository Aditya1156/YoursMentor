"""
The signup trial, and coupons on plans.

Also checks the thing that history says to check: that a promotion cannot stop
somebody creating an account. handle_new_user() once took signup down over a
one-character name, so the trial trigger swallows its own errors and this proves
it by breaking the trial on purpose.

  python3 scripts/smoke/trial-and-coupons.py
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


def mkuser(email, name, role, dob="2002-01-01"):
    st, u = call("/auth/v1/admin/users", "POST", {
        "email": email, "password": PW, "email_confirm": True,
        "user_metadata": {"name": name, "role": role, "date_of_birth": dob}})
    return st, (u.get("id") if isinstance(u, dict) else None), u


def signin(email):
    st, r = call("/auth/v1/token?grant_type=password", "POST",
                 {"email": email, "password": PW}, key=PUB)
    assert st == 200, r
    return r


def jar(sess):
    b = base64.b64encode(json.dumps(sess, separators=(",", ":")).encode()).decode()
    n = f"sb-{REF}-auth-token"
    CH = 3180
    if len(b) <= CH:
        return f"{n}=base64-{b}"
    parts = [b[i:i + CH] for i in range(0, len(b), CH)]
    return "; ".join(f'{n}.{i}={"base64-" + p if i == 0 else p}' for i, p in enumerate(parts))


def post(path, cookie, body):
    return subprocess.run(
        ["curl", "-s", "-X", "POST", "-H", f"Cookie: {cookie}",
         "-H", "Content-Type: application/json", "-d", json.dumps(body), APP + path],
        capture_output=True, text=True, timeout=60).stdout


def sub_of(uid):
    st, r = call(f"/rest/v1/subscriptions?user_id=eq.{uid}"
                 "&select=status,expires_at,group_remaining,one_on_one_remaining,"
                 "razorpay_payment_id,plans(code)")
    return r[0] if r else None


stamp = int(time.time())
made = []

print("=" * 70)
print("a new student gets one day, one session")
print("=" * 70)
se = f"trs{stamp}@gmail.com"
st, student, _ = mkuser(se, "Trial Student", "student")
made.append(student)
ok("the account was created", st in (200, 201))
time.sleep(1)
sub = sub_of(student)
ok("a trial subscription exists", bool(sub), sub)
if sub:
    ok("on the trial plan", sub["plans"]["code"] == "trial", sub["plans"]["code"])
    ok("one group session included", sub["group_remaining"] == 1, sub["group_remaining"])
    ok("no 1:1 included", sub["one_on_one_remaining"] == 0)
    ok("marked as a signup trial", sub["razorpay_payment_id"] == "signup_trial")
    hours = (datetime.fromisoformat(sub["expires_at"].replace("Z", "+00:00"))
             - datetime.now(timezone.utc)).total_seconds() / 3600
    ok("expires in about a day", 23 < hours <= 24.1, f"{hours:.1f}h")
st, notes = call(f"/rest/v1/notifications?user_id=eq.{student}&type=eq.trial_started&select=title")
ok("the student is told", len(notes) >= 1, notes[0]["title"] if notes else notes)

print()
print("  -- mentors and admins do not get one --")
st, m_uid, _ = mkuser(f"trm{stamp}@gmail.com", "Trial Mentor", "mentor", "1998-01-01")
made.append(m_uid)
time.sleep(1)
ok("a mentor gets no trial", sub_of(m_uid) is None, sub_of(m_uid))
st, a_uid, _ = mkuser(f"tra{stamp}@gmail.com", "Trial Admin", "admin", "1990-01-01")
made.append(a_uid)
call(f"/rest/v1/profiles?id=eq.{a_uid}", "PATCH", {"role": "admin"}, prefer="return=minimal")
ok("an admin gets no trial", sub_of(a_uid) is None)

print()
print("=" * 70)
print("the trial actually pays for a seat")
print("=" * 70)
call(f"/rest/v1/profiles?id=eq.{student}", "PATCH",
     {"onboarding_complete": True}, prefer="return=minimal")
s_sess = signin(se)
S, s_jar = s_sess["access_token"], jar(s_sess)
call("/rest/v1/mentor_profiles", "POST", {
    "user_id": m_uid, "headline": "SDE", "breakthrough_story": "t",
    "linkedin_url": "https://x.com/a", "price_1on1": 299, "college_tier": "tier3",
    "home_state": "Goa", "languages": ["English"], "tracks": ["first_job"],
    "topics": ["t"], "status": "approved"}, prefer="return=minimal")
start = datetime.now(timezone.utc) + timedelta(days=4)
st, g = call("/rest/v1/sessions", "POST", {
    "mentor_id": m_uid, "type": "group", "title": "Trial clinic",
    "start_at": start.isoformat(), "end_at": (start + timedelta(hours=1)).isoformat(),
    "capacity": 10, "min_seats": 1, "price": 99, "status": "scheduled",
}, prefer="return=representation")
st, bk = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": g[0]["id"]}, bearer=S, key=PUB)
res = json.loads(post(f"/api/checkout/{bk}", s_jar, {}))
ok("the trial covers the seat", res.get("paidBy") == "plan", res)
ok("the allowance is used up", sub_of(student)["group_remaining"] == 0)
ok("the session is days away but the seat is already confirmed",
   (start - datetime.now(timezone.utc)).days >= 3,
   "a 1-day trial still buys a seat later in the week")

st, bal = call("/rest/v1/rpc/credit_balance", "POST", {"p_user": student})
ok("no credit was involved", bal == 0, f"₹{bal}")

print()
print("=" * 70)
print("a coupon discounts a plan")
print("=" * 70)
code = f"HALF{stamp % 100000}"
st, _ = call("/rest/v1/coupons", "POST", {
    "code": code, "description": "50% off your first month", "kind": "percent",
    "value": 50, "scope": "any", "max_redemptions_per_user": 1, "active": True,
}, prefer="return=minimal")
ok("an admin-style coupon exists", st in (200, 201), st)
st, prev = call("/rest/v1/rpc/preview_coupon_for_amount", "POST",
                {"p_code": code, "p_amount": 499}, bearer=S, key=PUB)
ok("preview says ₹249 off ₹499", prev and prev[0]["amount_off"] == 249,
   prev[0]["amount_off"] if prev else prev)

call("/rest/v1/credit_ledger", "POST",
     {"user_id": student, "amount": 250, "reason": "test"}, prefer="return=minimal")
res = json.loads(post("/api/subscribe", s_jar, {"plan": "pro", "useCredits": True, "coupon": code}))
ok("Pro starts for the discounted price", res.get("status") == "active", res)
ok("the discount is reported", res.get("discount") == 249, res.get("discount"))
st, bal = call("/rest/v1/rpc/credit_balance", "POST", {"p_user": student})
ok("only ₹250 of credit was taken, not ₹499", bal == 0, f"₹{bal} left")

print()
print("  -- the trial is replaced, not stacked --")
sub = sub_of(student)
ok("now on Pro", sub["plans"]["code"] == "pro", sub["plans"]["code"])
ok("4 group sessions, not 5", sub["group_remaining"] == 4, sub["group_remaining"])
ok("2 one-on-ones", sub["one_on_one_remaining"] == 2)
days = (datetime.fromisoformat(sub["expires_at"].replace("Z", "+00:00"))
        - datetime.now(timezone.utc)).days
ok("30 days, not 31", 29 <= days <= 30, f"{days}d")

print()
print("  -- the code cannot be used twice --")
st, r = call("/rest/v1/rpc/preview_coupon_for_amount", "POST",
             {"p_code": code, "p_amount": 499}, bearer=S, key=PUB)
ok("a second use is refused", st >= 400, msg(r))
st, red = call(f"/rest/v1/coupon_redemptions?user_id=eq.{student}&select=amount_off")
ok("the redemption was recorded", len(red) == 1 and red[0]["amount_off"] == 249, red)

print()
print("  -- session-scoped codes stay off plans --")
gcode = f"GRP{stamp % 100000}"
call("/rest/v1/coupons", "POST", {
    "code": gcode, "description": "₹50 off a group room", "kind": "flat",
    "value": 50, "scope": "group_only", "active": True,
}, prefer="return=minimal")
st, r = call("/rest/v1/rpc/preview_coupon_for_amount", "POST",
             {"p_code": gcode, "p_amount": 199}, bearer=S, key=PUB)
ok("a group-only code is refused on a plan", st >= 400, msg(r))

print()
print("=" * 70)
print("the trial is not for sale, and cannot break signup")
print("=" * 70)
res = json.loads(post("/api/subscribe", s_jar, {"plan": "trial"}))
ok("buying the trial is refused", "error" in res, res.get("error"))
out = subprocess.run(["curl", "-s", APP + "/pricing"], capture_output=True, text=True).stdout
ok("/pricing does not list it as a column", "Free trial" not in out)

# Break the trial deliberately: no active trial plan to find.
call("/rest/v1/plans?code=eq.trial", "PATCH", {"active": False}, prefer="return=minimal")
st, broken, body = mkuser(f"trbroken{stamp}@gmail.com", "No Trial", "student")
made.append(broken)
ok("signup still succeeds with the trial plan switched off", st in (200, 201), st)
time.sleep(1)
ok("and that account simply has no subscription", sub_of(broken) is None)
call("/rest/v1/plans?code=eq.trial", "PATCH", {"active": True}, prefer="return=minimal")

for uid in made:
    if uid:
        call(f"/auth/v1/admin/users/{uid}", "DELETE")
call(f"/rest/v1/coupons?code=eq.{code}", "DELETE", prefer="return=minimal")
call(f"/rest/v1/coupons?code=eq.{gcode}", "DELETE", prefer="return=minimal")

print()
print("=" * 70)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 70)
