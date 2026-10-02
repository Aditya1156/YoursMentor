#!/usr/bin/env bash
# Runs every migration plus the booking test suite against a throwaway local
# Postgres. Needs postgresql@16 on PATH (brew install postgresql@16).
set -euo pipefail
cd "$(dirname "$0")/../.."

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
SOCK=${PGSOCK:-/tmp/ymp}
PGD="$SOCK/data"
DB=yoursmentor_test

mkdir -p "$SOCK"
[ -f "$PGD/PG_VERSION" ] || initdb -D "$PGD" -U postgres --locale=C -E UTF8 >/dev/null
pg_ctl -D "$PGD" -o "-p 54399 -k $SOCK" -l "$SOCK/pg.log" status >/dev/null 2>&1 \
  || pg_ctl -D "$PGD" -o "-p 54399 -k $SOCK" -l "$SOCK/pg.log" start >/dev/null
sleep 2

q() { psql -h "$SOCK" -p 54399 -U postgres -d "$DB" "$@"; }

dropdb -h "$SOCK" -p 54399 -U postgres --if-exists "$DB"
createdb -h "$SOCK" -p 54399 -U postgres "$DB"
q -q -f supabase/tests/_supabase_stubs.sql

echo "migrations"
for f in supabase/migrations/*.sql; do
  printf '  %-44s ' "$(basename "$f")"
  q -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null && echo OK
done

echo
echo "booking engine"
out=$(q -f supabase/tests/booking.test.sql 2>&1)
echo "$out" | grep -E 'NOTICE:  (PASS|FAIL)' | sed 's/.*NOTICE:  /  /'
if echo "$out" | grep -q 'NOTICE:  FAIL'; then
  echo; echo "FAILURES above."; exit 1
fi
echo
echo "all green"
