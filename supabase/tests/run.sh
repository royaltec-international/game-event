#!/usr/bin/env bash
# Run the SQL tests against a throwaway Postgres in Docker.
# Applies schema.sql's tables (without the Supabase-only storage section)
# plus every migration in order, then supabase/tests/*.test.sql.
set -euo pipefail

cd "$(dirname "$0")/.."
NAME="game-event-sqltest-$$"

docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16-alpine >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

until docker exec "$NAME" pg_isready -U postgres -q; do sleep 0.5; done
sleep 1

psql_run() { docker exec -i "$NAME" psql -q -U postgres -v ON_ERROR_STOP=1 "$@"; }

# Supabase roles the policies and grants refer to
psql_run <<'SQL'
create role anon nologin;
create role authenticated nologin;
SQL

# Baseline schema as it was first deployed: everything before the Storage section
sed '/^--  Storage: prize images/,$d' schema.sql | psql_run
for f in migrations/*.sql; do psql_run < "$f"; done
for f in tests/*.test.sql; do echo "== $f"; psql_run < "$f"; done
echo "ALL SQL TESTS PASSED"
