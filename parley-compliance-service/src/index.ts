// parley-compliance-service — TCPA guardrails.
// Owns the per-tenant Do-Not-Call list. The dialer/gateway calls /dnc/check BEFORE connecting a
// call; if a prospect asks to be removed mid-call, the copilot emits compliance.dnc_requested and
// this service appends to the list. All access is tenant-scoped via @parley/db (RLS).
import Fastify from "fastify";
import { connect, JSONCodec, type NatsConnection } from "nats";
import { SUBJECTS } from "@parley/contracts";
import { withOrg, repo } from "@parley/db";
import { precallCheck } from "./guard.js";

const jc = JSONCodec();

// NOTE: in production orgId is derived from the verified service/JWT context, never trusted from the
// request body. Kept in the body here for a transport-agnostic internal API.
interface DncBody { orgId: string; phoneHash: string }

async function main() {
  const nc: NatsConnection = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });

  // Mid-call DNC requests → append to the list (idempotent).
  (async () => {
    for await (const m of nc.subscribe(SUBJECTS.dncRequested, { queue: "compliance" })) {
      const e = jc.decode(m.data) as { orgId: string; data: { phoneHash: string } };
      try { await withOrg(e.orgId, (tx) => repo.dnc.add(tx, e.orgId, e.data.phoneHash)); } catch (err) { console.error("[dnc.add]", err); }
    }
  })();

  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-compliance-service" }));

  // Block check before a dial. Returns { blocked, reason }.
  app.post<{ Body: DncBody }>("/dnc/check", async (req) => {
    const { orgId, phoneHash } = req.body;
    if (!orgId || !phoneHash) return { blocked: true, reason: "missing org/phone" }; // fail-closed
    const blocked = await withOrg(orgId, (tx) => repo.dnc.isListed(tx, orgId, phoneHash));
    return { blocked, reason: blocked ? "on do-not-call list" : undefined };
  });

  // Admin/add (also reachable via the dncRequested event).
  app.post<{ Body: DncBody }>("/dnc/add", async (req) => {
    const { orgId, phoneHash } = req.body;
    await withOrg(orgId, (tx) => repo.dnc.add(tx, orgId, phoneHash));
    return { ok: true };
  });

  // The full pre-dial gate: DNC + recording-consent + calling-window in ONE call. The dialer/gateway
  // hits this before connecting; the copilot surfaces `warnings` (and consentLine) on the overlay.
  app.post<{ Body: { orgId: string; phoneHash: string; areaCode: string; nowUtcMs?: number } }>("/precall", async (req) => {
    const { orgId, phoneHash, areaCode } = req.body ?? ({} as any);
    if (!orgId || !phoneHash || !areaCode) return { allow: false, warnings: ["missing org/phone/areaCode"] }; // fail-closed
    const dnc = await withOrg(orgId, (tx) => repo.dnc.isListed(tx, orgId, phoneHash));
    return precallCheck({ areaCode, dnc, nowUtcMs: req.body.nowUtcMs ?? Date.now() });
  });

  await app.listen({ port: Number(process.env.PORT) || 8083, host: "0.0.0.0" });
}
main().catch((e) => { console.error(e); process.exit(1); });
