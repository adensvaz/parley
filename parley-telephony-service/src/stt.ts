// Streaming STT for the telephony paths. Same Deepgram engine as the gateway, but the encoding
// differs by source: PSTN/SIP media is 8 kHz μ-law; a Zoom/Meet bot yields 16 kHz linear PCM.
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export type Speaker = "rep" | "prospect";
type OnTranscript = (speaker: Speaker, text: string, isFinal: boolean) => void;
export interface SttOptions { encoding: "mulaw" | "linear16"; sampleRate: number }

export function createTranscriber(onTranscript: OnTranscript, opts: SttOptions) {
  const key = process.env.DEEPGRAM_API_KEY;
  // No key → STT inactive, but session lifecycle (call.started/ended) and number resolution still work.
  if (!key) return { start() {}, push(_s: Speaker, _b: string) {}, stop() {} };

  const dg = createClient(key);
  const conns: Partial<Record<Speaker, ReturnType<typeof dg.listen.live>>> = {};

  function open(speaker: Speaker) {
    const conn = dg.listen.live({
      model: "nova-3", encoding: opts.encoding, sample_rate: opts.sampleRate, channels: 1,
      interim_results: true, smart_format: true, endpointing: 250,
    });
    conn.on(LiveTranscriptionEvents.Transcript, (d: any) => {
      const text = d.channel?.alternatives?.[0]?.transcript ?? "";
      if (text) onTranscript(speaker, text, !!d.is_final);
    });
    conns[speaker] = conn;
  }

  return {
    start() { open("rep"); open("prospect"); },
    push(speaker: Speaker, base64: string) { (conns[speaker] as any)?.send(Buffer.from(base64, "base64")); },
    stop() { for (const c of Object.values(conns)) (c as any)?.finish?.(); },
  };
}
