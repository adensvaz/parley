// Renderer-side capture engine (fixes QA P0-2).
// Captures BOTH sides of the call with WebAudio — no native deps:
//   • rep      = getUserMedia (microphone)
//   • prospect = getDisplayMedia (system-audio loopback; main wires the loopback source)
// Each stream is downsampled to 16kHz mono PCM16 in an AudioWorklet and streamed over a
// single WebSocket to the gateway, tagged by speaker. ServerEvents come back on the same socket.

// Messages the gateway sends back to the desktop.
export type GatewayMessage =
  | { type: "card"; kind: "objection" | "script" | "coach" | "answer" | "signal"; title: string; body: string; urgency: "now" | "soon" | "fyi"; id: string; stats?: { books: number; used: number } }
  | { type: "transcript"; speaker: "rep" | "prospect"; text: string; isFinal: boolean; ts: number }
  | { type: "lead"; name?: string; phone?: string; lead_type?: string; address?: string; status?: string }
  | { type: "blocked"; reason: string; plan?: string }
  | { type: "audioStatus"; mic: boolean; reason: string };

const GATEWAY = (import.meta as any).env?.VITE_GATEWAY_URL ?? "ws://localhost:8080";

// Worklet: decimate context-rate float audio to 16kHz Int16, post ~100ms chunks.
const WORKLET = `
class PCM16 extends AudioWorkletProcessor {
  constructor(){ super(); this.buf=[]; this.ratio=sampleRate/16000; this.acc=0; }
  process(inputs){
    const ch = inputs[0] && inputs[0][0];
    if(!ch) return true;
    for(let i=0;i<ch.length;i++){
      this.acc++;
      if(this.acc>=this.ratio){ this.acc-=this.ratio;
        let s=Math.max(-1,Math.min(1,ch[i]));
        this.buf.push(s<0 ? s*0x8000 : s*0x7FFF);
      }
    }
    if(this.buf.length>=1600){
      const a=Int16Array.from(this.buf); this.buf=[];
      this.port.postMessage(a.buffer,[a.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm16', PCM16);
`;

export interface CaptureOptions {
  token: string;               // dev token or Clerk JWT — the gateway authenticates on the upgrade
  modeId: string;
  phone?: string;              // prospect number → gateway fetches lead context from CRM
  micDeviceId?: string | null;
  captureSystemAudio?: boolean;
  noiseSuppression?: boolean;
  onEvent: (ev: GatewayMessage) => void;
}

let ws: WebSocket | null = null;
let ctx: AudioContext | null = null;
let streams: MediaStream[] = [];
let workletUrl: string | null = null;

export async function startCapture(opts: CaptureOptions): Promise<void> {
  ws = new WebSocket(`${GATEWAY}/rt?token=${encodeURIComponent(opts.token)}`);
  await new Promise<void>((res, rej) => { ws!.onopen = () => res(); ws!.onerror = () => rej(new Error("gateway unreachable")); });
  ws.onmessage = (e) => { try { opts.onEvent(JSON.parse(e.data) as GatewayMessage); } catch { /* ignore */ } };
  send({ type: "start", modeId: opts.modeId, phone: opts.phone });

  // The REP mic is owned by voice.ts (one stream, feeding both tone analysis and STT) and
  // arrives here via sendAudio(). Only the prospect-side loopback is captured here.
  if (opts.captureSystemAudio) {
    try {
      ctx = new AudioContext();
      workletUrl = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
      await ctx.audioWorklet.addModule(workletUrl);
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      display.getVideoTracks().forEach((t) => t.stop()); // audio only
      if (display.getAudioTracks().length) pipe(new MediaStream(display.getAudioTracks()), "prospect");
    } catch {
      // denied or unavailable — the call still runs on the rep's mic + typed input
    }
  }
}

function pipe(stream: MediaStream, speaker: "rep" | "prospect") {
  streams.push(stream);
  const src = ctx!.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx!, "pcm16");
  node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => send({ type: "audio", speaker, pcm16: toB64(e.data) });
  src.connect(node);
  // worklet is a sink; do NOT connect to destination (avoid echo / feedback)
}

/** Practice / dev mode: inject a transcript line directly (no mic) — the gateway forwards it to
 *  the copilot exactly like an STT result. Powers "Practice Mode" and headless testing. */
export function sendTranscript(speaker: "rep" | "prospect", text: string, isFinal = true): void {
  send({ type: "transcript", speaker, text, isFinal });
}

/** Stream 16kHz PCM16 to the gateway for cloud STT. Fed by voice.ts so the mic opens once. */
export function sendAudio(speaker: "rep" | "prospect", pcm16: string): void {
  send({ type: "audio", speaker, pcm16 });
}

export function stopCapture(): void {
  send({ type: "stop" });
  streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  streams = [];
  ctx?.close(); ctx = null;
  if (workletUrl) { URL.revokeObjectURL(workletUrl); workletUrl = null; }
  ws?.close(); ws = null;
}

function send(obj: unknown) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
