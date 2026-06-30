# @parley/contracts

The versioned, shared boundary between every Parley service. **Nothing crosses service lines except
through here.** Changing a contract is a deliberate, reviewed, backward-compatible act.

- `src/events.ts` — NATS subjects + event payloads (async).
- `proto/` — gRPC service definitions (sync, low-latency: lead lookup, DNC check, entitlements).

Consumed as `@parley/contracts` (workspace package). Versioned subjects (`*.v1`) allow rolling upgrades.
