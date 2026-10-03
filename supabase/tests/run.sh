#!/usr/bin/env bash
# Runs the database test-suite on a throwaway database.
#   Local:  PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash supabase/tests/run.sh
#   CI:     same, against the postgres service container.
# Applies supabase/tests/00_stub.sql (Supabase emulation), every migration in order, then each *.test.sql.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${TEST_DB_NAME:-usine_flow_test}"
psql_admin() { psql -v ON_ERROR_STOP=1 -q -d postgres "$@"; }
psql_db() { psql -v ON_ERROR_STOP=1 -q -d "$DB" "$@"; }

psql_admin -c "drop database if exists $DB" -c "create database $DB"
# roles are cluster-wide: create them once, tolerate re-runs
for r in anon authenticated service_role; do psql_admin -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='$r') then create role $r nologin; end if; end \$\$"; done
sed '/^create role /d' supabase/tests/00_stub.sql > /tmp/usine_flow_stub.sql
psql_db -f /tmp/usine_flow_stub.sql

echo "▶ migrations"
for f in $(ls supabase/migrations/*.sql | sort); do
  echo "  $f"
  out=$(psql_db -f "$f" 2>&1) || true
  echo "$out" | grep -vE "NOTICE|DETAIL:|^ *$|^ *_(secure|readonly) *$|^-+$|^\([0-9]+ rows?\)$" || true
  if echo "$out" | grep -q "ERROR:"; then echo "✘ migration failed: $f"; exit 1; fi
done

fail=0
for f in $(ls supabase/tests/*.test.sql | sort); do
  if out=$(psql_db -f "$f" 2>&1); then echo "✔ $(basename "$f")"; else echo "✘ $(basename "$f")"; echo "$out" | grep -E "ERROR|CONTEXT|DETAIL" | head -5; fail=1; fi
done
exit $fail
