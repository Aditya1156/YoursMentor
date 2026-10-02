import json, os, time, urllib.request, urllib.error
BASE="https://bmyzudohkgxdnifpyanv.supabase.co"
env=dict(l.split("=",1) for l in open(os.path.expanduser("~/onestep/.env.local")) if "=" in l and not l.startswith("#"))
SVC=env["SUPABASE_SERVICE_ROLE_KEY"].strip(); PUB=env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].strip()
CRON=env["CRON_SECRET"].strip()

def call(path, method="GET", body=None, key=SVC, bearer=None, prefer=None):
    r=urllib.request.Request(BASE+path, method=method)
    r.add_header("apikey",key); r.add_header("Authorization","Bearer "+(bearer or key))
    r.add_header("Content-Type","application/json")
    if prefer: r.add_header("Prefer",prefer)
    d=json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(r,d,timeout=25) as x:
            raw=x.read().decode(); return x.status,(json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        raw=e.read().decode()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, raw

def cron(job):
    r=urllib.request.Request(f"http://localhost:3000/api/cron/{job}")
    r.add_header("Authorization","Bearer "+CRON)
    with urllib.request.urlopen(r,timeout=40) as x: return json.load(x)

def ok(label, cond, extra=""):
    print(("  PASS  " if cond else "  FAIL  ")+label+(f"  {extra}" if extra else ""))

stamp=int(time.time())
_,m=call("/auth/v1/admin/users","POST",{"email":f"cm{stamp}@gmail.com","password":"correct horse 8",
    "email_confirm":True,"user_metadata":{"name":"Cron Mentor","role":"mentor","date_of_birth":"1999-05-20"}})
_,s=call("/auth/v1/admin/users","POST",{"email":f"cs{stamp}@gmail.com","password":"correct horse 8",
    "email_confirm":True,"user_metadata":{"name":"Cron Student","role":"student","date_of_birth":"2003-01-01"}})
mentor,student=m["id"],s["id"]
call("/rest/v1/mentor_profiles","POST",{"user_id":mentor,"headline":"H","linkedin_url":"https://l",
    "status":"approved"},prefer="return=minimal")
_,tok=call("/auth/v1/token?grant_type=password","POST",
    {"email":f"cs{stamp}@gmail.com","password":"correct horse 8"},key=PUB)
stok=tok["access_token"]

start=time.strftime("%Y-%m-%dT%H:%M:%S+00:00",time.gmtime(time.time()+3*86400))
end=time.strftime("%Y-%m-%dT%H:%M:%S+00:00",time.gmtime(time.time()+3*86400+3600))
_,sess=call("/rest/v1/sessions","POST",{"mentor_id":mentor,"type":"group","title":"Cron Room",
    "start_at":start,"end_at":end,"capacity":5,"min_seats":3,"price":99},prefer="return=representation")
sid=sess[0]["id"]

print("expired holds")
_,bk=call("/rest/v1/rpc/hold_seat","POST",{"p_session":sid},key=PUB,bearer=stok)
_,before=call(f"/rest/v1/sessions?id=eq.{sid}&select=seats_booked")
ok("a seat is held", before[0]["seats_booked"]==1)
call(f"/rest/v1/bookings?id=eq.{bk}","PATCH",{"hold_expires_at":"2020-01-01T00:00:00Z"})
r=cron("release-holds")
_,after=call(f"/rest/v1/sessions?id=eq.{sid}&select=seats_booked")
_,b=call(f"/rest/v1/bookings?id=eq.{bk}&select=status")
ok("the cron releases it", after[0]["seats_booked"]==0 and b[0]["status"]=="cancelled_auto",
   f"affected={r['affected']}")

print("\nunder-filled room auto-cancels and refunds")
_,bk2=call("/rest/v1/rpc/hold_seat","POST",{"p_session":sid},key=PUB,bearer=stok)
call("/rest/v1/rpc/confirm_booking","POST",{"p_booking":bk2,"p_payment_id":"t","p_order_id":None})
call(f"/rest/v1/sessions?id=eq.{sid}","PATCH",{
  "start_at":time.strftime("%Y-%m-%dT%H:%M:%S+00:00",time.gmtime(time.time()+4*3600)),
  "end_at":time.strftime("%Y-%m-%dT%H:%M:%S+00:00",time.gmtime(time.time()+5*3600))})
r=cron("auto-cancel")
_,st=call(f"/rest/v1/sessions?id=eq.{sid}&select=status")
_,bal=call("/rest/v1/rpc/credit_balance","POST",{"p_user":student})
ok("the room is cancelled", st[0]["status"]=="cancelled", f"affected={r['affected']}")
ok("everyone is refunded in credits", bal==99, f"balance {bal}")

print("\nfinished sessions complete")
call(f"/rest/v1/sessions?id=eq.{sid}","PATCH",{"status":"scheduled","seats_booked":0})
_,bk3=call("/rest/v1/rpc/hold_seat","POST",{"p_session":sid},key=PUB,bearer=stok)
call("/rest/v1/rpc/confirm_booking","POST",{"p_booking":bk3,"p_payment_id":"t2","p_order_id":None})
call(f"/rest/v1/sessions?id=eq.{sid}","PATCH",{
  "start_at":time.strftime("%Y-%m-%dT%H:%M:%S+00:00",time.gmtime(time.time()-7200)),
  "end_at":time.strftime("%Y-%m-%dT%H:%M:%S+00:00",time.gmtime(time.time()-3600))})
r=cron("complete-sessions")
_,st=call(f"/rest/v1/sessions?id=eq.{sid}&select=status")
_,b3=call(f"/rest/v1/bookings?id=eq.{bk3}&select=status")
_,notes=call(f"/rest/v1/notifications?user_id=eq.{student}&type=eq.rate_session&select=id")
ok("the session completes", st[0]["status"]=="completed", f"affected={r['affected']}")
ok("attendance is recorded", b3[0]["status"]=="attended")
ok("the student is asked to rate it", len(notes)>0)

for uid in (mentor,student):
    rq=urllib.request.Request(BASE+"/auth/v1/admin/users/"+uid, method="DELETE")
    rq.add_header("apikey",SVC); rq.add_header("Authorization","Bearer "+SVC)
    try: urllib.request.urlopen(rq,timeout=20)
    except Exception: pass
print("\n  test accounts removed")
