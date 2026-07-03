# Parley — Engineering Leaps (first-principles moat)

Four VC worries → four engineering attacks. Each reframes a weakness into something a
feature-copying competitor cannot cheaply replicate. Two of these (§1, §4) are implemented
and proven in `parley-copilot-service/src/leaps/` with tests.

---

## Worry 1 — "Latency budget matters more than model IQ"
### Leap: Conversational speculative execution (branch prediction for calls)

**First principle:** a rebuttal must appear the instant the prospect *finishes* the objection.
Everyone else *reacts* — STT finalizes → LLM generates → render (600–1200ms). But a cold call is
a highly structured, near-Markov process: at each stage the set of likely next objections is small
(6–8) and known. So don't react — **predict and pre-compute.**

While the rep is talking (dead time for the copilot), we pre-warm the top-k rebuttals for the
objections most likely to come next. When STT confirms the objection, we serve from cache in ~0ms.
This is CPU branch prediction applied to conversation.

**Math.** Let objections at stage `s` be categorical with distribution `p_s` over `n≈8` classes.
Pre-warm the top-`k` by probability mass. Expected served-from-cache probability:

```
P(hit) = Σ_{i∈top-k} p_s(i)
```

Cold-call objection distributions are heavily skewed (Zipf-ish): the top 3 objections cover
~80–90% of occurrences. So with **k=3** we get `P(hit) ≈ 0.85`. Perceived latency:

```
E[latency] = P(hit)·t_cache + (1−P(hit))·t_llm
           ≈ 0.85·(5ms) + 0.15·(700ms) ≈ 109ms   (vs 700ms reactive → 6.4× faster)
```

Cost is bounded: `k` speculative generations per stage, throttled, and most are cache-reused across
calls of the same mode. Prewarm is free latency-wise (happens during rep speech).

**Beyond:** speculative decoding at the *token* level too — begin generating the rebuttal from the
partial transcript before `is_final`, discard if the prediction was wrong. Implemented in
`leaps/speculative.ts`.

---

## Worry 1b — "STT accuracy on noisy phone audio"
### Leap: Intent-spotting ≫ transcription. Dual-path ASR with contextual biasing.

**First principle:** we don't need a perfect transcript — we need to know *which objection* fired,
fast, on bad audio. Detecting one of 8 intents is a vastly easier problem than verbatim ASR.

Three stacked techniques:
1. **Parallel keyword-spotting (KWS).** A tiny wake-word-style model runs on-device *in parallel*
   with cloud ASR, tuned only to the current stage's objection triggers. It fires the intent in
   <100ms even when full ASR is still struggling with showroom noise.
2. **Per-stage contextual biasing.** Feed the ASR a biasing lexicon = exactly the trigger phrases
   for the active mode/stage (Deepgram `keyterm`/Whisper prompt). We boost recognition of the ~40
   phrases that matter instead of the whole language.
3. **Confidence-weighted fusion.** Fuse KWS + ASR with a calibrated confidence model; act on the
   objection when fused confidence crosses τ. Formally a likelihood-ratio test:

```
fire if   P(intent | KWS, ASR) ≥ τ ,   fused via  logit = w1·z_kws + w2·z_asr + b
```

Plus **speaker separation via rep voiceprint enrollment** — we know the rep's voice, so we subtract
it and isolate prospect audio even during crosstalk. Net: robustness comes from *problem reduction*
(intent, not words) + *redundancy* (two paths) — not from a bigger model. Latency stays flat on
bad audio.

---

## Worry 2 — "The proof. You need a measured +18% appointment rate."
### Leap: Build the randomized controlled trial *into the product*. Causal uplift as a feature.

**First principle:** you can't prove lift without a counterfactual. Most tools can't — they have no
control group. So **manufacture the counterfactual**: the product itself runs the experiment.

- **In-product RCT engine.** Randomly withhold the copilot on a configurable fraction of calls
  (interleaved within-rep, so rep skill is controlled for). This yields a clean treatment/control
  split → an unbiased ATE (average treatment effect) on appointment rate. That is *the Series-A slide*,
  generated automatically.
- **Per-rebuttal causal lift via doubly-robust estimation.** Because we log
  `(context, rebuttal_shown, outcome)`, we estimate each rebuttal's effect with IPW / doubly-robust
  estimators, not vibes:

```
τ̂_DR = (1/N) Σ [ (μ̂₁(xᵢ) − μ̂₀(xᵢ)) + Tᵢ(Yᵢ−μ̂₁)/ê(xᵢ) − (1−Tᵢ)(Yᵢ−μ̂₀)/(1−ê(xᵢ)) ]
```

  where `ê` is the propensity of showing that rebuttal and `μ̂` the outcome models. DR is consistent
  if *either* model is right → robust lift numbers.
- This flips the weakness into the moat: **Parley owns the only dataset with causal, per-rebuttal,
  per-market objection→outcome measurement.** Nobody can buy that; it's earned call by call.

---

## Worry 3 — "Window. Defense is data + speed, not features."
### Leap: The self-optimizing rebuttal policy (contextual bandit). Scripts don't compete with a policy.

**First principle:** "which rebuttal to show" is a decision under uncertainty with delayed, binary
reward (appointment set?). That is exactly a **contextual multi-armed bandit** — so make the product
*learn the optimal rebuttal per segment continuously* instead of shipping static scripts.

- **Thompson sampling** over rebuttal variants, context = `(objection, stage, market, lang, rep-style)`.
  Each arm keeps a Beta posterior on P(appointment | rebuttal, context); we sample and play the max.
- **Regret bound.** Thompson sampling achieves `O(√(KT log T))` regret — it provably converges to the
  best rebuttal per context, and the exploration cost is sublinear. In practice: within a few thousand
  calls per segment, each objection has a *measured* best rebuttal, auto-updating as the market shifts.
- **Why it's a moat:** a competitor can copy today's winning line, but not the *policy that keeps
  finding tomorrow's*. And it compounds: more calls → tighter posteriors → higher close rate → more
  seats → more calls. This is the flywheel with math behind it. Implemented in `leaps/bandit.ts`.

MENA edge stacks on top: separate posteriors per `lang=ar`, so the Arabic policy is independently
optimized — a market no SF competitor is even measuring.

---

## Worry 4 — "Invisible overlay is a legal liability."
### Leap: Reposition as *consent-native*. Turn compliance into a differentiator.

**First principle:** the overlay's value is "stays out of my screenshare," not "undetectable." So make
consent a first-class, provable part of the system:
- **Cryptographically logged consent + disclosure** per call (we already have `consent_records` +
  the compliance service). Two-party-consent states get an auto-disclosure nudge; the event is
  hash-chained and auditable.
- **On-device transcription mode** (local Whisper on Apple Silicon): "your calls never leave the
  device." A sales weapon in MENA/finance and a hard answer to the liability question.
- Drop "undetectable" from all copy. The overlay is a rep-convenience; the *moat* is the policy + data.

---

## The digital-twin bootstrap (solves bandit cold-start AND is a product)
The bandit needs data before you have customers. Build an **adversarial prospect simulator** (LLM
personas: the jaded expired-listing seller, the FSBO who won't pay commission). Reps train against it;
the bandit warms up on simulated `objection→outcome` episodes; you ship "Practice Mode" as a feature.
Cold-start solved with synthetic data, and a new acquisition surface created.

---

## Priority
1. **Bandit + speculative prefetch** (§4, §1) — the compounding moat + the latency win. *Implemented & proven.*
2. **In-product RCT + DR uplift** (§2) — the Series-A slide.
3. **Dual-path STT + voiceprint separation** (§1b) — robustness in the field.
4. **Prosody/close-window + whisper-in-ear scheduling** — the 10x demo.
