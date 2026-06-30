// Persistence side-effects for the live loop. Tenant-scoped via @parley/db (RLS).
// Guarded by DATABASE_URL so the service runs (and tests pass) without a DB; every call is
// fire-and-forget + caught so persistence can NEVER interrupt the real-time copilot path.
import { withOrg, repo } from "@parley/db";
import type { CallCard } from "@parley/contracts";

const ON = !!process.env.DATABASE_URL;
const swallow = (where: string) => (e: unknown) => console.error(`[persist:${where}]`, (e as Error)?.message);

export function persistStart(orgId: string, callId: string, repId: string, modeId: string, leadId?: string) {
  if (!ON) return;
  void withOrg(orgId, (tx) => repo.calls.create(tx, { id: callId, orgId, repId, modeId, leadId })).catch(swallow("start"));
}

export function persistTranscript(orgId: string, callId: string, speaker: string, content: string, isFinal: boolean) {
  if (!ON || !isFinal) return;
  void withOrg(orgId, (tx) => repo.transcript.add(tx, { orgId, callId, speaker, content, isFinal })).catch(swallow("transcript"));
}

export function persistCard(orgId: string, callId: string, card: CallCard) {
  if (!ON) return;
  void withOrg(orgId, (tx) => repo.events.add(tx, { orgId, callId, kind: card.kind, payload: card })).catch(swallow("card"));
}

export function persistEnd(orgId: string, callId: string, o: { disposition: string; talkRatioRep: number; appointmentSet: boolean }) {
  if (!ON) return;
  void withOrg(orgId, (tx) => repo.calls.setOutcome(tx, callId, o)).catch(swallow("end"));
}
