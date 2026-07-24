// Zoom / Google Meet source — a bot joins the meeting and streams its audio into the same pipeline.
//
// Two production integration paths (both land here, both open a session identically):
//   1. Zoom RTMS (Real-Time Media Streams): Zoom pushes mixed/per-participant audio to a webhook +
//      WSS we host; we map participants → rep/prospect and feed frames to the session.
//   2. Meeting SDK bot: a headless bot process joins via a join URL, captures the raw audio device,
//      and pipes 16 kHz PCM here. Same for Google Meet via a Meet bot.
//
// This module owns the session lifecycle and the audio sink; the concrete media transport is wired
// by whichever path is enabled (RTMS_WSS_URL vs. a spawned bot). Kept behind one interface so the
// rest of the platform is identical to a phone call.
import { openSession } from "../session.js";

export interface ZoomJoin { orgId: string; repId: string; meeting: string; leadId?: string; source?: "zoom" | "meet" }

/** Start listening to a video meeting. Returns the session so the media transport can feed audio. */
export function joinMeeting(j: ZoomJoin) {
  const session = openSession({
    orgId: j.orgId, repId: j.repId, leadId: j.leadId, source: j.source ?? "zoom",
    stt: { encoding: "linear16", sampleRate: 16000 },
  });

  // TODO(media): attach the RTMS WSS stream or the Meeting-SDK bot's audio here and, per frame:
  //   session.onAudio(speakerIsHost ? "rep" : "prospect", base64Pcm16)
  // For now the session is live (call.started emitted); feed audio via session.onAudio to transcribe.
  console.log(`[zoom] joined meeting=${j.meeting} call=${session.callId} — awaiting media transport`);
  return session;
}
