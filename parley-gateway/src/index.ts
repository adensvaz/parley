// parley-gateway — the ONLY public surface. Terminates WSS from the desktop, authenticates,
// runs STT, and bridges the call to/from the internal event bus.
//
// desktop --WSS--> gateway --(STT)--> NATS call.transcript --> copilot-service
// desktop <--WSS-- gateway <-- NATS call.card <----------------- copilot-service
import Fastify from "fastify";
import { WebSocketServer, type WebSocket } from "ws";
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallStarted, type CallTranscript, type CallEnded, type CallCard } from "@parley/contracts";
import { authenticate, type AuthContext } from "./auth.js";
import { createTranscriber, type Speaker } from "./stt.js";

const jc = JSONCodec();
let nc: NatsConnection;
const newId = () => `${Date.now().toString(36)}-${Math.round(Math.random() * 1e9).toString(36)}`;

function publish<T>(subject: any, orgId: string, traceId: string, data: T) {
  const env: Envelope<T> = { id: newId(), subject, orgId, traceId, occurredAt: new Date().toISOString(), data };
  nc.publish(subject, jc.encode(env));
}

function handleConnection(ws: WebSocket, ctx: AuthContext) {
  const callId = newId();
  const traceId = newId();
  const send = (obj: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(obj));

  // STT: transcripts go to the bus (for copilot) AND straight to the desktop (live feed).
  const stt = createTranscriber((speaker, text, isFinal) => {
    publish<CallTranscript>(SUBJECTS.callTranscript, ctx.orgId, traceId, { callId, speaker, text, isFinal });
    send({ type: "transcript", speaker, text, isFinal, ts: Date.now() });
  });

  // Relay copilot cards for THIS call back to the desktop.
  const cardSub = nc.subscribe(SUBJECTS.callCard);
  (async () => {
    for await (const m of cardSub) {
      const e = jc.decode(m.data) as Envelope<CallCard>;
      if (e.orgId === ctx.orgId && e.data.callId === callId)
        send({ type: "card", kind: e.data.kind, title: e.data.title, body: e.data.body, urgency: e.data.urgency, id: e.id });
    }
  })();

  ws.on("message", (raw) => {
    let msg: any; try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "start") {
      stt.start();
      publish<CallStarted>(SUBJECTS.callStarted, ctx.orgId, traceId, { callId, repId: ctx.repId, modeId: msg.modeId });
    } else if (msg.type === "audio" && (msg.speaker === "rep" || msg.speaker === "prospect")) {
      stt.push(msg.speaker as Speaker, msg.pcm16);
    } else if (msg.type === "stop") {
      stt.stop();
    }
  });

  ws.on("close", () => {
    stt.stop();
    cardSub.unsubscribe();
    publish<CallEnded>(SUBJECTS.callEnded, ctx.orgId, traceId, { callId, disposition: "unknown", talkRatioRep: 0, appointmentSet: false });
  });
}

async function main() {
  nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-gateway" }));

  const wss = new WebSocketServer({ server: app.server, path: "/rt" });
  wss.on("connection", async (ws, req) => {
    const token = new URL(req.url ?? "", "http://x").searchParams.get("token") ?? undefined;
    const ctx = await authenticate(token);
    if (!ctx) { ws.close(4401, "unauthorized"); return; }
    handleConnection(ws, ctx);
  });

  await app.listen({ port: Number(process.env.PORT) || 8080, host: "0.0.0.0" });
}
main().catch((e) => { console.error(e); process.exit(1); });
