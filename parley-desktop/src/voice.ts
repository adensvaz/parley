// Real voice: local prosody analysis + on-device transcription.
//
// Two things happen here, and neither needs a cloud key:
//  1. TONE — we analyse the mic signal in the browser (energy, fundamental frequency,
//     pitch variability, voiced-rate) and map it to the same affect vocabulary the
//     backend uses. This is genuine acoustic analysis, not a mock.
//  2. WORDS — the Web Speech API transcribes locally where the runtime supports it.
//     When it doesn't (packaged Electron has no speech provider), tone still works and
//     the rep can type; cloud STT (Deepgram) takes over when a key is configured.

export interface ToneRead {
  energyDb: number;      // loudness, dBFS (-100 quiet … 0 loud)
  pitchHz: number;       // fundamental frequency estimate
  pitchVar: number;      // intonation spread — monotone vs animated
  speechRate: number;    // voiced-frame ratio 0..1
  level: number;         // 0..1 for the VU meter
  emotion: string;       // engaged | flat | tense | calm | animated | quiet
  valence: number;       // -1..1
  arousal: number;       // 0..1
}

type ToneCb = (t: ToneRead) => void;
type WordsCb = (text: string, isFinal: boolean) => void;

let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let raf = 0;
let recog: any = null;
const pitchHistory: number[] = [];
const voicedHistory: number[] = [];

/** Autocorrelation pitch detector — robust enough for speech F0 (70–400Hz). */
function detectPitch(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return 0; // silence / unvoiced

  const minP = Math.floor(sampleRate / 400), maxP = Math.floor(sampleRate / 70);
  let bestOffset = -1, bestCorr = 0;
  for (let off = minP; off <= maxP; off++) {
    let corr = 0;
    for (let i = 0; i < SIZE - off; i++) corr += buf[i] * buf[i + off];
    corr /= SIZE - off;
    if (corr > bestCorr) { bestCorr = corr; bestOffset = off; }
  }
  if (bestOffset < 0 || bestCorr < 0.01) return 0;
  return sampleRate / bestOffset;
}

function classify(f: { energyDb: number; pitchHz: number; pitchVar: number; speechRate: number }) {
  const { energyDb, pitchVar, speechRate } = f;
  // Arousal rises with loudness and pitch movement; valence falls when loud+monotone (tense).
  const loud = Math.min(1, Math.max(0, (energyDb + 60) / 45));
  const arousal = Math.min(1, loud * 0.6 + Math.min(1, pitchVar / 45) * 0.4);
  let emotion = "calm", valence = 0.1;
  if (energyDb < -48) { emotion = "quiet"; valence = 0; }
  else if (pitchVar < 8 && speechRate > 0.25) { emotion = "flat"; valence = -0.25; }
  else if (arousal > 0.72 && pitchVar < 18) { emotion = "tense"; valence = -0.4; }
  else if (arousal > 0.6) { emotion = "animated"; valence = 0.45; }
  else if (pitchVar > 18) { emotion = "engaged"; valence = 0.35; }
  return { emotion, valence, arousal };
}

/** Start the mic: continuous tone analysis, plus words when the runtime can. */
export async function startVoice(onTone: ToneCb, onWords?: WordsCb): Promise<{ mic: boolean; words: boolean }> {
  let mic = false, words = false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
    mic = true;
  } catch { return { mic: false, words: false }; }

  ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);

  const time = new Float32Array(analyser.fftSize);
  const loop = () => {
    analyser.getFloatTimeDomainData(time);
    let sum = 0;
    for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
    const rms = Math.sqrt(sum / time.length);
    const energyDb = 20 * Math.log10(Math.max(rms, 1e-7));

    const pitchHz = detectPitch(time, ctx!.sampleRate);
    if (pitchHz > 0) { pitchHistory.push(pitchHz); if (pitchHistory.length > 60) pitchHistory.shift(); }
    voicedHistory.push(pitchHz > 0 ? 1 : 0);
    if (voicedHistory.length > 60) voicedHistory.shift();

    const mean = pitchHistory.reduce((a, b) => a + b, 0) / (pitchHistory.length || 1);
    const pitchVar = pitchHistory.length > 3
      ? Math.sqrt(pitchHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / pitchHistory.length) : 0;
    const speechRate = voicedHistory.reduce((a, b) => a + b, 0) / (voicedHistory.length || 1);

    const c = classify({ energyDb, pitchHz, pitchVar, speechRate });
    onTone({
      energyDb, pitchHz: Math.round(pitchHz), pitchVar: Math.round(pitchVar), speechRate,
      level: Math.min(1, Math.max(0, (energyDb + 60) / 50)), ...c,
    });
    raf = requestAnimationFrame(loop);
  };
  loop();

  // Words — Web Speech API where the runtime provides one.
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SR && onWords) {
    try {
      recog = new SR();
      recog.continuous = true; recog.interimResults = true; recog.lang = "en-US";
      recog.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          onWords(r[0].transcript.trim(), r.isFinal);
        }
      };
      recog.onerror = () => {};
      recog.onend = () => { try { recog?.start(); } catch {} }; // keep it alive
      recog.start();
      words = true;
    } catch { words = false; }
  }
  return { mic, words };
}

export function stopVoice() {
  cancelAnimationFrame(raf);
  try { recog?.stop(); } catch {}
  recog = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  ctx?.close(); ctx = null;
  pitchHistory.length = 0; voicedHistory.length = 0;
}
