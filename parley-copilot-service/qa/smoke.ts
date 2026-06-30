// Full-platform smoke test: exercises identity → billing → crm → (gateway-style bus events) →
// copilot → analytics, all running together. Asserts the whole system cooperates on one call.
import { connect, JSONCodec } from "nats";
import { randomUUID } from "node:crypto";
import { SUBJECTS } from "@parley/contracts";

const jc = JSONCodec();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const url = (port: number, path: string) => `http://localhost:${port}${path}`;
async function j(u: string, opts?: any) { const r = await fetch(u, opts); return r.status === 404 ? { __404: true } : r.json().catch(() => ({})); }
const post = (u: string, body: any) => j(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };

async function main() {
  // 1) identity: provision + resolve to internal uuids
  const id = await post(url(8081, "/verify"), { token: "dev:user_smoke:org_smoke" });
  check("identity provisions org/rep", !!id.orgId && !!id.repId, `org=${id.orgId?.slice(0, 8)}`);
  const { orgId, repId } = id;

  // 2) billing: org is entitled to call
  const ent = await j(url(8084, `/entitlements?orgId=${orgId}`));
  check("billing reports entitlement", ent.allowed === true, `plan=${ent.plan} used=${ent.used}`);

  // 3) crm: store + retrieve encrypted lead context
  await post(url(8082, "/leads"), { orgId, name: "Smoke Lead", phone: "+15550000001", leadType: "expired" });
  const lead = await j(url(8082, `/lead?orgId=${orgId}&phone=%2B15550000001`));
  check("crm returns decrypted lead context", lead.name === "Smoke Lead");

  // 4) the live call loop over NATS (simulating the gateway's STT output)
  const nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });
  const callId = randomUUID();
  const env = (s: any, d: any) => ({ id: randomUUID(), subject: s, orgId, traceId: "t", occurredAt: new Date().toISOString(), data: d });
  const cardP = (async () => {
    for await (const m of nc.subscribe(SUBJECTS.callCard)) {
      const e: any = jc.decode(m.data);
      if (e.data.callId === callId && e.data.kind === "objection") return e.data;
    }
  })();

  nc.publish(SUBJECTS.callStarted, jc.encode(env(SUBJECTS.callStarted, { callId, repId, modeId: "expired" })));
  await sleep(400);
  nc.publish(SUBJECTS.callTranscript, jc.encode(env(SUBJECTS.callTranscript, { callId, speaker: "prospect", text: "honestly i'm not interested", isFinal: true })));
  const card: any = await Promise.race([cardP, sleep(5000).then(() => null)]);
  check("copilot returns an objection card", card?.kind === "objection", card?.title);
  await sleep(300);
  nc.publish(SUBJECTS.callEnded, jc.encode(env(SUBJECTS.callEnded, { callId, repId, disposition: "Appointment set", talkRatioRep: 0.5, appointmentSet: true })));
  await sleep(2500); // billing meter + analytics scorecard + MV refresh
  await nc.drain();

  // 5) billing metered the call; analytics scored it
  const ent2 = await j(url(8084, `/entitlements?orgId=${orgId}`));
  check("billing metered the call", ent2.used >= 1, `used=${ent2.used}`);
  const stats = await j(url(8085, `/api/stats?orgId=${orgId}`));
  check("analytics dashboard reflects the call", Array.isArray(stats) && stats.length >= 1 && Number(stats[0].calls) >= 1, JSON.stringify(stats[0] ?? {}));

  // 6) gateway integration: real WS connect → identity auth + billing gate + crm lead context
  const ws: any = new WebSocket("ws://localhost:8080/rt?token=dev:user_smoke:org_smoke");
  const gwMsg = new Promise<any>((res) => { ws.onmessage = (ev: any) => { const m = JSON.parse(ev.data); if (m.type === "lead" || m.type === "blocked") res(m); }; });
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error("ws connect failed")); });
  ws.send(JSON.stringify({ type: "start", modeId: "expired", phone: "+15550000001" }));
  const gw: any = await Promise.race([gwMsg, sleep(3000).then(() => null)]);
  check("gateway authorizes (identity) + returns lead context (crm)", gw?.type === "lead" && gw.name === "Smoke Lead", gw?.type);
  ws.close();

  console.log(`\n══ SMOKE: ${pass} passed, ${fail} failed ══`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
