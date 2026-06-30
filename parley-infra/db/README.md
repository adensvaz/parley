# Parley Database — design, security & query optimization

PostgreSQL 16, multi-tenant, schema-per-service. **Validated against real PG16** (migrations apply;
RLS isolation, fail-closed access, cross-tenant write block, PII roundtrip, index-only DNC lookup, and
partitioning all verified — see `make db.test`).

## Security model

### 1. Tenant isolation via Row-Level Security (defense that can't be forgotten)
Every tenant table has `ENABLE` + **`FORCE ROW LEVEL SECURITY`** and a policy `org_id = app_current_org()`.
Services set `SET app.current_org = <jwt.org>` per request. Properties proven in the test harness:
- **Fail-closed:** no context → `app_current_org()` is NULL → **0 rows** (never leaks all tenants).
- **Read isolation:** org A sees only A's rows, org B only B's.
- **Write isolation:** `WITH CHECK` rejects inserting/updating a row into another tenant (SQLSTATE 42501).
RLS is enforced by the database, so an app-layer bug (a forgotten `WHERE org_id=`) cannot leak data.

### 2. Least privilege
`parley_app` (app, RLS-enforced, `statement_timeout=5s`, `idle_in_transaction_session_timeout=10s`),
`parley_readonly` (analytics/BI), `parley_relay` (outbox publisher only). No service connects as a
superuser; the migrator role is separate from the runtime role.

### 3. PII encrypted at rest (envelope encryption)
`leads.name_enc` / `phone_enc` are `bytea` ciphertext via `pgp_sym_encrypt`. The data key is injected
per-session from **KMS** as `app.enc_key` and **never stored in the database** — a stolen disk or backup
is useless without KMS. For equality matching (dedupe, DNC) we store **`phone_hash` = HMAC(E.164)** so we
can join/lookup without ever persisting the plaintext number.

### 4. Auditability & data lifecycle
Append-only `audit_log` (no UPDATE/DELETE grant). Transcript/event partitions are **dropped** to enforce
retention (instant, no `DELETE` bloat). All access is parameterized (no string-built SQL).

## Query optimization (indexes serve concrete access patterns)

| Access pattern | Index | Why it's fast |
|---|---|---|
| List newest leads / calls per org | `(org_id, created_at DESC)` | composite — one range scan, already ordered |
| "Who do I call next?" worklist | partial `(org_id, last_contact_at) WHERE status IN (...)` | index only covers the hot subset → tiny & cache-resident |
| Live calls dashboard | partial `(org_id) WHERE status='active'` | indexes only the handful of active rows |
| Appointments per rep | **covering** `(org_id, rep_id) INCLUDE(started_at) WHERE appointment_set` | **Index-Only Scan** — never touches the heap |
| DNC check before dial | PK `(org_id, phone_hash)` | **Index-Only Scan**, O(log n) — proven in test |
| Huge append-only event/transcript scans | **BRIN** on `created_at` + range partitioning | BRIN is ~kilobytes for billions of rows; partition pruning skips irrelevant months |
| Ad-hoc JSONB filters on lead metadata | **GIN** `jsonb_path_ops` | indexed containment queries |
| Manager daily dashboard | **materialized view** `rep_daily_stats` + `REFRESH CONCURRENTLY` | heavy GROUP BY computed once, not per page load |

### Scale & speed posture
- **Partitioning** (`call_events`, `transcript_segments`, `usage_events` by month) → partition pruning,
  small per-partition indexes, O(1) retention via `DROP`. Use **pg_partman** to roll partitions in prod.
- **Connection pooling** with **PgBouncer** (transaction mode) in front of Postgres; services use
  prepared statements. Read replicas serve `parley_readonly` analytics traffic.
- **Transactional outbox** (`outbox` + partial index on unpublished rows) gives exactly-the-event-once
  delivery to NATS without 2PC; the relay scan stays O(unpublished), not O(history).
- Statement/lock/idle timeouts prevent a runaway query from pinning a connection.

## Run
```bash
make db.up        # postgres + pgbouncer (docker-compose)
make db.migrate   # apply migrations/*.sql in order
make db.test      # apply to a throwaway PG and run the RLS/encryption/index assertions
```
