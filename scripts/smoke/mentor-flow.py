import json, os, time, urllib.request, urllib.error

BASE = "https://bmyzudohkgxdnifpyanv.supabase.co"
env = dict(l.split("=", 1) for l in open(os.path.expanduser("~/onestep/.env.local"))
           if "=" in l and not l.startswith("#"))
SVC = env["SUPABASE_SERVICE_ROLE_KEY"].strip()
PUB = env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].strip()

def call(path, method="GET", body=None, key=SVC, bearer=None, prefer=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("apikey", key); req.add_header("Authorization", "Bearer " + (bearer or key))
    req.add_header("Content-Type", "application/json")
    if prefer: req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=25) as r:
            raw = r.read().decode(); return r.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, raw

def ok(label, cond, extra=""):
    print(("  PASS  " if cond else "  FAIL  ") + label + (f"  {extra}" if extra else ""))

def signin(email):
    st, r = call("/auth/v1/token?grant_type=password", "POST",
                 {"email": email, "password": "correct horse 8"}, key=PUB)
    return r["access_token"]

stamp = int(time.time())
m_email, s_email = f"m{stamp}@gmail.com", f"s{stamp}@gmail.com"

_, m = call("/auth/v1/admin/users", "POST", {"email": m_email, "password": "correct horse 8",
    "email_confirm": True, "user_metadata": {"name": "Priya Sharma", "role": "mentor",
    "date_of_birth": "1999-05-20"}})
_, s = call("/auth/v1/admin/users", "POST", {"email": s_email, "password": "correct horse 8",
    "email_confirm": True, "user_metadata": {"name": "Rohan Kumar", "role": "student",
    "date_of_birth": "2003-01-01"}})
mentor_id, student_id = m["id"], s["id"]
m_tok, s_tok = signin(m_email), signin(s_email)

print("mentor applies and is approved")
st, _ = call("/rest/v1/mentor_profiles", "POST", {"user_id": mentor_id,
    "headline": "SDE at PhonePe", "breakthrough_story": "Cracked off-campus after 120 rejections.",
    "linkedin_url": "https://linkedin.com/in/p", "price_1on1": 199,
    "tracks": ["first_job"], "topics": ["DSA"], "college_tier": "tier3"},
    key=PUB, bearer=m_tok, prefer="return=minimal")
ok("mentor can create their own application", st in (200, 201), st)

st, _ = call(f"/rest/v1/mentor_profiles?user_id=eq.{mentor_id}", "PATCH",
             {"status": "approved"}, key=PUB, bearer=m_tok)
ok("mentor CANNOT approve themselves", st >= 400, st)

call(f"/rest/v1/mentor_profiles?user_id=eq.{mentor_id}", "PATCH", {"status": "approved"})

print("\nmentor sets availability and creates a room")
st, _ = call("/rest/v1/availability_rules", "POST", {"mentor_id": mentor_id,
    "day_of_week": 6, "start_time": "10:00", "end_time": "13:00", "timezone": "Asia/Kolkata"},
    key=PUB, bearer=m_tok, prefer="return=minimal")
ok("mentor can set weekly availability", st in (200, 201), st)

_, slots = call(f"/rest/v1/rpc/available_slots?", "POST",
                {"p_mentor": mentor_id, "p_days": 14}, key=PUB, bearer=s_tok)
ok("1:1 slots are generated from it", isinstance(slots, list) and len(slots) > 0,
   f"{len(slots) if isinstance(slots, list) else 0} slots")

start = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time() + 3*86400))
end   = time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time() + 3*86400 + 3600))
st, sess = call("/rest/v1/sessions", "POST", {"mentor_id": mentor_id, "type": "group",
    "title": "Resume Roasting", "start_at": start, "end_at": end,
    "capacity": 10, "min_seats": 1, "price": 99},
    key=PUB, bearer=m_tok, prefer="return=representation")
ok("mentor can publish a room", st in (200, 201), st)
session_id = sess[0]["id"]

st, _ = call(f"/rest/v1/sessions?id=eq.{session_id}", "PATCH",
             {"seats_booked": 9}, key=PUB, bearer=m_tok)
ok("mentor CANNOT fake the seat count", st >= 400, st)

print("\nstudent books, mentor marks attendance")
st, booking = call("/rest/v1/rpc/hold_seat", "POST", {"p_session": session_id},
                   key=PUB, bearer=s_tok)
call("/rest/v1/rpc/confirm_booking", "POST",
     {"p_booking": booking, "p_payment_id": "test", "p_order_id": None})

_, att = call("/rest/v1/rpc/session_attendees", "POST", {"p_session": session_id},
              key=PUB, bearer=m_tok)
ok("mentor sees the attendee list", isinstance(att, list) and len(att) == 1,
   att[0]["name"] if att else "")

st, r = call("/rest/v1/rpc/mark_attendance", "POST",
             {"p_booking": booking, "p_attended": True}, key=PUB, bearer=m_tok)
ok("attendance is refused before the session starts", st >= 400,
   (r.get("message") if isinstance(r, dict) else r) or "")

call(f"/rest/v1/sessions?id=eq.{session_id}", "PATCH", {
    "start_at": time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time()-7200)),
    "end_at": time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(time.time()-3600))})
st, _ = call("/rest/v1/rpc/mark_attendance", "POST",
             {"p_booking": booking, "p_attended": True}, key=PUB, bearer=m_tok)
ok("attendance works once it has started", st in (200, 204), st)  # void RPC returns 204

st, _ = call("/rest/v1/rpc/mark_attendance", "POST",
             {"p_booking": booking, "p_attended": False}, key=PUB, bearer=s_tok)
ok("a student CANNOT mark their own attendance", st >= 400, st)

print("\nearnings")
call("/rest/v1/rpc/complete_finished_sessions", "POST", {})
_, earn = call("/rest/v1/rpc/mentor_earnings", "POST", {"p_commission": 25},
               key=PUB, bearer=m_tok)
row = earn[0] if isinstance(earn, list) and earn else None
ok("earnings computed from attendance", row is not None and row["net"] == 75,
   f"gross {row['gross']}, fee {row['platform_fee']}, net {row['net']}" if row else "none")

json.dump({"mentor": mentor_id, "student": student_id}, open("/tmp/ymp/mentor_ids.json", "w"))
