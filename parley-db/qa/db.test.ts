// Proves the persistence layer enforces tenant isolation through RLS — connecting as the real
// non-superuser parley_app role. Requires DATABASE_URL pointing at a migrated DB.
import { withOrg, repo, close } from "../src/index.js";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const REP = "33333333-3333-3333-3333-333333333333";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, d = "") => c ? (pass++, console.log(`  ✅ ${n}`)) : (fail++, console.log(`  ❌ ${n}${d ? ` — ${d}` : ""}`));

async function main() {
  // Tenant A writes a full call (call + transcript + event) in one isolated transaction.
  const callId = await withOrg(A, async (tx) => {
    const c = await repo.calls.create(tx, { orgId: A, repId: REP, modeId: "expired" });
    await repo.transcript.add(tx, { orgId: A, callId: c.id, speaker: "prospect", content: "not interested", isFinal: true });
    await repo.events.add(tx, { orgId: A, callId: c.id, kind: "objection", payload: { label: "Not interested" } });
    return c.id;
  });
  check("tenant A wrote a call", !!callId);

  const aCount = await withOrg(A, (tx) => repo.calls.count(tx));
  const bCount = await withOrg(B, (tx) => repo.calls.count(tx));
  check("tenant A sees its own call (>=1)", aCount >= 1, `got ${aCount}`);
  check("tenant B sees ZERO of A's calls (RLS)", bCount === 0, `got ${bCount}`);

  // Cross-tenant write must be rejected by RLS WITH CHECK.
  let blocked = false;
  try {
    await withOrg(A, (tx) => repo.calls.create(tx, { orgId: B, repId: REP, modeId: "expired" }));
  } catch { blocked = true; }
  check("cross-tenant write blocked by RLS WITH CHECK", blocked);

  await close();
  console.log(`\n══ DB: ${pass} passed, ${fail} failed ══`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
