#!/usr/bin/env bash
# Promotes an existing account to admin. `profiles.role` is deliberately not
# writable by the app — a student who could set it would be one request away
# from the admin panel — so this is the only path, and it needs the service key.
#
#   ./scripts/make-admin.sh you@example.com
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -eq 1 ] || { echo "usage: $0 <email>"; exit 1; }

python3 - "$1" <<'PY'
import json, sys, urllib.request, urllib.error

email = sys.argv[1].lower()
env = dict(l.split("=", 1) for l in open(".env.local") if "=" in l and not l.startswith("#"))
BASE = env["NEXT_PUBLIC_SUPABASE_URL"].strip()
SVC = env["SUPABASE_SERVICE_ROLE_KEY"].strip()

def call(path, method="GET", body=None, prefer=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("apikey", SVC)
    req.add_header("Authorization", "Bearer " + SVC)
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=20) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

_, users = call("/auth/v1/admin/users?per_page=200")
match = [u for u in (users or {}).get("users", []) if (u.get("email") or "").lower() == email]
if not match:
    sys.exit(f"No account for {email}. Sign up at /signup first.")

uid = match[0]["id"]
st, err = call(f"/rest/v1/profiles?id=eq.{uid}", "PATCH", {"role": "admin"}, "return=minimal")
if st >= 400:
    sys.exit(f"Could not promote: {st} {err}")
print(f"{email} is now an admin. Open /admin/mentors.")
PY
