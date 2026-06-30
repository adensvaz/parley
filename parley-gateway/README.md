# parley-gateway

**Responsibility:** WSS ingress: authN, rate-limit, route audio to bus, relay cards to desktop

- **Owns data:** Redis session cache
- **Subscribes (NATS):** `call.card`
- **Publishes (NATS):** `call.started,call.transcript`
- **Port:** 8n-a80

Independently deployable. Talks to other services only via `@parley/contracts` (gRPC sync / NATS async) —
never reads another service's tables. See `../parley-platform/PLATFORM_ARCHITECTURE.md`.

```bash
npm install && npm run dev
```
