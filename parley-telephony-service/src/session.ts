// The shared ingest core. EVERY connection source (PSTN, SIP, Zoom, Meet) funnels through here,
// so copilot / analytics / billing never learn a new event shape — the source is just metadata.
//
//   media source ── onAudio(speaker,pcm) ──▶ STT ──▶ NATS call.transcript ──▶ copilot-service
//   session open  ─────────────────────────────────▶ NATS call.started (with `source`)
//   session end   ─────────────────────────────────▶ NATS call.ended
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallStarted, type CallTranscript, type CallEnded, type CallSource, type CallAffect } from "@parley/contracts";
import { createTranscriber, type Speaker, type SttOptions } from "./stt.js";
import { createAffectEngine } from "./affect.js";
import { randomUUID } from "node:crypto";

const jc = JSONCodec();
let nc: NatsConnection;
const newId = () => `${Date.now().toString(36)}-${Math.round(Math.random() * 1e9).toString(36)}`;

export async function initBus() { nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" }); }
export function publishEvent<T>(subject: any, orgId: string, traceId: string, data: T) {
  const env: Envelope<T> = { id: newId(), subject, orgId, traceId, occurredAt: new Date().toISOString(), data };
  nc.publish(subject, jc.encode(env));
}
const publish = publishEvent;

export interface SessionCtx {
  orgId: string; repId: string; source: CallSource;
  callId?: string; modeId?: string; leadId?: string;
  stt: SttOptions;   // per-source audio format (μ-law/8k for PSTN, linear16/16k for Zoom)
}
export interface CallOutcome { disposition?: string; talkRatioRep?: number; appointmentSet?: boolean }

/** Open a call session: mints a callId, starts STT, emits call.started. Returns the audio sink + end(). */
export function openSession(ctx: SessionCtx) {
  const callId = ctx.callId ?? randomUUID();      // uuid → maps directly to the calls table PK
  const traceId = newId();
  const affect = createAffectEngine(ctx.stt);     // tone (model ensemble + DSP) + vocal resonance, per source's audio format
  const stt = createTranscriber((speaker, text, isFinal) => {
    publish<CallTranscript>(SUBJECTS.callTranscript, ctx.orgId, traceId, { callId, speaker, text, isFinal });
    if (speaker === "prospect" && isFinal)
      void affect.read().then((a) => { if (a) publish<CallAffect>(SUBJECTS.callAffect, ctx.orgId, traceId, { callId, speaker: "prospect", affect: a }); });
  }, ctx.stt);
  stt.start();
  publish<CallStarted>(SUBJECTS.callStarted, ctx.orgId, traceId, {
    callId, repId: ctx.repId, modeId: ctx.modeId ?? "default", leadId: ctx.leadId, source: ctx.source,
  });

  let ended = false;
  return {
    callId,
    onAudio(speaker: Speaker, base64pcm: string) { stt.push(speaker, base64pcm); affect.push(speaker, base64pcm); },
    end(out: CallOutcome = {}) {
      if (ended) return; ended = true;
      stt.stop();
      publish<CallEnded>(SUBJECTS.callEnded, ctx.orgId, traceId, {
        callId, repId: ctx.repId, source: ctx.source,
        disposition: out.disposition ?? "completed", talkRatioRep: out.talkRatioRep ?? 0, appointmentSet: out.appointmentSet ?? false,
      });
    },
  };
}
