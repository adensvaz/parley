# parley-crm-service

**Responsibility:** Leads + CRM sync (FollowUpBoss/kvCORE/HubSpot)

- **Owns data:** crm schema
- **Subscribes (NATS):** `lead.upserted`
- **Publishes (NATS):** `lead.upserted`
- **Port:** 8n-a82

Independently deployable. Talks to other services only via `@parley/contracts` (gRPC sync / NATS async) —
never reads another service's tables. See `../parley-platform/PLATFORM_ARCHITECTURE.md`.

```bash
npm install && npm run dev
```
