// Number-provider abstraction. The real implementation calls Twilio/Telnyx to purchase a number in
// the requested area code and points its Voice webhook at THIS service's /voice. Stubbed here (no
// provider SDK dependency) so dev/self-host flows work end-to-end without an account.
export async function provisionNumber(opts: { areaCode?: string; provider?: string }): Promise<{ e164: string; provider: string }> {
  const provider = opts.provider ?? process.env.NUMBER_PROVIDER ?? "twilio";
  // TODO(provider): purchase a number in `areaCode` and set VoiceUrl = `${PUBLIC_URL}/voice`.
  const ac = (opts.areaCode ?? "415").replace(/\D/g, "").slice(0, 3).padEnd(3, "5");
  const line = String(Date.now() % 1e7).padStart(7, "0");
  return { e164: `+1${ac}${line}`, provider };
}

// ── Bring-your-own-number ("keep your own number") ───────────────────────────────────────────────
// A rep keeps their own cell/SIM. We never sell them a number — we only need (a) proof they own it,
// so we can present it as caller ID, and (b) the ability to place a two-legged bridge call.

/** Start verified-caller-ID for a number the rep already owns (Twilio Validation Requests / Telnyx
 *  verified caller IDs). Provider rings the number and reads a 6-digit code; once entered, the rep can
 *  use THEIR number as outbound caller ID. One-time, ~60s, no porting, no STIR/SHAKEN ownership move. */
export async function startCallerIdVerification(e164: string, provider = process.env.NUMBER_PROVIDER ?? "twilio"): Promise<{ validationCode: string; provider: string }> {
  // TODO(provider): Twilio `validationRequests.create({ phoneNumber: e164, ... })`.
  const code = String((Number(e164.replace(/\D/g, "").slice(-6)) * 7 + 13) % 1e6).padStart(6, "0"); // deterministic dev stub
  return { validationCode: code, provider };
}

export interface BridgeRequest {
  repPhone: string;       // the rep's OWN cell/SIM — we ring this first
  prospectPhone: string;  // who they're calling
  repCallerId: string;    // the rep's OWN verified number, shown to the prospect
  bridgeVoiceUrl: string; // TwiML webhook for the rep-answered leg (dials prospect + forks media)
  provider?: string;
}
/** Place the bridge: call the rep's own phone; when they answer, the returned TwiML dials the prospect
 *  with repCallerId and forks both legs to /media. Returns the provider call SID for tracking. */
export async function placeBridge(req: BridgeRequest): Promise<{ callSid: string; provider: string }> {
  const provider = req.provider ?? process.env.NUMBER_PROVIDER ?? "twilio";
  // TODO(provider): Twilio `calls.create({ to: req.repPhone, from: <A2P-registered pool #>, url: req.bridgeVoiceUrl })`.
  //   The rep's phone rings; on answer Twilio fetches bridgeVoiceUrl (see sources/bridge.ts bridgeTwiml).
  return { callSid: `CA_${Date.now().toString(36)}`, provider };
}
