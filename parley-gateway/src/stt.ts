// Streaming speech-to-text via Deepgram. Two logical channels (rep / prospect) arrive
// already tagged from the desktop, so diarization is free.
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export type Speaker = "rep" | "prospect";
type OnTranscript = (speaker: Speaker, text: string, isFinal: boolean) => void;

export function createTranscriber(onTranscript: OnTranscript) {
  const key = process.env.DEEPGRAM_API_KEY;
  // No key configured → STT inactive, but the gateway still does auth, billing gate, lead
  // context, and bus relay. (Crashing the whole gateway on connect is never acceptable.)
  if (!key) return { start() {}, push(_s: Speaker, _b: string) {}, stop() {} };

  const dg = createClient(key);
  const conns: Partial<Record<Speaker, ReturnType<typeof dg.listen.live>>> = {};

  function open(speaker: Speaker) {
    const conn = dg.listen.live({
      model: "nova-3", encoding: "linear16", sample_rate: 16000, channels: 1,
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
    push(speaker: Speaker, base64Pcm: string) { (conns[speaker] as any)?.send(Buffer.from(base64Pcm, "base64")); },
    stop() { for (const c of Object.values(conns)) (c as any)?.finish?.(); },
  };
}
