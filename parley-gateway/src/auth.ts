// Edge authentication. Verifies a Clerk-issued JWT against the project's JWKS and resolves
// tenant context (org + rep) used for RLS downstream. A local dev escape hatch is gated to non-prod.
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface AuthContext { orgId: string; repId: string }

const ISSUER = process.env.CLERK_ISSUER; // e.g. https://your-app.clerk.accounts.dev
const jwks = ISSUER ? createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`)) : null;
const IDENTITY_URL = process.env.IDENTITY_URL; // when set, identity-service is the source of truth

export async function authenticate(token?: string): Promise<AuthContext | null> {
  if (!token) return null;

  // Preferred path: delegate to identity-service, which verifies the JWT AND resolves the
  // external Clerk ids to INTERNAL uuids (what RLS + persistence expect).
  if (IDENTITY_URL) {
    try {
      const r = await fetch(`${IDENTITY_URL}/verify`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
      });
      if (!r.ok) return null;
      const j = (await r.json()) as { orgId: string; repId: string };
      return { orgId: j.orgId, repId: j.repId };
    } catch { return null; }
  }

  // DEV ONLY: "dev:<orgUuid>:<repUuid>" — never honored in production. Defaults are valid UUIDs
  // so downstream persistence (uuid columns) works without a real identity provider.
  if (process.env.NODE_ENV !== "production" && token.startsWith("dev:")) {
    const [, orgId = "00000000-0000-0000-0000-0000000000a1", repId = "00000000-0000-0000-0000-0000000000b1"] = token.split(":");
    return { orgId, repId };
  }

  if (!jwks || !ISSUER) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER });
    const orgId = (payload.org_id ?? payload.org) as string | undefined;
    const repId = payload.sub;
    if (!orgId || !repId) return null;
    return { orgId, repId };
  } catch {
    return null; // invalid signature / expired / wrong issuer
  }
}
