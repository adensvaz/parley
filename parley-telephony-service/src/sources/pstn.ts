// PSTN / SIP source — a Twilio Media Streams WebSocket. Twilio bridges the call to us and streams
// both legs as 8 kHz μ-law: track "inbound" = the prospect (the PSTN caller), "outbound" = the rep.
// That gives us free diarization, exactly like the desktop's tagged rep/prospect channels.
//
// Wiring: the voice webhook (see index.ts) returns TwiML that opens <Connect><Stream> back to this
// WSS with the resolved orgId/repId as <Parameter>s, so by the time media arrives the tenant is known.
import type { WebSocket } from "ws";
import { openSession } from "../session.js";

const TRACK: Record<string, "rep" | "prospect"> = { outbound: "rep", inbound: "prospect" };

export function handlePstnMedia(ws: WebSocket) {
  let session: ReturnType<typeof openSession> | null = null;

  ws.on("message", (raw) => {
    let m: any; try { m = JSON.parse(raw.toString()); } catch { return; }
    switch (m.event) {
      case "start": {
        const p = m.start?.customParameters ?? {};
        if (!p.orgId || !p.repId) { ws.close(1008, "missing tenant params"); return; }
        session = openSession({
          orgId: p.orgId, repId: p.repId, leadId: p.leadId, callId: p.callId, source: (p.source as any) || "pstn",
          stt: { encoding: "mulaw", sampleRate: 8000 },
        });
        break;
      }
      case "media": {
        const speaker = TRACK[m.media?.track] ?? "prospect";
        if (session && m.media?.payload) session.onAudio(speaker, m.media.payload); // base64 μ-law → STT
        break;
      }
      case "stop":
        session?.end();
        break;
    }
  });

  ws.on("close", () => session?.end());
}
