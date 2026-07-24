# Parley — Full Site Architecture

**Scope:** every page, every section, with its own sub-sitemap and page briefs.
**Site type:** Hybrid SaaS + content (3–4 levels deep).
**Method:** `site-architecture` + `content-strategy` skills.
**Companion docs:** `landing-content-strategy.md` (positioning + hero), `parley-landing-design.html` (design).

---

## 0. Four distinct section types (this is the key decision)

These were being conflated. They are **different pages with different jobs and different keywords**:

| Section | Answers | Organizing axis | Buyer stage | Example |
|---|---|---|---|---|
| **How It Works** | *"How does it actually do this?"* | Product mechanics / features | Consideration | `/how-it-works/live-overlay` |
| **Solutions** | *"Is this for someone like me?"* | Persona / team type | Consideration | `/solutions/sdr-teams` |
| **Use Cases** | *"Will it solve my specific problem?"* | Job / real scenario (JTBD) | Awareness → Consideration | `/use-cases/handle-objections-live` |
| **Resources** | *"Teach me / prove it."* | Content pillars, SEO | Awareness → Decision | `/guides/cold-calling` |

Every one of these gets **its own hub page + its own spoke pages + its own sub-sitemap** below.

---

## 1. Global navigation

**Primary nav:** `How it works ▾ · Solutions ▾ · Use cases ▾ · Pricing · Resources ▾ · Customers`
**Right side:** `Log in` · **Book a demo** (primary) · `Start free` (secondary)
**Footer nav:** full link map of every section (see §8).

**IA principles applied:**
- **3-click rule** — every money page (`/pricing`, `/demo`, `/how-it-works/*`) reachable in ≤3 clicks.
- **Flat where possible** — max depth is L3 except the two programmatic clusters (objections, scripts) at L3.
- **One canonical home per topic** — a topic lives in exactly one section; the others *link* to it, never duplicate it. (e.g. objection handling: mechanics live in How It Works, the scenario in Use Cases, the SEO library in Resources — three angles, cross-linked, not three copies.)

---

## 2. Master sitemap (all sections)

```
Home (/)
│
├── How it works (/how-it-works)               ← PRODUCT MECHANICS
│   ├── /how-it-works/live-overlay
│   ├── /how-it-works/objection-rebuttals
│   ├── /how-it-works/call-stage-detection
│   ├── /how-it-works/live-coaching
│   ├── /how-it-works/call-scoring
│   ├── /how-it-works/integrations
│   ├── /how-it-works/compliance
│   └── /how-it-works/security
│
├── Solutions (/solutions)                     ← BY PERSONA / TEAM
│   ├── /solutions/sdr-teams
│   ├── /solutions/inside-sales
│   ├── /solutions/real-estate-isa
│   ├── /solutions/sales-managers
│   ├── /solutions/rep-onboarding
│   └── /solutions/agencies-bpo
│
├── Use cases (/use-cases)                     ← BY REAL SCENARIO / JTBD
│   ├── /use-cases/handle-objections-live
│   ├── /use-cases/ramp-new-reps
│   ├── /use-cases/qualify-and-discovery
│   ├── /use-cases/book-more-meetings
│   ├── /use-cases/call-qa-and-scoring
│   ├── /use-cases/compliant-cold-calling
│   ├── /use-cases/auto-log-to-crm
│   └── /use-cases/objections/                 ← programmatic scenario cluster
│       ├── …/not-interested
│       ├── …/no-budget
│       ├── …/call-me-later
│       ├── …/already-use-a-competitor
│       ├── …/send-me-an-email
│       └── …/gatekeeper
│
├── Pricing (/pricing)   ├── #roi-calculator
│
├── Resources (/resources)                     ← CONTENT / SEO
│   ├── /blog  →  /blog/[slug]
│   ├── /guides/cold-calling                   (pillar)
│   ├── /resources/objection-library  →  …/[objection]
│   ├── /resources/cold-call-scripts  →  …/[industry]
│   ├── /resources/roi-calculator
│   ├── /resources/glossary
│   └── /compare/  → parley-vs-balto · parley-vs-gong · parley-vs-cresta
│
├── Customers (/customers)  →  /customers/[slug]
│
└── Company (/about · /careers · /contact)  +  Trust (/security · /privacy · /terms · /dpa)
```

**Total: ~55 pages** (excluding blog posts + programmatic leaves that scale).

---

## 3. Section: HOW IT WORKS  `/how-it-works`

> Job: prove the *mechanics* to a skeptical buyer. "Real-time, both sides, <1s, works on any dialer, compliant."

### Sub-sitemap
```
/how-it-works (hub — the real-time engine)
├── /live-overlay              the discreet always-on desktop overlay
├── /objection-rebuttals       instant rebuttal engine (trained on your best lines)
├── /call-stage-detection      knows the stage, surfaces the next line
├── /live-coaching             whisper coaching + manager barge-in
├── /call-scoring              after the call: scoring, rollups, dashboards
├── /integrations              CRM + dialer/softphone sync
├── /compliance                TCPA, DNC scrub, consent, retention
└── /security                  encryption, tenant isolation, SOC 2 path
```

### Page briefs
**`/how-it-works` (hub)**
- Purpose: one-screen mental model — *You talk → Parley hears both sides → card in <1s.* Route to spokes.
- H1: "How Parley rides along on every call."
- Sections: the 3-step diagram · the 4 core moments (rebuttal/stage/coaching/score) · "works on any dialer" · latency claim · security strip · CTA.
- Meta title: `How Parley Works — Real-Time Cold Call Copilot`
- Meta desc: "See how Parley listens to both sides of a live call and whispers the next line in under a second — on any dialer, fully compliant."
- Primary CTA: Book a demo · Links → every spoke, /pricing.

**`/how-it-works/live-overlay`** — Purpose: kill "is it clunky/visible?" fear. H1: "A copilot only your rep can see." Sections: how it stays hidden on screen-share, works over any dialer/softphone, hotkeys, latency. Meta: `The Parley Overlay — Discreet, Always-On Call Copilot`. CTA: Start free.

**`/how-it-works/objection-rebuttals`** ★ flagship — Purpose: the core value. H1: "The perfect rebuttal, before the pause gets awkward." Sections: live detection, trained on your winning lines, the card anatomy, example gallery. Links → Use Cases/handle-objections-live, Resources/objection-library. Meta: `Real-Time Objection Handling — Parley`.

**`/how-it-works/call-stage-detection`** — H1: "It always knows where the call is." Sections: stage rail (Opener→Objection→Discovery→Close), next-line prompts, staying on-script without sounding scripted.

**`/how-it-works/live-coaching`** — H1: "Coach every call. Without being on every call." Sections: whisper coaching, manager barge/takeover, real-time nudges. Links → Solutions/sales-managers.

**`/how-it-works/call-scoring`** — H1: "Every call, scored the moment it ends." Sections: auto-scoring, rollups, dashboards, what-good-looks-like. Links → Use Cases/call-qa-and-scoring.

**`/how-it-works/integrations`** — H1: "Syncs the lead before you dial." Sections: CRM grid (FollowUpBoss, kvCORE, HubSpot…), dialer/softphone support, auto-logging. Links → Use Cases/auto-log-to-crm.

**`/how-it-works/compliance`** — H1: "Built for outbound. Built for TCPA." Sections: DNC scrub *before* dial, consent capture, call windows, retention. Links → Use Cases/compliant-cold-calling.

**`/how-it-works/security`** — H1: "Your calls, locked down." Sections: encryption in transit/at rest, per-tenant isolation (RLS), mTLS between services, SOC 2 path. Buyer-trust. Links → /dpa, /privacy.

---

## 4. Section: SOLUTIONS  `/solutions`

> Job: self-identification — "this is for a team like mine." Persona-led. Each page = their pain → the exact Parley moment → tailored proof → CTA.

### Sub-sitemap
```
/solutions (hub — pick your team)
├── /solutions/sdr-teams          outbound SDR/BDR orgs
├── /solutions/inside-sales       high-volume inside-sales floors
├── /solutions/real-estate-isa    real-estate ISAs (kvCORE/FollowUpBoss)
├── /solutions/sales-managers     managers & coaches (dashboard, QA)
├── /solutions/rep-onboarding     ramp new reps 3× faster
└── /solutions/agencies-bpo       call centers / outsourced SDR / BPO
```

### Page briefs (each follows one template)
> **Template:** H1 (persona + payoff) · their world today (pain) · the moment Parley changes · features that matter *to them* (link to How It Works) · tailored proof/metric · objection-buster · CTA.

- **`/solutions/sdr-teams`** — H1: "Turn every SDR into your best SDR." Pain: inconsistent reps, long ramp, missed objections. Proof: connect→meeting rate. Meta: `Parley for SDR Teams — Real-Time Cold Call Coaching`.
- **`/solutions/inside-sales`** — H1: "High-volume calling, without the drop-off." Pain: fatigue, script drift. Metric: talk-time efficiency.
- **`/solutions/real-estate-isa`** — H1: "Book more appointments from your lead pond." Pain: speed-to-lead, objection-heavy seller calls. Integrations hero: kvCORE + FollowUpBoss. Meta: `Parley for Real Estate ISAs — Live Call Copilot`.
- **`/solutions/sales-managers`** — H1: "Coach the whole floor. In real time." Pain: can't be on every call; coaching doesn't stick. Links → How It Works/live-coaching + call-scoring.
- **`/solutions/rep-onboarding`** — H1: "New reps ramp in 2 weeks, not 2 months." Pain: slow ramp, tribal knowledge. Links → Use Cases/ramp-new-reps.
- **`/solutions/agencies-bpo`** — H1: "Consistent quality across every seat, every client." Pain: scale, QA, multi-account. Links → How It Works/call-scoring + security.

---

## 5. Section: USE CASES  `/use-cases`

> Job: match a *specific real problem* to Parley — the "real usecases" you asked for. JTBD/scenario-led, high awareness-stage search value. Includes a **programmatic objection-scenario cluster**.

### Sub-sitemap
```
/use-cases (hub — what do you need to fix?)
├── /use-cases/handle-objections-live      never freeze on an objection
├── /use-cases/ramp-new-reps               ramp reps fast
├── /use-cases/qualify-and-discovery       ask the right discovery questions
├── /use-cases/book-more-meetings          convert dials → booked meetings
├── /use-cases/call-qa-and-scoring         QA & score 100% of calls
├── /use-cases/compliant-cold-calling      dial without TCPA risk
├── /use-cases/auto-log-to-crm             kill manual call logging
└── /use-cases/objections/                 ← PROGRAMMATIC scenario pages
    ├── /not-interested
    ├── /no-budget
    ├── /call-me-later
    ├── /already-use-a-competitor
    ├── /send-me-an-email
    └── /gatekeeper
```

### Page briefs
> **Template:** H1 (the problem, in their words) · what it costs them today · the live Parley moment (mini live-call sim) · how it works under the hood (link to How It Works) · who it's for (link to Solutions) · proof · CTA.

- **`/use-cases/handle-objections-live`** ★ — H1: "Never blank on an objection again." Awareness keyword magnet. Links → How It Works/objection-rebuttals, Resources/objection-library.
- **`/use-cases/ramp-new-reps`** — H1: "Put your playbook in every new rep's ear." Metric: time-to-first-meeting.
- **`/use-cases/qualify-and-discovery`** — H1: "Ask the question that moves the deal." Sections: live discovery prompts, MEDDIC/BANT nudges.
- **`/use-cases/book-more-meetings`** — H1: "More dials into booked meetings." The close moment.
- **`/use-cases/call-qa-and-scoring`** — H1: "Score 100% of calls, not 2%." For managers/QA. Links → How It Works/call-scoring.
- **`/use-cases/compliant-cold-calling`** — H1: "Dial hard. Stay compliant." Links → How It Works/compliance.
- **`/use-cases/auto-log-to-crm`** — H1: "Stop typing call notes." Links → How It Works/integrations.

**Programmatic objection cluster `/use-cases/objections/[objection]`**
- One page per common objection (scalable via `programmatic-seo` skill). Each: the objection verbatim as H1 ("'We're not interested' — how to respond"), why it happens, 3–5 rebuttal frameworks, the exact line Parley whispers, an interactive mini-arcade, CTA. High-intent long-tail; feeds the Objection Library in Resources. Template-driven so 6 → 60 pages later.

---

## 6. Section: RESOURCES  `/resources`

> Job: the SEO + trust flywheel — searchable (capture demand) and shareable (create demand). Content pillars from `content-strategy`.

### Sub-sitemap
```
/resources (hub / content index)
├── /blog  →  /blog/[slug]                     articles
├── /guides/cold-calling                       PILLAR (hub/spoke guide)
│     └── spoke articles interlink back to pillar
├── /resources/objection-library               product-led library
│     └── /resources/objection-library/[objection]
├── /resources/cold-call-scripts               script templates
│     └── /resources/cold-call-scripts/[industry]
├── /resources/roi-calculator                  standalone tool (lead gen)
├── /resources/glossary                        sales-tech terms (AI/LLM discovery)
└── /compare/                                   consideration-stage
      ├── /compare/parley-vs-balto
      ├── /compare/parley-vs-gong               "real-time vs post-call" thesis
      └── /compare/parley-vs-cresta
```

### Content pillars (own these topics)
1. **Objection handling** → objection-library + /use-cases/objections (product-led, high intent).
2. **Cold-calling mastery & scripts** → /guides/cold-calling pillar + /cold-call-scripts.
3. **Sales coaching & rep ramp** → manager-persona articles.
4. **Real-time sales tech (category creation)** → /compare/* + "real-time vs post-call" thesis (shareable).
5. **Outbound compliance (TCPA/DNC)** → differentiator + real-estate.

### Page briefs
- **`/guides/cold-calling`** — Pillar page: comprehensive guide, links out to 8–12 spoke articles, each linking back. Meta: `The Complete Guide to Cold Calling (2026)`.
- **`/resources/objection-library`** ★ — Searchable + product-led flagship. Grid of objections → each a `/[objection]` leaf with rebuttals + "hear Parley's version." Cross-links to /use-cases/objections and /how-it-works/objection-rebuttals.
- **`/resources/cold-call-scripts`** — Template library (high-intent "cold call script template"); `/[industry]` leaves (real-estate, SaaS, insurance…). Immediate standalone value + shows the product.
- **`/resources/roi-calculator`** — Interactive tool ("one saved deal pays for the year"); email-gated report → lead gen.
- **`/resources/glossary`** — Definitional pages, structured for AI/LLM citation (ai-seo skill).
- **`/compare/parley-vs-[x]`** — Decision stage. `parley-vs-gong` leads on the *"in-call vs after-call"* wedge.

---

## 7. Remaining sections (brief)

- **Pricing** `/pricing` — plans + usage metering + `#roi-calculator` anchor + procurement FAQ. Money page.
- **Customers** `/customers` → `/customers/[slug]` — logos hub + case studies (Challenge→Solution→Results, metric-first).
- **Company** — `/about` (the "parley = two sides" thesis), `/careers`, `/contact`.
- **Trust/legal** — `/security`, `/privacy`, `/terms`, `/dpa`.
- **Convert** — `/demo`, `/signup`, `/login`.

---

## 8. Footer link map (every section surfaced)

| Product | Solutions | Use cases | Resources | Company |
|---|---|---|---|---|
| How it works | SDR teams | Handle objections | Blog | About |
| Live overlay | Inside sales | Ramp new reps | Cold-calling guide | Customers |
| Objection rebuttals | Real estate ISA | Qualify & discovery | Objection library | Careers |
| Call scoring | Sales managers | Book more meetings | Scripts | Contact |
| Integrations | Rep onboarding | Call QA & scoring | ROI calculator | Security |
| Compliance | Agencies / BPO | Compliant calling | Compare | Privacy · Terms · DPA |
| Pricing | | Auto-log to CRM | Glossary | |

---

## 9. URL & linking rules

- **Lowercase, hyphenated, no trailing slash.** Section-first: `/section/page`.
- **Programmatic clusters** live under a clear parent: `/use-cases/objections/[x]`, `/resources/cold-call-scripts/[industry]`, `/compare/parley-vs-[x]`.
- **Canonical topic ownership** (avoid cannibalization): objection *mechanics* → How It Works; objection *scenario* → Use Cases; objection *reference/SEO* → Resources. Cross-link the trio, never duplicate.
- **Breadcrumbs** on all L2/L3 pages: `Home › Use cases › Handle objections live`.
- **Every spoke links up to its hub and sideways to its 2–3 nearest siblings.**

---

## 10. sitemap.xml (technical SEO — for `seo-audit`/dev)

Generate a single `/sitemap.xml` (or a sitemap index if it grows) partitioned by section for crawl clarity:

```
/sitemap.xml  (index)
 ├── /sitemap-core.xml        home, how-it-works/*, solutions/*, pricing, demo, signup
 ├── /sitemap-use-cases.xml   use-cases/* + use-cases/objections/*
 ├── /sitemap-resources.xml   blog/*, guides/*, objection-library/*, scripts/*, compare/*, glossary
 └── /sitemap-company.xml     customers/*, about, careers, contact, legal
```
- `changefreq`: weekly for blog/resources, monthly for product/solutions, yearly for legal.
- `priority`: 1.0 home · 0.9 how-it-works hub, pricing, use-case hubs · 0.8 spokes · 0.6 leaves.
- Programmatic clusters auto-added on publish. Exclude `/login`, thank-you, and gated pages.
- (This is the *technical* sitemap for crawlers — distinct from the *visual* sitemaps above, which are for humans/IA.)

---

## 11. Build order (money-first, then flywheel)

1. **Home** (live-sim) + **/how-it-works** hub + **/pricing** + **/demo** — the conversion path.
2. **/how-it-works/objection-rebuttals** + **/use-cases/handle-objections-live** — the flagship story.
3. **/solutions** hub + top 2 persona pages (sdr-teams, real-estate-isa).
4. **Resources flywheel:** /guides/cold-calling pillar + /resources/objection-library + /compare/parley-vs-gong.
5. **Programmatic clusters:** /use-cases/objections/* and /resources/cold-call-scripts/* (via `programmatic-seo`).
6. **Customers** case studies as proof lands.

> Promote positioning into `.agents/product-marketing.md` (run `/product-marketing`) so `/copywriting`, `/cro`, `/seo-audit`, `/ads` all generate every one of these pages against the same source of truth.
```
