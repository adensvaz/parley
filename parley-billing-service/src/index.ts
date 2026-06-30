// parley-billing-service — plans, subscriptions, usage metering, entitlements.
// Meters every call.started, enforces plan quota via /entitlements (the gateway gates calls on it),
// and updates subscriptions from Stripe (webhook). Tenant-scoped via @parley/db (RLS).
import Fastify from "fastify";
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallStarted } from "@parley/contracts";
import { withOrg, repo } from "@parley/db";

const jc = JSONCodec();

async function main() {
  const nc: NatsConnection = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });

  // Meter each started call (and lazily ensure the org has a trial subscription).
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callStarted, { queue: "billing" })) {
      const e = jc.decode(m.data) as Envelope<CallStarted>;
      try {
        await withOrg(e.orgId, async (tx) => { await repo.billing.ensureSub(tx, e.orgId); await repo.billing.meter(tx, e.orgId, "call"); });
      } catch (err) { console.error("[meter]", err); }
    }
  })();

  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-billing-service" }));

  // The gateway calls this BEFORE allowing a call. Fail-closed on error.
  app.get<{ Querystring: { orgId: string } }>("/entitlements", async (req) => {
    const orgId = req.query.orgId;
    if (!orgId) return { allowed: false, reason: "no org" };
    return withOrg(orgId, async (tx) => {
      await repo.billing.ensureSub(tx, orgId);
      const sub = await repo.billing.getSub(tx, orgId);
      const used = await repo.billing.usedThisMonth(tx, orgId, "call");
      const quota = sub?.monthly_call_quota ?? null; // null = unlimited
      const allowed = quota === null || used < quota;
      return {
        plan: sub?.plan_id, status: sub?.status, quota, used,
        remaining: quota === null ? null : Math.max(0, quota - used),
        allowed,
      };
    });
  });

  // Stripe webhook target. In production the signature is verified with STRIPE_WEBHOOK_SECRET via
  // stripe.webhooks.constructEvent; here we upsert the subscription from the normalized event.
  app.post<{ Body: { orgId: string; planId: string; status?: string; stripeCustomerId?: string; stripeSubId?: string; periodEnd?: string } }>(
    "/webhooks/stripe",
    async (req, reply) => {
      const b = req.body;
      if (!b?.orgId || !b?.planId) return reply.code(400).send({ error: "orgId + planId required" });
      await withOrg(b.orgId, (tx) => repo.billing.setPlan(tx, { orgId: b.orgId, planId: b.planId, status: b.status ?? "active", stripeCustomerId: b.stripeCustomerId, stripeSubId: b.stripeSubId, periodEnd: b.periodEnd }));
      return { ok: true };
    },
  );

  await app.listen({ port: Number(process.env.PORT) || 8084, host: "0.0.0.0" });
}
main().catch((e) => { console.error(e); process.exit(1); });
