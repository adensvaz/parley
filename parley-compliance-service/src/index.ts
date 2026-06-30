// parley-compliance-service — DNC scrub, consent, call windows, retention
// Bounded context owns: compliance schema
// Subscribes: compliance.dnc_requested   |   Publishes: -
import Fastify from 'fastify';
import { connect, type NatsConnection } from 'nats';

let nc: NatsConnection | null = null;
async function bus() { nc = await connect({ servers: process.env.NATS_URL || 'nats://localhost:4222' }); return nc; }

async function main() {
  await bus();
  // TODO: subscribe to [compliance.dnc_requested], publish [-] via the transactional outbox relay.
const app = Fastify({ logger: true });
app.get('/health', async () => ({ ok: true, service: 'parley-compliance-service' }));
app.get('/ready', async () => ({ ready: nc !== null }));
await app.listen({ port: Number(process.env.PORT) || 8083, host: '0.0.0.0' });
}
main().catch((e) => { console.error(e); process.exit(1); });
