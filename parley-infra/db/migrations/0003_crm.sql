-- 0003_crm.sql — leads. Owned by crm-service. PII (name/phone) encrypted at rest.

BEGIN;

CREATE TABLE leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  name_enc        bytea,                       -- PII, pgp_sym_encrypt
  phone_enc       bytea,                       -- PII, pgp_sym_encrypt
  phone_hash      text NOT NULL,               -- HMAC(E.164) for dedupe + DNC join (no plaintext)
  lead_type       text,                        -- 'expired' | 'fsbo' | 'buyer' | ...
  address         text,
  est_value       numeric(12,2),
  status          text NOT NULL DEFAULT 'new', -- new | working | contacted | won | dead
  source          text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  last_contact_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Access-pattern-driven indexes:
CREATE INDEX        leads_org_created_idx ON leads (org_id, created_at DESC);          -- list newest leads
CREATE UNIQUE INDEX leads_org_phone_uq    ON leads (org_id, phone_hash);               -- per-tenant dedupe + O(log n) DNC join
CREATE INDEX        leads_worklist_idx    ON leads (org_id, last_contact_at)
                      WHERE status IN ('new', 'working');                              -- partial: the hot "who to call next" queue
CREATE INDEX        leads_meta_gin        ON leads USING gin (metadata jsonb_path_ops); -- ad-hoc jsonb filters

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY; ALTER TABLE leads FORCE ROW LEVEL SECURITY;
CREATE POLICY leads_isolation ON leads USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());

GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO parley_app;
GRANT SELECT ON leads TO parley_readonly;

COMMIT;
