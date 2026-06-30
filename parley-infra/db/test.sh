#!/usr/bin/env bash
# Spin up a throwaway Postgres 16, apply migrations, assert tenant isolation + encryption + indexing.
set -euo pipefail
cd "$(dirname "$0")"
C=parley-pgtest
docker rm -f $C >/dev/null 2>&1 || true
docker run -d --name $C -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=parley -v "$PWD/migrations":/mig:ro postgres:16-alpine >/dev/null
for i in $(seq 1 30); do docker exec $C pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
for f in $(docker exec $C sh -c 'ls /mig/*.sql | sort'); do
  docker exec $C psql -U postgres -d parley -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null && echo "applied $(basename $f)"
done
docker exec -i $C psql -U postgres -d parley -q < rls_test.sql
docker rm -f $C >/dev/null
