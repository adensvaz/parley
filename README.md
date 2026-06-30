# Parley

**The real-time conversation copilot for cold calls** — a parley is a negotiation between two sides,
and that's exactly what Parley mediates: it listens to both sides of a live sales call and feeds the rep
instant objection rebuttals, the next line to say, call-stage guidance, and coaching — on a discreet
always-on overlay.

Monorepo. Each module is independently buildable but versioned together here.

## Layout
| Path | What |
|------|------|
| `parley-desktop/` | Electron cold-call copilot overlay (the rep's app) |
| `parley-web/` | Next.js manager dashboard, billing portal, marketing |
| `parley-contracts/` | Shared event (NATS) + gRPC schemas — the typed boundary |
| `parley-gateway/` | WSS edge service (authN, rate-limit, bus bridge) |
| `parley-copilot-service/` | Real-time advisor workers (objection/stage/coaching + LLM) |
| `parley-identity-service/` | Clerk-backed auth, orgs, RBAC |
| `parley-crm-service/` | Leads + CRM integrations |
| `parley-compliance-service/` | DNC scrub, consent, retention (TCPA) |
| `parley-billing-service/` | Stripe, plans, entitlements, metering |
| `parley-analytics-service/` | Call scoring, rollups, dashboards |
| `parley-infra/` | Postgres migrations, docker-compose, k8s, CI |

See [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md) for the service map, data flow, and security model.

## Quick start
```bash
pnpm install                 # install all workspaces
cd parley-infra && make db.test   # prove the DB design (RLS, encryption, indexes) on a throwaway PG
cd parley-desktop && npm run dev   # launch the desktop copilot
```
