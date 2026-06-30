# parley-copilot-service

**Responsibility:** Objection/stage/coaching + LLM advisor (stateless workers)

- **Owns data:** none
- **Subscribes (NATS):** `call.transcript`
- **Publishes (NATS):** `call.card,objection.fired`
- **Port:** n-a

Independently deployable. Talks to other services only via `@parley/contracts` (gRPC sync / NATS async) —
never reads another service's tables. See `../parley-platform/PLATFORM_ARCHITECTURE.md`.

```bash
npm install && npm run dev
```
