// Desktop ↔ backend seam proof. Speaks the REAL desktop wire protocol (the same messages
// src/audioEngine.ts sends) against the live gateway, and asserts the full loop works:
// auth (identity) → lead context (crm) → injected transcript → copilot → objection card back.
// Uses Node 22 globals (WebSocket, fetch) — no imports needed.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TOKEN = "dev:user_seam:org_seam";
const PHONE = "+15559990001";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, e = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${e ? ` — ${e}` : ""}`); };
const post = (u: string, body: unknown) => fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

async function main() {
  // Resolve the internal org (identity) and seed a lead (crm) so the gateway can return context.
  const id: any = await post("http://localhost:8081/verify", { token: TOKEN });
  await post("http://localhost:8082/leads", { orgId: id.orgId, name: "Seam Lead", phone: PHONE, leadType: "expired" });

  // Connect exactly as the desktop does.
  const ws: any = new WebSocket(`ws://localhost:8080/rt?token=${encodeURIComponent(TOKEN)}`);
  let lead: any = null, card: any = null, transcript: any = null;
  ws.onmessage = (e: any) => {
    const m = JSON.parse(e.data);
    if (m.type === "lead") lead = m;
    if (m.type === "transcript") transcript = m;
    if (m.type === "card" && m.kind === "objection") card = m;
  };
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error("gateway unreachable")); });

  ws.send(JSON.stringify({ type: "start", modeId: "expired", phone: PHONE }));
  await sleep(700);
  check("gateway authorizes + returns lead context", lead?.name === "Seam Lead", lead?.name);

  ws.send(JSON.stringify({ type: "transcript", speaker: "prospect", text: "honestly i'm not interested", isFinal: true }));
  await sleep(1500);
  check("transcript echoed back to desktop", transcript?.text?.includes("not interested"));
  check("copilot objection card returns through the gateway", card?.kind === "objection", card?.title);

  ws.send(JSON.stringify({ type: "stop" }));
  ws.close();
  console.log(`\n══ SEAM: ${pass} passed, ${fail} failed ══`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
