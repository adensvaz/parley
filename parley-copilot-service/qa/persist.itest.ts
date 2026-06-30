// Full-stack proof: drive a call over NATS and assert the copilot-service PERSISTED the
// call + event rows into Postgres, tenant-scoped. Requires NATS + a migrated PG + the service running.
import { connect, JSONCodec } from "nats";
import { SUBJECTS, type Envelope } from "@parley/contracts";
import { withOrg, close } from "@parley/db";

const jc = JSONCodec();
const ORG = "00000000-0000-0000-0000-0000000000c1";
const REP = "00000000-0000-0000-0000-0000000000b1";
const CALL = "00000000-0000-0000-0000-0000000000d1";
const env = (subject: any, data: any): Envelope<any> =>
  ({ id: Math.random().toString(36).slice(2), subject, orgId: ORG, traceId: "t1", occurredAt: new Date().toISOString(), data });

async function main() {
  const nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
  nc.publish(SUBJECTS.callStarted, jc.encode(env(SUBJECTS.callStarted, { callId: CALL, repId: REP, modeId: "expired" })));
  await new Promise((r) => setTimeout(r, 400));
  nc.publish(SUBJECTS.callTranscript, jc.encode(env(SUBJECTS.callTranscript, { callId: CALL, speaker: "prospect", text: "honestly i'm not interested", isFinal: true })));
  await new Promise((r) => setTimeout(r, 400));
  nc.publish(SUBJECTS.callEnded, jc.encode(env(SUBJECTS.callEnded, { callId: CALL, disposition: "Not interested", talkRatioRep: 0.2, appointmentSet: false })));
  await new Promise((r) => setTimeout(r, 800)); // let async persistence flush
  await nc.drain();

  // Read back through RLS as the ORG tenant.
  const got = await withOrg(ORG, async (tx) => {
    const calls = await tx.query("SELECT count(*)::int c, max(disposition) d, bool_or(status='completed') done FROM calls WHERE id=$1", [CALL]);
    const events = await tx.query("SELECT count(*)::int c FROM call_events WHERE call_id=$1", [CALL]);
    const tr = await tx.query("SELECT count(*)::int c FROM transcript_segments WHERE call_id=$1", [CALL]);
    return { calls: calls.rows[0], events: events.rows[0].c, transcripts: tr.rows[0].c };
  });
  // A different tenant must see none of it.
  const otherSees = await withOrg("00000000-0000-0000-0000-0000000000ff", (tx) =>
    tx.query("SELECT count(*)::int c FROM calls WHERE id=$1", [CALL]).then((r) => r.rows[0].c));
  await close();

  let ok = true;
  const check = (n: string, c: boolean) => { ok = ok && c; console.log(`  ${c ? "✅" : "❌"} ${n}`); };
  check("call row persisted", got.calls.c === 1);
  check("call marked completed + disposition saved", got.calls.done === true && got.calls.d === "Not interested");
  check("objection event persisted", got.events >= 1);
  check("final transcript persisted", got.transcripts >= 1);
  check("other tenant sees NONE of it (RLS)", otherSees === 0);
  console.log(`\n══ PERSISTENCE: ${ok ? "PASS" : "FAIL"} ══`);
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
