#!/usr/bin/env bash
# Boot the ENTIRE Parley platform locally: Postgres + NATS + all services (via tsx).
# Usage: ./dev-all.sh           # bring up, health-check, stay running (Ctrl-C to stop)
#        ./dev-all.sh --smoke   # bring up, run the cross-service smoke test, tear down
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMOKE="${1:-}"
PIDS=()
# npx tsx spawns a node grandchild; kill by command pattern so nothing is orphaned on the ports.
cleanup() { kill "${PIDS[@]}" 2>/dev/null || true; pkill -f "tsx src/index.ts" 2>/dev/null || true; docker rm -f parley-nats parley-pg >/dev/null 2>&1 || true; }
trap cleanup EXIT

pkill -f "tsx src/index.ts" 2>/dev/null || true   # clear orphans from a previous run
sleep 1
echo "▶ infra (postgres + nats)…"
docker rm -f parley-nats parley-pg >/dev/null 2>&1 || true
docker run -d --name parley-nats -p 4222:4222 nats:2-alpine -js >/dev/null
docker run -d --name parley-pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=parley -p 5433:5432 \
  -v "$ROOT/parley-infra/db/migrations":/docker-entrypoint-initdb.d:ro postgres:16-alpine >/dev/null
for i in $(seq 1 30); do docker exec parley-pg pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
sleep 2
docker exec parley-pg psql -U postgres -d parley -q \
  -c "ALTER ROLE parley_app LOGIN PASSWORD 'pw'; ALTER ROLE parley_identity LOGIN PASSWORD 'pw';"

export NATS_URL="nats://localhost:4222"
export APP_DB="postgres://parley_app:pw@localhost:5433/parley"
export ID_DB="postgres://parley_identity:pw@localhost:5433/parley"
export PII_KEY="dev-kms-key" PHONE_HASH_KEY="dev-hash-key"
export IDENTITY_URL="http://localhost:8081"
export BILLING_URL="http://localhost:8084" CRM_URL="http://localhost:8082"

start() { # name dir port db
  ( cd "$ROOT/$2" && DATABASE_URL="$4" PORT="$3" npx tsx src/index.ts >"/tmp/parley-$1.log" 2>&1 ) & PIDS+=($!)
}
echo "▶ services…"
start identity   parley-identity-service   8081 "$ID_DB"
start copilot    parley-copilot-service     8086 "$APP_DB"
start compliance parley-compliance-service  8083 "$APP_DB"
start billing    parley-billing-service     8084 "$APP_DB"
start crm        parley-crm-service         8082 "$APP_DB"
start analytics  parley-analytics-service   8085 "$APP_DB"
start gateway    parley-gateway             8080 "$APP_DB"
sleep 5

echo "▶ health:"
for p in 8080 8081 8082 8083 8084 8085 8086; do
  printf "  :%s  %s\n" "$p" "$(curl -s "localhost:$p/health" || echo 'DOWN')"
done

if [ "$SMOKE" = "--smoke" ]; then
  echo; echo "▶ cross-service smoke:"
  ( cd "$ROOT/parley-copilot-service" && npx tsx qa/smoke.ts )
else
  echo; echo "Platform up. Press Ctrl-C to stop."; wait
fi
