-- 0002_identity.sql — organizations, users, RBAC memberships. Owned by identity-service.

BEGIN;

CREATE TABLE organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id   text   UNIQUE NOT NULL,         -- external identity (Clerk)
  email      citext UNIQUE NOT NULL,
  name       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE org_role AS ENUM ('owner', 'admin', 'manager', 'rep');

CREATE TABLE memberships (
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       org_role NOT NULL DEFAULT 'rep',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);  -- "what orgs am I in?"

CREATE TRIGGER trg_org_updated  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_updated BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS: tenant isolation ──────────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY; ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships   ENABLE ROW LEVEL SECURITY; ALTER TABLE memberships   FORCE ROW LEVEL SECURITY;
-- users is global identity; exposure is mediated by memberships at the service layer.

CREATE POLICY org_isolation        ON organizations USING (id = app_current_org());
CREATE POLICY membership_isolation ON memberships   USING (org_id = app_current_org());

GRANT SELECT, INSERT, UPDATE, DELETE ON organizations, users, memberships TO parley_app;
GRANT SELECT ON organizations, users, memberships TO parley_readonly;

COMMIT;
