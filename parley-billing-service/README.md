# parley-billing-service

**Responsibility:** Stripe, plans, entitlements, usage metering

- **Owns data:** billing schema
- **Subscribes (NATS):** `call.started,usage.metered`
- **Publishes (NATS):** `-`
- **Port:** 8n-a84

Independently deployable. Talks to other services only via `@parley/contracts` (gRPC sync / NATS async) —
never reads another service's tables. See `../parley-platform/PLATFORM_ARCHITECTURE.md`.

```bash
npm install && npm run dev
```
