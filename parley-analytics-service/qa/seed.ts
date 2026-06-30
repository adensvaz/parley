// Publishes a couple of call.ended events to exercise the analytics pipeline.
import { connect, JSONCodec } from "nats";
import { SUBJECTS } from "@parley/contracts";

const jc = JSONCodec();
const ORG = "00000000-0000-0000-0000-0000000000c1";
const REP = "00000000-0000-0000-0000-0000000000e1";
const ev = (callId: string, appt: boolean, tr: number) => ({
  id: Math.random().toString(36).slice(2), subject: SUBJECTS.callEnded, orgId: ORG, traceId: "t",
  occurredAt: new Date().toISOString(), data: { callId, repId: REP, disposition: "done", talkRatioRep: tr, appointmentSet: appt },
});

const nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
nc.publish(SUBJECTS.callEnded, jc.encode(ev("00000000-0000-0000-0000-0000000000f1", true, 0.5)));  // score 95
nc.publish(SUBJECTS.callEnded, jc.encode(ev("00000000-0000-0000-0000-0000000000f2", false, 0.8))); // score 40
await nc.drain();
console.log("seeded 2 call.ended events for rep", REP);
