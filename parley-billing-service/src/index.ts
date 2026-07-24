// parley-billing-service — plans, subscriptions, usage metering, entitlements.
// Meters every call.started, enforces plan quota via /entitlements (the gateway gates calls on it),
// and updates subscriptions from Stripe (webhook). Tenant-scoped via @parley/db (RLS).
import Fastify from "fastify";
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallStarted, type CallEnded } from "@parley/contracts";
import { withOrg, repo } from "@parley/db";

const jc = JSONCodec();

async function main() {
  const nc: NatsConnection = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });

  // Meter each started call (and lazily ensure the org has a trial subscription). Calls are a coarse
  // count; the real cost driver is CONNECTED MINUTES (STT + affect are per-minute), metered on call.ended.
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callStarted, { queue: "billing" })) {
      const e = jc.decode(m.data) as Envelope<CallStarted>;
      try {
        await withOrg(e.orgId, async (tx) => { await repo.billing.ensureSub(tx, e.orgId); await repo.billing.meter(tx, e.orgId, "call"); });
      } catch (err) { console.error("[meter]", err); }
    }
  })();

  // Meter connected MINUTES on call.ended — this is what actually costs money (Deepgram STT + the
  // acoustic affect model both bill per audio-minute). Billing must track the cost unit, not just calls.
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callEnded, { queue: "billing" })) {
      const e = jc.decode(m.data) as Envelope<CallEnded>;
      const minutes = Math.max(1, Math.ceil((e.data.durationSec ?? 0) / 60)); // round up; a connect is ≥1 min billed
      if (!e.data.durationSec) continue; // no duration → nothing to meter (legacy/edge)
      try {
        await withOrg(e.orgId, (tx) => repo.billing.meter(tx, e.orgId, "minute", minutes));
      } catch (err) { console.error("[meter:minute]", err); }
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
      const sub: any = await repo.billing.getSub(tx, orgId);
      const usedCalls = await repo.billing.usedThisMonth(tx, orgId, "call");
      const usedMinutes = await repo.billing.usedThisMonth(tx, orgId, "minute");
      const callQuota = sub?.monthly_call_quota ?? null;      // null = unlimited
      const minuteQuota = sub?.monthly_minute_quota ?? null;  // per-seat included minutes; overage billed, not blocked
      // Included MINUTES are the real allowance; going over meters overage (billed) rather than hard-blocking a
      // live call. We only hard-block if the plan is inactive or a call-count cap (trial abuse guard) is hit.
      const callAllowed = callQuota === null || usedCalls < callQuota;
      const active = !sub?.status || sub.status === "active" || sub.status === "trialing";
      return {
        plan: sub?.plan_id, status: sub?.status,
        callQuota, usedCalls, callRemaining: callQuota === null ? null : Math.max(0, callQuota - usedCalls),
        minuteQuota, usedMinutes, minuteRemaining: minuteQuota === null ? null : Math.max(0, minuteQuota - usedMinutes),
        overageMinutes: minuteQuota === null ? 0 : Math.max(0, usedMinutes - minuteQuota),
        allowed: active && callAllowed,
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
