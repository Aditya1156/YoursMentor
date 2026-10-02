"""
What each role actually sees in the navbar, checked against the running app.

Signs in as a student, a mentor and an admin, forges the same cookie
@supabase/ssr writes, and reads the rendered <header> back. This is the check
that was missing: the navbar took no notice of role, so mentors were being
offered "Become a Mentor" and a student dashboard, and had no link at all to
their own pages.

Needs the dev server on :3000.  python3 scripts/smoke/nav-by-role.py
"""
import base64, json, os, re, subprocess, sys, time, urllib.request, urllib.error

BASE = "https://bmyzudohkgxdnifpyanv.supabase.co"
REF = "bmyzudohkgxdnifpyanv"
APP = os.environ.get("APP_URL", "http://localhost:3000")
env = dict(
    l.split("=", 1) for l in open(os.path.expanduser("~/onestep/.env.local"))
    if "=" in l and not l.startswith("#")
)
PUB = env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].strip()
SVC = env["SUPABASE_SERVICE_ROLE_KEY"].strip()
PW = "correct horse 8"
fails = []


def api(path, method="GET", body=None, key=SVC, prefer=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", "Bearer " + key)
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


def signin(email):
    st, r = api("/auth/v1/token?grant_type=password", "POST",
                {"email": email, "password": PW}, key=PUB)
    assert st == 200, r
    return r


def cookies_for(sess):
    """The cookie @supabase/ssr reads: base64- prefixed JSON, chunked if long."""
    b64 = base64.b64encode(json.dumps(sess, separators=(",", ":")).encode()).decode()
    name = f"sb-{REF}-auth-token"
    CHUNK = 3180
    if len(b64) <= CHUNK:
        return [(name, "base64-" + b64)]
    parts = [b64[i:i + CHUNK] for i in range(0, len(b64), CHUNK)]
    return [(f"{name}.{i}", ("base64-" + p) if i == 0 else p) for i, p in enumerate(parts)]


def header_html(path, cookies):
    jar = "; ".join(f"{k}={v}" for k, v in cookies)
    out = subprocess.run(
        ["curl", "-s", "-H", f"Cookie: {jar}", APP + path],
        capture_output=True, text=True, timeout=60).stdout
    m = re.search(r"<header.*?</header>", out, re.S)
    return m.group(0) if m else ""


def nav_labels(html):
    """Link text inside the header, de-duplicated (desktop + mobile repeat it)."""
    found = []
    for href, text in re.findall(r'href="([^"]+)"[^>]*>(?:<[^>]+>)*([^<]{2,40})<', html):
        t = text.strip()
        if t and t not in found:
            found.append(t)
    return found


stamp = int(time.time())
print("=" * 68)
print("Making one account per role")
print("=" * 68)

people = {}
for role, name in (("student", "Nav Student"), ("mentor", "Nav Mentor"), ("admin", "Nav Admin")):
    email = f"nav{role}{stamp}@gmail.com"
    st, u = api("/auth/v1/admin/users", "POST", {
        "email": email, "password": PW, "email_confirm": True,
        "user_metadata": {"name": name, "role": role, "date_of_birth": "1999-05-20"},
    })
    assert st in (200, 201), u
    uid = u["id"]
    api(f"/rest/v1/profiles?id=eq.{uid}", "PATCH",
        {"role": role, "onboarding_complete": True, "college_tier": "tier3"},
        prefer="return=minimal")
    if role == "mentor":
        api("/rest/v1/mentor_profiles", "POST", {
            "user_id": uid, "headline": "SDE at Zomato",
            "breakthrough_story": "Off-campus after 90 applications.",
            "linkedin_url": "https://linkedin.com/in/nav", "price_1on1": 199,
            "college_tier": "tier3", "home_state": "Bihar",
            "languages": ["Hindi"], "tracks": ["first_job"],
            "topics": ["Resume review"], "status": "approved",
        }, prefer="return=minimal")
    people[role] = (email, uid)
    print(f"  {role:<8} {email}")

print()
print("=" * 68)
print("GUEST — nobody signed in")
print("=" * 68)
guest = subprocess.run(["curl", "-s", APP + "/"], capture_output=True, text=True).stdout
gh = re.search(r"<header.*?</header>", guest, re.S)
gl = nav_labels(gh.group(0) if gh else "")
print(f"  nav: {gl}")
ok("guest is invited to become a mentor", "Become a Mentor" in gl)
ok("guest can browse mentors", "Find Mentors" in gl)
ok("guest sees no dashboard", "Dashboard" not in gl)
ok("guest sees no credits", "Credits:" not in (gh.group(0) if gh else ""))

for role, path in (("student", "/dashboard"), ("mentor", "/mentor"), ("admin", "/admin")):
    email, uid = people[role]
    sess = signin(email)
    cks = cookies_for(sess)
    html = header_html(path, cks)
    labels = nav_labels(html)
    print()
    print("=" * 68)
    print(f"{role.upper()} — signed in")
    print("=" * 68)
    print(f"  nav: {labels}")

    ok(f"{role} is NOT asked to become a mentor", "Become a Mentor" not in labels)

    if role == "student":
        ok("student gets their dashboard", "Dashboard" in labels)
        ok("student can find mentors", "Find Mentors" in labels)
        ok("student sees their own sessions", "My Sessions" in labels)
        ok("student sees a credits wallet", "Credits:" in html)
        ok("student is not offered Earnings", "Earnings" not in labels)
        ok("student is not offered admin screens", "Coupons" not in labels)
    if role == "mentor":
        ok("mentor gets Availability", "Availability" in labels)
        ok("mentor gets Earnings", "Earnings" in labels)
        ok("mentor has NO credits wallet", "Credits:" not in html)
        ok("mentor is not offered the student dashboard", "/dashboard" not in html)
        ok("mentor subtitle reads Mentor", "Mentor</span>" in html or ">Mentor<" in html)
    if role == "admin":
        ok("admin gets Overview", "Overview" in labels)
        ok("admin gets Coupons", "Coupons" in labels)
        ok("admin has NO credits wallet", "Credits:" not in html)
        ok("admin is not offered the student dashboard", "/dashboard" not in html)

print()
print("=" * 68)
print("Student-only pages reject other roles")
print("=" * 68)
for role in ("mentor", "admin"):
    email, uid = people[role]
    cks = cookies_for(signin(email))
    jar = "; ".join(f"{k}={v}" for k, v in cks)
    out = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code} %{redirect_url}",
         "-H", f"Cookie: {jar}", APP + "/dashboard"],
        capture_output=True, text=True).stdout.strip()
    code = out.split()[0]
    dest = out.split()[1] if len(out.split()) > 1 else ""
    expected = "/admin" if role == "admin" else "/mentor"
    ok(f"{role} visiting /dashboard is redirected to {expected}",
       code in ("307", "302", "303") and dest.endswith(expected), out)

print()
print("=" * 68)
print("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED")
for f in fails:
    print("  - " + f)
print("=" * 68)
