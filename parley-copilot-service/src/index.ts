// parley-copilot-service — stateless real-time advisor workers.
// Consume the live transcript off NATS, run the PROVEN copilot engine per call, and publish
// cards + objections back onto the bus. Horizontally scalable via the "copilot" queue group.
import Fastify from "fastify";
import { connect, JSONCodec, type NatsConnection } from "nats";
import {
  SUBJECTS, type Envelope, type CallStarted, type CallTranscript, type CallEnded,
  type CallCard, type ObjectionFired, type CallAffect, type LeadHeat, type VoiceBehaviour,
} from "@parley/contracts";
import { CopilotEngine } from "./engine.js";
import type { ServerEvent } from "./types.js";
import { persistStart, persistTranscript, persistCard, persistEnd } from "./persist.js";

const jc = JSONCodec();
const sessions = new Map<string, { eng: CopilotEngine; orgId: string; traceId: string }>();

function publish<T>(nc: NatsConnection, subject: any, orgId: string, traceId: string, data: T) {
  const env: Envelope<T> = {
    id: `${Date.now().toString(36)}-${Math.round(Math.random() * 1e9).toString(36)}`,
    subject, orgId, traceId, occurredAt: new Date().toISOString(), data,
  };
  nc.publish(subject, jc.encode(env));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Translate the engine's rich ServerEvent stream into cross-service contract events.
function makeEmit(nc: NatsConnection, callId: string, orgId: string, traceId: string) {
  return (ev: ServerEvent) => {
    // Emotion + lead temperature → a signal card the rep sees as a live gauge, and a heat event
    // for analytics (cold→hot journey per call).
    if (ev.type === "affect") {
      const arrow = ev.trend === "up" ? "▲" : ev.trend === "down" ? "▼" : "▬";
      publish<CallCard>(nc, SUBJECTS.callCard, orgId, traceId, {
        callId, kind: "signal", urgency: "fyi",
        title: `${cap(ev.affect.emotion)} · ${ev.tier} ${arrow} ${ev.heat}`,
        body: ev.drivers.join(" · ") || "reading the room",
      });
      publish<LeadHeat>(nc, SUBJECTS.leadHeat, orgId, traceId, { callId, heat: ev.heat, tier: ev.tier, trend: ev.trend, drivers: ev.drivers });
      return;
    }
    // Voice Behaviour Analysis (premium) → publish the profile (analytics folds it into the scorecard),
    // and surface the running read as a live signal card on the overlay.
    if (ev.type === "behaviour") {
      const b: VoiceBehaviour = { ...ev.behaviour, callId };
      publish<VoiceBehaviour>(nc, SUBJECTS.callBehaviour, orgId, traceId, b);
      const arrow = b.momentum > 8 ? "▲" : b.momentum < -8 ? "▼" : "▬";
      publish<CallCard>(nc, SUBJECTS.callCard, orgId, traceId, {
        callId, kind: "signal", urgency: "fyi",
        title: `Voice ${arrow} rapport ${b.rapport} · momentum ${b.momentum > 0 ? "+" : ""}${b.momentum}`,
        body: b.read,
      });
      return;
    }
    if (ev.type !== "card") return; // stage/metrics/postcall persisted elsewhere; cards drive the UI
    const card: CallCard = { callId, kind: ev.kind, title: ev.title, body: ev.body, urgency: ev.urgency };
    publish<CallCard>(nc, SUBJECTS.callCard, orgId, traceId, card);
    persistCard(orgId, callId, card);
    if (ev.kind === "objection") {
      const fired: ObjectionFired = { callId, label: ev.title.replace(/^Objection:\s*/, "") };
      publish<ObjectionFired>(nc, SUBJECTS.objectionFired, orgId, traceId, fired);
    }
  };
}

async function main() {
  const nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
  const q = { queue: "copilot" };

  // 1) call.started → spin up an engine for the call's mode
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callStarted, q)) {
      const e = jc.decode(m.data) as Envelope<CallStarted>;
      const emit = makeEmit(nc, e.data.callId, e.orgId, e.traceId);
      sessions.set(e.data.callId, { eng: new CopilotEngine(e.data.modeId, undefined, emit, e.data.culture), orgId: e.orgId, traceId: e.traceId });
      persistStart(e.orgId, e.data.callId, e.data.repId, e.data.modeId, e.data.leadId);
    }
  })();

  // 1b) call.affect → feed acoustic emotion (prosody) into the engine; fused on the next utterance.
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callAffect, q)) {
      const e = jc.decode(m.data) as Envelope<CallAffect>;
      if (e.data.speaker === "prospect") sessions.get(e.data.callId)?.eng.ingestAcoustic(e.data.affect);
    }
  })();

  // 2) call.transcript → feed the engine (objection/stage/coaching fire synchronously)
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callTranscript, q)) {
      const e = jc.decode(m.data) as Envelope<CallTranscript>;
      sessions.get(e.data.callId)?.eng.onUtterance(e.data.speaker, e.data.text, e.data.isFinal);
      persistTranscript(e.orgId, e.data.callId, e.data.speaker, e.data.text, e.data.isFinal);
    }
  })();

  // 3) call.ended → finalize (post-call summary) and release the engine
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callEnded, q)) {
      const e = jc.decode(m.data) as Envelope<CallEnded>;
      const s = sessions.get(e.data.callId);
      if (s) { s.eng.recordOutcome(e.data.appointmentSet); await s.eng.finish(); sessions.delete(e.data.callId); }
      persistEnd(e.orgId, e.data.callId, { disposition: e.data.disposition, talkRatioRep: e.data.talkRatioRep, appointmentSet: e.data.appointmentSet });
    }
  })();

  const app = Fastify();
  app.get("/health", async () => ({ ok: true, service: "parley-copilot-service", activeCalls: sessions.size }));
  await app.listen({ port: Number(process.env.PORT) || 8086, host: "0.0.0.0" });
  app.log.info("copilot-service consuming transcript stream");
}
main().catch((e) => { console.error(e); process.exit(1); });
