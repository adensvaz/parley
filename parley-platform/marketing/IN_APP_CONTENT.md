# Parley — In-App Content & Microcopy

The UX writing that ships inside the product. Same voice as the emails: confident, human, never robotic.
Copy is content, not decoration — every string should reduce hesitation or add momentum.

---

## Onboarding intro slides (in `product.html`)
1. **Meet Parley** — "The AI copilot that whispers the perfect line on every cold call — so you never freeze, never lose the appointment, and never wing it again."
2. **It hears the objection before you panic** — "Parley listens to both sides and hands you the proven rebuttal the instant the prospect pushes back." *(chips: Speculative · Self-optimizing)*
3. **Built for how you actually sell** — "Expired, FSBO, circle prospecting, SDR — each mode loads its own objections, script, and compliance profile. English & Arabic." *(chips: Compliant · Discreet)*
4. **Every call makes you better** — "Auto-scored, auto-logged to your CRM, follow-up drafted. Your manager sees the whole floor light up."

CTA progression: Continue → Continue → Continue → **Get started →**. Persistent **Skip intro →** top-right.

---

## Empty states (the moment before value)
| Screen | Copy |
|---|---|
| Copilot rail, pre-call | "The call is starting… Parley is pre-warming likely objections." |
| Call Library, no calls | "No calls yet. Your first live call shows up here — scored and searchable." |
| Manager dashboard, no data | "No calls on the floor yet. As your reps go live, their scores and appointments land here." |
| Modes, custom empty | "No custom modes yet. Build one and Parley loads your objections + script live." |
| Leads, none | "Connect your CRM and Parley shows you who you're calling before you dial." |

Rule: an empty state names the value that's about to appear, never just "nothing here."

---

## Live-call microcopy (the copilot rail)
- Objection card badge: **NOW** (red) — say this immediately.
- Speculative served: **⚡ pre-warmed · served in {{ms}}ms** — quietly shows the speed edge.
- Bandit-chosen: **🧠 bandit-chosen · +{{n}}% lift vs alternatives** — shows it's learning.
- Coach (over-talking): **🎯 You're talking too much — ask a question and let them talk.**
- Discreet toggle tooltip: "Stays out of your screen-share." *(never "undetectable")*

---

## Milestone moments (celebrate the behavior you want repeated)
| Trigger | Moment |
|---|---|
| First live call ends | "That's one. Every call from here makes Parley sharper — and you faster." |
| First appointment set | "🎉 Appointment set — with Parley in your ear. That's the whole point. Next call?" |
| 10th call | "10 calls in. Your objection reflexes are already faster. Keep going." |
| First 100-score call | "Perfect call. Appointment set, clean talk ratio, objections handled. Save it to your playbook?" |
| 5-day streak | "5 days dialing straight. This is how top producers are built." |

---

## Nudges (behavioral, gentle, dismissible)
- Idle 48h: "Your dialer's ready. One live call and you'll feel it."
- 5 calls, 0 appointments: "Let's fix the opener — watch a 40-sec teardown of a booked call."
- Talk ratio high 3× running: "You're doing most of the talking. Ask one more question — Parley will cue you."
- Trial day 10: "4 days left on your trial. You've booked {{appt_count}} appointments so far."

---

## Notifications (OS-level, opt-in)
- Appointment set: "Appointment booked ✓ — logged to {{crm}} and follow-up drafted."
- DNC requested: "Removed from your list ✓ — you're compliant."
- Manager digest (daily): "{{team}} booked {{appts}} appointments today. Top rep: {{rep}}."

---

## Toasts / confirmations (in `product.html`)
- "Sent & logged to FollowUpBoss ✓"
- "Booked in your calendar ✓"
- "Discreet mode on — hidden from screen-share"

---

## Upgrade / paywall moments (#91 in-app upsell — earned, not nagging)
- After 3 appointments on trial: "You've booked 3 appointments with Parley. Keep it for less than one showing's worth of gas — $99/mo."
- Team trigger (teammates detected): "3 agents at {{brokerage}} use Parley. Put them on one dashboard →"

Principle: never paywall mid-call. Upgrade prompts appear on the post-call high, tied to a number they just earned.
