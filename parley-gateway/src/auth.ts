// Edge authentication. Verifies a Clerk-issued JWT against the project's JWKS and resolves
// tenant context (org + rep) used for RLS downstream. A local dev escape hatch is gated to non-prod.
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface AuthContext { orgId: string; repId: string }

const ISSUER = process.env.CLERK_ISSUER; // e.g. https://your-app.clerk.accounts.dev
const jwks = ISSUER ? createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`)) : null;

export async function authenticate(token?: string): Promise<AuthContext | null> {
  if (!token) return null;

  // DEV ONLY: "dev:<orgId>:<repId>" — never honored in production.
  if (process.env.NODE_ENV !== "production" && token.startsWith("dev:")) {
    const [, orgId = "org_dev", repId = "rep_dev"] = token.split(":");
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
