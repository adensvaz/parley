// Streaming STT + diarization via Deepgram. We run two logical channels
// (rep / prospect) so diarization is trivial: each side already arrives tagged.

import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { Speaker } from "../shared/types.js";

interface Utterance { speaker: Speaker; text: string; isFinal: boolean }

export function createTranscriber(onUtterance: (u: Utterance) => void) {
  const dg = createClient(process.env.DEEPGRAM_API_KEY ?? "");
  const conns: Partial<Record<Speaker, any>> = {};

  function open(speaker: Speaker) {
    const conn = dg.listen.live({
      model: "nova-3",
      encoding: "linear16",
      sample_rate: 16000,
      channels: 1,
      interim_results: true,
      endpointing: 250,
      smart_format: true,
    });
    conn.on(LiveTranscriptionEvents.Transcript, (d: any) => {
      const text = d.channel?.alternatives?.[0]?.transcript ?? "";
      if (text) onUtterance({ speaker, text, isFinal: !!d.is_final });
    });
    conns[speaker] = conn;
  }

  return {
    start() {
      open("rep");
      open("prospect");
    },
    push(speaker: Speaker, base64Pcm: string) {
      conns[speaker]?.send(Buffer.from(base64Pcm, "base64"));
    },
    stop() {
      (Object.values(conns) as any[]).forEach((c) => c?.finish?.());
    },
  };
}
