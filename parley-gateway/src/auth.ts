// Edge authentication. Verifies a Clerk-issued JWT against the project's JWKS and resolves
// tenant context (org + rep) used for RLS downstream. A local dev escape hatch is gated to non-prod.
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface AuthContext { orgId: string; repId: string }

const ISSUER = process.env.CLERK_ISSUER; // e.g. https://your-app.clerk.accounts.dev
const jwks = ISSUER ? createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`)) : null;

export async function authenticate(token?: string): Promise<AuthContext | null> {
  if (!token) return null;

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
