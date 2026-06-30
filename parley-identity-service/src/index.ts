// parley-identity-service — Clerk-backed auth, orgs, RBAC, service tokens
// Bounded context owns: identity schema
// Subscribes: -   |   Publishes: -
import Fastify from 'fastify';
import { connect, type NatsConnection } from 'nats';

let nc: NatsConnection | null = null;
async function bus() { nc = await connect({ servers: process.env.NATS_URL || 'nats://localhost:4222' }); return nc; }

async function main() {
  await bus();
  // TODO: subscribe to [-], publish [-] via the transactional outbox relay.
const app = Fastify({ logger: true });
app.get('/health', async () => ({ ok: true, service: 'parley-identity-service' }));
app.get('/ready', async () => ({ ready: nc !== null }));
await app.listen({ port: Number(process.env.PORT) || 8081, host: '0.0.0.0' });
}
main().catch((e) => { console.error(e); process.exit(1); });
