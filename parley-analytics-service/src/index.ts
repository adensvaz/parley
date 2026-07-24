// parley-analytics-service — scoring, rollups, and the manager dashboard.
// Consumes call.ended → writes a per-call scorecard → (debounced) refreshes the daily rollup MV.
// Serves /dashboard (HTML) and /api/stats (JSON) for the manager view.
import Fastify from "fastify";
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallEnded, type CallScored, type VoiceBehaviour } from "@parley/contracts";
import { withOrg, withConn, repo } from "@parley/db";
import { DASHBOARD_HTML } from "./dashboard.js";
import { buildScorecard } from "./scorecard.js";
import { REPORT_HTML } from "./report.js";

const jc = JSONCodec();
let nc: NatsConnection;
const newId = () => `${Date.now().toString(36)}-${Math.round(Math.random() * 1e9).toString(36)}`;

// Latest Voice Behaviour Analysis per call (premium), fed by call.behaviour and folded into the
// scorecard on call.ended. Evicted after scoring so the map can't grow unbounded.
const behaviourByCall = new Map<string, VoiceBehaviour>();

// Coalesce MV refreshes so a burst of call.ended events triggers one refresh, not N.
let refreshTimer: NodeJS.Timeout | null = null;
function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = null;
    try { await withConn((tx) => repo.scorecards.refreshDaily(tx)); } catch (e) { console.error("[refresh]", e); }
  }, 1000);
}

// call.ended → read the transcript → build the rich scorecard → persist → announce call.scored.
// call.scored is what the desktop/web listens for to pop the rep's report the moment the call ends.
async function onCallEnded(e: Envelope<CallEnded>) {
  const { callId, repId, talkRatioRep, appointmentSet } = e.data;
  const sc = await withOrg(e.orgId, async (tx) => {
    const objectionsHandled = await repo.events.countObjections(tx, callId);
    const transcript = await repo.transcript.forCall(tx, callId);
    const startedAtMs = transcript.length ? Date.parse(transcript[0].ts) : Date.parse(e.occurredAt);
    const behaviour = behaviourByCall.get(callId);
    const card = buildScorecard({ callId, repId, transcript, talkRatioRep, appointmentSet, objectionsHandled, startedAtMs, behaviour });
    await repo.scorecards.upsertReport(tx, {
      callId, orgId: e.orgId, repId, score: card.score, talkRatio: talkRatioRep,
      objectionsHandled, appointmentSet, stages: card.stages, fix: card.fix, moments: card.moments,
    });
    return card;
  });
  // announce the finished scorecard so the rep gets it live (idempotent on callId downstream).
  const env: Envelope<CallScored> = { id: newId(), subject: SUBJECTS.callScored, orgId: e.orgId, traceId: e.traceId, occurredAt: new Date().toISOString(), data: sc };
  nc.publish(SUBJECTS.callScored, jc.encode(env));
  behaviourByCall.delete(callId);
  scheduleRefresh();
}

async function main() {
  nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callEnded, { queue: "analytics" })) {
      try { await onCallEnded(jc.decode(m.data) as Envelope<CallEnded>); } catch (e) { console.error("[scorecard]", e); }
    }
  })();
  // Voice Behaviour Analysis stream → keep the latest profile per call for the scorecard.
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callBehaviour, { queue: "analytics" })) {
      const b = (jc.decode(m.data) as Envelope<VoiceBehaviour>).data;
      if (b?.callId) behaviourByCall.set(b.callId, b);
    }
  })();

  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-analytics-service" }));

  // Manager dashboard data (org derived from auth in prod; query param here for the internal API).
  app.get<{ Querystring: { orgId: string } }>("/api/stats", async (req) => {
    const orgId = req.query.orgId;
    if (!orgId) return [];
    return withConn((tx) => repo.scorecards.dashboard(tx, orgId));
  });

  app.get<{ Querystring: { orgId: string } }>("/dashboard", async (req, reply) => {
    reply.type("text/html").send(DASHBOARD_HTML(req.query.orgId ?? ""));
  });

  // The rep's own post-call report — JSON for the desktop/web, HTML for a shareable link.
  app.get<{ Params: { callId: string }; Querystring: { orgId: string } }>("/api/scorecard/:callId", async (req, reply) => {
    const row = await withOrg(req.query.orgId, (tx) => repo.scorecards.get(tx, req.params.callId));
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });
  app.get<{ Params: { callId: string }; Querystring: { orgId: string } }>("/report/:callId", async (req, reply) => {
    const row: any = await withOrg(req.query.orgId, (tx) => repo.scorecards.get(tx, req.params.callId));
    if (!row) return reply.code(404).type("text/html").send("<h1>Scorecard not found</h1>");
    reply.type("text/html").send(REPORT_HTML({
      callId: row.call_id, repId: row.rep_id, score: row.score, stages: row.stages ?? [], fix: row.fix,
      moments: row.moments ?? [], talkRatioRep: row.talk_ratio, objectionsHandled: row.objections_handled, appointmentSet: row.appointment_set,
    }));
  });

  await app.listen({ port: Number(process.env.PORT) || 8085, host: "0.0.0.0" });
}
main().catch((e) => { console.error(e); process.exit(1); });
