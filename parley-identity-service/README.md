# parley-identity-service

**Responsibility:** Clerk-backed auth, orgs, RBAC, service tokens

- **Owns data:** identity schema
- **Subscribes (NATS):** `-`
- **Publishes (NATS):** `-`
- **Port:** 8n-a81

Independently deployable. Talks to other services only via `@parley/contracts` (gRPC sync / NATS async) —
never reads another service's tables. See `../parley-platform/PLATFORM_ARCHITECTURE.md`.

```bash
npm install && npm run dev
```
