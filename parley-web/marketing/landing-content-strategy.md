# Parley — Landing Page Content Strategy

**Concept:** "The Live Call" (product-as-hero, live-call simulation)
**Deliverable:** positioning + full sitemap + page-by-page briefs + finished hero copy
**Owner:** parley-web
**Status:** v1 draft

---

## 0. Positioning (the ground truth everything is built on)

**One-liner:** The real-time AI copilot that rides along on your cold calls and whispers the perfect next line.

**What it does:** Parley listens to *both sides* of a live cold call and feeds the rep — on a discreet, always-on desktop overlay — instant objection rebuttals, the exact next line to say, call-stage guidance, and live coaching. Managers get scoring, rollups, and a coaching dashboard. TCPA/DNC compliance and CRM sync are built in.

**Category:** Real-time sales copilot / live conversation intelligence (in-call, not post-call).

**ICP:**
| Persona | Role | Cares about | The pain we kill |
|---|---|---|---|
| **User** | SDR / BDR / ISA / inside-sales rep | Not freezing, hitting quota, sounding good live | Going blank on an objection; dead air; fumbling the close |
| **Champion** | Sales manager / floor lead | Team hitting number, ramping new reps | Can't be on every call; coaching doesn't stick |
| **Decision maker** | VP Sales / Head of Sales | Predictable pipeline, faster ramp | Long ramp times, inconsistent reps, tribal knowledge |
| **Financial buyer** | RevOps / VP Sales | ROI, per-seat cost vs. lift | Paying for tools reps don't use |

**Anti-persona:** Enterprise field sales with no cold-calling motion; solo founders making <10 calls/week.

**The wedge (why we win):** Everyone else grades the call *after* it's over. Gong and Chorus give you a report card on a call you already lost. Parley is *in the call, in real time* — it changes the outcome while the prospect is still on the line. Our real rivals are the real-time players (Balto, Cresta, Attention, Convin); our positioning against *them* is speed, the discreet overlay that works on any dialer, and compliance built for outbound.

**The metaphor (creative engine):** *A parley is a negotiation between two sides.* The name gives us the whole visual and narrative system — **both sides of the line**, and a third voice (Parley) whispering the winning move. Every page dramatizes this.

**Brand voice:** Sales-native, sharp, a little swagger. Sounds like the best rep on the floor, not a corporate SaaS brochure. Short sentences. Verbs. No "leverage synergies."

**Primary conversion action:** Book a demo (team motion) / Start free (self-serve rep).

---

## 1. The Creative Concept — "The Live Call"

> The landing page doesn't *describe* the product. It *is* the product, mid-call.

**The core mechanic:** The hero is a cold call in progress. The prospect's words stream in as a live transcript on one side of a center "waveform" spine; Parley's coaching cards slide in on the other side in real time — exactly what a rep sees over their shoulder. As you **scroll, the call advances through its stages** (Opener → Objection → Discovery → Close), and each section of the page is a *moment in the call where Parley saves the rep.*

**Why it's unorthodox & powerful:**
- **Show, don't tell.** Visitors *feel* the product working in the first 3 seconds instead of reading a feature list.
- **Scroll = call timeline.** A pinned call-stage progress bar turns scrolling into a narrative, not a brochure crawl.
- **Interactive proof.** An embedded "objection arcade" lets the visitor pick a brutal objection ("We have no budget," "Call me next quarter," "We already use a competitor") and watch Parley fire the rebuttal live — the single most shareable, addictive moment on the page.
- **The waveform spine** running down the center visually *is* the "both sides" metaphor, section after section.
- **Optional sound toggle** — actually *hear* the whisper. Most SaaS sites are silent; this one has a heartbeat.

**Signature interaction moments (build order of impact):**
1. Hero live-transcript + card stream (auto-plays, loops, respects `prefers-reduced-motion`).
2. Objection Arcade (click an objection → live rebuttal card). *This is the growth loop — make it embeddable/shareable.*
3. Scroll-driven call-stage rail.
4. "Both sides" split reveals per section.

---

## 2. Full Sitemap (Information Architecture)

Top nav: **Product ▾ · Solutions ▾ · Pricing · Customers · Resources ▾ · Company ▾** — with `Log in` + `Book a demo` (primary) + `Start free` (secondary).

```
/                                   Home — the Live Call simulation
│
├─ PRODUCT (hub + spokes)
│  /product                         How Parley works (overview hub)
│  /product/objection-handling      Instant, live objection rebuttals
│  /product/call-stage-guidance     Stage detection + the next line to say
│  /product/live-coaching           Whisper coaching + manager barge-in
│  /product/overlay                 The discreet always-on overlay (any dialer/softphone)
│  /product/analytics               Call scoring, rollups, coaching dashboard
│  /product/integrations            CRM + dialer sync (FollowUpBoss, kvCORE, HubSpot…)
│  /product/compliance              TCPA, DNC scrub, consent, retention
│  /product/security                SOC 2, encryption, tenant isolation (trust page)
│
├─ SOLUTIONS ([persona] + [use-case])
│  /solutions                       Hub
│  /solutions/sdr-teams             Outbound SDR/BDR teams
│  /solutions/inside-sales          Inside-sales floors / high-volume dialing
│  /solutions/real-estate           Real-estate ISAs (kvCORE / FollowUpBoss)
│  /solutions/sales-managers        For managers & coaches
│  /solutions/rep-onboarding        Ramp new reps 3× faster
│  /solutions/agencies-bpo          Call centers / BPO / outsourced SDR
│
├─ PRICING
│  /pricing                         Plans, entitlements, usage metering + ROI calculator
│
├─ CUSTOMERS
│  /customers                       Logos + results hub
│  /customers/[slug]                Case studies (Challenge → Solution → Results)
│
├─ RESOURCES (content pillars)
│  /resources                       Hub / blog index
│  /guides/cold-calling             PILLAR: the cold-calling guide (hub/spoke)
│  /resources/objection-library     The Objection Library (template/library, product-led)
│  /resources/cold-call-scripts     Script templates
│  /resources/roi-calculator        Standalone ROI tool
│  /resources/glossary              Sales-tech glossary (AI/LLM discovery)
│  /compare/parley-vs-balto         Comparison (consideration stage)
│  /compare/parley-vs-gong          Comparison — "real-time vs post-call" angle
│  /compare/parley-vs-cresta        Comparison
│  /blog/[slug]                     Articles
│
├─ COMPANY
│  /about                           Story + the "parley" thesis
│  /careers
│  /contact
│
├─ CONVERSION
│  /demo                            Book a demo (team motion)
│  /signup                          Start free (self-serve rep)
│  /login
│
└─ LEGAL / TRUST
   /security  /privacy  /terms  /dpa
```

---

## 3. Page-by-Page Briefs

### `/` Home — "The Live Call"
- **Job:** In 3 seconds, make the visitor *feel* Parley win a live objection. Convert to demo/free.
- **Sections (each = a call stage):**
  1. **Hero — "Ringing → Connected."** Live transcript + card stream. H1 + CTAs. (Full copy in §5.)
  2. **The Opener** — problem framing: "The moment they pick up, the clock starts." Card: perfect opener.
  3. **The Objection** — the Objection Arcade (interactive). "Watch it handle your worst objection."
  4. **Discovery** — stage guidance + next-line. "It always knows where the call is."
  5. **The Close** — coaching + "book the meeting" card.
  6. **After the call** — analytics/scoring + manager dashboard glimpse.
  7. **Both sides, one truth** — compliance & security trust strip (TCPA/DNC baked in).
  8. **Proof** — logos, a metric-forward testimonial, case-study teaser.
  9. **Objection-handling *your* objections** — mini FAQ that answers *buyer* objections (privacy, "is it creepy?", latency, dialer support).
  10. **Final CTA** — "Put Parley on your next call."
- **Primary CTA:** Book a demo · **Secondary:** Start free.

### `/product` (hub)
- **Job:** Explain the real-time engine simply; route to spokes. Reinforce "in-call, not post-call."
- Diagram: *You talk → Parley listens to both sides → card appears in <Xs.* Link every spoke.

### Product spokes
- **/objection-handling** — the flagship. Live rebuttals, objection library preview, "trained on your best rebuttals."
- **/call-stage-guidance** — detects stage, surfaces the next line, keeps reps on-script without sounding scripted.
- **/live-coaching** — whisper coaching, manager barge/takeover, ramp reps in real calls.
- **/overlay** — the discreet always-on desktop overlay; works over *any* dialer/softphone; stays hidden on screen-share.
- **/analytics** — call scoring, rollups, what's working across the floor.
- **/integrations** — CRM + dialer grid; FollowUpBoss, kvCORE, HubSpot named; "syncs the lead before you dial."
- **/compliance** — TCPA, DNC scrub *before* dial, consent, retention windows. (Differentiator vs. generic tools.)
- **/security** — SOC 2 path, encryption at rest/in transit, per-tenant isolation, mTLS between services. Buyer-trust page.

### Solutions (persona × use-case — long-tail SEO + sales relevance)
- **/sdr-teams**, **/inside-sales**, **/real-estate**, **/sales-managers**, **/rep-onboarding**, **/agencies-bpo** — each: their pain, the specific Parley moment that fixes it, a tailored proof point, a CTA. Real-estate page leans on kvCORE/FollowUpBoss.

### `/pricing`
- Per-seat plans + usage metering transparency; ROI calculator ("one saved deal pays for the year"); FAQ handling procurement objections; demo + free CTAs.

### `/customers` + `/customers/[slug]`
- Hub with logos + headline metrics. Case studies: **Challenge → Solution → Results → Key learnings**, metric-first (connect rate, objection-win rate, ramp time, quota attainment).

### Resources (content pillars — see §4)
- **/guides/cold-calling** pillar page anchoring the cluster; **/resources/objection-library** as the product-led, high-intent library; comparison pages for the consideration stage.

### Company / Legal
- **/about** tells the "parley = two sides negotiating" thesis. Standard trust/legal set.

---

## 4. Content Pillars & Buyer-Stage Keyword Map

**Pillars (topics Parley will own):**
1. **Objection handling** — product-led + massive intent ("how to handle the "we have no budget" objection"). Feeds the Objection Library.
2. **Cold-calling mastery & scripts** — audience-led, high volume; the `/guides/cold-calling` pillar.
3. **Sales coaching & rep ramp** — the manager persona; ties to /live-coaching + /rep-onboarding.
4. **Real-time sales tech (category creation)** — "real-time vs post-call," comparisons, thought leadership. This is where we *name the category* and win against Gong-style post-call tools.
5. **Outbound compliance (TCPA/DNC)** — differentiator + real-estate relevance.

**Keyword map by buyer stage:**
| Stage | Modifiers | Example targets | Lands on |
|---|---|---|---|
| Awareness | what is / how to / guide | "how to handle sales objections," "cold calling tips" | /guides/cold-calling, /blog |
| Consideration | best / vs / alternatives | "best real-time sales coaching software," "Balto alternatives," "Gong vs real-time coaching" | /compare/*, /solutions/* |
| Decision | pricing / demo / reviews | "Parley pricing," "real-time call coaching demo" | /pricing, /demo |
| Implementation | templates / examples / setup | "cold call script template," "objection rebuttal examples" | /resources/objection-library, /resources/cold-call-scripts |

**Each pillar piece must be searchable, shareable, or both** — search first. The Objection Library is the flagship *searchable + product-led* asset; the "real-time vs post-call" thesis is the flagship *shareable* asset.

---

## 5. Finished Hero Copy (Home)

**Eyebrow (status pill, animates "● Ringing…" → "● Connected"):**
> ● Live on the call

**H1:**
> **Whisper the perfect line.
> On every cold call. In real time.**

**Subhead:**
> Parley listens to both sides of your live calls and feeds your reps the exact rebuttal, the next line, and the coaching to close — on a discreet overlay only they can see. The prospect never knows. Your number does.

**Primary CTA:** `Book a demo`  ·  **Secondary CTA:** `Start free — no card`

**Trust line (under CTAs):**
> Works over any dialer · TCPA & DNC built in · Live in minutes

**Live-simulation UI copy (the animated hero panel):**

*Transcript — prospect side (streams in):*
> **Prospect:** "Honestly? We already use [Competitor]. We're not looking to switch."

*Parley card — whispers in (<1s later):*
> 🎯 **OBJECTION — Incumbent**
> "Totally fair — most of our best customers said the same thing before they saw the one thing [Competitor] can't do. Worth 9 minutes to see if it even applies to you?"
> *Next: book the 9-min, don't pitch.*

*Call-stage rail (pinned, left):* `Opener → ● Objection → Discovery → Close`

**Micro-tagline (sub-hero, sets the whole page up):**
> Scroll down. You're on a live call.

**Social proof strip (logos + one line):**
> Trusted by outbound teams who live and die by the phone.
> *"Our new reps ramp in two weeks instead of two months." — [Name], VP Sales, [Company]*

---

## 6. Alternate H1s (for A/B testing)
1. "Never freeze on a cold call again."
2. "Your reps will never blank on an objection again."
3. "The copilot that's *in* the call — not the report card after it."
4. "Every rep sounds like your best rep. Live."
5. "Win the call while they're still on the line."

---

## 7. What to build next (recommended order)
1. Approve positioning + concept (this doc).
2. Build the **Home hero** live-sim as a working component (I can generate the animated HTML/React).
3. Ship the **Objection Arcade** as the shareable growth loop.
4. Stand up `/product/objection-handling` + `/pricing` + `/demo` (the money path).
5. Seed the **Objection Library** (searchable, product-led SEO) and the **"real-time vs post-call"** thesis (shareable).

> Foundational positioning here should be promoted to `.agents/product-marketing.md` so every other marketing skill (copywriting, cro, ads, seo-audit) generates against the same source of truth.
