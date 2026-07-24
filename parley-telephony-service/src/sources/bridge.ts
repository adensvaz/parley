// "Keep your own number" bridge source.
//
// The problem: a real-estate rep wants to dial from their OWN number/SIM (better pickup, their
// relationships), but iOS/Android forbid third-party apps from tapping native cellular call audio —
// so Parley can't "listen" to a call made in the normal Phone app. Physics, not preference.
//
// The solve: separate IDENTITY (the number the prospect sees) from TRANSPORT (the pipe the audio
// flows through). The rep keeps the identity; Parley only needs to be in the transport.
//
//   1. Rep taps "call" in the Parley app  → POST /bridge/start { repPhone, prospectPhone }.
//   2. Parley rings the rep's OWN cell (repPhone). The rep answers on their normal phone/SIM.
//   3. On answer, the provider fetches bridgeTwiml(): it <Dial>s the prospect with callerId = the
//      rep's OWN verified number, and <Stream>s both legs to /media.
//   4. Media hits handlePstnMedia() → the SAME session core as every other source. Copilot runs,
//      the overlay lands on the rep's screen. We hear both sides; the rep uses their own phone+number.
//
// We are a thin bridge, NOT a number reseller: the number is the rep's, verified once (60s OTP).
import { openSession } from "../session.js";

export interface BridgeStart {
  orgId: string; repId: string; leadId?: string; callId?: string;
  repPhone: string;       // the rep's own cell/SIM — rung first
  prospectPhone: string;  // the prospect
  repCallerId: string;    // the rep's own verified number, shown to the prospect
}

/** TwiML fetched when the REP answers their own phone: dial the prospect as the rep's own number and
 *  fork both legs to /media so Parley hears the whole conversation. */
export function bridgeTwiml(b: BridgeStart, mediaWss: string): string {
  const q = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${q(mediaWss)}/media" track="both_tracks">
      <Parameter name="orgId" value="${q(b.orgId)}"/>
      <Parameter name="repId" value="${q(b.repId)}"/>
      <Parameter name="leadId" value="${q(b.leadId ?? "")}"/>
      <Parameter name="source" value="bridge"/>
    </Stream>
  </Start>
  <Dial callerId="${q(b.repCallerId)}" answerOnBridge="true">
    <Number>${q(b.prospectPhone)}</Number>
  </Dial>
</Response>`;
}

/** Open the ingest session for a bridged call up-front, so copilot is warm before the prospect answers.
 *  The Twilio Media Streams frames are handled by the shared handlePstnMedia() (μ-law/8k, same tracks). */
export function openBridgeSession(b: BridgeStart) {
  return openSession({
    orgId: b.orgId, repId: b.repId, leadId: b.leadId, callId: b.callId, source: "bridge",
    stt: { encoding: "mulaw", sampleRate: 8000 },
  });
}
