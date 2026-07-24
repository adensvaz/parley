# parley-telephony-service

The **connection layer** for calls that don't originate on the desktop. Two more ways to plug in —
both converging on the exact same NATS transcript pipeline as `parley-gateway`, so `copilot-service`,
`analytics-service`, and `billing-service` never learn a new event shape.

```
                                   ┌─────────────── this service ───────────────┐
 ① Parley number (PSTN/SIP) ─Twilio Media Streams (WSS /media)─┐
 ② Zoom / Meet ──────────────bot / RTMS audio──────────────────┤─ openSession() ─ STT ─▶ NATS call.transcript ─▶ copilot
                                                                └───────────────── call.started (source) / call.ended
   (③ desktop dialer stays on parley-gateway — same events, source="desktop")
```

## Why a separate service
`parley-gateway` is the desktop's WSS edge. Telephony has a **different public contract** (provider
webhooks + media WSS, μ-law/8k audio) and a **different lifecycle** (a call can exist with no desktop
attached). Splitting keeps each edge simple and independently scalable — telephony scales on concurrent
media streams, the gateway on desktop sockets.

## Connection paths
| Path | Source tag | How audio arrives | Diarization |
|------|-----------|-------------------|-------------|
| Existing dialer | `desktop` | *(handled by parley-gateway)* | client-tagged |
| Parley virtual number | `pstn` / `sip` | Twilio Media Streams → `/media` (μ-law 8k) | `track`: inbound=prospect, outbound=rep |
| Zoom / Google Meet | `zoom` / `meet` | bot or RTMS → session (linear16 16k) | host=rep, others=prospect |

## API
- `POST /numbers { orgId, repId?, areaCode? }` → provisions a Parley number, stores the `org_numbers` mapping, emits `telephony.number_provisioned.v1`.
- `GET  /numbers?orgId=…` → the org's active numbers.
- `POST /voice` → **Twilio Voice webhook.** Resolves the dialed number → tenant (pre-auth, via the `telephony_resolve` SECURITY DEFINER fn), returns TwiML that forks both call legs to `/media`.
- `WSS  /media` → Twilio Media Streams; frames → `openSession().onAudio(speaker, pcm)`.
- `POST /zoom/join { orgId, repId, meeting }` → sends a listening bot into a live meeting.

## Env
`NATS_URL`, `DATABASE_URL`, `DEEPGRAM_API_KEY` (STT; no key → lifecycle still works, no transcript),
`PUBLIC_WSS_URL` (media WSS base, falls back to request host), `NUMBER_PROVIDER` (`twilio`|`telnyx`).

## Ownership
Owns the `org_numbers` table (0007 migration). Never touches another service's data — number→org
resolution is the one pre-tenant read, scoped to a single `SECURITY DEFINER` probe by exact key.
