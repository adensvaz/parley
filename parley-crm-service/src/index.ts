// parley-crm-service — leads with PII encrypted at rest.
// POST /leads stores a lead (name/phone encrypted via pii_encrypt); GET /lead?phone returns the
// decrypted "who am I calling" context for the desktop on call start. Tenant-scoped (RLS) and the
// phone is matched by HMAC fingerprint so the plaintext number is never used as a lookup key.
import Fastify from "fastify";
import { createHmac } from "node:crypto";
import { withOrg, repo } from "@parley/db";

const HASH_KEY = process.env.PHONE_HASH_KEY ?? "dev-hash-key";
const fingerprint = (e164: string) => createHmac("sha256", HASH_KEY).update(e164.trim()).digest("hex");

async function main() {
  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-crm-service" }));

  app.post<{ Body: { orgId: string; name: string; phone: string; leadType?: string; address?: string } }>(
    "/leads",
    async (req, reply) => {
      const { orgId, name, phone, leadType, address } = req.body ?? ({} as any);
      if (!orgId || !phone) return reply.code(400).send({ error: "orgId + phone required" });
      const row = await withOrg(orgId, (tx) =>
        repo.leads.create(tx, { orgId, name: name ?? "", phone, phoneHash: fingerprint(phone), leadType, address }));
      return { id: row.id };
    },
  );

  // Call context: look up by phone number (hashed) → decrypted lead.
  app.get<{ Querystring: { orgId: string; phone: string } }>("/lead", async (req, reply) => {
    const { orgId, phone } = req.query;
    if (!orgId || !phone) return reply.code(400).send({ error: "orgId + phone required" });
    const lead = await withOrg(orgId, (tx) => repo.leads.getByPhoneHash(tx, fingerprint(phone)));
    if (!lead) return reply.code(404).send({ error: "not found" });
    return lead;
  });

  await app.listen({ port: Number(process.env.PORT) || 8082, host: "0.0.0.0" });
}
main().catch((e) => { console.error(e); process.exit(1); });
