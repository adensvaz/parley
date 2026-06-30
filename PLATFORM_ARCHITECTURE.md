# Parley Platform — Microservices Architecture

Each capability is an **independently deployable, independently versioned repo** with one job, its
own data ownership, and a typed contract. Services never reach into each other's database — they talk
over the contracts (gRPC for sync, NATS JetStream for async events). This is the "database-per-service"
rule that keeps modules decoupled and robust.

## Repos (each is its own git remote)

| Repo | Kind | Responsibility | Owns |
|------|------|----------------|------|
| `parley-desktop` | frontend (Electron) | The rep's overlay + capture | — (client) |
| `parley-web` | frontend (Next.js) | Manager dashboard, marketing, billing portal | — (client) |
| `parley-contracts` | shared lib | Types, gRPC protos, event schemas, OpenAPI | — |
| `parley-gateway` | edge service | WS ingress, authN, rate-limit, routes audio→bus | session cache (Redis) |
| `parley-copilot-service` | core service | Objection/stage/coaching + LLM advisor | — (stateless) |
| `parley-identity-service` | service | Clerk-backed auth, orgs, RBAC, service tokens | `identity` schema |
| `parley-crm-service` | service | Leads, CRM sync (FollowUpBoss/kvCORE/HubSpot) | `crm` schema |
| `parley-compliance-service` | service | DNC scrub, consent, call windows, retention | `compliance` schema |
| `parley-billing-service` | service | Stripe, plans, entitlements, usage metering | `billing` schema |
| `parley-analytics-service` | service | Call scoring, rollups, dashboards | `analytics` schema |
| `parley-infra` | infra | Docker Compose, k8s/Helm, **DB migrations**, Terraform | — |

> Architect's note: at this stage a **monorepo-of-services (Turborepo)** is usually cheaper to operate
> than 11 polyrepos. We're delivering separate repos as requested; `parley-platform/meta/` includes a
> script to push each folder to its own remote, so you can collapse/expand later without rework.

## Runtime data flow (a live call)

```
 desktop ──WSS──▶ gateway ──┬─ audio frames ─▶ STT(Deepgram) ─▶ transcript ─┐
   ▲   copilot cards  │     │                                               ▼
   └──────────────────┘     └─ NATS: call.transcript ─▶ copilot-service ─▶ NATS: call.card ─▶ gateway ─▶ desktop
                                                            │
        identity (JWT verify) ◀── gateway authN            ├─ reads lead ◀─ crm-service (gRPC)
        compliance (DNC check before dial) ◀───────────────┤
        billing (usage meter: call.started) ◀── NATS ──────┤
        analytics (call.ended → score) ◀── NATS ───────────┘
```

- **Edge is the only public surface.** `parley-gateway` terminates WSS, verifies the Clerk JWT via
  `identity-service`, enforces rate limits + quotas (billing entitlements cached in Redis), and is the
  ONLY component the desktop talks to. Everything else is private (mesh / cluster network only).
- **Async by default.** Transcription → copilot → cards flow over **NATS JetStream** (at-least-once,
  durable). Services emit domain events; consumers are independent and horizontally scalable.
- **Sync only when needed.** Lead lookup, DNC check, entitlement check are low-latency **gRPC** calls
  with deadlines + circuit breakers.

## Tech stack (industry standard)

- **Language:** TypeScript (Node 22, Fastify) across services for one toolchain; the audio/STT hot path
  can drop to Go later without changing contracts.
- **Datastore:** **PostgreSQL 16** (primary, schema-per-service, multi-tenant via RLS), **Redis** (cache,
  rate-limit, session, pub/sub), **NATS JetStream** (event bus). Object storage (S3) for call recordings.
- **Sync transport:** gRPC + protobuf (`parley-contracts`). **Async:** NATS subjects (versioned).
- **AuthN/Z:** Clerk at the edge → short-lived JWT → services verify; **service-to-service = mTLS +
  signed service tokens**. RBAC (org/admin/rep) enforced in `identity` + Postgres **RLS**.
- **Deploy:** Docker → Kubernetes (Helm), HPA autoscaling, one Postgres (managed, e.g. RDS/Cloud SQL)
  with **PgBouncer** pooling and read replicas. Local dev = `parley-infra/docker-compose.yml`.
- **Observability:** OpenTelemetry traces across NATS+gRPC, Prometheus metrics, structured JSON logs,
  Grafana. Every request carries a `trace_id` from the edge.

## Why each service is independent & robust
- **Failure isolation:** copilot-service crashing degrades suggestions but the call continues (gateway
  still relays transcript). Circuit breakers + NATS buffering absorb downstream outages.
- **Independent scaling:** copilot-service (LLM-bound) scales on queue depth; gateway (connection-bound)
  scales on socket count; analytics batch-scales off-peak.
- **Independent deploys:** contracts are versioned; a service ships on its own cadence behind the
  contract. Backward-compatible event/proto evolution only.
- **Data ownership:** no shared tables. Cross-service reads go through APIs, so a schema change can't
  silently break another team.

See `parley-infra/db/README.md` for the database design (partitioning, RLS, indexing, encryption).
