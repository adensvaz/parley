# Parley — Architecture & Module Catalog

**Parley** is a real-time cold-call AI copilot for real estate agents and sales reps.
It is the Cluely engine (dual-stream audio capture → cloud LLM → discreet always-on
overlay streaming answers back) repointed at outbound calling.

The rep dials from a power dialer (Mojo, BatchDialer, PhoneBurner, Vulcan7, Twilio,
Aircall) on their Mac. Parley taps the OS audio so it works with *any* dialer, hears
both sides of the call, and renders live guidance on a frameless overlay that only the
rep sees.

> Why this is legitimate where Cluely is gray: the copilot assists **your** side of a
> call you are already a party to. No deception of the prospect, no two-party-consent
> trap (we add a recording-disclosure module anyway). The "invisible" overlay just
> means it stays out of your way on screen.

---

## 1. System shape (thin client + cloud brain)

```
┌─ Rep's Mac (Electron) ─────────────────────┐        ┌─ Parley Cloud ─────────────────┐
│  MAIN PROCESS                              │        │  Realtime Gateway (WSS)         │
│   • Overlay window manager                 │  WSS   │   • STT (Deepgram streaming)    │
│   • Global shortcuts                       │ <────> │   • Diarization (rep/prospect)  │
│   • Audio engine: mic + system loopback    │ audio  │   • Copilot engine (LLM stream) │
│   • Screen-pop (optional screenshot)       │ frames │   • Objection + stage detection │
│  RENDERER (React + TanStack Router)        │ <────> │   • Knowledge / RAG retrieval   │
│   • Live transcript / objection cards      │ cards  │  REST API                       │
│   • Script guide / coach cues / lead panel │        │   • CRM sync, dialer webhooks   │
│   • Post-call summary                      │        │   • Compliance (DNC, consent)   │
└────────────────────────────────────────────┘        │  Clerk (auth) · Stripe (billing)│
                                                       └─────────────────────────────────┘
```

Audio path: rep mic (node-record-lpcm16 → LPCM16) + prospect voice (Electron
`setDisplayMediaRequestHandler` → `audio: "loopback"`, system audio via ScreenCaptureKit)
are streamed as 16kHz PCM frames over a single WebSocket. The gateway transcribes,
diarizes, runs the copilot loop, and streams back structured `CopilotCard` events.

---

## 2. Module catalog

### A. Core platform (reused from the Cluely-class engine)
| # | Module | File | Status |
|---|--------|------|--------|
| A1 | Overlay / window manager (frameless, always-on-top, content-protection) | `electron/main.ts` | ✅ coded |
| A2 | Global shortcuts / keybinds | `electron/main.ts` | ✅ coded |
| A3 | Audio capture engine (mic + system loopback) | `electron/audio.ts` | ✅ coded |
| A4 | Realtime transport (WS client, reconnect, framing) | `electron/preload.ts` + renderer | ✅ coded |
| A5 | Screen-pop context (optional screenshot of CRM) | `electron/main.ts` | 🟡 stubbed |
| A6 | Auth (Clerk) | `src/auth/*` | 🟡 spec |
| A7 | Auto-update (electron-updater) | `electron/main.ts` | 🟡 spec |

### B. AI / Copilot (the new value)
| # | Module | File | Status |
|---|--------|------|--------|
| B1 | Live transcription (Deepgram streaming) | `server/stt.ts` | ✅ coded |
| B2 | Diarization (rep vs prospect channel-split) | `server/stt.ts` | ✅ coded |
| B3 | Objection detection + rebuttal engine | `server/copilot.ts` | ✅ coded |
| B4 | Call-stage state machine + script guide | `server/copilot.ts` | ✅ coded |
| B5 | Real-time coach cues (talk ratio, pace, monologue, sentiment) | `server/copilot.ts` | ✅ coded |
| B6 | Knowledge / RAG (scripts, comps, market stats) | `server/knowledge.ts` | 🟡 stubbed |
| B7 | Answer generation (LLM streaming) | `server/copilot.ts` | ✅ coded |

### C. CRM / data
| # | Module | File | Status |
|---|--------|------|--------|
| C1 | Lead context panel (FollowUpBoss, kvCORE, HubSpot, Salesforce) | `server/crm.ts` | 🟡 spec |
| C2 | Dialer integration (Mojo, BatchDialer, PhoneBurner, Twilio, Aircall) | `server/dialer.ts` | 🟡 spec |
| C3 | Post-call: summary, disposition, follow-up draft, CRM log | `server/copilot.ts` (postCall) | ✅ coded |
| C4 | Local market data (comps, AVM, schools) | `server/knowledge.ts` | 🟡 spec |

### D. Management / team / compliance
| # | Module | File | Status |
|---|--------|------|--------|
| D1 | Modes (prospecting-type prompt presets) | `shared/modes.ts` | ✅ coded |
| D2 | Scorecard & analytics (per rep / per call) | `server/analytics.ts` | 🟡 spec |
| D3 | Manager dashboard + call library | web app | 🟡 spec |
| D4 | Compliance (recording consent, DNC scrub, TCPA, call windows) | `server/compliance.ts` | 🟡 stubbed |
| D5 | Billing / plans (Stripe + Clerk) | web app | 🟡 spec |

Legend: ✅ real code shipped in this scaffold · 🟡 interface defined, ready to build out.

---

## 3. Prospecting Modes (the "Modes" tab, repointed)
Instead of Cluely's interview modes, Parley ships sales-call presets. Each = a system
prompt + objection library + script skeleton + summary template. See `shared/modes.ts`.

- **Expired Listings** — listing failed to sell; empathy + "what went wrong" + relist.
- **FSBO** — for-sale-by-owner; respect their effort, sell representation value.
- **Circle Prospecting** — "just listed / just sold" neighborhood calls.
- **Buyer Lead Follow-up** — internet leads, speed-to-lead, qualify + appointment.
- **Sphere / Past Clients** — referral + reconnect.
- **Investor / Wholesaler** — motivation, numbers, creative terms.
- **General SDR Cold Call** — B2B outbound, pattern-interrupt + discovery.

---

## 4. Run
```bash
cp .env.example .env      # add DEEPGRAM_API_KEY + OPENAI_API_KEY (or ANTHROPIC_API_KEY)
npm install
npm run server            # starts the realtime gateway on :8787
npm run dev               # starts Electron + Vite renderer
```
