// parley-billing-service — Stripe, plans, entitlements, usage metering
// Bounded context owns: billing schema
// Subscribes: call.started,usage.metered   |   Publishes: -
import Fastify from 'fastify';
import { connect, type NatsConnection } from 'nats';

let nc: NatsConnection | null = null;
async function bus() { nc = await connect({ servers: process.env.NATS_URL || 'nats://localhost:4222' }); return nc; }

async function main() {
  await bus();
  // TODO: subscribe to [call.started,usage.metered], publish [-] via the transactional outbox relay.
const app = Fastify({ logger: true });
app.get('/health', async () => ({ ok: true, service: 'parley-billing-service' }));
app.get('/ready', async () => ({ ready: nc !== null }));
await app.listen({ port: Number(process.env.PORT) || 8084, host: '0.0.0.0' });
}
main().catch((e) => { console.error(e); process.exit(1); });
