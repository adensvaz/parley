// parley-crm-service — Leads + CRM sync (FollowUpBoss/kvCORE/HubSpot)
// Bounded context owns: crm schema
// Subscribes: lead.upserted   |   Publishes: lead.upserted
import Fastify from 'fastify';
import { connect, type NatsConnection } from 'nats';

let nc: NatsConnection | null = null;
async function bus() { nc = await connect({ servers: process.env.NATS_URL || 'nats://localhost:4222' }); return nc; }

async function main() {
  await bus();
  // TODO: subscribe to [lead.upserted], publish [lead.upserted] via the transactional outbox relay.
const app = Fastify({ logger: true });
app.get('/health', async () => ({ ok: true, service: 'parley-crm-service' }));
app.get('/ready', async () => ({ ready: nc !== null }));
await app.listen({ port: Number(process.env.PORT) || 8082, host: '0.0.0.0' });
}
main().catch((e) => { console.error(e); process.exit(1); });
