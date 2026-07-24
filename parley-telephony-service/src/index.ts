// parley-telephony-service — the connection layer for calls that DON'T originate on the desktop.
// Two more ways to plug in, both converging on the same NATS transcript pipeline as the gateway:
//
//   ① Parley virtual number (PSTN/SIP) — provider forks both call legs to /media (Twilio Media
//      Streams); we resolve number→org, open a session, and transcribe. call.started/transcript/ended.
//   ② Zoom / Meet — a bot joins the meeting and streams audio to the same session core.
//
// Public surface is small and provider-driven (webhooks + media WSS); everything internal is the
// tenant-scoped @parley/db + the shared event bus.
import Fastify from "fastify";
import { WebSocketServer } from "ws";
import { withOrg, withConn, repo } from "@parley/db";
import { SUBJECTS, type NumberProvisioned } from "@parley/contracts";
import { initBus, publishEvent } from "./session.js";
import { handlePstnMedia } from "./sources/pstn.js";
import { joinMeeting } from "./sources/zoom.js";
import { bridgeTwiml, openBridgeSession, type BridgeStart } from "./sources/bridge.js";
import { provisionNumber, startCallerIdVerification, placeBridge } from "./provider.js";

const PUBLIC_WSS = process.env.PUBLIC_WSS_URL; // e.g. wss://telephony.parley.ai (falls back to req host)
const PUBLIC_HTTP = process.env.PUBLIC_HTTP_URL; // e.g. https://telephony.parley.ai (for the bridge voice webhook)
// In-flight bridge requests, keyed by callId; consumed when the rep's own phone answers (/bridge/voice).
const pendingBridges = new Map<string, BridgeStart>();

async function main() {
  await initBus();
  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-telephony-service" }));

  // ── Number provisioning (called by web/billing when an org opts into a Parley number) ──────────
  app.post<{ Body: { orgId: string; repId?: string; areaCode?: string; provider?: string } }>("/numbers", async (req, reply) => {
    const { orgId, repId, areaCode, provider } = req.body ?? ({} as any);
    if (!orgId) return reply.code(400).send({ error: "orgId required" });
    const { e164, provider: prov } = await provisionNumber({ areaCode, provider });
    await withOrg(orgId, (tx) => repo.numbers.provision(tx, { e164, orgId, repId, provider: prov, source: "pstn" }));
    // announce so billing can meter the number and the desktop can show "your number is live".
    publishEvent<NumberProvisioned>(SUBJECTS.numberProvisioned, orgId, e164, { e164, orgId, repId, provider: prov as any, source: "pstn" });
    reply.send({ e164, provider: prov });
  });
  app.get<{ Querystring: { orgId: string } }>("/numbers", async (req) =>
    req.query.orgId ? withOrg(req.query.orgId, (tx) => repo.numbers.listForOrg(tx, req.query.orgId)) : []);

  // ── "Keep your own number" bridge ──────────────────────────────────────────────────────────────
  // ① One-time: prove the rep owns their cell so we can show it as caller ID (60s, no porting).
  app.post<{ Body: { e164: string; provider?: string } }>("/bridge/verify", async (req, reply) => {
    const e164 = (req.body?.e164 ?? "").trim();
    if (!/^\+?[1-9]\d{6,15}$/.test(e164)) return reply.code(400).send({ error: "valid e164 required" });
    reply.send(await startCallerIdVerification(e164, req.body?.provider));
  });
  // ② Per call: ring the rep's OWN phone; on answer it dials the prospect as the rep's number + forks media.
  app.post<{ Body: BridgeStart }>("/bridge/start", async (req, reply) => {
    const b = req.body ?? ({} as BridgeStart);
    if (!b.orgId || !b.repId || !b.repPhone || !b.prospectPhone || !b.repCallerId)
      return reply.code(400).send({ error: "orgId, repId, repPhone, prospectPhone, repCallerId required" });
    const session = openBridgeSession(b);          // warm the copilot before the prospect picks up
    const bs: BridgeStart = { ...b, callId: session.callId };
    pendingBridges.set(session.callId, bs);
    const httpBase = PUBLIC_HTTP ?? `https://${req.headers.host}`;
    const { callSid, provider } = await placeBridge({
      repPhone: b.repPhone, prospectPhone: b.prospectPhone, repCallerId: b.repCallerId,
      bridgeVoiceUrl: `${httpBase}/bridge/voice?callId=${encodeURIComponent(session.callId)}`,
    });
    reply.send({ callId: session.callId, source: "bridge", callSid, provider });
  });
  // ③ Provider fetches this when the rep answers their own phone → dial prospect (as rep) + stream media.
  app.all<{ Querystring: { callId: string } }>("/bridge/voice", async (req, reply) => {
    const b = pendingBridges.get(req.query.callId ?? "");
    if (!b) { reply.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>`); return; }
    pendingBridges.delete(b.callId!);
    reply.type("text/xml").send(bridgeTwiml(b, PUBLIC_WSS ?? `wss://${req.headers.host}`));
  });

  // ── Twilio Voice webhook: a call hit a Parley number → resolve tenant, fork both legs to /media ──
  app.post<{ Body: Record<string, string> }>("/voice", async (req, reply) => {
    const to = req.body?.To ?? "";
    // Pre-auth lookup (no tenant context yet) via the SECURITY DEFINER resolver.
    const owner = await withConn((c) => repo.numbers.resolve(c, to));
    if (!owner) { reply.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>`); return; }
    const host = PUBLIC_WSS ?? `wss://${req.headers.host}`;
    // <Start><Stream> forks media without altering the call; routing (<Dial>) is flow-specific.
    reply.type("text/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${host}/media" track="both_tracks">
      <Parameter name="orgId" value="${owner.org_id}"/>
      <Parameter name="repId" value="${owner.rep_id ?? ""}"/>
      <Parameter name="source" value="${owner.source}"/>
    </Stream>
  </Start>
</Response>`);
  });

  // ── Zoom / Meet: send a listening bot into a live meeting ──────────────────────────────────────
  app.post<{ Body: { orgId: string; repId: string; meeting: string; leadId?: string; source?: "zoom" | "meet" } }>("/zoom/join", async (req, reply) => {
    const b = req.body ?? ({} as any);
    if (!b.orgId || !b.repId || !b.meeting) return reply.code(400).send({ error: "orgId, repId, meeting required" });
    const session = joinMeeting(b);
    reply.send({ callId: session.callId, source: b.source ?? "zoom" });
  });

  // ── Media Streams WSS (Twilio connects here per the TwiML above) ───────────────────────────────
  const wss = new WebSocketServer({ noServer: true });
  await app.listen({ port: Number(process.env.PORT) || 8086, host: "0.0.0.0" });
  app.server.on("upgrade", (req, socket, head) => {
    if (!req.url || !req.url.startsWith("/media")) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => handlePstnMedia(ws));
  });
}
main().catch((e) => { console.error(e); process.exit(1); });
