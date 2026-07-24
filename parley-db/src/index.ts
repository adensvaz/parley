// @parley/db — the shared, tenant-safe persistence layer for every service.
//
// SECURITY: every unit of work runs inside `withOrg(orgId, …)`, which opens a transaction and
// sets `app.current_org` LOCALly. PostgreSQL Row-Level Security then scopes ALL reads/writes to
// that tenant — a forgotten `WHERE org_id=` cannot leak data. Services connect as the non-superuser
// `parley_app` role, so RLS is always enforced.
// SPEED: pooled connections, parameterized (prepared) statements, statement timeout.
import pg from "pg";

const { Pool } = pg;
export type Tx = pg.PoolClient;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  statement_timeout: 5000,
  idle_in_transaction_session_timeout: 10000,
});

/** Plain pooled connection for privileged/global ops (identity provisioning, analytics reads). */
export async function withConn<T>(fn: (c: Tx) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try { return await fn(c); } finally { c.release(); }
}

/** Run `fn` in a transaction bound to one tenant. RLS enforces isolation for everything inside. */
export async function withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.current_org', $1, true)", [orgId]); // true = txn-local
    if (process.env.PII_KEY) await c.query("SELECT set_config('app.enc_key', $1, true)", [process.env.PII_KEY]); // for pii_encrypt/decrypt
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// Repositories — parameterized queries only (no string interpolation).
export const repo = {
  calls: {
    create: (tx: Tx, p: { id?: string; orgId: string; repId: string; modeId: string; leadId?: string; source?: string }) =>
      tx.query<{ id: string }>(
        `INSERT INTO calls (id, org_id, rep_id, mode_id, lead_id, source)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5, COALESCE($6,'desktop')) RETURNING id`,
        [p.id ?? null, p.orgId, p.repId, p.modeId, p.leadId ?? null, p.source ?? null],
      ).then((r) => r.rows[0]),
    setOutcome: (tx: Tx, callId: string, p: { disposition: string; talkRatioRep: number; appointmentSet: boolean }) =>
      tx.query(
        `UPDATE calls SET status='completed', disposition=$2, talk_ratio_rep=$3, appointment_set=$4, ended_at=now() WHERE id=$1`,
        [callId, p.disposition, p.talkRatioRep, p.appointmentSet],
      ),
    count: (tx: Tx) => tx.query<{ count: string }>(`SELECT count(*)::int AS count FROM calls`).then((r) => Number(r.rows[0].count)),
  },
  transcript: {
    add: (tx: Tx, p: { orgId: string; callId: string; speaker: string; content: string; isFinal: boolean }) =>
      tx.query(
        `INSERT INTO transcript_segments (org_id, call_id, speaker, content, is_final) VALUES ($1,$2,$3,$4,$5)`,
        [p.orgId, p.callId, p.speaker, p.content, p.isFinal],
      ),
    // Ordered final transcript for a call — the input to post-call scoring.
    forCall: (tx: Tx, callId: string) =>
      tx.query<{ speaker: string; content: string; ts: string }>(
        `SELECT speaker, content, ts FROM transcript_segments
         WHERE call_id=$1 AND is_final ORDER BY ts ASC`, [callId],
      ).then((r) => r.rows),
  },
  events: {
    add: (tx: Tx, p: { orgId: string; callId: string; kind: string; payload: unknown }) =>
      tx.query(
        `INSERT INTO call_events (org_id, call_id, kind, payload) VALUES ($1,$2,$3,$4)`,
        [p.orgId, p.callId, p.kind, JSON.stringify(p.payload)],
      ),
    countObjections: (tx: Tx, callId: string) =>
      tx.query<{ c: number }>(`SELECT count(*)::int c FROM call_events WHERE call_id=$1 AND kind='objection'`, [callId])
        .then((r) => r.rows[0].c),
  },

  // Identity provisioning (run via withConn as the BYPASSRLS parley_identity role).
  identity: {
    upsertUser: (c: Tx, p: { clerkId: string; email: string; name?: string }) =>
      c.query<{ id: string }>(
        `INSERT INTO users (clerk_id, email, name) VALUES ($1,$2,$3)
         ON CONFLICT (clerk_id) DO UPDATE SET email=EXCLUDED.email, updated_at=now() RETURNING id`,
        [p.clerkId, p.email, p.name ?? null],
      ).then((r) => r.rows[0]),
    upsertOrg: (c: Tx, p: { clerkOrgId: string; name: string }) =>
      c.query<{ id: string }>(
        `INSERT INTO organizations (clerk_org_id, name) VALUES ($1,$2)
         ON CONFLICT (clerk_org_id) DO UPDATE SET name=EXCLUDED.name, updated_at=now() RETURNING id`,
        [p.clerkOrgId, p.name],
      ).then((r) => r.rows[0]),
    upsertMembership: (c: Tx, p: { orgId: string; userId: string; role: string }) =>
      c.query(
        `INSERT INTO memberships (org_id, user_id, role) VALUES ($1,$2,$3::org_role)
         ON CONFLICT (org_id, user_id) DO UPDATE SET role=EXCLUDED.role`,
        [p.orgId, p.userId, p.role],
      ),
  },

  // Billing — subscriptions, plans, usage metering, quota.
  billing: {
    ensureSub: (tx: Tx, orgId: string) =>
      tx.query(`INSERT INTO subscriptions (org_id, plan_id, status) VALUES ($1,'trial','trialing')
                ON CONFLICT (org_id) DO NOTHING`, [orgId]),
    getSub: (tx: Tx, orgId: string) =>
      tx.query<{ plan_id: string; status: string; monthly_call_quota: number | null }>(
        `SELECT s.plan_id, s.status, p.monthly_call_quota
         FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.org_id=$1`, [orgId],
      ).then((r) => r.rows[0]),
    setPlan: (tx: Tx, p: { orgId: string; planId: string; status: string; stripeCustomerId?: string; stripeSubId?: string; periodEnd?: string }) =>
      tx.query(
        `INSERT INTO subscriptions (org_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_end)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (org_id) DO UPDATE SET plan_id=EXCLUDED.plan_id, status=EXCLUDED.status,
           stripe_customer_id=COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
           stripe_subscription_id=COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
           current_period_end=EXCLUDED.current_period_end, updated_at=now()`,
        [p.orgId, p.planId, p.status, p.stripeCustomerId ?? null, p.stripeSubId ?? null, p.periodEnd ?? null],
      ),
    meter: (tx: Tx, orgId: string, metric = "call", qty = 1) =>
      tx.query(`INSERT INTO usage_events (org_id, metric, qty) VALUES ($1,$2,$3)`, [orgId, metric, qty]),
    usedThisMonth: (tx: Tx, orgId: string, metric = "call") =>
      tx.query<{ c: number }>(
        `SELECT COALESCE(sum(qty),0)::int c FROM usage_events
         WHERE org_id=$1 AND metric=$2 AND created_at >= date_trunc('month', now())`, [orgId, metric],
      ).then((r) => r.rows[0].c),
  },

  // CRM — leads with PII encrypted at rest (requires PII_KEY set on the connection).
  leads: {
    create: (tx: Tx, p: { orgId: string; name: string; phone: string; phoneHash: string; leadType?: string; address?: string }) =>
      tx.query<{ id: string }>(
        `INSERT INTO leads (org_id, name_enc, phone_enc, phone_hash, lead_type, address)
         VALUES ($1, pii_encrypt($2), pii_encrypt($3), $4, $5, $6) RETURNING id`,
        [p.orgId, p.name, p.phone, p.phoneHash, p.leadType ?? null, p.address ?? null],
      ).then((r) => r.rows[0]),
    getByPhoneHash: (tx: Tx, phoneHash: string) =>
      tx.query(
        `SELECT id, pii_decrypt(name_enc) AS name, pii_decrypt(phone_enc) AS phone,
                lead_type, address, status, est_value, last_contact_at
         FROM leads WHERE phone_hash=$1 LIMIT 1`, [phoneHash],
      ).then((r) => r.rows[0] ?? null),
  },

  // Analytics
  scorecards: {
    upsert: (tx: Tx, p: { callId: string; orgId: string; repId: string; score: number; talkRatio: number; objectionsHandled: number; appointmentSet: boolean }) =>
      tx.query(
        `INSERT INTO scorecards (call_id, org_id, rep_id, score, talk_ratio, objections_handled, appointment_set)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (call_id) DO UPDATE SET score=EXCLUDED.score, talk_ratio=EXCLUDED.talk_ratio,
           objections_handled=EXCLUDED.objections_handled, appointment_set=EXCLUDED.appointment_set`,
        [p.callId, p.orgId, p.repId, p.score, p.talkRatio, p.objectionsHandled, p.appointmentSet],
      ),
    // Rich post-call report — extends the scorecard row with the stage breakdown, the one fix,
    // and transcript-anchored moments (jsonb). Upserted alongside the numeric score.
    upsertReport: (tx: Tx, p: { callId: string; orgId: string; repId: string; score: number; talkRatio: number; objectionsHandled: number; appointmentSet: boolean; stages: unknown; fix: unknown; moments: unknown }) =>
      tx.query(
        `INSERT INTO scorecards (call_id, org_id, rep_id, score, talk_ratio, objections_handled, appointment_set, stages, fix, moments)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (call_id) DO UPDATE SET score=EXCLUDED.score, talk_ratio=EXCLUDED.talk_ratio,
           objections_handled=EXCLUDED.objections_handled, appointment_set=EXCLUDED.appointment_set,
           stages=EXCLUDED.stages, fix=EXCLUDED.fix, moments=EXCLUDED.moments`,
        [p.callId, p.orgId, p.repId, p.score, p.talkRatio, p.objectionsHandled, p.appointmentSet,
         JSON.stringify(p.stages), p.fix == null ? null : JSON.stringify(p.fix), JSON.stringify(p.moments)],
      ),
    // The rep's own scorecard for one call (drives the /report view + call.scored payload).
    get: (tx: Tx, callId: string) =>
      tx.query(
        `SELECT call_id, rep_id, score, talk_ratio, objections_handled, appointment_set, stages, fix, moments
         FROM scorecards WHERE call_id=$1`, [callId],
      ).then((r) => r.rows[0] ?? null),
    refreshDaily: (tx: Tx) => tx.query(`SELECT refresh_rep_daily_stats()`),
    dashboard: (tx: Tx, orgId: string) =>
      tx.query(
        `SELECT rep_id, day, calls, avg_score, appts FROM rep_daily_stats
         WHERE org_id=$1 ORDER BY day DESC, rep_id LIMIT 200`, [orgId],
      ).then((r) => r.rows),
  },

  // Telephony — Parley virtual numbers mapped to an org/rep. `resolve` runs BEFORE tenant context
  // is known (inbound call), so it goes through the SECURITY DEFINER function; everything else is
  // tenant-scoped under withOrg + RLS.
  numbers: {
    provision: (tx: Tx, p: { e164: string; orgId: string; repId?: string; provider?: string; source?: string }) =>
      tx.query(
        `INSERT INTO org_numbers (e164, org_id, rep_id, provider, source) VALUES ($1,$2,$3,COALESCE($4,'twilio'),COALESCE($5,'pstn'))
         ON CONFLICT (e164) DO UPDATE SET org_id=EXCLUDED.org_id, rep_id=EXCLUDED.rep_id, active=true`,
        [p.e164, p.orgId, p.repId ?? null, p.provider ?? null, p.source ?? null],
      ),
    listForOrg: (tx: Tx, orgId: string) =>
      tx.query<{ e164: string; rep_id: string | null; provider: string; source: string }>(
        `SELECT e164, rep_id, provider, source FROM org_numbers WHERE org_id=$1 AND active ORDER BY created_at DESC`, [orgId],
      ).then((r) => r.rows),
    /** Inbound number → tenant, pre-auth. Uses the SECURITY DEFINER probe (no org context yet). */
    resolve: (c: Tx, e164: string) =>
      c.query<{ org_id: string; rep_id: string | null; source: string }>(
        `SELECT org_id, rep_id, source FROM telephony_resolve($1)`, [e164],
      ).then((r) => r.rows[0] ?? null),
  },
  dnc: {
    /** O(log n) index-only probe against the per-tenant DNC list. */
    isListed: (tx: Tx, orgId: string, phoneHash: string) =>
      tx.query(`SELECT 1 FROM dnc_entries WHERE org_id=$1 AND phone_hash=$2 LIMIT 1`, [orgId, phoneHash])
        .then((r) => (r.rowCount ?? 0) > 0),
    add: (tx: Tx, orgId: string, phoneHash: string, scope = "org") =>
      tx.query(
        `INSERT INTO dnc_entries (org_id, phone_hash, scope) VALUES ($1,$2,$3)
         ON CONFLICT (org_id, phone_hash) DO NOTHING`,
        [orgId, phoneHash, scope],
      ),
  },
};

export async function close() { await pool.end(); }
