// Realtime gateway: one WebSocket per active call.
// Receives audio frames + control, fans out to STT, runs the copilot loop,
// streams CopilotCard / transcript / metrics / postcall events back.

import { WebSocketServer, WebSocket } from "ws";
import type { ClientEvent, ServerEvent, LeadContext } from "../shared/types.js";
import { createTranscriber } from "./stt.js";
import { CopilotEngine } from "./copilot.js";

const PORT = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ port: PORT });
console.log(`[gateway] listening on :${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  let engine: CopilotEngine | null = null;

  const emit = (ev: ServerEvent) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(ev));
  };

  // STT yields {speaker, text, isFinal}; feed both into the engine.
  const stt = createTranscriber((t) => {
    emit({ type: "transcript", ...t, ts: Date.now() });
    engine?.onUtterance(t.speaker, t.text, t.isFinal);
  });

  ws.on("message", (raw) => {
    const ev = JSON.parse(raw.toString()) as ClientEvent;
    switch (ev.type) {
      case "start":
        engine = new CopilotEngine(ev.modeId, ev.lead as LeadContext | undefined, emit);
        stt.start();
        break;
      case "audio":
        stt.push(ev.speaker, ev.pcm16);
        break;
      case "manualAsk":
        engine?.manualAsk(ev.text);
        break;
      case "stop":
        stt.stop();
        engine?.finish();
        engine = null;
        break;
    }
  });

  ws.on("close", () => {
    stt.stop();
    engine?.finish();
  });
});
