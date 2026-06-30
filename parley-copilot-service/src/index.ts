// parley-copilot-service — stateless workers. Consume the live transcript, run the proven copilot
// engine (objection match + stage machine + coaching + LLM advisor), publish cards back to the bus.
// The engine validated in parley-desktop (server/copilot.ts, 116 passing tests) MOVES here as src/engine.ts.
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS, type Envelope, type CallTranscript, type CallCard } from "@parley/contracts";
// import { CopilotEngine } from "./engine.js"; // relocated from parley-desktop/server/copilot.ts

const jc = JSONCodec();
const engines = new Map<string, any /* CopilotEngine */>();

async function main() {
  const nc: NatsConnection = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });

  // Durable queue group → horizontal scaling: add replicas, NATS load-balances transcript work.
  const sub = nc.subscribe(SUBJECTS.callTranscript, { queue: "copilot" });
  for await (const m of sub) {
    const e = jc.decode(m.data) as Envelope<CallTranscript>;
    const { callId, speaker, text, isFinal } = e.data;

    // One engine instance per active call; emit() publishes cards back onto the bus.
    let eng = engines.get(callId);
    if (!eng) {
      const emit = (card: CallCard) =>
        nc.publish(SUBJECTS.callCard, jc.encode(<Envelope<CallCard>>{
          id: `${callId}-${Date.now()}`, subject: SUBJECTS.callCard, orgId: e.orgId,
          traceId: e.traceId, occurredAt: new Date().toISOString(), data: { ...card, callId },
        }));
      // eng = new CopilotEngine(modeId, undefined, emit);  // wired once engine.ts lands
      eng = { onUtterance: (_s: string, _t: string, _f: boolean) => emit({ callId, kind: "coach", title: "stub", body: "engine.ts pending", urgency: "fyi" }) };
      engines.set(callId, eng);
    }
    eng.onUtterance(speaker, text, isFinal);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
