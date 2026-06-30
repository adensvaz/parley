# Parley — QA Report

**QA owner:** Lead QA · **Build:** parley v0.1.0 (scaffold) · **Method:** static data-flow tracing of every
function/flow + executable test suite against the real source (`qa/run.ts`, OpenAI stubbed).

**Headline:** the deterministic copilot *logic* is solid (56/56 unit checks pass), but the app is **not wired
end-to-end** — two independent WebSockets mean copilot output never reaches the UI, and prospect audio is
never captured, so the core feature does not function in the real app yet. These are integration defects, not
logic defects, and are fixable in a focused pass.

---

## Test execution
```
npx tsx qa/run.ts   →   56 passed, 2 failed (the 2 failures are intentional bug-probes, see B1/B2)
```
Covered by executable tests: modes data integrity (all 5 modes), trigger-collision audit, DNC coverage,
opener emission, objection detection + rebuttal, objection dedupe, benign-speech false-positive guard,
stage transitions (intro→discovery, →close), talk-ratio coaching, metrics emission.

Not executable here (needs Electron runtime + API keys + audio hardware) — **covered by static review**:
overlay/content-protection, audio capture I/O, Deepgram STT, live LLM streaming, IPC, WS reconnect.

---

## Defects (severity-ordered)

### 🔴 P0-1 — Copilot output never reaches the UI (split-socket wiring)
**Flow:** `electron/audio.ts` opens WebSocket #1, sends `start` + audio → gateway creates Engine A → Engine A
emits cards/transcript/metrics back on socket #1. **`audio.ts` has no `message` listener** → those events are
dropped. Separately, `src/copilot/CopilotOverlay.tsx` opens its **own** WebSocket #2 to *receive* events, but
**never sends `start`** → gateway's connection #2 has `engine = null` and produces nothing.
**Result:** objection cards, transcript, coaching, and post-call summary never render in the real app.
**Fix:** one socket. Either (a) main process owns the socket and bridges `ServerEvent`s to the renderer via
`preload` (`ipcRenderer` channel), or (b) renderer owns the socket and forwards captured audio to it. Recommend (a).
**Verified:** `grep` shows no message listener in `audio.ts`; renderer opens a 2nd socket and only calls
`startCapture` (which drives the main-process socket).

### 🔴 P0-2 — Prospect-side audio is never captured
`electron/main.ts` registers `setDisplayMediaRequestHandler` (loopback), and `audio.ts` exposes
`pushProspectFrame()`, but **nothing in the renderer calls `getDisplayMedia`** and `pushProspectFrame` is
**never called**. Only the rep mic is streamed. Since objection detection keys off **prospect** utterances
(`if (speaker === "prospect") this.matchObjection(text)`), the product's core feature can't fire live.
**Fix:** in the renderer, `navigator.mediaDevices.getDisplayMedia({audio:true})` → AudioWorklet → 16kHz PCM →
`pushProspectFrame` over the (single) socket tagged `speaker:"prospect"`.

### 🟠 P1-1 — No build config; desktop app cannot launch as configured
No `tsconfig.json`, no `vite.config.ts`. `package.json main` = `dist-electron/main.js` which is **never built**.
`"dev": "vite"` starts only the renderer (and never sets `VITE_DEV_SERVER_URL`, which `main.ts` reads);
`"start:electron": "electron ."` has no compiled main to load.
**Fix:** add `vite.config.ts` with `vite-plugin-electron` (builds `electron/*.ts` → `dist-electron`, sets the
dev-server URL) + a `tsconfig.json`. Also re-verify `__dirname` usage in `main.ts` resolves under the chosen
bundle format (ESM vs CJS).

### 🟠 P1-2 (B1) — Interim STT results inflate word counts → wrong coaching
`CopilotEngine.onUtterance` increments `repWords/prospectWords` **before** the `if (isFinal)` guard. With
`interim_results: true`, each growing partial is counted repeatedly. **Proven:** test B1 yields
`talkRatioRep = 0.200` where the correct value is `0.333` — the prospect's 4 words were counted as 8.
**Fix:** move word counting inside the `if (isFinal)` block.

### 🟡 P2-1 (B2) — Rigid substring triggers miss natural paraphrases
Objection matching is `text.includes(trigger)`. "every agent says the exact same thing" does **not** match the
trigger "all agents say the same" → no card. Real prospects paraphrase constantly; deterministic recall will be
low. **Fix:** keep the fast deterministic layer for high-confidence hits, add a lightweight semantic/LLM
classifier fallback for misses (the engine already has an LLM call site to extend).

### 🟡 P2-2 — Deepgram frames sent before connection open; no reconnect/error handling
`server/stt.ts push()` calls `conn.send()` immediately; early frames can be dropped before the Deepgram socket
is open. No `error`/`close`/reconnect handling on the STT or gateway sockets. **Fix:** buffer until `open`,
add reconnect + backoff.

### 🟡 P2-3 — Post-call renderer can crash on malformed LLM JSON
`CopilotOverlay`→`PostCall` reads `data.followUpDraft.channel`. If the model's JSON omits `followUpDraft`
(happens), this throws and white-screens the overlay at end of call. **Fix:** null-guard + schema-validate the
post-call payload server-side before emitting.

### ⚪ P3 — Quality / completeness
- Talk ratio uses **cumulative** counts for the whole call (no rolling window) → sluggish, drowns out recent
  behavior. `wordsPerMin` and `longestMonologueSec` are hardcoded `0`.
- Dead/incomplete: `audio.ts` `getSocket()`/`pushProspectFrame` exported but unused; preload's
  "subscribe to ServerEvents" intent is not implemented.
- **Compliance gap:** a DNC *rebuttal* exists, but there is no runtime **DNC-list scrub / call-window /
  consent** enforcement before dialing. Launch-critical for TCPA — currently spec only.
- `manualAsk`/`maybeAdvise`/`finish` have no timeout/cancel; a hung LLM call leaks during a fast call.

---

## What's working (verified)
- ✅ All 5 prospecting modes are structurally valid; no duplicate triggers; DNC reachable in every mode.
- ✅ Objection engine: correct rebuttal, `urgency:"now"`, stage→objection, **fires once per call** (dedupe), and
  **no false positives** on benign speech.
- ✅ Stage machine: intro→discovery on rep question; →close on appointment language.
- ✅ Coaching fires on rep monologue; metrics emitted.
- ✅ `demo.html` — corrupted CSS color values fixed; scripted flow verified; renders standalone.

---

## Recommended fix order
1. **P0-1 + P0-2** together (single socket + prospect capture) — without these the product doesn't work. ~½ day.
2. **P1-1** build config so it actually launches. ~½ day.
3. **P1-2 / P2-3** (one-line word-count fix; post-call null-guard) — cheap, high-value.
4. **P2-1** semantic objection fallback — the difference between a demo and a product.
5. **P2-2 / compliance** before any real dialing.

Re-run gate: `npx tsx qa/run.ts` must stay green, and B1 must flip to ✅ once P1-2 is fixed.

---

## Resolution log
- ✅ **P0-1 (split-socket)** — RESOLVED. Capture + gateway socket now live in the renderer
  (`src/audioEngine.ts`); copilot events arrive on the same socket. No orphaned connection.
- ✅ **P0-2 (prospect audio)** — RESOLVED. `src/audioEngine.ts` captures BOTH sides via WebAudio
  (mic = getUserMedia, prospect = getDisplayMedia loopback), downsamples to 16kHz PCM16 in an
  AudioWorklet, streams tagged frames. Dropped the native `sox` dependency entirely.
- ✅ **P1-1 (build config)** — RESOLVED. `tsconfig.json` + `vite.config.ts` (multi-page renderer,
  `vite-plugin-electron`, `.js`→`.ts` resolver). Verified: `vite build` produces `dist/` +
  `dist-electron/main.js` + `preload.mjs`; `tsc --noEmit` = 0 errors.
- ✅ **P1-2 / B1 (interim word-count)** — RESOLVED. Word counting moved inside the `isFinal` guard;
  B1 test now passes (talk-ratio 0.333). Gate: **116 passed, 0 failed**.
- ✅ **P2-1 (paraphrase recall)** — IMPROVED. Expanded trigger coverage; B2 paraphrase now detected.
- ⏳ Still open: P2-2 (Deepgram open-before-send / reconnect), P2-3 (post-call JSON null-guard),
  P3 (rolling-window talk ratio), runtime DNC-list provider, Clerk/Stripe wiring.
