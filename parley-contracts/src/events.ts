// parley-contracts — the versioned event catalog (NATS subjects) shared by every service.
// Backward-compatible evolution only: add fields, never repurpose; bump v2.* for breaking changes.

export const SUBJECTS = {
  callStarted: "call.started.v1",
  callTranscript: "call.transcript.v1",
  callCard: "call.card.v1",
  callEnded: "call.ended.v1",
  objectionFired: "objection.fired.v1",
  leadUpserted: "lead.upserted.v1",
  usageMetered: "usage.metered.v1",
  dncRequested: "compliance.dnc_requested.v1",
} as const;

export type Subject = (typeof SUBJECTS)[keyof typeof SUBJECTS];

export interface Envelope<T> {
  id: string;            // event id (idempotency key for consumers)
  subject: Subject;
  orgId: string;
  traceId: string;       // propagated from the edge for distributed tracing
  occurredAt: string;    // ISO-8601
  data: T;
}

export interface CallStarted { callId: string; repId: string; leadId?: string; modeId: string }
export interface CallTranscript { callId: string; speaker: "rep" | "prospect"; text: string; isFinal: boolean }
export interface CallCard { callId: string; kind: "objection" | "script" | "coach" | "answer" | "signal"; title: string; body: string; urgency: "now" | "soon" | "fyi" }
export interface CallEnded { callId: string; disposition: string; talkRatioRep: number; appointmentSet: boolean }
export interface ObjectionFired { callId: string; label: string; severity?: "low" | "med" | "high" }
export interface UsageMetered { metric: "call" | "minute"; qty: number }
