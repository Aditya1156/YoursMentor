"""
Pod and Pro: does an included session actually pay for a seat, and does
cancelling give back the right thing?

The bug this is really guarding against: cancel_booking() used to credit
bookings.amount whatever paid for it, so a Pod subscriber cancelling four
sessions a month would have earned 4 x 199 in spendable credit off a 199 plan.

  python3 scripts/smoke/plans.py        (dev server on :3000)
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
                 "&select=group_remaining,one_on_one_remaining,status,expires_at")
    return r[0] if r else None


stamp = int(time.time())
m_email, s_email = f"plm{stamp}@gmail.com", f"pls{stamp}@gmail.com"
st, u = call("/auth/v1/admin/users", "POST", {
    "email": m_email, "password": PW, "email_confirm": True,
    "user_metadata": {"name": "Plan Mentor", "role": "mentor", "date_of_birth": "1998-01-01"}})
mentor = u["id"]
st, u = call("/auth/v1/admin/users", "POST", {
    "email": s_email, "password": PW, "email_confirm": True,
    "user_metadata": {"name": "Plan Student", "role": "student", "date_of_birth": "2002-01-01"}})
student = u["id"]
call("/rest/v1/mentor_profiles", "POST", {
    "user_id": mentor, "headline": "SDE at Swiggy", "breakthrough_story": "t",
    "linkedin_url": "https://x.com/a", "price_1on1": 299, "session_1on1_minutes": 30,
    "college_tier": "tier3", "home_state": "Goa", "languages": ["English"],
    "tracks": ["first_job"], "topics": ["t"], "status": "approved"}, prefer="return=minimal")
call(f"/rest/v1/profiles?id=eq.{student}", "PATCH",
     {"onboarding_complete": True}, prefer="return=minimal")
s_sess = signin(s_email)
S, s_jar = s_sess["access_token"], jar(s_sess)

print("=" * 70)
print("the plans are on sale")
print("=" * 70)
st, plans = call("/rest/v1/plans?select=code,price,group_sessions,one_on_ones&active=is.true&order=price")
ok("Pod and Pro are active and public", st == 200 and {p["code"] for p in plans} >= {"pod", "pro"},
   ", ".join(f'{p["code"]} ₹{p["price"]}' for p in plans))
out = subprocess.run(["curl", "-s", APP + "/pricing"], capture_output=True, text=True).stdout
ok("/pricing renders both", "Pod" in out and "Pro" in out)
ok("and keeps the ₹99 single session on the page", "Pay as you go" in out)

print()
print("=" * 70)
print("buying Pod with credits")
print("=" * 70)
call("/rest/v1/credit_ledger", "POST",
     {"user_id": student, "amount": 199, "reason": "test"}, prefer="return=minimal")
res = json.loads(post("/api/subscribe", s_jar, {"plan": "pod", "useCredits": True}))
ok("the subscribe route activates it", res.get("status") == "active", res)
sub = sub_of(student)
ok("4 group sessions are credited", sub and sub["group_remaining"] == 4, sub)
ok("Pod includes no 1:1s", sub and sub["one_on_one_remaining"] == 0)
st, bal = call("/rest/v1/rpc/credit_balance", "POST", {"p_user": student})
ok("the ₹199 was taken from credit", bal == 0, f"₹{bal}")

print()
print("=" * 70)
print("a group seat is paid by the plan, not by money")
print("=" * 70)
start = datetime.now(timezone.utc) + timedelta(days=3)
st, g = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "group", "title": "Resume clinic",
    "start_at": start.isoformat(), "end_at": (start + timedelta(hours=1)).isoformat(),
    "capacity": 10, "min_seats": 1, "price": 99, "status": "scheduled",
}, prefer="return=representation")
gid = g[0]["id"]
st, bk = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": gid}, bearer=S, key=PUB)
res = json.loads(post(f"/api/checkout/{bk}", s_jar, {}))
ok("checkout confirms it from the plan", res.get("status") == "confirmed"
   and res.get("paidBy") == "plan", res)
st, row = call(f"/rest/v1/bookings?id=eq.{bk}&select=status,razorpay_payment_id")
ok("the booking is confirmed", row[0]["status"] == "confirmed")
ok("and marked as plan-paid", str(row[0]["razorpay_payment_id"]).startswith("plan_"),
   row[0]["razorpay_payment_id"])
ok("the allowance went 4 -> 3", sub_of(student)["group_remaining"] == 3)
st, bal = call("/rest/v1/rpc/credit_balance", "POST", {"p_user": student})
ok("no credit was spent", bal == 0, f"₹{bal}")

print()
print("=" * 70)
print("THE BUG THIS EXISTS FOR: cancelling must not mint credit")
print("=" * 70)
st, result = call("/rest/v1/rpc/cancel_booking", "POST", {"p_booking": bk}, bearer=S, key=PUB)
ok("cancel reports the session returned, not credited", result == "session_returned", result)
st, bal = call("/rest/v1/rpc/credit_balance", "POST", {"p_user": student})
ok("NO credit was created", bal == 0, f"₹{bal} — a credit here would be free money")
ok("the session went back 3 -> 4", sub_of(student)["group_remaining"] == 4)

print()
print("=" * 70)
print("a 1:1 is refused on Pod, allowed on Pro")
print("=" * 70)
o_start = datetime.now(timezone.utc) + timedelta(days=4)
st, o = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one", "title": "1:1 with Plan Mentor",
    "start_at": o_start.isoformat(), "end_at": (o_start + timedelta(minutes=30)).isoformat(),
    "capacity": 1, "min_seats": 1, "price": 299, "status": "scheduled",
}, prefer="return=representation")
oid = o[0]["id"]
st, obk = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": oid}, bearer=S, key=PUB)
res = json.loads(post(f"/api/checkout/{obk}", s_jar, {}))
ok("Pod does not cover a 1:1", res.get("paidBy") != "plan", res.get("error") or res)

# Upgrade to Pro and try again.
call("/rest/v1/credit_ledger", "POST",
     {"user_id": student, "amount": 499, "reason": "test"}, prefer="return=minimal")
res = json.loads(post("/api/subscribe", s_jar, {"plan": "pro", "useCredits": True}))
ok("switching to Pro works", res.get("status") == "active", res)
sub = sub_of(student)
ok("Pro adds two 1:1s", sub["one_on_one_remaining"] == 2, sub)
ok("and tops the group allowance up rather than stacking a second subscription",
   sub["group_remaining"] == 8, sub["group_remaining"])
st, subs = call(f"/rest/v1/subscriptions?user_id=eq.{student}&select=id")
ok("still exactly one subscription row", len(subs) == 1, len(subs))

res = json.loads(post(f"/api/checkout/{obk}", s_jar, {}))
ok("Pro covers the 1:1", res.get("paidBy") == "plan", res)
ok("1:1 allowance 2 -> 1", sub_of(student)["one_on_one_remaining"] == 1)

print()
print("=" * 70)
print("running out, and cancelling the plan")
print("=" * 70)
call(f"/rest/v1/subscriptions?user_id=eq.{student}", "PATCH",
     {"group_remaining": 0}, prefer="return=minimal")
g2start = datetime.now(timezone.utc) + timedelta(days=5)
st, g2 = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "group", "title": "Second clinic",
    "start_at": g2start.isoformat(), "end_at": (g2start + timedelta(hours=1)).isoformat(),
    "capacity": 10, "min_seats": 1, "price": 99, "status": "scheduled",
}, prefer="return=representation")
st, bk2 = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": g2[0]["id"]}, bearer=S, key=PUB)
res = json.loads(post(f"/api/checkout/{bk2}", s_jar, {}))
ok("with 0 left the plan does not cover it", res.get("paidBy") != "plan", res.get("error") or res)

st, _ = call("/rest/v1/rpc/cancel_my_subscription", "POST", {}, bearer=S, key=PUB)
sub = sub_of(student)
ok("cancelling marks it cancelled", sub["status"] == "cancelled", sub["status"])
call(f"/rest/v1/subscriptions?user_id=eq.{student}", "PATCH",
     {"one_on_one_remaining": 1}, prefer="return=minimal")
o2start = datetime.now(timezone.utc) + timedelta(days=6)
st, o2 = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor, "type": "one_on_one", "title": "1:1 after cancelling",
    "start_at": o2start.isoformat(), "end_at": (o2start + timedelta(minutes=30)).isoformat(),
    "capacity": 1, "min_seats": 1, "price": 299, "status": "scheduled",
}, prefer="return=representation")
st, obk2 = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": o2[0]["id"]}, bearer=S, key=PUB)
res = json.loads(post(f"/api/checkout/{obk2}", s_jar, {}))
ok("what is left still spends after cancelling", res.get("paidBy") == "plan",
   "they paid for those sessions; cancelling only stops the renewal")

print()
print("=" * 70)
print("clients cannot reach the money functions")
print("=" * 70)
for fn, args in (("start_subscription", {"p_user": student, "p_plan_code": "pro"}),
                 ("spend_subscription_seat", {"p_booking": obk2}),
                 ("refund_subscription_seat", {"p_booking": obk2})):
    st, r = call(f"/rest/v1/rpc/{fn}", "POST", args, bearer=S, key=PUB)
    ok(f"a student cannot call {fn}()", st >= 400, msg(r))

for uid in (mentor, student):
    call(f"/auth/v1/admin/users/{uid}", "DELETE")

print()
print("=" * 70)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 70)
