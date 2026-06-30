-- 0004_calls.sql — calls + high-volume event/transcript streams. Owned by gateway/copilot.
-- call_events & transcript_segments are RANGE-partitioned by time: cheap retention (drop old
-- partitions), fast time-bounded scans, and indexes that stay small per partition.

BEGIN;

CREATE TABLE calls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  rep_id          uuid NOT NULL,
  lead_id         uuid,
  mode_id         text NOT NULL,
  status          text NOT NULL DEFAULT 'active',  -- active | completed | abandoned
  disposition     text,
  talk_ratio_rep  real,
  appointment_set boolean NOT NULL DEFAULT false,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calls_org_started_idx ON calls (org_id, started_at DESC);
CREATE INDEX calls_rep_idx         ON calls (org_id, rep_id, started_at DESC);
CREATE INDEX calls_active_idx      ON calls (org_id) WHERE status = 'active';          -- partial: live calls only
-- Covering index: the appointments-per-rep dashboard query is served entirely from the index.
CREATE INDEX calls_appt_cov ON calls (org_id, rep_id) INCLUDE (started_at) WHERE appointment_set;

CREATE TRIGGER trg_calls_updated BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE calls ENABLE ROW LEVEL SECURITY; ALTER TABLE calls FORCE ROW LEVEL SECURITY;
CREATE POLICY calls_isolation ON calls USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());

-- ── call_events (partitioned, append-only) ─────────────────────────────────────
CREATE TABLE call_events (
  id         bigint GENERATED ALWAYS AS IDENTITY,
  org_id     uuid NOT NULL,
  call_id    uuid NOT NULL,
  kind       text NOT NULL,            -- card | stage | metric | objection
  payload    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)         -- partition key must be in the PK
) PARTITION BY RANGE (created_at);
CREATE INDEX call_events_call_idx ON call_events (call_id, created_at);
CREATE INDEX call_events_brin     ON call_events USING brin (created_at);  -- tiny index for a huge append-only table
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY; ALTER TABLE call_events FORCE ROW LEVEL SECURITY;
CREATE POLICY call_events_isolation ON call_events USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());
CREATE TABLE call_events_2026_06 PARTITION OF call_events FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE call_events_2026_07 PARTITION OF call_events FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE call_events_default PARTITION OF call_events DEFAULT;

-- ── transcript_segments (partitioned; retention drops old partitions) ──────────
CREATE TABLE transcript_segments (
  id       bigint GENERATED ALWAYS AS IDENTITY,
  org_id   uuid NOT NULL,
  call_id  uuid NOT NULL,
  speaker  text NOT NULL,              -- rep | prospect
  content  text NOT NULL,              -- classified sensitive; retention enforced by partition drop
  is_final boolean NOT NULL DEFAULT true,
  ts       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);
CREATE INDEX transcript_call_idx ON transcript_segments (call_id, ts);
CREATE INDEX transcript_brin     ON transcript_segments USING brin (ts);
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY; ALTER TABLE transcript_segments FORCE ROW LEVEL SECURITY;
CREATE POLICY transcript_isolation ON transcript_segments USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());
CREATE TABLE transcript_segments_2026_06 PARTITION OF transcript_segments FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE transcript_segments_default PARTITION OF transcript_segments DEFAULT;

-- ── objections_fired (analytics-friendly) ──────────────────────────────────────
CREATE TABLE objections_fired (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id   uuid NOT NULL,
  call_id  uuid NOT NULL,
  label    text NOT NULL,
  severity text,
  fired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX objections_org_label_idx ON objections_fired (org_id, label);  -- "most common objections"
ALTER TABLE objections_fired ENABLE ROW LEVEL SECURITY; ALTER TABLE objections_fired FORCE ROW LEVEL SECURITY;
CREATE POLICY objections_isolation ON objections_fired USING (org_id = app_current_org()) WITH CHECK (org_id = app_current_org());

GRANT SELECT, INSERT, UPDATE, DELETE ON calls, call_events, transcript_segments, objections_fired TO parley_app;
GRANT SELECT ON calls, call_events, transcript_segments, objections_fired TO parley_readonly;

COMMIT;
