// parley-analytics-service — scoring, rollups, and the manager dashboard.
// Consumes call.ended → writes a per-call scorecard → (debounced) refreshes the daily rollup MV.
// Serves /dashboard (HTML) and /api/stats (JSON) for the manager view.
import Fastify from "fastify";
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallEnded } from "@parley/contracts";
import { withOrg, withConn, repo } from "@parley/db";
import { DASHBOARD_HTML } from "./dashboard.js";

const jc = JSONCodec();

// 0–100 call score: appointment is king; reward a healthy talk balance and objections handled.
function score(p: { talkRatioRep: number; appointmentSet: boolean; objectionsHandled: number }): number {
  let s = 40;
  if (p.appointmentSet) s += 40;
  if (p.talkRatioRep >= 0.4 && p.talkRatioRep <= 0.6) s += 15; // ideal listen/talk band
  s += Math.min(15, p.objectionsHandled * 5);
  return Math.max(0, Math.min(100, s));
}

// Coalesce MV refreshes so a burst of call.ended events triggers one refresh, not N.
let refreshTimer: NodeJS.Timeout | null = null;
function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = null;
    try { await withConn((tx) => repo.scorecards.refreshDaily(tx)); } catch (e) { console.error("[refresh]", e); }
  }, 1000);
}

async function onCallEnded(e: Envelope<CallEnded>) {
  const { callId, repId, talkRatioRep, appointmentSet } = e.data;
  await withOrg(e.orgId, async (tx) => {
    const objectionsHandled = await repo.events.countObjections(tx, callId);
    await repo.scorecards.upsert(tx, {
      callId, orgId: e.orgId, repId,
      score: score({ talkRatioRep, appointmentSet, objectionsHandled }),
      talkRatio: talkRatioRep, objectionsHandled, appointmentSet,
    });
  });
  scheduleRefresh();
}

async function main() {
  const nc: NatsConnection = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callEnded, { queue: "analytics" })) {
      try { await onCallEnded(jc.decode(m.data) as Envelope<CallEnded>); } catch (e) { console.error("[scorecard]", e); }
    }
  })();

  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-analytics-service" }));

  // Dashboard data (org derived from auth in prod; query param here for the internal API).
  app.get<{ Querystring: { orgId: string } }>("/api/stats", async (req) => {
    const orgId = req.query.orgId;
    if (!orgId) return [];
    return withConn((tx) => repo.scorecards.dashboard(tx, orgId));
  });

  app.get<{ Querystring: { orgId: string } }>("/dashboard", async (req, reply) => {
    reply.type("text/html").send(DASHBOARD_HTML(req.query.orgId ?? ""));
  });

  await app.listen({ port: Number(process.env.PORT) || 8085, host: "0.0.0.0" });
}
main().catch((e) => { console.error(e); process.exit(1); });
