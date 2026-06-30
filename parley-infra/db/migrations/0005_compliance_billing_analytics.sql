-- 0005 — compliance (DNC/consent), billing (plans/subs/usage), analytics (scorecards + MV).

BEGIN;

-- ── Compliance ─────────────────────────────────────────────────────────────────
CREATE TABLE dnc_entries (
  org_id     uuid NOT NULL,
  phone_hash text NOT NULL,                 -- HMAC(E.164); never store the plaintext number
  scope      text NOT NULL DEFAULT 'org',   -- org | state | federal
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, phone_hash)          -- DNC check = single index probe, O(log n)
);
ALTER TABLE dnc_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE dnc_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY dnc_isolation ON dnc_entries USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());

CREATE TABLE consent_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  lead_phone_hash text NOT NULL,
  channel         text NOT NULL,            -- call | sms | email
  disclosed       boolean NOT NULL,
  at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_org_phone_idx ON consent_records (org_id, lead_phone_hash, at DESC);
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY; ALTER TABLE consent_records FORCE ROW LEVEL SECURITY;
CREATE POLICY consent_isolation ON consent_records USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());

-- ── Billing ────────────────────────────────────────────────────────────────────
CREATE TABLE plans (                         -- global catalog, no tenant data → no RLS
  id                 text PRIMARY KEY,        -- 'trial' | 'pro' | 'team'
  name               text NOT NULL,
  monthly_call_quota int,                     -- NULL = unlimited
  price_cents        int NOT NULL
);
INSERT INTO plans (id, name, monthly_call_quota, price_cents) VALUES
  ('trial','Trial',100,0), ('pro','Pro',NULL,9900), ('team','Team',NULL,29900);

CREATE TABLE subscriptions (
  org_id                 uuid PRIMARY KEY,
  plan_id                text NOT NULL REFERENCES plans(id),
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text NOT NULL DEFAULT 'trialing',
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY; ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY subs_isolation ON subscriptions USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());

CREATE TABLE usage_events (                   -- metered for billing; partitioned for volume
  id         bigint GENERATED ALWAYS AS IDENTITY,
  org_id     uuid NOT NULL,
  metric     text NOT NULL,                   -- call | minute
  qty        int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE INDEX usage_org_metric_idx ON usage_events (org_id, metric, created_at);
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY; ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;
CREATE POLICY usage_isolation ON usage_events USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());
CREATE TABLE usage_events_2026_06 PARTITION OF usage_events FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE usage_events_default PARTITION OF usage_events DEFAULT;

-- ── Analytics ──────────────────────────────────────────────────────────────────
CREATE TABLE scorecards (
  call_id           uuid PRIMARY KEY,
  org_id            uuid NOT NULL,
  rep_id            uuid NOT NULL,
  score             int,
  talk_ratio        real,
  objections_handled int,
  appointment_set   boolean,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scorecards_rep_idx ON scorecards (org_id, rep_id, created_at DESC);
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY; ALTER TABLE scorecards FORCE ROW LEVEL SECURITY;
CREATE POLICY scorecards_isolation ON scorecards USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());

-- Pre-aggregated dashboard (heavy GROUP BY computed once, not per page load).
CREATE MATERIALIZED VIEW rep_daily_stats AS
  SELECT org_id, rep_id, date_trunc('day', created_at) AS day,
         count(*) AS calls, avg(score)::numeric(5,2) AS avg_score,
         count(*) FILTER (WHERE appointment_set) AS appts
  FROM scorecards GROUP BY org_id, rep_id, date_trunc('day', created_at)
  WITH NO DATA;
CREATE UNIQUE INDEX rep_daily_uq ON rep_daily_stats (org_id, rep_id, day);  -- enables REFRESH ... CONCURRENTLY

CREATE OR REPLACE FUNCTION refresh_rep_daily_stats() RETURNS void
  LANGUAGE sql AS $$ REFRESH MATERIALIZED VIEW CONCURRENTLY rep_daily_stats $$;

GRANT SELECT ON plans TO parley_app, parley_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON dnc_entries, consent_records, subscriptions, usage_events, scorecards TO parley_app;
GRANT SELECT ON dnc_entries, consent_records, subscriptions, usage_events, scorecards, rep_daily_stats TO parley_readonly;

COMMIT;
