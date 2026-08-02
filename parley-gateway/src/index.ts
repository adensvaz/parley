// parley-gateway — the ONLY public surface. Terminates WSS from the desktop, authenticates,
// runs STT, and bridges the call to/from the internal event bus.
//
// desktop --WSS--> gateway --(STT)--> NATS call.transcript --> copilot-service
// desktop <--WSS-- gateway <-- NATS call.card <----------------- copilot-service
import Fastify from "fastify";
import { WebSocketServer, type WebSocket } from "ws";
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallStarted, type CallTranscript, type CallEnded, type CallCard, type CallAffect } from "@parley/contracts";
import { randomUUID } from "node:crypto";
import { authenticate, type AuthContext } from "./auth.js";
import { createTranscriber, type Speaker } from "./stt.js";
import { createAffectEngine } from "./affect.js";

const jc = JSONCodec();
let nc: NatsConnection;
const newId = () => `${Date.now().toString(36)}-${Math.round(Math.random() * 1e9).toString(36)}`;
const BILLING_URL = process.env.BILLING_URL; // entitlement gate before a call
const CRM_URL = process.env.CRM_URL;         // lead context on call start

function publish<T>(subject: any, orgId: string, traceId: string, data: T) {
  const env: Envelope<T> = { id: newId(), subject, orgId, traceId, occurredAt: new Date().toISOString(), data };
  nc.publish(subject, jc.encode(env));
}

function handleConnection(ws: WebSocket, ctx: AuthContext) {
  const callId = randomUUID();   // uuid so it maps directly to the calls table PK
  const traceId = newId();
  const send = (obj: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(obj));

  // STT: transcripts go to the bus (for copilot) AND straight to the desktop (live feed).
  // Affect engine: reads the PROSPECT's tone (model ensemble + DSP) AND the rep↔prospect vocal
  // resonance. Both legs feed it; we emit on finished prospect utterances so copilot fuses tone+words.
  const affect = createAffectEngine({ encoding: "linear16", sampleRate: 16000 });
  const stt = createTranscriber((speaker, text, isFinal) => {
    publish<CallTranscript>(SUBJECTS.callTranscript, ctx.orgId, traceId, { callId, speaker, text, isFinal });
    send({ type: "transcript", speaker, text, isFinal, ts: Date.now() });
    if (speaker === "prospect" && isFinal)
      void affect.read().then((a) => { if (a) publish<CallAffect>(SUBJECTS.callAffect, ctx.orgId, traceId, { callId, speaker: "prospect", affect: a }); });
  });

  // Relay copilot cards for THIS call back to the desktop.
  const cardSub = nc.subscribe(SUBJECTS.callCard);
  (async () => {
    for await (const m of cardSub) {
      const e = jc.decode(m.data) as Envelope<CallCard>;
      if (e.orgId === ctx.orgId && e.data.callId === callId)
        send({ type: "card", kind: e.data.kind, title: e.data.title, body: e.data.body, urgency: e.data.urgency, stats: e.data.stats, id: e.id });
    }
  })();

  // Gate on plan quota, surface lead context, then open the call.
  async function startCall(msg: any) {
    if (BILLING_URL) {
      try {
        const ent: any = await fetch(`${BILLING_URL}/entitlements?orgId=${ctx.orgId}`).then((r) => r.json());
        if (ent && ent.allowed === false) { send({ type: "blocked", reason: "quota", plan: ent.plan }); return; }
      } catch { /* fail-open: don't drop calls on a billing outage */ }
    }
    if (CRM_URL && msg.phone) {
      try {
        const r = await fetch(`${CRM_URL}/lead?orgId=${ctx.orgId}&phone=${encodeURIComponent(msg.phone)}`);
        if (r.ok) send({ type: "lead", ...(await r.json()) });
      } catch { /* lead context is best-effort */ }
    }
    stt.start();
    publish<CallStarted>(SUBJECTS.callStarted, ctx.orgId, traceId, { callId, repId: ctx.repId, modeId: msg.modeId });
  }

  ws.on("message", (raw) => {
    let msg: any; try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "start") {
      void startCall(msg);
    } else if (msg.type === "audio" && (msg.speaker === "rep" || msg.speaker === "prospect")) {
      stt.push(msg.speaker as Speaker, msg.pcm16);
      affect.push(msg.speaker as Speaker, msg.pcm16); // both legs → tone + vocal-resonance
    } else if (msg.type === "transcript" && (msg.speaker === "rep" || msg.speaker === "prospect")) {
      // Practice / no-STT mode: client-injected transcript, forwarded to the bus like an STT result.
      publish<CallTranscript>(SUBJECTS.callTranscript, ctx.orgId, traceId, { callId, speaker: msg.speaker, text: msg.text ?? "", isFinal: msg.isFinal !== false });
      send({ type: "transcript", speaker: msg.speaker, text: msg.text ?? "", isFinal: msg.isFinal !== false, ts: Date.now() });
    } else if (msg.type === "stop") {
      stt.stop();
    }
  });

  ws.on("close", () => {
    stt.stop();
    cardSub.unsubscribe();
    publish<CallEnded>(SUBJECTS.callEnded, ctx.orgId, traceId, { callId, repId: ctx.repId, disposition: "unknown", talkRatioRep: 0, appointmentSet: false });
  });
}

async function main() {
  nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-gateway" }));

  // Authenticate DURING the upgrade (before completing the handshake) so the message listener
  // in handleConnection is attached synchronously — otherwise the client's first frame can race
  // ahead of an async auth and be dropped.
  const wss = new WebSocketServer({ noServer: true });
  await app.listen({ port: Number(process.env.PORT) || 8080, host: "0.0.0.0" });
  app.server.on("upgrade", async (req, socket, head) => {
    if (!req.url || !req.url.startsWith("/rt")) { socket.destroy(); return; }
    const token = new URL(req.url, "http://x").searchParams.get("token") ?? undefined;
    const ctx = await authenticate(token);
    if (!ctx) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => handleConnection(ws, ctx));
  });
}
main().catch((e) => { console.error(e); process.exit(1); });
