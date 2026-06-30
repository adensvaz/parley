// parley-gateway — the ONLY public surface. Terminates WSS from the desktop, authenticates,
// rate-limits, and bridges the call to the internal event bus. Stateless except a Redis session cache.
import Fastify from "fastify";
import { WebSocketServer, type WebSocket } from "ws";
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallCard } from "@parley/contracts";

const jc = JSONCodec();
let nc: NatsConnection;

// Verify the Clerk JWT and resolve tenant context. (Calls identity-service in prod.)
async function authenticate(token?: string): Promise<{ orgId: string; repId: string } | null> {
  if (!token) return null;
  // TODO: verify signature + exp via identity-service / JWKS; map to org + rep.
  return { orgId: "org_demo", repId: "rep_demo" };
}

const newId = () => `${Date.now().toString(36)}-${Math.round(Math.random() * 1e9).toString(36)}`;

function handleConnection(ws: WebSocket, ctx: { orgId: string; repId: string }) {
  const callId = newId();
  const trace = newId();
  const env = <T>(subject: any, data: T): Envelope<T> =>
    ({ id: newId(), subject, orgId: ctx.orgId, traceId: trace, occurredAt: new Date().toISOString(), data });

  // Relay copilot cards for THIS call back to the desktop.
  const sub = nc.subscribe(SUBJECTS.callCard);
  (async () => {
    for await (const m of sub) {
      const e = jc.decode(m.data) as Envelope<CallCard>;
      if (e.orgId === ctx.orgId && e.data.callId === callId && ws.readyState === ws.OPEN)
        ws.send(JSON.stringify({ type: "card", ...e.data }));
    }
  })();

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "start")
      nc.publish(SUBJECTS.callStarted, jc.encode(env(SUBJECTS.callStarted, { callId, repId: ctx.repId, modeId: msg.modeId })));
    else if (msg.type === "audio")
      // Forward to STT (Deepgram) → transcript onto the bus. (STT adapter omitted in skeleton.)
      nc.publish(SUBJECTS.callTranscript, jc.encode(env(SUBJECTS.callTranscript, { callId, speaker: msg.speaker, text: "", isFinal: false })));
  });

  ws.on("close", () => {
    nc.publish(SUBJECTS.callEnded, jc.encode(env(SUBJECTS.callEnded, { callId, disposition: "unknown", talkRatioRep: 0, appointmentSet: false })));
    sub.unsubscribe();
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
    if (!ctx) return ws.close(4401, "unauthorized");
    handleConnection(ws, ctx);
  });
  await app.listen({ port: Number(process.env.PORT) || 8080, host: "0.0.0.0" });
}
main().catch((e) => { console.error(e); process.exit(1); });
