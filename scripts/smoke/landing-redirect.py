"""
A signed-in person must never be shown the marketing page.

Each role lands on its own home from / and from the auth pages, and signed-out
visitors still get the landing page they are the audience for.

  python3 scripts/smoke/landing-redirect.py     (dev server on :3000)
"""
import base64, json, os, subprocess, time, urllib.request, urllib.error

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


def call(p, m="GET", b=None, key=SVC, prefer=None):
    r = urllib.request.Request(BASE + p, method=m)
    r.add_header("apikey", key)
    r.add_header("Authorization", "Bearer " + key)
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


def jar_for(email):
    r = urllib.request.Request(BASE + "/auth/v1/token?grant_type=password", method="POST")
    r.add_header("apikey", PUB)
    r.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(
            r, json.dumps({"email": email, "password": PW}).encode()) as x:
        sess = json.loads(x.read())
    b = base64.b64encode(json.dumps(sess, separators=(",", ":")).encode()).decode()
    n = f"sb-{REF}-auth-token"
    CH = 3180
    if len(b) <= CH:
        return f"{n}=base64-{b}"
    parts = [b[i:i + CH] for i in range(0, len(b), CH)]
    return "; ".join(f'{n}.{i}={"base64-" + p if i == 0 else p}' for i, p in enumerate(parts))


def hop(path, jar=""):
    """Status and Location for one request, following nothing."""
    args = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code} %{redirect_url}"]
    if jar:
        args += ["-H", f"Cookie: {jar}"]
    out = subprocess.run(args + [APP + path], capture_output=True, text=True,
                         timeout=60).stdout.strip().split()
    return out[0], (out[1].replace(APP, "") if len(out) > 1 else "")


stamp = int(time.time())
print("=" * 68)
print("making one account per role")
print("=" * 68)
people = {}
for role, name in (("student", "LR Student"), ("mentor", "LR Mentor"), ("admin", "LR Admin")):
    email = f"lr{role}{stamp}@gmail.com"
    st, u = call("/auth/v1/admin/users", "POST", {
        "email": email, "password": PW, "email_confirm": True,
        "user_metadata": {"name": name, "role": role, "date_of_birth": "1999-05-20"}})
    uid = u["id"]
    call(f"/rest/v1/profiles?id=eq.{uid}", "PATCH",
         {"role": role, "onboarding_complete": True}, prefer="return=minimal")
    if role == "mentor":
        call("/rest/v1/mentor_profiles", "POST", {
            "user_id": uid, "headline": "SDE", "breakthrough_story": "t",
            "linkedin_url": "https://x.com/a", "price_1on1": 199, "college_tier": "tier3",
            "home_state": "Goa", "languages": ["English"], "tracks": ["first_job"],
            "topics": ["t"], "status": "approved"}, prefer="return=minimal")
    people[role] = (email, uid)
    print(f"  {role:<8} {email}")

print()
print("=" * 68)
print("the landing page")
print("=" * 68)
code, _ = hop("/")
ok("a signed-out visitor still gets the landing page", code == "200", code)
out = subprocess.run(["curl", "-s", APP + "/"], capture_output=True, text=True).stdout
ok("and it is the marketing page", "Know What to Do Next" in out)

for role, expected in (("student", "/dashboard"), ("mentor", "/mentor"), ("admin", "/admin")):
    email, _ = people[role]
    jar = jar_for(email)
    code, loc = hop("/", jar)
    ok(f"{role} visiting / is sent to {expected}",
       code in ("307", "302", "303") and loc == expected, f"{code} {loc or '(no redirect)'}")

print()
print("=" * 68)
print("the auth pages, which used to send everyone to /dashboard")
print("=" * 68)
for role, expected in (("student", "/dashboard"), ("mentor", "/mentor"), ("admin", "/admin")):
    email, _ = people[role]
    jar = jar_for(email)
    for page in ("/signin", "/signup"):
        code, loc = hop(page, jar)
        ok(f"{role} on {page} goes to {expected}",
           code in ("307", "302", "303") and loc == expected, f"{code} {loc or '(none)'}")

print()
print("=" * 68)
print("a student who has not finished onboarding")
print("=" * 68)
email, uid = people["student"]
call(f"/rest/v1/profiles?id=eq.{uid}", "PATCH",
     {"onboarding_complete": False}, prefer="return=minimal")
jar = jar_for(email)
code, loc = hop("/", jar)
ok("goes to /onboarding, not /dashboard",
   code in ("307", "302", "303") and loc == "/onboarding", f"{code} {loc}")
call(f"/rest/v1/profiles?id=eq.{uid}", "PATCH",
     {"onboarding_complete": True}, prefer="return=minimal")

print()
print("=" * 68)
print("security headers")
print("=" * 68)
hdr = subprocess.run(["curl", "-sI", APP + "/"], capture_output=True, text=True).stdout.lower()
for name in ("strict-transport-security", "x-content-type-options",
             "x-frame-options", "referrer-policy", "permissions-policy"):
    ok(f"{name} is set", name in hdr)
ok("x-powered-by is gone", "x-powered-by" not in hdr)
ok("camera and microphone are allowed for our own origin",
   "camera=(self)" in hdr and "microphone=(self)" in hdr,
   "a blanket camera=() would break every call")
ok("display-capture allowed, so screen sharing works", "display-capture=(self)" in hdr)

room = subprocess.run(["curl", "-sI", APP + "/room/00000000-0000-0000-0000-000000000000"],
                      capture_output=True, text=True).stdout.lower()
ok("a room URL is noindex", "noindex" in room)

for uid_ in (people[r][1] for r in people):
    call(f"/auth/v1/admin/users/{uid_}", "DELETE")

print()
print("=" * 68)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 68)
