# parley-compliance-service

**Responsibility:** DNC scrub, consent, call windows, retention

- **Owns data:** compliance schema
- **Subscribes (NATS):** `compliance.dnc_requested`
- **Publishes (NATS):** `-`
- **Port:** 8n-a83

Independently deployable. Talks to other services only via `@parley/contracts` (gRPC sync / NATS async) —
never reads another service's tables. See `../parley-platform/PLATFORM_ARCHITECTURE.md`.

```bash
npm install && npm run dev
```
