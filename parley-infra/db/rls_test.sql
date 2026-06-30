\set ON_ERROR_STOP on
SET app.enc_key = 'kms-data-key-demo';
INSERT INTO organizations (id,name) VALUES
  ('11111111-1111-1111-1111-111111111111','Org A'),
  ('22222222-2222-2222-2222-222222222222','Org B');
INSERT INTO leads (org_id, name_enc, phone_enc, phone_hash, lead_type, status) VALUES
  ('11111111-1111-1111-1111-111111111111', pii_encrypt('Alice'), pii_encrypt('+15550001'),'hashA1','expired','new'),
  ('11111111-1111-1111-1111-111111111111', pii_encrypt('Andy'),  pii_encrypt('+15550002'),'hashA2','fsbo','working'),
  ('22222222-2222-2222-2222-222222222222', pii_encrypt('Bob'),   pii_encrypt('+15550003'),'hashB1','buyer','new');
INSERT INTO dnc_entries (org_id, phone_hash) VALUES ('11111111-1111-1111-1111-111111111111','hashA2');

\echo '--- PII encrypt/decrypt roundtrip (stored as bytea ciphertext) ---'
SELECT pii_decrypt(name_enc) AS decrypted_name, length(name_enc) AS cipher_bytes FROM leads WHERE phone_hash='hashA1';

SET ROLE parley_app;

\echo '--- fail-closed: app role, NO org context => 0 rows ---'
SET app.current_org = '';
SELECT count(*) AS visible_no_context FROM leads;

\echo '--- tenant A context => sees only A (expect 2) ---'
SET app.current_org = '11111111-1111-1111-1111-111111111111';
SELECT count(*) AS visible_org_A FROM leads;

\echo '--- tenant B context => sees only B (expect 1) ---'
SET app.current_org = '22222222-2222-2222-2222-222222222222';
SELECT count(*) AS visible_org_B FROM leads;

\echo '--- cross-tenant write blocked (A tries to insert a row tagged B) ---'
SET app.current_org = '11111111-1111-1111-1111-111111111111';
DO $$ BEGIN
  INSERT INTO leads (org_id, phone_hash, status) VALUES ('22222222-2222-2222-2222-222222222222','evil','new');
  RAISE NOTICE 'INSERT SUCCEEDED — RLS FAILED!';
EXCEPTION WHEN others THEN RAISE NOTICE 'BLOCKED by RLS WITH CHECK (%) ✅', SQLSTATE;
END $$;

RESET ROLE;
\echo '--- DNC lookup access path (single index probe) ---'
SET enable_seqscan = off;
EXPLAIN (COSTS OFF) SELECT 1 FROM dnc_entries WHERE org_id='11111111-1111-1111-1111-111111111111' AND phone_hash='hashA2';
SET enable_seqscan = on;

\echo '--- declarative partitions of call_events ---'
SELECT inhrelid::regclass AS partition FROM pg_inherits WHERE inhparent='call_events'::regclass ORDER BY 1;
