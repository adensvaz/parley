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

/** Run `fn` in a transaction bound to one tenant. RLS enforces isolation for everything inside. */
export async function withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.current_org', $1, true)", [orgId]); // true = txn-local
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
    create: (tx: Tx, p: { id?: string; orgId: string; repId: string; modeId: string; leadId?: string }) =>
      tx.query<{ id: string }>(
        `INSERT INTO calls (id, org_id, rep_id, mode_id, lead_id)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5) RETURNING id`,
        [p.id ?? null, p.orgId, p.repId, p.modeId, p.leadId ?? null],
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
  },
  events: {
    add: (tx: Tx, p: { orgId: string; callId: string; kind: string; payload: unknown }) =>
      tx.query(
        `INSERT INTO call_events (org_id, call_id, kind, payload) VALUES ($1,$2,$3,$4)`,
        [p.orgId, p.callId, p.kind, JSON.stringify(p.payload)],
      ),
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
