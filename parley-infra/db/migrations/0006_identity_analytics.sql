-- 0006 — identity provisioning (Clerk→internal uuid) + analytics dashboard plumbing.

BEGIN;

-- ── Identity: map external Clerk org ids to internal organizations ──────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS clerk_org_id text UNIQUE;

-- A privileged provisioning role. Identity is the tenant authority: it creates orgs/users
-- BEFORE any tenant context exists, so it bypasses RLS (and ONLY identity does).
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'parley_identity')
    THEN CREATE ROLE parley_identity NOLOGIN BYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO parley_identity;
GRANT SELECT, INSERT, UPDATE ON organizations, users, memberships TO parley_identity;

-- ── Analytics: let the app role read + refresh the dashboard materialized view ──
GRANT SELECT ON rep_daily_stats TO parley_app;

-- Refresh needs MV ownership, so wrap it in a SECURITY DEFINER function (owned by the migrator).
CREATE OR REPLACE FUNCTION refresh_rep_daily_stats() RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = public
  AS $$ REFRESH MATERIALIZED VIEW CONCURRENTLY rep_daily_stats $$;
REVOKE ALL ON FUNCTION refresh_rep_daily_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_rep_daily_stats() TO parley_app;

-- Populate once (non-concurrent) so later CONCURRENTLY refreshes are valid.
REFRESH MATERIALIZED VIEW rep_daily_stats;

COMMIT;
