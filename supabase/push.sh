#!/usr/bin/env bash
# Applies every migration in supabase/migrations to the cloud project.
#
# Pick whichever you have:
#   1. Already signed in           ./supabase/push.sh
#   2. A personal access token     SUPABASE_ACCESS_TOKEN=sbp_… ./supabase/push.sh
#   3. The database password       SUPABASE_DB_PASSWORD=…      ./supabase/push.sh
set -euo pipefail
cd "$(dirname "$0")/.."

REF=${SUPABASE_PROJECT_REF:-bmyzudohkgxdnifpyanv}

command -v supabase >/dev/null || {
  echo "Supabase CLI not found. brew install supabase/tap/supabase"; exit 1; }

# --- 3. direct connection, no account login needed --------------------------
if [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "Pushing with the database password..."
  # The direct host, not the shared pooler. The pooler expects a tenant user
  # (postgres.<ref>) and this project is not registered with the one we were
  # pointed at, so it answers "tenant/user not found" however good the
  # password is. db.<ref>.supabase.co is IPv6-only but resolves everywhere we
  # deploy from.
  supabase db push --db-url \
    "postgresql://postgres:$(python3 -c "
import os, urllib.parse
print(urllib.parse.quote(os.environ['SUPABASE_DB_PASSWORD'], safe=''))
")@db.${REF}.supabase.co:5432/postgres"
  echo "Done."
  exit 0
fi

# --- 1 & 2. account login ---------------------------------------------------
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  supabase login --token "$SUPABASE_ACCESS_TOKEN" >/dev/null
fi

LIST=$(supabase projects list 2>/dev/null | tail -1)

if ! echo "$LIST" | grep -q '"projects"'; then
  cat <<'MSG'
Not signed in. Either:

  supabase login                 # opens a browser, then re-run this script

or set one of these and re-run:

  SUPABASE_ACCESS_TOKEN=sbp_...  # supabase.com/dashboard/account/tokens
  SUPABASE_DB_PASSWORD=...       # Settings -> Database -> Database password
MSG
  exit 1
fi

# `supabase link` fails with an opaque privileges error when the signed-in
# account simply cannot see the project, so check that first and say so.
if ! echo "$LIST" | grep -q "\"ref\":\"${REF}\""; then
  echo "Signed in, but this account cannot see project ${REF}."
  echo
  echo "It can see:"
  echo "$LIST" | python3 -c "
import sys, json
for p in json.load(sys.stdin)['projects']:
    print(f\"  {p['ref']}  {p['name']}\")
"
  cat <<MSG

Either sign in as the account that owns ${REF}:

  supabase logout && supabase login

or skip the account entirely with the database password:

  SUPABASE_DB_PASSWORD='...' ./supabase/push.sh
MSG
  exit 1
fi

echo "Linking ${REF}..."
supabase link --project-ref "$REF"
echo "Pushing migrations..."
supabase db push
echo "Done."
