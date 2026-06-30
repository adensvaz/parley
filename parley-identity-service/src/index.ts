// parley-identity-service — the tenant authority.
// Verifies a Clerk JWT, provisions org/user/membership on first sight, and resolves external Clerk
// ids to INTERNAL uuids that the rest of the platform (and RLS) use. Connects as the privileged
// BYPASSRLS `parley_identity` role, since it creates tenants before any tenant context exists.
import Fastify from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { withConn, repo } from "@parley/db";

const ISSUER = process.env.CLERK_ISSUER;
const jwks = ISSUER ? createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`)) : null;

interface Claims { clerkUserId: string; email: string; clerkOrgId?: string; orgName?: string; orgRole?: string }
export interface Resolved { orgId: string; repId: string; email: string; role: string }

async function extractClaims(token: string): Promise<Claims | null> {
  // DEV ONLY: "dev:<clerkUserId>:<clerkOrgId>" — never honored in production.
  if (process.env.NODE_ENV !== "production" && token.startsWith("dev:")) {
    const [, clerkUserId = "user_dev", clerkOrgId] = token.split(":");
    return { clerkUserId, email: `${clerkUserId}@dev.local`, clerkOrgId: clerkOrgId || undefined, orgRole: "admin" };
  }
  if (!jwks || !ISSUER) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER });
    if (!payload.sub) return null;
    return {
      clerkUserId: payload.sub,
      email: (payload.email as string) ?? `${payload.sub}@unknown`,
      clerkOrgId: payload.org_id as string | undefined,
      orgName: payload.org_name as string | undefined,
      orgRole: payload.org_role as string | undefined,
    };
  } catch { return null; }
}

function mapRole(orgRole: string | undefined, personal: boolean): string {
  if (personal) return "owner";
  if (!orgRole) return "rep";
  if (orgRole.includes("admin")) return "admin";
  if (orgRole.includes("manager")) return "manager";
  return "rep";
}

async function provision(c: Claims): Promise<Resolved> {
  const personal = !c.clerkOrgId;
  const clerkOrgId = c.clerkOrgId ?? `personal:${c.clerkUserId}`; // stable synthetic org for solo users
  const role = mapRole(c.orgRole, personal);
  return withConn(async (conn) => {
    const user = await repo.identity.upsertUser(conn, { clerkId: c.clerkUserId, email: c.email });
    const org = await repo.identity.upsertOrg(conn, { clerkOrgId, name: c.orgName ?? (personal ? "Personal" : "Organization") });
    await repo.identity.upsertMembership(conn, { orgId: org.id, userId: user.id, role });
    return { orgId: org.id, repId: user.id, email: c.email, role };
  });
}

async function main() {
  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true, service: "parley-identity-service" }));

  // The gateway calls this to authenticate a connection and get internal tenant context.
  app.post<{ Body: { token?: string } }>("/verify", async (req, reply) => {
    const claims = await extractClaims(req.body?.token ?? "");
    if (!claims) return reply.code(401).send({ error: "unauthorized" });
    return provision(claims);
  });

  await app.listen({ port: Number(process.env.PORT) || 8081, host: "0.0.0.0" });
}
main().catch((e) => { console.error(e); process.exit(1); });
