// End-to-end integration test: proves the real-time loop over a LIVE NATS bus.
// Publishes call.started + a transcript that contains an objection, asserts the service
// publishes the matching card back. Requires NATS running (NATS_URL).
import { connect, JSONCodec } from "nats";
import { SUBJECTS, type Envelope, type CallCard } from "@parley/contracts";

const jc = JSONCodec();
const NATS = process.env.NATS_URL || "nats://localhost:4222";

function env<T>(subject: any, data: T, orgId = "org_test"): Envelope<T> {
  return { id: Math.random().toString(36).slice(2), subject, orgId, traceId: "t1", occurredAt: new Date().toISOString(), data };
}

async function main() {
  const nc = await connect({ servers: NATS });
  const callId = "call_" + Math.random().toString(36).slice(2);

  // Listen for cards BEFORE we publish.
  const cardSub = nc.subscribe(SUBJECTS.callCard);
  const objSub = nc.subscribe(SUBJECTS.objectionFired);

  const gotObjectionCard = (async () => {
    for await (const m of cardSub) {
      const e = jc.decode(m.data) as Envelope<CallCard>;
      if (e.data.callId === callId && e.data.kind === "objection") return e.data;
    }
  })();

  // Drive the call.
  nc.publish(SUBJECTS.callStarted, jc.encode(env(SUBJECTS.callStarted, { callId, repId: "rep1", modeId: "expired" })));
  await new Promise((r) => setTimeout(r, 300)); // let the engine spin up
  nc.publish(SUBJECTS.callTranscript, jc.encode(env(SUBJECTS.callTranscript, { callId, speaker: "prospect", text: "honestly, i'm not interested", isFinal: true })));

  const card = await Promise.race([
    gotObjectionCard,
    new Promise<undefined>((r) => setTimeout(() => r(undefined), 5000)),
  ]);

  if (card && card.kind === "objection") {
    console.log(`  ✅ end-to-end: transcript → objection card`);
    console.log(`     title: ${card.title}`);
    console.log(`     body : ${card.body.slice(0, 70)}…`);
    await nc.drain();
    console.log("\n══ INTEGRATION: PASS ══");
    process.exit(0);
  } else {
    console.log("  ❌ no objection card received within 5s (is copilot-service running + connected to NATS?)");
    await nc.drain();
    console.log("\n══ INTEGRATION: FAIL ══");
    process.exit(1);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
