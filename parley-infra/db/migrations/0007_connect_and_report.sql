-- 0007_connect_and_report.sql
-- Two capabilities:
--   (A) Call-connection ingestion — a `source` on every call (desktop | pstn | sip | zoom | meet)
--       and a Parley virtual-number → org/rep mapping for the PSTN/SIP path.
--   (B) Post-call report — extends the per-call scorecard with a stage breakdown, the one fix,
--       and transcript-anchored moments (kept jsonb, backward-compatible with 0005 columns).

BEGIN;

-- ── (A1) where the call came from ───────────────────────────────────────────────
ALTER TABLE calls ADD COLUMN source text NOT NULL DEFAULT 'desktop';  -- desktop | pstn | sip | zoom | meet
CREATE INDEX calls_source_idx ON calls (org_id, source, started_at DESC);

-- ── (A2) Parley virtual numbers → org/rep (owned by telephony-service) ───────────
CREATE TABLE org_numbers (
  e164       text PRIMARY KEY,                 -- the provisioned number, E.164 (e.g. +14155551234)
  org_id     uuid NOT NULL,
  rep_id     uuid,                             -- optional: a number dedicated to a single rep
  provider   text NOT NULL DEFAULT 'twilio',   -- twilio | telnyx
  source     text NOT NULL DEFAULT 'pstn',     -- pstn | sip
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX org_numbers_org_idx ON org_numbers (org_id) WHERE active;
-- RLS isolates every tenant-scoped read/write (provision, listForOrg run under withOrg as parley_app).
-- NOTE: ENABLE but *not* FORCE — the SECURITY DEFINER resolver below runs as the table owner before
-- any tenant context exists, and needs to bypass the policy for the single number→org probe.
ALTER TABLE org_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_numbers_isolation ON org_numbers
  USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());

-- Inbound resolution: a call to a Parley number arrives with NO tenant context, so the
-- number→org lookup must run *before* app.current_org is set. SECURITY DEFINER scopes that to a
-- single safe, read-only probe by the exact key — never a table scan, never a data leak path.
CREATE OR REPLACE FUNCTION telephony_resolve(p_e164 text)
RETURNS TABLE(org_id uuid, rep_id uuid, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.org_id, n.rep_id, n.source FROM org_numbers n WHERE n.e164 = p_e164 AND n.active LIMIT 1;
$$;

-- ── (B) rich post-call report on the existing scorecard row ──────────────────────
ALTER TABLE scorecards ADD COLUMN stages  jsonb NOT NULL DEFAULT '[]'::jsonb;  -- StageGrade[]  (opener/discovery/objection/close)
ALTER TABLE scorecards ADD COLUMN fix     jsonb;                               -- { title, detail, playbook }
ALTER TABLE scorecards ADD COLUMN moments jsonb NOT NULL DEFAULT '[]'::jsonb;  -- ReportMoment[] (transcript anchors)

GRANT SELECT, INSERT, UPDATE, DELETE ON org_numbers TO parley_app;
GRANT EXECUTE ON FUNCTION telephony_resolve(text) TO parley_app;

COMMIT;
