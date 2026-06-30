import { connect, JSONCodec } from "nats";
import { randomUUID } from "node:crypto";
import { SUBJECTS } from "@parley/contracts";
const org = process.argv[2];
const jc = JSONCodec();
const nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
nc.publish(SUBJECTS.callStarted, jc.encode({ id: randomUUID(), subject: SUBJECTS.callStarted, orgId: org, traceId: "t", occurredAt: new Date().toISOString(), data: { callId: randomUUID(), repId: "00000000-0000-0000-0000-0000000000b1", modeId: "expired" } }));
await nc.drain();
console.log("published call.started for", org);
