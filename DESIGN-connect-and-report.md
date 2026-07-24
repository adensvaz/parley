# Design — Call Connection & Post-Call Report

Two capabilities added to the Parley platform, following the existing contracts + database-per-service
patterns. Everything converges on the current async pipeline; no service learns a new call shape.

---

## 1. Requirements

**Connection (how a call's audio reaches Parley) — functional**
- Support three sources besides the desktop: **existing dialer** (already via gateway), a **Parley
  virtual phone number** (PSTN/SIP), and **Zoom / Google Meet** listening.
- All must produce the same `call.transcript.v1` stream so copilot/analytics are source-agnostic.
- A call to a Parley number must resolve to the right tenant **before** any auth/session context.

**Report (post-call) — functional**
- The second a call ends, produce a rep-facing **scorecard**: overall score, per-stage breakdown
  (opener / discovery / objection / close), **one fix** for next time, and transcript-anchored moments.
- Push it live (so the desktop/web pops it), and expose it as JSON + a shareable HTML page.

**Non-functional**
- Latency: report built within seconds of `call.ended`; connection adds ≤ the STT round-trip already present.
- Isolation: strict multi-tenant (RLS) — a number→org lookup can't become a data-leak path.
- Scale: telephony scales on concurrent media streams; analytics on `call.ended` throughput.
- Constraint: reuse Deepgram STT, NATS JetStream, `@parley/db` (RLS), the versioned event catalog.

---

## 2. High-level design

```
 desktop ─WSS─▶ parley-gateway ──┐
 PSTN/SIP ─Twilio Media Streams─▶ parley-telephony-service ─┤─▶ NATS call.transcript.v1 ─▶ copilot-service ─▶ call.card
 Zoom/Meet ─bot/RTMS───────────▶ parley-telephony-service ─┘        │
                                                                    ├─ call.started.v1 { source }
                                                                    └─ call.ended.v1 ─▶ parley-analytics-service
                                                                                             │ read transcript
                                                                                             ▼ build scorecard
                                                                             call.scored.v1 ─▶ desktop/web (rep report)
                                                                             + /report/:callId (HTML) + /api/scorecard/:callId
```

**New service:** `parley-telephony-service` (edge #2). Separate from the gateway because it has a
different public contract (provider webhooks, μ-law/8k media) and lifecycle (no desktop attached).

**Extended service:** `parley-analytics-service` — already consumed `call.ended`; now it reads the
transcript and emits a full report + `call.scored`.

---

## 3. Contracts (the typed boundary — `@parley/contracts`)

Backward-compatible additions only (optional fields; new subjects):
- `SUBJECTS.callScored = "call.scored.v1"`, `SUBJECTS.numberProvisioned = "telephony.number_provisioned.v1"`
- `CallSource = "desktop" | "pstn" | "sip" | "zoom" | "meet"`; optional `source` on `CallStarted`/`CallEnded`
- `Scorecard` / `CallScored` — `{ score, stages: StageGrade[], fix, moments: ReportMoment[], … }`
- `NumberProvisioned`

The *source is metadata, not a branch*: copilot/analytics keep consuming `call.transcript`/`call.ended`
unchanged. That's the load-bearing decision — adding a 4th or 5th connection path is a new adapter, not
a platform change.

---

## 4. Data model (migration `0007`)

- `calls.source` (`text`, default `'desktop'`) — where the call came from.
- `scorecards` gains `stages jsonb`, `fix jsonb`, `moments jsonb` — the rich report on the existing row
  (no new table; old numeric columns preserved).
- `org_numbers (e164 PK, org_id, rep_id?, provider, source, active)` — virtual-number → tenant map.
- `telephony_resolve(e164)` — `SECURITY DEFINER` function returning `(org_id, rep_id, source)` for the
  inbound pre-tenant lookup. **`org_numbers` is `ENABLE` but not `FORCE` RLS** so the definer probe can
  bypass; tenant-scoped reads/writes still go through `withOrg` + the isolation policy.

---

## 5. Deep dive

**Connection ingestion (`session.ts`)** — one `openSession(ctx)` core: mints the `callId`, starts STT
with the source's audio format (μ-law/8k for PSTN, linear16/16k for Zoom), emits `call.started{source}`,
returns `{ onAudio(speaker, pcm), end(outcome) }`, emits `call.ended` on stop. PSTN and Zoom adapters
just feed audio in — DRY, and the gateway can later adopt the same core.

**Number resolution (pre-auth):** inbound call → `/voice` → `telephony_resolve(To)` (no org context) →
TwiML forks both legs to `/media` with `orgId/repId` as `<Parameter>`s → media arrives already tenant-tagged.

**Report (`scorecard.ts`)** — pure function `buildScorecard(transcript, outcome)` → deterministic v1
heuristics (question count → discovery grade; objection raised & handled → objection grade; appointment
→ close; talk-ratio band → bonus). The **one fix** = the weakest stage, ranked by impact
(objection > close > discovery > opener), phrased in the copilot's playbook voice. Same shape an LLM
grader will later fill — callers and the `/report` page never change.

---

## 6. Scale & reliability
- **Telephony** is stateless per media stream → horizontal scale on stream count; a crash drops one
  call's live assist but NATS + the report path are unaffected.
- **Analytics** consumes `call.ended` on a queue group (competing consumers) and coalesces MV refreshes.
- **STT-less fallback:** no `DEEPGRAM_API_KEY` → sessions still emit lifecycle events (no transcript),
  so provisioning/number flows and dashboards keep working.
- **Idempotency:** `call.scored` keyed on `callId`; scorecard upsert is idempotent.

---

## 7. Trade-offs & what I'd revisit
- **Separate telephony service vs. extending the gateway:** chose separate (different contract/scale) —
  cost is a little duplicated STT wiring; mitigated by the shared `session.ts` core.
- **jsonb report columns vs. a normalized `scorecard_stages` table:** chose jsonb (the report is read as
  a whole, per call) — revisit if we need cross-call stage analytics at scale (then materialize).
- **Deterministic heuristics vs. LLM grader:** shipped heuristics for latency/cost/predictability; the
  `Scorecard` shape is LLM-ready, so swapping the engine is internal to `scorecard.ts`.
- **Twilio `<Start><Stream>` (fork, listen-only)** keeps us out of the call's audio path; if we later
  need to *inject* (e.g., a whisper tone), switch to `<Connect><Stream>` — no downstream change.
- **Next:** persist raw media to S3 for re-scoring; per-participant Zoom RTMS mapping; SIP trunk (BYOC).

---

## Addendum — Affect (tone) & Lead Temperature

**Goal:** understand *how* the prospect is speaking (angry / hesitant / warming), not just what they say,
then curate the response to that tone — optimizing to **keep them on the call and move cold → hot**.

**The affect engine (`gateway|telephony/affect.ts`) — state of the art, three tiers:**
- **Model ensemble** (best configured wins): **audio-native LLM** (GPT-4o-audio / Gemini) →
  **emotion2vec+** (SOTA open SER) → **Hume** prosody. These read sarcasm, strain, warmth.
- **DSP baseline** (always on, zero-dep): real feature extraction — **F0 (autocorrelation pitch)**,
  energy (dBFS), intonation range, speech rate → a true acoustic affect, not just loudness. Decodes
  both linear16/16k (desktop) and μ-law/8k (telephony).
- **Vocal Resonance (invented)** — prosodic **entrainment** between the prospect's and rep's voices
  (convergence of energy/pitch/rate EMAs). Rapport shows up in the voice *before* the words, so rising
  resonance is a **leading indicator** of a warming lead. Carried on `Affect.resonance`.

**Fusion + trajectory (`copilot/affect.ts`):** `fuseAffect()` combines tone + words (weighted by how
strong the acoustic model is — tone drives arousal & catches hidden anger; words drive topic). The
engine also tracks the **emotional trajectory** (escalating vs. cooling) so strategy reacts to the
*direction*, not just the level — it won't re-trigger a prospect who's already settling.

**Lead thermometer (`Thermometer`)** — a 0–100 heat with momentum: up on engagement + warming tone +
buying signals, down on hostility/disengagement, mild pull to neutral. Emits `lead.heat.v1` (analytics)
and a live signal card the rep sees as a gauge (`Angry · cool ▼ 34`).

**Response curation** — every prospect turn, the engine reads the room, picks a `Strategy`
(`de-escalate | acknowledge | probe | advance | trial-close | close`, each mapped to a master —
Voss for anger, NEPQ for hesitation, Hormozi/Straight-Line for warm→hot), and injects tone + heat +
the strategy + the **dwell objective** ("never dead-end; match their temperature; don't pitch an angry
prospect, don't stall a hot one") into the advisor prompt.

**Trade-offs:** lexical-only works with zero external deps (graceful if no acoustic arrives); the
`Affect` shape is model-agnostic, so swapping the baseline for Hume is internal to `affect.ts`. The
thermometer is heuristic v1 — same interface an learned model will fill.
