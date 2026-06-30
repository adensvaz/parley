# Parley 🎯📞

**The AI cold-call copilot that never lets you freeze.**

Real-time copilot for real estate agents and B2B SDRs. It listens to both sides of a live cold
call and shows the rep, on a discreet always-on overlay: instant **objection rebuttals**, the **next
line to say**, **call-stage guidance**, **talk/listen coaching**, and **auto post-call CRM notes**.

Same engine class as Cluely (dual-stream audio capture → cloud LLM → content-protected overlay),
repointed from meeting-cheating to a 100% legitimate sales tool.

## Repo map
```
parley-desktop/
├── docs/
│   ├── ARCHITECTURE.md      ← system design + full module catalog (build status per module)
│   ├── CONTENT_STRATEGY.md  ← pillars, channels, 15 content ideas, lead magnets
│   └── MARKETING_HOOKS.md   ← taglines, positioning angles, viral mechanics, launch story
├── electron/                ← desktop client (overlay, shortcuts, audio capture, IPC)
│   ├── main.ts  preload.ts  audio.ts
├── server/                  ← cloud brain (realtime gateway, STT, copilot engine)
│   ├── gateway.ts  stt.ts  copilot.ts
├── shared/                  ← contracts shared across client/server
│   ├── types.ts  modes.ts   ← prospecting modes: Expired, FSBO, Circle, Buyer, SDR
└── src/                     ← React overlay UI
    ├── main.tsx  store.ts  styles.css
    └── copilot/CopilotOverlay.tsx  components/Cards.tsx
```

## Run (dev)
```bash
cp .env.example .env     # DEEPGRAM_API_KEY + OPENAI_API_KEY
npm install
npm run server           # realtime gateway :8787
npm run dev              # Electron overlay + Vite
```

## What's built vs. next
- ✅ Overlay engine, audio capture, realtime gateway, STT+diarization, copilot engine
  (objection match + stage machine + coach + LLM advisor + post-call), 5 prospecting modes, UI.
- 🟡 Next: CRM sync (FollowUpBoss/kvCORE/HubSpot), dialer webhooks (Mojo/PhoneBurner/Twilio),
  Clerk auth, Stripe billing, manager dashboard + call library, compliance (DNC/consent), RAG knowledge.
  Interfaces for all are defined in `docs/ARCHITECTURE.md`.
```
