# parley-analytics-service

**Responsibility:** Call scoring, rollups, manager dashboards

- **Owns data:** analytics schema
- **Subscribes (NATS):** `call.ended,objection.fired`
- **Publishes (NATS):** `-`
- **Port:** 8n-a85

Independently deployable. Talks to other services only via `@parley/contracts` (gRPC sync / NATS async) —
never reads another service's tables. See `../parley-platform/PLATFORM_ARCHITECTURE.md`.

```bash
npm install && npm run dev
```
