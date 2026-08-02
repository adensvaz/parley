#!/usr/bin/env bash
# Bring the platform up and LEAVE IT UP (no cleanup trap — survives the launching shell).
# Each service sources its own .env so API keys reach the right process and nowhere else.
#   ./up.sh          start everything
#   ./up.sh --status health-check only
#   ./up.sh --down   stop everything
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORTS="8080 8081 8082 8083 8084 8085 8086"

status() {
  for p in $PORTS; do
    printf ":%s " "$p"
    curl -sf "localhost:$p/health" >/dev/null 2>&1 && printf "up   " || printf "DOWN "
  done; echo
}

case "${1:-}" in
  --status) status; exit 0 ;;
  --down)   pkill -f "tsx src/index.ts" 2>/dev/null; docker rm -f parley-nats parley-pg >/dev/null 2>&1; echo "stopped"; exit 0 ;;
esac

docker info >/dev/null 2>&1 || { orb start >/dev/null 2>&1; sleep 6; }
docker rm -f parley-nats parley-pg >/dev/null 2>&1
docker run -d --name parley-nats -p 4222:4222 nats:2-alpine -js >/dev/null
docker run -d --name parley-pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=parley -p 5433:5432 \
  -v "$ROOT/parley-infra/db/migrations":/docker-entrypoint-initdb.d:ro postgres:16-alpine >/dev/null
for i in $(seq 1 30); do docker exec parley-pg pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
sleep 2
docker exec parley-pg psql -U postgres -d parley -q \
  -c "ALTER ROLE parley_app LOGIN PASSWORD 'pw'; ALTER ROLE parley_identity LOGIN PASSWORD 'pw';" 2>/dev/null

export NATS_URL="nats://localhost:4222"
export PII_KEY="dev-kms-key" PHONE_HASH_KEY="dev-hash-key"
export IDENTITY_URL="http://localhost:8081" BILLING_URL="http://localhost:8084" CRM_URL="http://localhost:8082"
APP_DB="postgres://parley_app:pw@localhost:5433/parley"
ID_DB="postgres://parley_identity:pw@localhost:5433/parley"

pkill -f "tsx src/index.ts" 2>/dev/null; sleep 1
run() { # name dir port db
  ( cd "$ROOT/$2" \
    && set -a && [ -f .env ] && . ./.env; set +a \
    && DATABASE_URL="$4" PORT="$3" nohup npx tsx src/index.ts >"/tmp/parley-$1.log" 2>&1 & )
}
run identity   parley-identity-service   8081 "$ID_DB"
run copilot    parley-copilot-service     8086 "$APP_DB"
run compliance parley-compliance-service  8083 "$APP_DB"
run billing    parley-billing-service     8084 "$APP_DB"
run crm        parley-crm-service         8082 "$APP_DB"
run analytics  parley-analytics-service   8085 "$APP_DB"
run gateway    parley-gateway             8080 "$APP_DB"

for i in $(seq 1 45); do curl -sf localhost:8080/health >/dev/null 2>&1 && break; sleep 1; done
echo "▶ platform:"; status
echo "logs: /tmp/parley-*.log   ·   stop: ./up.sh --down"
