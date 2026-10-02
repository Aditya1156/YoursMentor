import json, os, time, urllib.request

BASE = "https://bmyzudohkgxdnifpyanv.supabase.co"
env = dict(
    l.split("=", 1) for l in open(os.path.expanduser("~/onestep/.env.local"))
    if "=" in l and not l.startswith("#")
)
SVC = env["SUPABASE_SERVICE_ROLE_KEY"].strip()
PUB = env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].strip()

def call(path, method="GET", body=None, key=SVC, bearer=None, prefer=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", "Bearer " + (bearer or key))
    req.add_header("Content-Type", "application/json")
    if prefer: req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=20) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, raw

def ok(label, cond, extra=""):
    print(("  PASS  " if cond else "  FAIL  ") + label + (("  " + str(extra)) if extra else ""))
    return cond

stamp = int(time.time())
student_id = open("/tmp/ymp/smoke_uid").read().strip()
student_tok = open("/tmp/ymp/smoke_token").read().strip()

print("profile created by the signup trigger")
_, rows = call(f"/rest/v1/profiles?id=eq.{student_id}&select=name,role,date_of_birth,is_adult_confirmed")
p = rows[0]
ok("name derived from metadata", p["name"] == "Smoke Test", p["name"])
ok("18+ set from the date of birth in metadata", p["is_adult_confirmed"] is True)

print("\nmentor goes live through the real flow")
st, m = call("/auth/v1/admin/users", "POST", {
    "email": f"smokementor{stamp}@gmail.com", "password": "correct horse 8",
    "email_confirm": True,
    "user_metadata": {"name": "Priya Sharma", "role": "mentor", "date_of_birth": "1999-05-20"},
})
mentor_id = m["id"]
st, _ = call("/rest/v1/mentor_profiles", "POST", {
    "user_id": mentor_id, "headline": "Software Engineer at PhonePe",
    "breakthrough_story": "Cracked off-campus SDE-1 after 120 rejections.",
    "linkedin_url": "https://linkedin.com/in/priya", "price_1on1": 199,
    "college_tier": "tier3", "home_state": "Uttar Pradesh",
    "languages": ["Hindi", "English"], "tracks": ["first_job"],
    "topics": ["Off-Campus Referrals", "DSA in Java"], "first_gen_graduate": True,
}, prefer="return=minimal")
ok("mentor application created", st in (200, 201), st)

_, d = call("/rest/v1/mentor_directory?select=id")
ok("a pending mentor is NOT in the public directory", len(d) == 0, f"{len(d)} listed")

call(f"/rest/v1/mentor_profiles?user_id=eq.{mentor_id}", "PATCH",
     {"status": "approved"}, prefer="return=minimal")
_, d = call("/rest/v1/mentor_directory?select=id,name,headline")
ok("once approved, the mentor appears", len(d) == 1, d[0]["name"] if d else "")

print("\nanonymous visitor sees the right things")
_, d = call("/rest/v1/mentor_directory?select=id", key=PUB)
ok("anon can browse the directory", len(d) == 1)
_, b = call("/rest/v1/bookings?select=id", key=PUB)
ok("anon sees no bookings", len(b) == 0)

print("\nseat holding, as the signed-in student")
start = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time() + 3 * 86400))
end   = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time() + 3 * 86400 + 3600))
st, s = call("/rest/v1/sessions", "POST", {
    "mentor_id": mentor_id, "type": "group", "title": "Resume Roasting",
    "description": "Live line-by-line roast of four anonymous resumes.",
    "track": "first_job", "start_at": start, "end_at": end,
    "capacity": 2, "min_seats": 1, "price": 99,
}, prefer="return=representation")
session_id = s[0]["id"]
ok("session created", st in (200, 201))

st, booking = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": session_id},
                   key=PUB, bearer=student_tok)
ok("student can hold a seat", st == 200 and isinstance(booking, str), booking)

_, s2 = call(f"/rest/v1/sessions?id=eq.{session_id}&select=seats_booked")
ok("seat count incremented", s2[0]["seats_booked"] == 1)

st, again = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": session_id},
                 key=PUB, bearer=student_tok)
ok("a repeat hold returns the same booking, not a second seat",
   again == booking and s2[0]["seats_booked"] == 1)

print("\nthe escalation paths a client might try")
st, r = call(f"/rest/v1/mentor_profiles?user_id=eq.{mentor_id}", "PATCH",
             {"status": "approved"}, key=PUB, bearer=student_tok)
ok("a client cannot PATCH mentor status", st >= 400, st)

st, r = call(f"/rest/v1/profiles?id=eq.{student_id}", "PATCH",
             {"role": "admin"}, key=PUB, bearer=student_tok)
ok("a student cannot make themselves admin", st >= 400, st)

st, r = call("/rest/v1/credit_ledger", "POST",
             {"user_id": student_id, "amount": 99999, "reason": "free money"},
             key=PUB, bearer=student_tok)
ok("a student cannot mint credits", st >= 400, st)

st, r = call(f"/rest/v1/sessions?id=eq.{session_id}", "PATCH",
             {"seats_booked": 0}, key=PUB, bearer=student_tok)
ok("a client cannot reset seat counts", st >= 400 or
   call(f"/rest/v1/sessions?id=eq.{session_id}&select=seats_booked")[1][0]["seats_booked"] == 1, st)

json.dump({"student": student_id, "mentor": mentor_id, "session": session_id},
          open("/tmp/ymp/smoke_ids.json", "w"))
