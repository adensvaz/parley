-- 0001_foundation.sql — extensions, least-privilege roles, tenant context, crypto, audit, outbox.
-- Design goals: multi-tenant isolation (RLS), PII encrypted at rest, fast time-series, safe defaults.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid, hmac, pgp_sym_encrypt
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy search where PII isn't encrypted

-- ── Least-privilege roles ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'parley_app')      THEN CREATE ROLE parley_app NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'parley_readonly') THEN CREATE ROLE parley_readonly NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'parley_relay')    THEN CREATE ROLE parley_relay NOLOGIN; END IF;
END $$;

-- Safety rails: no query may hang a connection or hold a txn open forever.
ALTER ROLE parley_app SET statement_timeout = '5s';
ALTER ROLE parley_app SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE parley_app SET lock_timeout = '2s';

-- ── Tenant context: services set `app.current_org` per request/connection ──────
-- Every RLS policy filters on this, so a missing/empty GUC sees ZERO rows (fail-closed).
CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.current_org', true), '')::uuid $$;

-- ── Common triggers ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ── PII envelope encryption ────────────────────────────────────────────────────
-- The data key is injected per-session from KMS as `app.enc_key` and NEVER stored in the DB.
-- A stolen disk/backup is useless without the KMS key.
CREATE OR REPLACE FUNCTION pii_encrypt(plain text) RETURNS bytea
  LANGUAGE sql AS $$ SELECT pgp_sym_encrypt(plain, current_setting('app.enc_key', true)) $$;
CREATE OR REPLACE FUNCTION pii_decrypt(cipher bytea) RETURNS text
  LANGUAGE sql AS $$ SELECT pgp_sym_decrypt(cipher, current_setting('app.enc_key', true)) $$;

-- ── Append-only audit log ──────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id    uuid,
  actor     uuid,
  action    text NOT NULL,
  entity    text NOT NULL,
  entity_id text,
  diff      jsonb,
  at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_org_at_idx ON audit_log (org_id, at DESC);

-- ── Transactional outbox (atomic DB write + event publish) ─────────────────────
-- Services write domain events here in the SAME transaction as the state change; a relay
-- publishes unpublished rows to NATS and stamps published_at. Guarantees no lost events.
CREATE TABLE outbox (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id       uuid,
  subject      text NOT NULL,            -- NATS subject, e.g. 'call.ended'
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
-- Partial index: the relay scans ONLY unpublished rows — index stays tiny regardless of history.
CREATE INDEX outbox_unpublished_idx ON outbox (created_at) WHERE published_at IS NULL;

GRANT INSERT, SELECT ON audit_log TO parley_app;          -- append-only: no UPDATE/DELETE grant
GRANT INSERT, SELECT ON outbox TO parley_app;
GRANT SELECT, UPDATE ON outbox TO parley_relay;           -- relay marks rows published

COMMIT;
