// Parley — full site content model. Every page lives here.
export const SITE = 'https://parley-live.netlify.app';

const DEMO = ['Book a demo', '/demo/', 'pri'];
const FREE = ['Try 2 calls free', '/signup/', 'sec'];
const CTAS = [DEMO, FREE];
const home = { label: 'Home', href: '/' };
const finalCta = (h2 = 'Put Parley on your next call.', sub = 'See it handle a live objection in a 20-minute demo — or try it free on your next 2 calls.') => ({ type: 'cta', h2, sub, ctas: CTAS });
const box = (title, sub) => `<div style="padding:10px"><div class="mono" style="color:var(--green);margin-bottom:8px">${title}</div><div class="body" style="font-size:14px">${sub}</div></div>`;
// Voice Behaviour Analysis panel — the live premium read (momentum / rapport / strain).
const vbBar = (label, valuePct, valueText, tint = 'var(--green)', center = false) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font:500 12px/1 var(--mono);color:var(--mut);margin-bottom:6px"><span>${label}</span><span style="color:${tint}">${valueText}</span></div><div style="position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden">${center ? '<span style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--dim)"></span>' : ''}<i style="position:absolute;top:0;${center ? 'left:50%' : 'left:0'};height:100%;width:${valuePct}%;background:${tint}"></i></div></div>`;
const voicePanel = () => `<div style="padding:4px 6px">
  <div style="display:flex;justify-content:space-between;align-items:center;font:500 11px/1 var(--mono);letter-spacing:.16em;color:var(--violet);margin-bottom:12px"><span>VOICE INTELLIGENCE · LIVE</span><span style="color:var(--dim)">03:12</span></div>
  <div style="font-size:15px;line-height:1.45;color:var(--txt);margin-bottom:16px">“Warming fast — the two voices are syncing. Keep pulling and go for the ask while it’s hot.”</div>
  ${vbBar('Momentum · cold → hot', 50, '+100', 'var(--green)', true)}
  ${vbBar('Rapport · voice sync', 73, '73', 'var(--green)')}
  ${vbBar('Vocal strain', 6, '6', 'var(--amber)')}
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px">${['heating up', 'rapport building', 'highly engaged'].map(t => `<span style="font:500 11px/1 var(--mono);color:var(--mut);border:1px solid var(--line2);border-radius:999px;padding:6px 11px">${t}</span>`).join('')}</div>
</div>`;
const miniEq = (n = 16) => '<div class="eq">' + Array.from({ length: n }, (_, i) => `<i style="height:${28 + ((i * 37) % 52)}%;animation-duration:${680 + ((i * 61) % 420)}ms;animation-delay:-${(i * 53) % 800}ms"></i>`).join('') + '</div>';
// the "dead air" pause panel — visualizes the problem
const pausePanel = `<div class="panel"><div class="panel-hd"><div style="display:flex;gap:8px;align-items:center"><span class="dot red"></span><span class="mono" style="color:var(--txt)">Live call · 00:47</span></div><span class="mono dim">the pause</span></div><div class="panel-bd"><div class="side" style="color:var(--blue);margin-top:0">Prospect</div><div class="bubble pros">“We already use someone. Not looking to switch.”</div><div class="side" style="color:var(--red)">Rep</div><div class="bubble" style="background:rgba(255,77,109,.08);border:1px solid rgba(255,77,109,.3);color:var(--mut);border-bottom-left-radius:4px">…uh… okay… thanks for your time.</div><div style="text-align:center;margin-top:14px"><span class="tag" style="color:var(--red);border-color:rgba(255,77,109,.4)">3 seconds of dead air = deal lost</span></div></div></div>`;
// the "win" panel — Parley saves the moment
const winPanel = `<div class="panel"><div class="panel-hd"><div style="display:flex;gap:8px;align-items:center"><span class="dot"></span><span class="mono" style="color:var(--txt)">Live call · 00:48</span></div><span class="mono dim">with Parley</span></div><div class="panel-bd"><div class="side" style="color:var(--blue);margin-top:0">Prospect</div><div class="bubble pros">“We already use someone.”</div><div class="side" style="color:var(--green)">Parley</div><div class="card g" style="box-shadow:none;padding:12px"><div class="card-lbl g"><span class="dot"></span>Next line</div><div class="body" style="color:#d9fff2">“Totally fair — what’s the one thing you wish they did that they don’t?”</div></div><div style="text-align:center;margin-top:14px"><span class="tag" style="color:var(--green);border-color:rgba(43,255,176,.4)">✓ Meeting booked</span></div></div></div>`;
// abstract 3-stage pipeline visuals — reused for the "how it plays out" flow
const momentViz = [
  `<div class="side" style="color:var(--blue);margin:0 0 2px">Live call</div><div class="bubble pros">“We already use someone…”</div>${miniEq()}`,
  `<div class="rail"><span class="st">Opener</span><span class="sep">→</span><span class="st on">● Reading</span><span class="sep">→</span><span class="st">Act</span></div><div style="text-align:center;margin-top:10px"><span class="tag" style="color:var(--green);border-color:rgba(43,255,176,.4)">Parley · on it</span></div>`,
  `<div class="card g" style="box-shadow:none;padding:12px"><div class="card-lbl g"><span class="dot"></span>On the overlay</div><div class="body" style="color:#d9fff2">The exact move — the line, the question, or the next step.</div></div>`,
];
const liveMoment = `<div class="panel"><div class="panel-hd"><div style="display:flex;gap:8px;align-items:center"><span class="dot red"></span><span class="mono" style="color:var(--txt)">Live call</span></div><span class="mono dim">the moment</span></div><div class="panel-bd">${momentViz[0]}<div class="side" style="color:var(--green)">Parley</div>${momentViz[2]}</div></div>`;

const PAGES = [];
const add = p => { PAGES.push(p); return p; };

/* ============================ HOME ============================ */
add({
  slug: '', title: 'Parley — The real-time copilot for cold calls', desc: 'Parley listens to both sides of your live cold calls and whispers the exact rebuttal, the next line, and the coaching to close — on a discreet overlay only your rep can see.',
  sections: [
    { type: 'hero', eyebrow: 'Live on the call', h1: 'Whisper the perfect line.<br><span class="grad">In real time.</span>', sub: 'Parley listens to both sides of your live calls and feeds reps the exact rebuttal, the next line, and the coaching to close — on an overlay only they can see. The prospect never knows. Your number does.', trust: 'First 2 calls free · Keep your own number · Works over any dialer', ctas: CTAS, live: { pros: 'We already use a competitor. Not really looking to switch right now.', label: 'Objection · Incumbent', line: 'Totally fair — most of our best customers said that too, right before they saw the one thing their tool couldn’t do. Worth 9 minutes to see if it applies?', next: 'book the 9-min · don’t pitch' } },
    { type: 'logos', items: ['Northwind', 'BeltLine', 'Cadence', 'HarborSDR', 'Rooftop Realty', 'Vantage'] },
    { type: 'steps', eyebrow: 'How it works', h2: 'The scroll <span class="grad">is</span> the call.', center: true, sub: 'You talk. Parley hears both sides. A card appears in under a second.', items: [
      { title: 'Hears both sides', body: 'Parley transcribes the rep and the prospect live over any dialer or softphone.' },
      { title: 'Reads the moment', body: 'It detects the call stage and the objection the instant it lands — no button to press.' },
      { title: 'Whispers the move', body: 'The exact rebuttal or next line appears on a discreet overlay only the rep can see.' },
    ] },
    { type: 'arcade', eyebrow: 'Objection arcade', h2: 'Pick your worst objection.<br>Watch Parley counter, live.', center: true, sub: 'This is what your rep sees the moment the prospect pushes back.', items: [
      { q: 'Incumbent', qShort: '“We already use a competitor.”', qFull: 'We already use a competitor and we’re happy.', label: 'Objection · Incumbent', line: 'Makes sense — you wouldn’t have picked them if they were bad. Quick one: what’s the one thing you wish they did that they don’t?', next: 'find the gap · book the follow-up' },
      { q: 'Budget', qShort: '“We have no budget.”', qFull: 'We just don’t have the budget for this right now.', label: 'Objection · Budget', line: 'Totally hear you. If I could show you it pays for itself with one saved deal, would budget still be the blocker — or is it timing?', next: 'isolate the real objection' },
      { q: 'Brush-off', qShort: '“Just send me an email.”', qFull: 'Can you just send me an email with some info?', label: 'Objection · Brush-off', line: 'Happy to — and so it’s not just another ignored email, what’s the one thing it needs to answer for it to be worth your reply?', next: 'earn the specifics before the send' },
      { q: 'Stall', qShort: '“Call me next quarter.”', qFull: 'Reach back out to me next quarter.', label: 'Objection · Stall', line: 'I can do that. So I don’t waste the touch — what changes next quarter that makes this a yes? Let’s make sure it’s actually different.', next: 'expose the fake timeline' },
      { q: 'Gatekeeper', qShort: '“She’s not available.”', qFull: 'She’s not available right now.', label: 'Objection · Gatekeeper', line: 'No worries — you probably know her calendar better than anyone. When’s she genuinely easiest to catch, and should I mention we spoke?', next: 'make the gatekeeper an ally' },
    ] },
    { type: 'cards', eyebrow: 'The brain', h2: 'It doesn’t think like generic AI.<br>It thinks like the <span class="grad">greatest closers alive.</span>', center: true, sub: 'Parley’s rebuttals are built on the proven frameworks of the closers who’ve done billions in high-ticket sales — so every rep gets their playbook, live, in the moment.', cols: 3, items: [
      { icon: '🎯', title: 'Alex Hormozi', body: 'Value framing — reframe price into return until the cost feels obvious.', more: '$100M Offers' },
      { icon: '🧠', title: 'Chris Voss', body: 'Tactical empathy — labels, calibrated questions, “no”-oriented negotiation.', more: 'Never Split the Difference' },
      { icon: '❓', title: 'Jeremy Miner', body: 'NEPQ — neuro-emotional questions that let the prospect sell themselves.', more: 'NEPQ' },
      { icon: '🔥', title: 'Grant Cardone', body: 'Relentless, structured closing and objection persistence.', more: '10X' },
      { icon: '📏', title: 'Jordan Belfort', body: 'The Straight Line — control the tonality and the path from open to close.', more: 'Straight Line' },
      { icon: '➕', title: 'Your best reps', body: 'On top of the masters, Parley learns your team’s winning lines — sharper with every call.', more: 'Your edge' },
    ] },
    { type: 'prose', html: '<p style="text-align:center;font-size:13px;color:var(--dim);max-width:640px;margin:-24px auto 0">Names denote publicly documented sales methodologies used to inform Parley’s training — no affiliation or endorsement implied.</p>' },
    { type: 'split', flip: true, eyebrow: 'Coaching', h2: 'Coach the whole floor. Without being on every call.', body: 'Managers get live whisper coaching, barge-in, and a score on every call the moment it ends — so ramp gets faster and best practices actually spread.', bullets: ['Whisper a nudge only the rep hears', 'Barge or take over a call that’s slipping', 'Every call scored automatically — not just the 2% you review'], cta: [['See live coaching', '/how-it-works/live-coaching/', 'sec']], media: box('MANAGER', 'Rep is 40s into a stall. Nudge sent: “ask what changes next quarter.” Call score: 82 · objection handled ✓') },
    { type: 'split', eyebrow: 'Voice intelligence', h2: 'It reads the <span class="grad">voice</span>,<br>not just the words.', body: 'Words tell you what they said. The voice tells you whether they mean it. Parley reads tone, hesitation, and vocal strain on every turn — and tracks a signal no script can: <strong>Vocal Resonance</strong>, the two voices syncing up. Rapport shows in the voice seconds before it shows in the words, so your rep feels the room turn and knows the exact moment to push.', bullets: ['Tone & emotion read on every prospect turn', 'Vocal Resonance — rapport, before the words catch up', 'A live cold → hot lead temperature', 'Tuned to each culture’s vibe — 12 locales'], cta: [['Explore Voice Intelligence', '/how-it-works/voice-intelligence/', 'sec']], media: voicePanel() },
    { type: 'stats', h2: 'What teams see', items: [
      { big: '2 wks', lbl: 'to ramp a new rep — down from 2 months' },
      { big: '+34%', lbl: 'objection-to-conversation rate' },
      { big: '100%', lbl: 'of calls scored, not sampled' },
      { big: '<1s', lbl: 'from objection to on-screen rebuttal' },
    ] },
    { type: 'cards', eyebrow: 'Built for outbound', h2: 'Everything a cold-calling team needs.', center: true, cols: 3, items: [
      { icon: '🎯', title: 'Objection rebuttals', body: 'The perfect counter, before the pause gets awkward.', href: '/how-it-works/objection-rebuttals/' },
      { icon: '🧭', title: 'Call-stage guidance', body: 'It always knows where the call is and what to say next.', href: '/how-it-works/call-stage-detection/' },
      { icon: '🔌', title: 'Any dialer + your CRM', body: 'Works over your softphone; syncs the lead before you dial.', href: '/how-it-works/integrations/' },
      { icon: '🛡️', title: 'Compliance built in', body: 'DNC scrub before dial, consent, retention — TCPA-ready.', href: '/how-it-works/compliance/' },
      { icon: '📊', title: 'Scored automatically', body: 'Every call graded the moment it ends.', href: '/how-it-works/call-scoring/' },
      { icon: '🔒', title: 'Enterprise security', body: 'Encryption, tenant isolation, SOC 2 path.', href: '/how-it-works/security/' },
    ] },
    { type: 'faq', h2: 'The questions buyers actually ask', items: [
      { q: 'Can the prospect tell?', a: 'No. Parley runs on a silent overlay only the rep sees, and it never plays audio into the call — on every plan. On Team and up, the overlay is also undetectable on screen-share, so Zoom, Meet, and monitoring never reveal it.' },
      { q: 'Does it work with our dialer?', a: 'Yes — Parley listens at the audio layer, so it works over virtually any dialer or softphone. No rip-and-replace.' },
      { q: 'Can reps keep their own number or SIM?', a: 'Yes. Parley doesn’t replace your line, it listens to it. Dial from the dialer you already use, or SIM-only reps use the Parley bridge — it rings your own cell, you answer on your normal phone, and it dials the prospect showing your own number. No porting, no new SIM.' },
      { q: 'Is real-time listening compliant?', a: 'Parley is built for outbound compliance: DNC scrub before dial, consent capture, call-window rules, and configurable retention. See our compliance page.' },
      { q: 'How fast is “real-time”?', a: 'Rebuttal cards typically appear in under a second from when the objection lands.' },
      { q: 'What if it doesn’t lift our numbers?', a: 'Then you don’t pay. Put Parley on your floor for 30 days — if your reps use it and booked meetings don’t rise, that month is on us.' },
    ] },
    finalCta('One saved deal covers a rep for a year.', 'Every day in the pause, deals slip away. Put Parley on your reps’ next call — keep your own number, first 2 calls free, and if booked meetings don’t lift in 30 days, the month’s on us.'),
  ],
});

/* ============================ HOW IT WORKS ============================ */
add({ slug: 'how-it-works', title: 'How Parley works — real-time cold-call copilot', desc: 'See how Parley listens to both sides of a live call and whispers the next line in under a second — on any dialer, fully compliant.',
  crumb: [home, { label: 'How it works' }],
  sections: [
    { type: 'hero', eyebrow: 'How it works', h1: 'How Parley rides along<br>on every call.', sub: 'One always-on overlay. It hears both sides, reads the moment, and whispers the move — in under a second, on any dialer.', ctas: CTAS, media: box('YOU TALK', 'Parley hears both sides → detects the objection → whispers the rebuttal in &lt;1s.') },
    { type: 'steps', h2: 'Three steps, zero buttons.', center: true, items: [
      { title: 'Hears both sides', body: 'Live transcription of the rep and the prospect, captured at the audio layer over any dialer or softphone.' },
      { title: 'Reads the moment', body: 'The engine detects the call stage and classifies objections the instant they land.' },
      { title: 'Whispers the move', body: 'The exact rebuttal or next line surfaces on the overlay — only the rep can see it.' },
    ] },
    { type: 'cta', h2: 'Watch the whole loop in motion.', sub: 'A walkthrough of the split second that decides the call — from the objection landing to the line in your rep’s ear.', ctas: [['Explore the live tour', '/how-it-works/tour/', 'pri'], DEMO] },
    { type: 'cards', h2: 'Explore the engine', center: true, cols: 3, items: [
      { icon: '🫥', title: 'Live overlay', body: 'The discreet, always-on desktop overlay.', href: '/how-it-works/live-overlay/' },
      { icon: '🎯', title: 'Objection rebuttals', body: 'Instant counters, trained on your best lines.', href: '/how-it-works/objection-rebuttals/' },
      { icon: '🧭', title: 'Call-stage detection', body: 'Knows the stage, surfaces the next line.', href: '/how-it-works/call-stage-detection/' },
      { icon: '🎧', title: 'Live coaching', body: 'Whisper coaching and manager barge-in.', href: '/how-it-works/live-coaching/' },
      { icon: '📊', title: 'Call scoring', body: 'Every call scored the moment it ends.', href: '/how-it-works/call-scoring/' },
      { icon: '🗣️', title: 'Voice Intelligence', body: 'Reads tone, rapport, and lead temperature — live.', href: '/how-it-works/voice-intelligence/' },
      { icon: '🔌', title: 'Integrations', body: 'CRM + dialer sync, auto-logging.', href: '/how-it-works/integrations/' },
      { icon: '🛡️', title: 'Compliance', body: 'TCPA, DNC scrub, consent, retention.', href: '/how-it-works/compliance/' },
      { icon: '🔒', title: 'Security', body: 'Encryption, isolation, SOC 2 path.', href: '/how-it-works/security/' },
    ] },
    finalCta(),
  ],
});
/* Interactive 3D tour page */
add({ slug: 'how-it-works/tour', title: 'How Parley works — the real-time loop, explained', desc: 'A prospect pushes back and your rep has one second before the call dies. Here’s exactly what Parley does in that second to hand them the right line.',
  crumb: [home, { label: 'How it works', href: '/how-it-works/' }, { label: 'The real-time loop' }],
  sections: [
    { type: 'hero', eyebrow: 'The real-time loop', h1: 'The split second<br><span class="grad">that wins the call.</span>', sub: 'A prospect pushes back. Your rep has about one second before the silence turns into “thanks for your time.” Here’s exactly what Parley does in that second — and why the right line lands before the pause ever gets awkward.', ctas: [DEMO, ['Back to how it works', '/how-it-works/', 'sec']] },
    { type: 'split', eyebrow: 'The problem', h2: 'Calls aren’t lost in the pitch. They’re lost in the pause.', body: 'The moment after “we already use someone,” a rep’s mind goes blank and three seconds of dead air tell the prospect this is going nowhere. Veterans fill that gap on instinct. Everyone else freezes — and the deal quietly dies. Parley exists to close that gap: not with a report card after the call, but <em>during</em> it, while the outcome can still change.', media: pausePanel },
    { type: 'flow', eyebrow: 'What happens in that second', h2: 'Three moves. Under a second.', center: true, items: [
      { title: 'It hears both sides', body: 'Rep and prospect captured at the audio layer, over any dialer. No bot, no beep — nothing the prospect can detect.', visual: `<div class="side" style="color:var(--blue);margin:0 0 2px">Prospect</div><div class="bubble pros">“We already use someone.”</div>${miniEq()}` },
      { title: 'It reads the moment', body: 'It tracks the call stage and classifies the objection the instant it lands — budget, timing, or brush-off each need a different move.', visual: `<div class="rail"><span class="st">Opener</span><span class="sep">→</span><span class="st on">● Objection</span><span class="sep">→</span><span class="st">Close</span></div><div style="text-align:center;margin-top:10px"><span class="tag" style="color:var(--red);border-color:rgba(255,77,109,.4)">Incumbent · detected</span></div>` },
      { title: 'It hands over the line', body: 'The rebuttal your best reps use is rendered to a discreet overlay. The rep reads it in their own voice — and the “no” becomes a conversation.', visual: `<div class="card g" style="box-shadow:none;padding:12px"><div class="card-lbl g"><span class="dot"></span>Parley · next line</div><div class="body" style="color:#d9fff2">“Totally fair — most of our best customers said that too, right before they switched.”</div></div>` },
    ] },
    { type: 'embed', eyebrow: 'Explore it', h2: 'The same loop, one call at a time.', src: '/assets/how-it-works-3d.html', title: 'Parley — the real-time loop' },
    { type: 'split', flip: true, eyebrow: 'Why real-time', h2: 'A report card can’t save a call that’s already over.', body: 'Post-call tools like Gong grade the conversation after it ends — useful for coaching next week, useless for the deal you just lost. Parley works in the live call because that’s the only place an objection can still be turned around. Same intelligence, delivered at the one moment it changes the number.', bullets: ['In the call, not the recording', 'Under a second from objection to answer', 'Works over the dialer you already have'], cta: [['Compare vs. post-call tools', '/compare/parley-vs-gong/', 'sec']], media: box('TIMING', 'Gong tells you why you lost. Parley helps you win — while it’s still winnable.') },
    { type: 'cards', eyebrow: 'Go deeper', h2: 'How each part actually works.', center: true, cols: 3, items: [
      { icon: '🎯', title: 'Choosing the line', body: 'How Parley picks the rebuttal your best reps would use — trained on your calls, not a generic script.', href: '/how-it-works/objection-rebuttals/', more: 'Objection rebuttals' },
      { icon: '🧭', title: 'Reading the moment', body: 'How it tracks the call stage and knows an objection from a buying signal in real time.', href: '/how-it-works/call-stage-detection/', more: 'Call-stage detection' },
      { icon: '🫥', title: 'The whisper', body: 'How the card reaches the rep silently, on any dialer, invisible to the prospect and on screen-share.', href: '/how-it-works/live-overlay/', more: 'The live overlay' },
    ] },
    finalCta('Watch it save a real objection.', 'Book 20 minutes and throw your team’s worst pushback at it — live, on a real call flow.'),
  ],
});

const HIW = [
  ['live-overlay', 'Live overlay', 'A copilot only your rep can see.', 'The overlay floats over your dialer, updates silently as the call moves, and never plays audio into the line — on every plan. On Team and up, it also stays hidden on screen-share, so demos and monitoring stay clean.', ['Invisible to the prospect — silent, on-screen only', 'Undetectable on screen-share (Team and up)', 'Works over any dialer or softphone', 'Hotkeys to pin, snooze, or expand a card'], box('OVERLAY', 'Floating card · hidden on share · &lt;1s updates')],
  ['objection-rebuttals', 'Objection rebuttals', 'The perfect rebuttal, before the pause gets awkward.', 'Parley classifies the objection the instant it lands and surfaces a rebuttal trained on your team’s winning lines — not generic scripts. Reps stop freezing; new reps sound like veterans.', ['Detects the objection type in real time', 'Trained on your best reps’ rebuttals', 'One tap to log which line worked'], box('OBJECTION · BUDGET', 'Card: “If it pays for itself with one deal, is budget still the blocker?”')],
  ['call-stage-detection', 'Call-stage detection', 'It always knows where the call is.', 'Opener, objection, discovery, close — Parley tracks the stage and surfaces the next best line so reps stay on the path without sounding scripted.', ['Automatic stage tracking, no manual input', 'Next-line prompts tuned to the moment', 'Keeps reps on your methodology (MEDDIC, BANT, your own)'], box('STAGE', 'Opener → ● Discovery → Close · next: “what’s driving the timing?”')],
  ['live-coaching', 'Live coaching', 'Coach the whole floor. In real time.', 'Managers whisper nudges only the rep hears, or barge in and take over a call that’s slipping. Coaching happens in the moment it matters — not in a review three days later.', ['Whisper a nudge mid-call', 'Barge or take over when needed', 'Turn every call into a teachable moment'], box('COACH', 'Whisper → rep: “slow down, ask one more question.”')],
  ['call-scoring', 'Call scoring', 'Every call, scored the moment it ends.', 'Parley auto-scores 100% of calls on the things you care about — opener, discovery, objection handling, next step — and rolls it up so managers see what’s working across the floor.', ['Automatic scoring on every call', 'Team rollups and trend lines', 'Spot which rebuttals actually convert'], box('SCORE', 'Call 4,182 · 82/100 · objection handled ✓ · next step set ✓')],
  ['voice-intelligence', 'Voice Intelligence', 'It reads the voice, not just the words.', 'Words are half the call. Voice Intelligence reads <em>how</em> the prospect speaks — tone, hesitation, and vocal strain — and tracks <strong>Vocal Resonance</strong>, the two voices syncing as rapport builds. It runs a live cold → hot lead temperature and lands a behavioural scorecard on every call.', ['Tone & emotion on every prospect turn', 'Vocal Resonance — rapport before the words', 'Live cold → hot lead temperature', 'Culturally calibrated across 12 locales'], voicePanel()],
  ['integrations', 'Integrations', 'Syncs the lead before you dial.', 'Parley pulls the lead record so reps have context on the overlay, and pushes the outcome back automatically — killing manual call logging.', ['CRM sync: FollowUpBoss, kvCORE, HubSpot & more', 'Works over your existing dialer / softphone', 'Auto-logs disposition, notes, and next steps'], box('CRM', 'Lead synced · outcome pushed · note auto-written')],
  ['compliance', 'Compliance', 'Built for outbound. Built for TCPA.', 'Compliance isn’t a bolt-on. Parley scrubs against DNC before the dial, captures consent, enforces calling windows, and applies your retention rules.', ['DNC scrub before every dial', 'Consent capture and audit trail', 'Configurable call windows and retention'], box('COMPLIANCE', 'DNC ✓ · consent logged · window OK')],
  ['security', 'Security', 'Your calls, locked down.', 'Enterprise-grade from the edge in: encryption in transit and at rest, strict per-tenant isolation, signed service-to-service auth, and a SOC 2 path.', ['Encryption in transit and at rest', 'Per-tenant data isolation (row-level security)', 'mTLS + signed tokens between services'], box('SECURITY', 'Encrypted · isolated tenants · SOC 2 in progress')],
];
// rich per-page detail (problem framing, how-it-works steps, proof, FAQ)
const HIW_DETAIL = {
  'voice-intelligence': {
    problem: 'A script tells your rep what to say. It can’t tell them whether the prospect actually means the “yeah, sounds good” — or is politely edging toward the door. The single most revealing signal on the call, the voice, goes completely unread.',
    cost: 'So reps push when they should pull, and pull when they should push. They pitch a prospect who’s cooling and stall one who’s ready. The exact moment to ask comes and goes, unheard.',
    steps: [
      { title: 'Reads the tone', body: 'A prosody model plus dependency-free DSP read pitch, energy, and speech rate every turn — catching the flat, angry “fine.” the words alone would score as neutral.' },
      { title: 'Tracks the sync', body: 'Vocal Resonance measures how far the prospect’s voice is converging toward the rep’s. Rising entrainment is rapport — and it shows up in the voice before it ever reaches the words.' },
      { title: 'Calls the temperature', body: 'Tone, engagement, and resonance roll into one live 0–100 lead heat with momentum, so the rep watches the room go cold → warm → hot in real time and knows when to make the ask.' },
    ],
    faqs: [
      { q: 'Isn’t this just sentiment analysis?', a: 'No. Sentiment reads words. Voice Intelligence reads the voice itself — prosody, vocal strain, and the entrainment between two speakers — which is where real intent surfaces first, often while the words still say “I’m not sure.”' },
      { q: 'Does it work across cultures?', a: 'Yes. A reserved tone in one culture is a warm one in another, so Parley recalibrates the read to the prospect’s locale across 12 cultural profiles before it ever judges the room.' },
    ],
  },
  'live-overlay': {
    problem: 'Most “sales assist” tools live in a browser tab the rep never looks at during a live call — or worse, they’re obvious to the prospect. Either way, the help arrives too late or blows the rep’s cover.',
    cost: 'A tool reps don’t glance at is a tool reps don’t use. And a visible assistant kills the rep’s credibility the moment a prospect catches on.',
    steps: [
      { title: 'Docks over your dialer', body: 'The overlay floats above whatever dialer or softphone you already run — no new window to babysit.' },
      { title: 'Updates silently', body: 'Cards slide in and out as the call moves. No sound, no pop, nothing that leaks into the line.' },
      { title: 'Hides on demand', body: 'Screen-sharing a call for coaching? The overlay auto-hides so monitors and prospects never see it.' },
    ],
    faqs: [
      { q: 'Can the prospect ever hear or see it?', a: 'No. The overlay is on-screen only and renders nothing into the audio path — on every plan. Screen-share invisibility (so it’s hidden even when you share your screen on Zoom or to a monitor) is included on Team and up.' },
      { q: 'Does it get in the rep’s way?', a: 'It sits at the edge of the screen and only expands the one card that matters right now. Hotkeys pin, snooze, or dismiss.' },
    ],
  },
  'objection-rebuttals': {
    problem: 'The average rep has heard “we already use someone” a thousand times and still fumbles it — because in the moment, under pressure, recall fails. The three seconds of silence is where deals die.',
    cost: 'Every fumbled objection is a conversation that ends early. Across a floor of reps and thousands of dials a week, that’s pipeline quietly leaking out the bottom.',
    steps: [
      { title: 'Detects the objection', body: 'Parley classifies the pushback the instant it lands — incumbent, budget, timing, brush-off, or gatekeeper.' },
      { title: 'Pulls your best line', body: 'It surfaces a rebuttal trained on your own top performers’ winning language — not a generic script.' },
      { title: 'Learns what worked', body: 'One tap logs which line landed, so the library gets sharper with every call.' },
    ],
    faqs: [
      { q: 'Are the rebuttals generic?', a: 'No — Parley learns from your best reps’ calls, so the lines match how your team actually sells and what actually converts.' },
      { q: 'What if the rep wants to go off-script?', a: 'Cards are prompts, not teleprompters. Reps stay in control; Parley just makes sure they’re never stuck.' },
    ],
  },
  'call-stage-detection': {
    problem: 'Reps lose the thread. They pitch during discovery, discover during the close, and miss the buying signal entirely — because tracking where a call *is* while also talking is genuinely hard.',
    cost: 'A call that wanders is a call that doesn’t convert. Managers see it in the recordings — the meeting that should’ve booked, didn’t.',
    steps: [
      { title: 'Tracks the stage', body: 'Opener, objection, discovery, close — Parley knows which one you’re in, automatically.' },
      { title: 'Surfaces the next line', body: 'The prompt that fits the moment appears — the discovery question, the trial close, the ask.' },
      { title: 'Keeps you on method', body: 'MEDDIC, BANT, or your own playbook — Parley nudges toward the next step without sounding scripted.' },
    ],
    faqs: [
      { q: 'Do reps have to set the stage manually?', a: 'No. Detection is automatic from the conversation — there’s nothing to click.' },
      { q: 'Can we use our own sales methodology?', a: 'Yes. Parley maps its prompts to your framework and qualification criteria.' },
    ],
  },
  'live-coaching': {
    problem: 'A manager can sit on maybe two calls a day. The other 300 happen unwatched, and the feedback — if it comes at all — lands three days later in a 1:1, long after the moment that mattered.',
    cost: 'Coaching that’s delayed is coaching that doesn’t stick. New reps ramp slowly and the whole floor drifts toward mediocre.',
    steps: [
      { title: 'Listen to any live call', body: 'Managers drop into a rep’s call from the dashboard — no scheduling, no warning.' },
      { title: 'Whisper a nudge', body: 'Send a one-line prompt only the rep hears: “slow down,” “ask about timing,” “go for the meeting.”' },
      { title: 'Barge when it counts', body: 'For a deal worth saving, take the call over in one click and model the save.' },
    ],
    faqs: [
      { q: 'Does the prospect know a manager joined?', a: 'No. Whisper coaching is heard only by the rep; barge-in is a normal handoff.' },
      { q: 'Can this scale past one manager?', a: 'Yes — team leads coach in parallel, and Parley flags the calls most worth jumping into.' },
    ],
  },
  'call-scoring': {
    problem: 'Manual QA reviews a handful of calls a week and calls it representative. It isn’t. The calls that need coaching most are exactly the ones nobody had time to listen to.',
    cost: 'You’re coaching on a 2% sample and guessing about the other 98%. Real problems hide in the calls no one scored.',
    steps: [
      { title: 'Scores every call', body: 'Opener, discovery, objection handling, and next step — graded automatically the moment the call ends.' },
      { title: 'Rolls it up', body: 'Team and rep trend lines show what’s improving and what’s slipping, week over week.' },
      { title: 'Surfaces the outliers', body: 'Parley flags the calls — good and bad — most worth a manager’s attention.' },
    ],
    faqs: [
      { q: 'What does it score against?', a: 'Your rubric. Configure the criteria that matter to your team and Parley grades consistently against them.' },
      { q: 'Is it accurate?', a: 'Scores are transparent and reviewable — click any score to see the moment in the transcript that drove it.' },
    ],
  },
  'integrations': {
    problem: 'Reps dial blind and log by hand. They open a call with no context on the lead, then spend the last two minutes typing notes instead of dialing the next number.',
    cost: 'No context means weaker calls. Manual logging means dirty CRM data and fewer dials per hour — a double tax on the whole team.',
    steps: [
      { title: 'Pulls the lead', body: 'Before the dial, Parley surfaces the lead’s history and context from your CRM onto the overlay.' },
      { title: 'Rides your dialer', body: 'It listens over the dialer or softphone you already use — no rip-and-replace.' },
      { title: 'Writes it back', body: 'Disposition, notes, and next steps are logged to the CRM automatically when the call ends.' },
    ],
    faqs: [
      { q: 'Which CRMs and dialers are supported?', a: 'FollowUpBoss, kvCORE, HubSpot and more, over virtually any dialer or softphone. Tell us your stack and we’ll confirm.' },
      { q: 'Do we have to change how we dial?', a: 'No. Parley fits around your existing workflow.' },
    ],
  },
  'compliance': {
    problem: 'Outbound teams live one bad call away from a complaint. Reps can’t hold DNC rules, consent language, and calling windows in their heads while also selling.',
    cost: 'A single TCPA misstep can mean real penalties — and the fear of it makes managers throttle dial volume, capping the whole team.',
    steps: [
      { title: 'Scrubs before the dial', body: 'Every number is checked against DNC lists before it ever rings.' },
      { title: 'Captures consent', body: 'Consent language and confirmations are prompted and logged, with a clean audit trail.' },
      { title: 'Enforces the rules', body: 'Calling windows and retention policies are applied automatically, by jurisdiction.' },
    ],
    faqs: [
      { q: 'Does compliance slow reps down?', a: 'No — the checks run in the background. Reps just dial; Parley keeps them inside the lines.' },
      { q: 'Is there an audit trail?', a: 'Yes. Consent, scrubs, and call windows are logged and exportable for your records.' },
    ],
  },
  'security': {
    problem: 'Call recordings and lead data are some of the most sensitive assets a sales org has — and “trust us” isn’t an answer procurement or security teams accept.',
    cost: 'A weak security posture stalls deals in review and puts customer data at real risk. Trust has to be provable, not promised.',
    steps: [
      { title: 'Encrypt everything', body: 'Data is encrypted in transit and at rest, end to end.' },
      { title: 'Isolate every tenant', body: 'Row-level security keeps each organization’s data strictly separate.' },
      { title: 'Verify every service', body: 'Service-to-service traffic is mutually authenticated with signed tokens and mTLS.' },
    ],
    faqs: [
      { q: 'Are you SOC 2 compliant?', a: 'Controls are mapped and our audit is underway. Reach out for our current posture and documentation.' },
      { q: 'Where is call data stored, and for how long?', a: 'In encrypted object storage with configurable, policy-driven retention you control.' },
    ],
  },
};
const HIW_DEEP = {
  'voice-intelligence': `<h2>Why the voice beats the words</h2><p>By the time a prospect’s <em>words</em> turn positive, the decision is usually already made. The voice moves earlier. A softening of tone, a drop in vocal strain, a pace that starts to match the rep’s — these are the tells a great closer feels in their gut, and they arrive seconds before “okay, that makes sense.” Voice Intelligence is Parley reading those tells for every rep on the floor, not just the naturals.</p><p>The signal at the center of it is <strong>Vocal Resonance</strong>: a measure of how much the prospect’s prosody is converging toward the rep’s. Two people building rapport unconsciously entrain — pitch, rhythm, and energy drift together. Rising resonance is rapport forming in real time; a diverging voice is an early warning the room is cooling, well before the prospect says anything cold. Parley turns that into a live number the rep can act on.</p><h2>Built to be trusted on a live call</h2><p>Tone is easy to misread across people and cultures, so Voice Intelligence never judges in a vacuum. It fuses the acoustic read with the words, recalibrates to the prospect’s cultural baseline — a reserved “yes” in one culture is not disengagement in another — and only then rolls everything into a single cold → hot lead temperature. When the call ends, the same stream becomes a behavioural scorecard: momentum, rapport, engagement, talk-share balance, and vocal strain, with the one moment the room actually turned.</p>`,
  'live-overlay': `<h2>What it actually looks like</h2><p>The overlay is a slim panel pinned to the edge of the rep’s screen, above their dialer. Most of the time it’s quiet — a status line and the current call stage. The instant something matters, one card expands: the objection that just landed and the line to answer it. Nothing animates loudly, nothing beeps, and it never renders into the call audio, so the prospect has no idea it’s there.</p><p>Reps run it over Aircall, RingCentral, a browser softphone, or a desk phone — Parley listens at the audio layer, so there’s nothing to integrate and nothing to rip out. And because it auto-hides the moment a rep shares their screen, managers can monitor and QA calls on a shared screen without the assist ever showing up.</p>`,
  'objection-rebuttals': `<h2>Where the lines come from</h2><p>Generic objection scripts fail because they sound generic. Parley’s rebuttals are built from your own team’s calls — the exact phrasing your best closer uses when a prospect says “we’re happy with our current vendor,” not a line from a sales book. When a rep taps to log that a line worked, that signal feeds back in, so the library gets sharper the more your team dials.</p><p>Detection is what makes it usable live. “We have no budget,” “now’s not a good time,” and “just email me” are three different objections that need three different moves — and Parley classifies which one landed in a fraction of a second, so the card that appears is the right one, not a menu the rep has to scroll while the prospect waits.</p>`,
  'call-stage-detection': `<h2>Knowing where the call is</h2><p>A good call has a shape: a permission-based opener, discovery that earns the right to pitch, objections handled, then a clear ask. Reps lose deals by skipping steps — pitching before they’ve found the pain, or talking straight past the buying signal. Parley tracks that shape in real time and surfaces the move that fits the current stage, so the call keeps moving toward a next step.</p><p>It works with the methodology you already run. Whether your team qualifies on MEDDIC, BANT, or a checklist you built yourself, Parley maps its prompts to your criteria and nudges the next best question — without turning the rep into someone reading a teleprompter.</p>`,
  'live-coaching': `<h2>Coaching in the moment, not the postmortem</h2><p>Feedback three days after a call is a history lesson. By then the rep has made the same mistake twenty more times. Parley lets a manager drop into any live call from the dashboard and send a one-line whisper only the rep hears — “slow down,” “ask about timing,” “go for the meeting” — so the correction happens while it still changes the outcome.</p><p>When a deal is worth saving, the manager takes the call over in a single click and models the save in real time. Every rep on the floor can be coached in parallel, and Parley flags the calls most worth jumping into — so managers spend their attention where it moves the number.</p>`,
  'call-scoring': `<h2>Score the whole floor, not a sample</h2><p>Manual QA listens to a handful of calls a week and hopes they’re representative. They never are — the calls that most need coaching are exactly the ones nobody had time to review. Parley scores 100% of calls automatically, the moment they end, against the rubric you care about: opener, discovery, objection handling, and whether a next step got set.</p><p>The scores roll up into trend lines by rep and by team, so you can see what’s improving and what’s slipping week over week. And every score is transparent — click it and jump straight to the moment in the transcript that drove it, so coaching is grounded in what actually happened, not a gut feel.</p>`,
  'integrations': `<h2>Context in, outcomes out</h2><p>Before the dial, Parley pulls the lead’s history from your CRM onto the overlay, so the rep opens with context instead of cold. After the call, it writes the disposition, notes, and next steps back automatically — killing the two minutes of typing that reps skip and managers chase.</p><p>It syncs with FollowUpBoss, kvCORE, HubSpot and more, and listens over whatever dialer or softphone you already use. There’s no new phone system to learn and no data-entry tax — reps stay on the phone, and the CRM stays clean enough to actually trust for forecasting.</p>`,
  'compliance': `<h2>Compliance that doesn’t cap your dials</h2><p>Most teams manage TCPA risk by slowing down — throttling volume because a single wrong number or missing consent can mean real penalties. Parley removes the trade-off. Every number is scrubbed against DNC lists before it rings, consent language is prompted and logged, and calling-window rules are enforced automatically by jurisdiction.</p><p>All of it runs in the background, so reps just dial while Parley keeps them inside the lines — and every scrub, consent, and call window is logged and exportable, so when someone asks for the audit trail, you actually have one.</p>`,
  'security': `<h2>Provable, not promised</h2><p>Call recordings and lead data are among the most sensitive assets a sales org holds, and “trust us” doesn’t clear a security review. Parley encrypts data in transit and at rest, isolates every organization’s data with row-level security, and mutually authenticates traffic between its services with signed tokens and mTLS.</p><p>Our SOC 2 controls are mapped and our audit is underway, and retention is policy-driven and configurable — call data lives exactly as long as your rules say and no longer. Reach out for our current documentation; the point is that the answers are concrete, not adjectives.</p>`,
};
HIW.forEach(([slug, name, h1, body, bullets, media]) => {
  const d = HIW_DETAIL[slug] || {};
  const related = HIW.filter(x => x[0] !== slug).slice(0, 3).map(x => ({ icon: '⚙️', title: x[1], body: x[2], href: `/how-it-works/${x[0]}/` }));
  add({
    slug: `how-it-works/${slug}`, title: `${name} — how Parley works`, desc: `${h1} ${body}`.replace(/<[^>]*>/g, ' ').slice(0, 155),
    crumb: [home, { label: 'How it works', href: '/how-it-works/' }, { label: name }],
    sections: [
      { type: 'hero', eyebrow: 'How it works', h1, sub: body, ctas: CTAS, media },
      { type: 'split', eyebrow: 'The problem', h2: 'Why this is hard on a live call.', body: d.problem || body, bullets: d.cost ? [d.cost] : undefined, media: box('THE COST', d.cost || 'Lost conversations, slower ramp, leaking pipeline.') },
      { type: 'prose', html: HIW_DEEP[slug] || '' },
      { type: 'split', flip: true, eyebrow: 'What it changes', h2: 'What this changes on the floor.', body, bullets, media },
      { type: 'cards', eyebrow: 'Works with the rest of Parley', h2: 'One copilot, many moments.', center: true, cols: 3, items: related },
      { type: 'faq', h2: 'Questions about ' + name.toLowerCase(), items: d.faqs || [] },
      finalCta(),
    ],
  });
});

/* ============================ SOLUTIONS ============================ */
add({ slug: 'solutions', title: 'Parley for sales teams — solutions by role', desc: 'Real-time call coaching for SDR teams, inside sales, real-estate ISAs, managers, and BPOs. Find the fit for your team.',
  crumb: [home, { label: 'Solutions' }],
  sections: [
    { type: 'hero', eyebrow: 'Solutions', h1: 'Find the fit<br>for your team.', sub: 'Every team lives on the phone differently. Here’s how Parley shows up for yours.', ctas: CTAS, media: box('PICK YOUR TEAM', 'SDRs · Inside sales · Real estate · Managers · Onboarding · BPO') },
    { type: 'cards', h2: 'Who’s it for?', center: true, cols: 3, items: [
      { icon: '📞', title: 'SDR teams', body: 'Turn every SDR into your best SDR.', href: '/solutions/sdr-teams/' },
      { icon: '⚡', title: 'Inside sales', body: 'High-volume calling without the drop-off.', href: '/solutions/inside-sales/' },
      { icon: '🏠', title: 'Real estate ISAs', body: 'Book more appointments from your lead pond.', href: '/solutions/real-estate-isa/' },
      { icon: '🎧', title: 'Sales managers', body: 'Coach the whole floor in real time.', href: '/solutions/sales-managers/' },
      { icon: '🚀', title: 'Rep onboarding', body: 'Ramp new reps in 2 weeks, not 2 months.', href: '/solutions/rep-onboarding/' },
      { icon: '🏢', title: 'Agencies / BPO', body: 'Consistent quality across every seat.', href: '/solutions/agencies-bpo/' },
    ] },
    { type: 'split', flip: true, eyebrow: 'The common thread', h2: 'Different teams, same problem.', body: 'Whatever you call the role, the failure mode is identical: the rep knows what to do in theory, but freezes or drifts on the live call. Parley fixes that in the moment — so the gap between your best rep and everyone else closes.', bullets: ['Rebuttals the instant an objection lands', 'Coaching that happens live, not days later', 'Every call scored, so nothing hides'], media: box('THE PATTERN', 'Knowledge in the head ≠ words in the moment. Parley bridges the two.') },
    { type: 'stats', h2: 'What teams see', items: [{ big: '2 wks', lbl: 'faster ramp' }, { big: '+34%', lbl: 'objection win-rate' }, { big: '100%', lbl: 'calls scored' }, { big: '<1s', lbl: 'to rebuttal' }] },
    finalCta(),
  ],
});
const SOL = [
  ['sdr-teams', 'SDR teams', 'Turn every SDR into your best SDR.', 'Your top rep handles the “we already use someone” objection in their sleep. Your new hire freezes. Parley closes that gap live — so the whole team performs like your best rep, on every dial.', ['Live rebuttals end the awkward freeze', 'Your winning talk tracks, in every rep’s ear', 'Managers see what’s working across the team'], 'connect-to-meeting rate'],
  ['inside-sales', 'Inside sales', 'High-volume calling, without the drop-off.', 'By dial 60 the energy dips and the script drifts. Parley keeps every call sharp — surfacing the next line and the right rebuttal so quality doesn’t fall off a cliff after lunch.', ['Consistent quality from dial 1 to dial 200', 'Next-line prompts keep momentum', 'Auto-logging so reps stay on the phone'], 'talk-time efficiency'],
  ['real-estate-isa', 'Real estate ISAs', 'Book more appointments from your lead pond.', 'Seller and buyer calls are objection-heavy and speed-to-lead is everything. Parley rides along on your kvCORE and FollowUpBoss calls and whispers the line that turns a maybe into a booked appointment.', ['Native kvCORE & FollowUpBoss context', 'Rebuttals for “we’re just looking” and “which agent?”', 'Auto-logs the outcome back to your CRM'], 'appointments booked per 100 dials'],
  ['sales-managers', 'Sales managers', 'Coach the whole floor. In real time.', 'You can’t sit on every call, and coaching three days later doesn’t stick. Parley lets you whisper, barge, and score in the moment — and shows you exactly which rebuttals move the number.', ['Whisper and barge into live calls', 'Every call scored automatically', 'See which lines actually convert'], 'ramp time & quota attainment'],
  ['rep-onboarding', 'Rep onboarding', 'New reps ramp in 2 weeks, not 2 months.', 'Tribal knowledge lives in your veterans’ heads. Parley puts your playbook in every new rep’s ear from day one, so they hit their first booked meeting weeks sooner.', ['Your playbook, live, from call one', 'Safe reps: rebuttals and compliance built in', 'Faster time-to-first-meeting'], 'time-to-first-meeting'],
  ['agencies-bpo', 'Agencies / BPO', 'Consistent quality across every seat, every client.', 'Scaling seats means scaling variance. Parley standardizes quality across every agent and every campaign, with scoring and security built for multi-account operations.', ['Per-client scripts and rebuttals', 'Score 100% of calls for QA', 'Tenant isolation across accounts'], 'QA pass rate across seats'],
];
const feat = (t, b, href) => ({ icon: '⚡', title: t, body: b, href });
const SOL_DETAIL = {
  'sdr-teams': { pain: 'Your best SDR books three meetings for every one your new hire books — and the gap is almost entirely about what they say when a prospect pushes back. That knowledge lives in one person’s head, and it doesn’t transfer through a slide deck.', features: [feat('Objection rebuttals', 'Your top rep’s answers, in every rep’s ear.', '/how-it-works/objection-rebuttals/'), feat('Call scoring', 'See exactly where each rep drops the call.', '/how-it-works/call-scoring/'), feat('Live coaching', 'Nudge a rep mid-call, from anywhere.', '/how-it-works/live-coaching/')], quote: { t: 'Our whole team started handling the incumbent objection like our best closer. Meetings booked jumped in the first month.', who: 'Director of Sales Development, HarborSDR' } },
  'inside-sales': { pain: 'The first hour of dials is sharp. By hour three the energy sags, the script drifts, and the pitch gets sloppy — right when volume is supposed to be your edge. Consistency, not effort, is what breaks down.', features: [feat('Call-stage guidance', 'Keeps every call on the rails, dial 1 to dial 200.', '/how-it-works/call-stage-detection/'), feat('Objection rebuttals', 'No fumbles, even on the hundredth call.', '/how-it-works/objection-rebuttals/'), feat('Auto-logging', 'Reps stay on the phone, not in the CRM.', '/how-it-works/integrations/')], quote: { t: 'Quality used to fall off a cliff after lunch. Now the afternoon calls sound like the morning ones.', who: 'Inside Sales Manager, Cadence' } },
  'real-estate-isa': { pain: 'Seller and buyer calls are objection-heavy — “we’re just looking,” “which agent is this?” — and speed-to-lead decides everything. An ISA who hesitates loses the appointment to the next team that called.', features: [feat('CRM context', 'kvCORE & FollowUpBoss lead history on the overlay.', '/how-it-works/integrations/'), feat('Objection rebuttals', 'Live answers to “just looking” and agent objections.', '/how-it-works/objection-rebuttals/'), feat('Compliance', 'DNC-safe dialing out of the box.', '/how-it-works/compliance/')], quote: { t: 'Our new ISAs ramp in two weeks instead of two months, and appointments are up 34%.', who: 'VP Sales, Rooftop Realty' } },
  'sales-managers': { pain: 'You can sit on two calls a day. The other few hundred happen without you, and the feedback lands days later in a 1:1 — long after the moment that would’ve taught the rep anything.', features: [feat('Live coaching', 'Whisper and barge into any live call.', '/how-it-works/live-coaching/'), feat('Call scoring', 'Every call graded — coach from the full picture.', '/how-it-works/call-scoring/'), feat('Analytics', 'See which lines actually move the number.', '/how-it-works/call-scoring/')], quote: { t: 'I finally coach in the moment instead of autopsying calls from last week. It changed how fast my team improves.', who: 'Head of Sales, Meridian' } },
  'rep-onboarding': { pain: 'A new rep’s first weeks are brutal: no muscle memory, no rebuttals, no feel for the flow. They churn or they crawl to quota — and either way it’s expensive. Your playbook is trapped in veterans’ heads.', features: [feat('Live coaching', 'Your playbook, live, from call one.', '/how-it-works/live-coaching/'), feat('Objection rebuttals', 'New reps sound like veterans on day one.', '/how-it-works/objection-rebuttals/'), feat('Compliance', 'Safe to dial from the very first call.', '/how-it-works/compliance/')], quote: { t: 'Time-to-first-meeting dropped from six weeks to under two. That math paid for Parley immediately.', who: 'RevOps Lead, Pace' } },
  'agencies-bpo': { pain: 'Every new seat you add is a new source of variance. Different agents, different clients, different scripts — and QA can’t keep up. Quality becomes a coin flip exactly as you scale.', features: [feat('Per-client rebuttals', 'Tuned scripts and objections per campaign.', '/how-it-works/objection-rebuttals/'), feat('Call scoring', 'Score 100% of calls for airtight QA.', '/how-it-works/call-scoring/'), feat('Security', 'Strict tenant isolation across accounts.', '/how-it-works/security/')], quote: { t: 'We standardized quality across 60 seats and three clients without adding QA headcount.', who: 'Operations Director, Vantage BPO' } },
};
SOL.forEach(([slug, name, h1, body, bullets, metric]) => {
  const d = SOL_DETAIL[slug] || {};
  add({
    slug: `solutions/${slug}`, title: `Parley for ${name} — real-time call coaching`, desc: `${h1} ${body}`.slice(0, 155),
    crumb: [home, { label: 'Solutions', href: '/solutions/' }, { label: name }],
    sections: [
      { type: 'hero', eyebrow: `Solutions · ${name}`, h1, sub: body, ctas: CTAS, media: liveMoment },
      { type: 'split', eyebrow: 'Your world today', h2: 'The problem you already know.', body: d.pain || body, media: pausePanel },
      { type: 'split', flip: true, eyebrow: 'Where Parley earns its seat', h2: 'The moment it changes the call.', body, bullets, media: winPanel },
      { type: 'cards', eyebrow: 'Built for how you work', h2: 'The features that matter to you.', center: true, cols: 3, items: d.features || [] },
      { type: 'stats', items: [{ big: '2 wks', lbl: 'faster ramp' }, { big: '+34%', lbl: 'objection win-rate' }, { big: '100%', lbl: 'calls scored' }, { big: '<1s', lbl: 'to rebuttal' }] },
      { type: 'prose', html: d.quote ? `<blockquote style="border-left:3px solid var(--green);padding-left:18px;font-size:20px;color:var(--txt);line-height:1.5">“${d.quote.t}”<footer style="margin-top:12px;font-size:14px;color:var(--dim)">— ${d.quote.who}</footer></blockquote>` : '' },
      { type: 'faq', h2: 'Common questions', items: [{ q: 'Do we have to change our dialer or CRM?', a: 'No. Parley works over your existing dialer and syncs with your CRM — no rip-and-replace.' }, { q: 'How long until we see results?', a: 'Most teams hear the difference on day one and see ramp and objection metrics move within the first few weeks.' }] },
      finalCta(),
    ],
  });
});

/* ============================ USE CASES ============================ */
add({ slug: 'use-cases', title: 'Parley use cases — real cold-calling scenarios', desc: 'Handle objections live, ramp new reps, book more meetings, score every call, stay compliant, and auto-log to your CRM.',
  crumb: [home, { label: 'Use cases' }],
  sections: [
    { type: 'hero', eyebrow: 'Use cases', h1: 'What do you need<br>to fix?', sub: 'Real scenarios from the sales floor — and the exact moment Parley steps in.', ctas: CTAS, media: box('SCENARIOS', 'Objections · Ramp · Discovery · Booking · QA · Compliance · CRM') },
    { type: 'cards', h2: 'Real use cases', center: true, cols: 3, items: [
      { icon: '🧊', title: 'Handle objections live', body: 'Never freeze on an objection again.', href: '/use-cases/handle-objections-live/' },
      { icon: '🚀', title: 'Ramp new reps', body: 'Put your playbook in every ear.', href: '/use-cases/ramp-new-reps/' },
      { icon: '🔍', title: 'Qualify & discovery', body: 'Ask the question that moves the deal.', href: '/use-cases/qualify-and-discovery/' },
      { icon: '📅', title: 'Book more meetings', body: 'Turn more dials into booked meetings.', href: '/use-cases/book-more-meetings/' },
      { icon: '📊', title: 'Call QA & scoring', body: 'Score 100% of calls, not 2%.', href: '/use-cases/call-qa-and-scoring/' },
      { icon: '🛡️', title: 'Compliant cold calling', body: 'Dial hard. Stay compliant.', href: '/use-cases/compliant-cold-calling/' },
      { icon: '📝', title: 'Auto-log to CRM', body: 'Stop typing call notes.', href: '/use-cases/auto-log-to-crm/' },
      { icon: '🎯', title: 'Objection playbook', body: 'Responses to every common objection.', href: '/resources/objection-library/' },
    ] },
    { type: 'steps', eyebrow: 'How every use case works', h2: 'Same engine, every scenario.', center: true, items: [{ title: 'Parley hears the call', body: 'Both sides, live, over your existing dialer.' }, { title: 'It reads the moment', body: 'Objection, discovery, buying signal, compliance check — detected in real time.' }, { title: 'The rep gets the move', body: 'The right line, question, or nudge appears on the overlay in under a second.' }] },
    { type: 'stats', items: [{ big: '<1s', lbl: 'to on-screen guidance' }, { big: '100%', lbl: 'of calls covered' }, { big: '+34%', lbl: 'objection win-rate' }, { big: '2 wks', lbl: 'faster ramp' }] },
    finalCta(),
  ],
});
const UC = [
  ['handle-objections-live', 'Handle objections live', 'Never blank on an objection again.', 'The prospect pushes back and the clock starts ticking. Parley classifies the objection and surfaces the perfect rebuttal before the silence gets awkward — so “we’re all set” becomes a real conversation.', ['objection-rebuttals', 'call-stage-detection']],
  ['ramp-new-reps', 'Ramp new reps', 'Put your playbook in every new rep’s ear.', 'New reps don’t fail because they’re lazy — they fail because they don’t know what to say when. Parley coaches them live, so they book their first meeting weeks sooner and sound like a veteran doing it.', ['live-coaching', 'objection-rebuttals']],
  ['qualify-and-discovery', 'Qualify & discovery', 'Ask the question that moves the deal.', 'Weak discovery kills more deals than weak closing. Parley prompts the next best question in the moment — surfacing budget, authority, and timing signals so reps qualify hard without a checklist.', ['call-stage-detection', 'call-scoring']],
  ['book-more-meetings', 'Book more meetings', 'More dials into booked meetings.', 'The close is a moment, and most reps miss it. Parley recognizes buying signals and nudges the ask at exactly the right time — so more conversations end with a calendar invite.', ['call-stage-detection', 'live-coaching']],
  ['call-qa-and-scoring', 'Call QA & scoring', 'Score 100% of calls, not 2%.', 'Manual QA samples a handful of calls a week and misses the rest. Parley scores every single call automatically, so managers coach from the full picture and spot what’s actually working.', ['call-scoring', 'live-coaching']],
  ['compliant-cold-calling', 'Compliant cold calling', 'Dial hard. Stay compliant.', 'One bad call can cost you. Parley scrubs DNC before the dial, captures consent, and enforces calling windows — so your team can run hot without the TCPA risk hanging over it.', ['compliance', 'integrations']],
  ['auto-log-to-crm', 'Auto-log to CRM', 'Stop typing call notes.', 'Reps hate CRM hygiene and it shows. Parley writes the disposition, notes, and next steps back to your CRM automatically — so the data’s clean and the rep stays on the phone.', ['integrations', 'call-scoring']],
];
const UC_DETAIL = {
  'handle-objections-live': { before: 'The prospect says “we’re all set” and the rep freezes. Three seconds of dead air, a weak “okay, thanks for your time,” and the call is over before it started.', after: 'Parley catches the objection the instant it lands and drops the perfect counter on the overlay. The rep breathes, delivers a sharp line, and the “no” turns into a real conversation.', steps: [{ title: 'Objection lands', body: 'The prospect pushes back — incumbent, budget, timing, brush-off.' }, { title: 'Parley reads it', body: 'It classifies the objection type in under a second.' }, { title: 'The rep responds', body: 'The right rebuttal appears; the rep says it in their own voice and keeps control.' }], faqs: [{ q: 'Which objections does it handle?', a: 'The full set — incumbent, budget, timing, “send me an email,” gatekeeper, and your own custom ones. See the objection library.' }, { q: 'Will reps sound robotic reading a card?', a: 'No. Cards are short prompts, not scripts — reps deliver them naturally and log what worked.' }] },
  'ramp-new-reps': { before: 'A new hire spends six weeks flailing — no rebuttals, no feel for the flow, watching their pipeline stay empty while the veterans crush it.', after: 'Parley puts the team’s playbook in the new rep’s ear from call one. They handle objections like a veteran and book their first meeting in week two.', steps: [{ title: 'Day one, live', body: 'The rep dials real prospects with Parley coaching in real time.' }, { title: 'Guardrails on', body: 'Rebuttals and compliance are built in, so early mistakes don’t cost deals.' }, { title: 'Ramp compresses', body: 'Time-to-first-meeting drops from weeks to days.' }], faqs: [{ q: 'How much faster do reps ramp?', a: 'Teams typically cut time-to-first-meeting from ~6 weeks to under 2.' }, { q: 'Does it replace training?', a: 'It reinforces it — your training sets the playbook; Parley makes it stick on live calls.' }] },
  'qualify-and-discovery': { before: 'The rep pitches too early, skips the question that mattered, and never surfaces budget or timing. The deal dies in “I’ll think about it.”', after: 'Parley prompts the next best discovery question in the moment, so reps qualify hard and surface the real buying signals — without a checklist.', steps: [{ title: 'Detects discovery', body: 'Parley knows when the call is in discovery.' }, { title: 'Prompts the question', body: 'It surfaces the MEDDIC/BANT question that fits right now.' }, { title: 'Captures the signal', body: 'Budget, authority, and timing get logged automatically.' }], faqs: [{ q: 'Can it follow our qualification framework?', a: 'Yes — MEDDIC, BANT, or your own. Parley maps prompts to your criteria.' }, { q: 'Does it interrupt the rep’s flow?', a: 'No. Prompts are glanceable and optional; the rep stays in the driver’s seat.' }] },
  'book-more-meetings': { before: 'The buying signal comes and goes and the rep talks right past it — no ask, no calendar, another “maybe” that never converts.', after: 'Parley recognizes the moment to close and nudges the ask at the right time, so more conversations end with a booked meeting.', steps: [{ title: 'Spots the signal', body: 'Parley detects when the prospect is ready.' }, { title: 'Nudges the ask', body: 'It prompts the rep to go for the meeting — now.' }, { title: 'Confirms next step', body: 'The rep books it and the next step is logged.' }], faqs: [{ q: 'How much does booking improve?', a: 'Teams commonly see a double-digit lift in connect-to-meeting rate.' }, { q: 'Does it work for both inbound and outbound?', a: 'Yes — any live call where a next step is the goal.' }] },
  'call-qa-and-scoring': { before: 'QA listens to a handful of calls a week and hopes it’s representative. The calls that need coaching most are the ones nobody had time to hear.', after: 'Parley scores every call automatically, so managers coach from the full picture and problems can’t hide in the 98% no one reviewed.', steps: [{ title: 'Every call scored', body: 'Graded on your rubric the moment it ends.' }, { title: 'Trends roll up', body: 'Team and rep trend lines make coaching obvious.' }, { title: 'Outliers flagged', body: 'Parley surfaces the calls most worth a listen.' }], faqs: [{ q: 'What’s the scoring based on?', a: 'Your criteria. Configure the rubric; Parley grades consistently and transparently.' }, { q: 'Can we still listen to calls?', a: 'Yes — every score links to the exact moment in the transcript that drove it.' }] },
  'compliant-cold-calling': { before: 'One number that shouldn’t have been dialed, one missing consent — and you’re exposed to real TCPA penalties. So managers throttle dials and cap the team.', after: 'Parley scrubs DNC before the dial, captures consent, and enforces calling windows automatically — so the team can run hot without the risk.', steps: [{ title: 'Scrub first', body: 'Every number is checked against DNC before it rings.' }, { title: 'Capture consent', body: 'Consent is prompted and logged with an audit trail.' }, { title: 'Stay in the window', body: 'Calling-time and retention rules apply by jurisdiction.' }], faqs: [{ q: 'Does compliance slow reps down?', a: 'No — checks run in the background. Reps dial; Parley keeps them compliant.' }, { q: 'Is everything auditable?', a: 'Yes. Scrubs, consent, and windows are logged and exportable.' }] },
  'auto-log-to-crm': { before: 'Reps spend the last two minutes of every call typing notes — or skip it, leaving the CRM full of holes and the pipeline impossible to trust.', after: 'Parley writes the disposition, notes, and next steps back to your CRM automatically, so data stays clean and reps stay on the phone.', steps: [{ title: 'Listens to the call', body: 'Parley captures the outcome as it happens.' }, { title: 'Writes it back', body: 'Disposition, notes, and next steps sync to the CRM.' }, { title: 'Rep dials on', body: 'No manual logging, more dials per hour.' }], faqs: [{ q: 'Which CRMs are supported?', a: 'FollowUpBoss, kvCORE, HubSpot and more. Tell us your stack.' }, { q: 'Can reps edit the auto-notes?', a: 'Yes — the notes are a draft the rep can adjust before they sync.' }] },
};
UC.forEach(([slug, name, h1, body, links]) => {
  const d = UC_DETAIL[slug] || {};
  add({
    slug: `use-cases/${slug}`, title: `${name} — Parley use case`, desc: `${h1} ${body}`.slice(0, 155),
    crumb: [home, { label: 'Use cases', href: '/use-cases/' }, { label: name }],
    sections: [
      { type: 'hero', eyebrow: `Use case`, h1, sub: body, ctas: CTAS, media: liveMoment },
      { type: 'split', eyebrow: 'Without Parley', h2: 'How this goes today.', body: d.before || body, media: pausePanel },
      { type: 'split', flip: true, eyebrow: 'With Parley', h2: 'How it goes with a copilot.', body: d.after || body, media: winPanel },
      { type: 'flow', eyebrow: 'The moment, step by step', h2: 'How it plays out live.', center: true, items: (d.steps || []).map((s, i) => ({ ...s, visual: momentViz[i] || '' })) },
      { type: 'cards', h2: 'How it works under the hood', center: true, cols: 2, items: links.map(l => { const h = HIW.find(x => x[0] === l); return { icon: '⚙️', title: h[1], body: h[2], href: `/how-it-works/${l}/` }; }) },
      { type: 'faq', h2: 'Questions', items: d.faqs || [] },
      { type: 'cta', h2: 'See it on your next call.', sub: 'Book a 20-minute demo and we’ll run this exact scenario live.', ctas: CTAS },
    ],
  });
});

/* objection scenario cluster */
const OBJ = [
  ['not-interested', '“We’re not interested”', 'Most “not interested” is reflex, not a decision. The goal is to earn one more sentence.', 'Sounds like I caught you cold — totally fair. If I’ve got the wrong read, just say so, but teams like yours usually call us about [specific pain]. Is that not on your radar?'],
  ['no-budget', '“We have no budget”', 'Budget objections are usually priority objections in disguise. Isolate the real blocker.', 'Totally hear you. If I could show it pays for itself with one saved deal, would budget still be the blocker — or is it really timing?'],
  ['call-me-later', '“Call me next quarter”', 'A vague future date is usually a polite no. Make the timeline real.', 'I can do that — so I don’t waste the touch, what actually changes next quarter that turns this into a yes?'],
  ['already-use-a-competitor', '“We already use a competitor”', 'Happy customers don’t switch. Find the gap they’ve quietly accepted.', 'Makes sense — you wouldn’t have picked them if they were bad. What’s the one thing you wish they did that they don’t?'],
  ['send-me-an-email', '“Just send me an email”', 'The email brush-off is a test. Earn the specifics that make a reply likely.', 'Happy to — and so it’s not just another ignored email, what’s the one thing it has to answer for it to be worth your reply?'],
  ['gatekeeper', '“She’s not available”', 'The gatekeeper is an ally, not an obstacle. Enlist them.', 'No worries — you probably know her calendar better than anyone. When’s she genuinely easiest to catch, and should I mention we spoke?'],
];
OBJ.forEach(([slug, q, why, line], idx) => {
  const related = OBJ.filter(x => x[0] !== slug).slice(0, 3).map(x => ({ icon: '🎯', title: x[1], body: x[2].slice(0, 64) + '…', href: `/use-cases/objections/${x[0]}/`, more: 'See the line' }));
  add({
    slug: `use-cases/objections/${slug}`, title: `How to respond to ${q} — objection handling | Parley`, desc: `${why} The exact line to use, and how Parley whispers it live.`,
    crumb: [home, { label: 'Use cases', href: '/use-cases/' }, { label: 'Objections', href: '/resources/objection-library/' }, { label: q }],
    sections: [
      { type: 'hero', eyebrow: 'Objection handling', h1: `${q}`, sub: why, ctas: CTAS, media: `<div class="card obj g"><div class="card-lbl"><span class="dot red"></span>Parley whispers</div><div class="body" style="color:#ffe9ee">“${line}”</div></div>` },
      { type: 'prose', html: `<h2>Why you hear this</h2><p>${why} Nine times out of ten it’s a reflex, not a considered decision — the prospect is protecting their time, not rejecting your offer. Treat it as the start of the conversation, not the end.</p><h2>What not to do</h2><p>Don’t argue, don’t pitch harder, and don’t accept it at face value and hang up. All three end the call. The goal is simply to earn one more sentence.</p><h2>The move</h2><p>Acknowledge, then redirect to a single specific question that reopens the conversation. You’re not overcoming the objection by force — you’re making it easy for the prospect to keep talking.</p><h2>The line</h2><p><strong>“${line}”</strong></p><h2>How Parley helps</h2><p>Recalling the right line under pressure is the hard part. Parley detects this exact objection the instant it lands and surfaces the response on the rep’s overlay in under a second — so nobody freezes, and every rep handles it like your best closer.</p>` },
      { type: 'steps', eyebrow: 'The framework', h2: 'Handle it in three moves.', center: true, items: [{ title: 'Acknowledge', body: 'Validate the pushback so the prospect feels heard and drops their guard.' }, { title: 'Redirect', body: 'Pivot to one specific question that reopens the conversation.' }, { title: 'Earn the next step', body: 'Use the answer to move toward a small, concrete commitment.' }] },
      { type: 'cards', eyebrow: 'More objections', h2: 'Handle the next one too.', center: true, cols: 3, items: related },
      { type: 'faq', h2: 'Questions', items: [{ q: `Isn’t “${q.replace(/[“”]/g, '')}” just a polite no?`, a: 'Sometimes — but most of the time it’s a reflex. The line above is designed to tell the difference without being pushy.' }, { q: 'Can Parley deliver this automatically?', a: 'Parley surfaces the line on the rep’s overlay the moment the objection lands. The rep still says it in their own voice — Parley just makes sure they never blank.' }] },
      { type: 'cta', h2: 'Hear Parley handle this live.', sub: 'Book a demo and throw your worst objections at it.', ctas: CTAS },
    ],
  });
});

/* ============================ PRICING ============================ */
add({ slug: 'pricing', title: 'Parley pricing — plans for every calling team', desc: 'Simple per-seat pricing with transparent usage. One saved deal pays for the year. Try 2 calls free or book a demo.',
  crumb: [home, { label: 'Pricing' }],
  sections: [
    { type: 'hero', eyebrow: 'Pricing', h1: 'Win more deals.<br>Pay like <span class="grad">it’s nothing.</span>', sub: 'A single high-ticket close clears $8k+ in commission. Parley costs less than one lost deal — and it’s engineered to win your reps several more a month. No rip-and-replace; it runs over the dialer you already have.', ctas: [FREE, DEMO], media: box('ROI', 'Most teams clear their entire annual cost in the first 3 booked meetings — then it’s pure upside.') },
    { type: 'stats', h2: 'The math nobody argues with', center: true, items: [
      { big: '$8k+', lbl: 'avg. commission per high-ticket close' },
      { big: '3', lbl: 'booked meetings to full payback' },
      { big: '+34%', lbl: 'more objections turned around, live' },
      { big: '10 min', lbl: 'from install to your first assisted call' },
    ] },
    { type: 'tiers', h2: 'Plans', sub: 'Per rep, per month. Annual saves up to 23%. Talk-minutes are the Parley AI layer — run it over the dialer you already have at zero telephony cost, or add optional Parley Numbers (metered, with local presence & spam remediation).', center: true, billing: true, items: [
      { name: 'Starter', kind: 'plain', desc: 'For first-time cold-callers getting off scripts.',
        monthly: 129, annual: 99, saveYear: 360, per: '/rep/mo', ctaLabel: 'Try 2 calls free', ctaKind: 'plain', href: '/signup/',
        allowance: { amt: '1,500 talk-minutes', unit: '/rep/mo', equiv: ['≈ 500 connected conversations', 'Pooled across your whole team'], note: 'then $0.04/min · connected time only' },
        band: { title: 'ASSISTED · NOT UNLIMITED', sub: 'Selected models — get reps off scripts, fast.' },
        feats: [
          { t: 'Live whisper overlay + objection rebuttals', in: true },
          { t: 'Silent to the prospect — never touches the audio', in: true },
          { t: 'Call-stage guidance', in: true },
          { t: 'Works over any dialer or Zoom', in: true },
          { t: 'Auto CRM call logging', in: true },
          { t: 'Undetectable overlay — invisible on screen-share', in: false },
          { t: 'Live whisper coaching + barge', in: false },
          { t: 'Call scoring on 100% of calls', in: false },
          { t: 'Voice Behaviour Analysis', in: false },
        ] },
      { name: 'Team', kind: 'hot', desc: 'For teams that coach and score every call.', pills: [{ text: 'MOST POPULAR', type: 'pop' }],
        monthly: 319, annual: 249, saveYear: 840, per: '/rep/mo', ctaLabel: 'Book a demo', ctaKind: 'pri', href: '/demo/',
        allowance: { amt: '3,000 talk-minutes', unit: '/rep/mo', equiv: ['≈ 1,000 connected conversations', 'Pooled across your whole team'], note: 'then $0.03/min · connected time only' },
        band: { title: 'COACH + SCORE · FULL FLOOR', sub: 'Every call scored, the whole team coached live.' },
        feats: [
          { t: 'Everything in Starter', in: true },
          { t: 'Undetectable overlay — invisible on screen-share', in: true, detail: 'defeats Zoom / Meet / Teams monitoring' },
          { t: 'Live whisper coaching + barge-in', in: true },
          { t: 'Call scoring on 100% of calls', in: true },
          { t: 'Post-call scorecards + manager dashboard', in: true },
          { t: 'CRM integrations (FollowUpBoss, kvCORE, HubSpot…)', in: true },
          { t: 'Trains on your team’s winning lines', in: true },
          { t: 'Priority support', in: true },
          { t: 'Voice Behaviour Analysis', in: false },
        ] },
      { name: 'Signal', kind: 'ultra', desc: 'For floors that read the voice, not just the words.', pills: [{ text: 'BEST VALUE', type: 'best' }, { text: 'VOICE INTELLIGENCE', type: 'voice' }],
        monthly: 639, annual: 499, saveYear: 1680, per: '/rep/mo', ctaLabel: 'Book a demo', ctaKind: 'ultra', href: '/demo/',
        allowance: { amt: '3,000 talk-minutes', unit: '/rep/mo', equiv: ['≈ 1,000 conversations, fully analyzed', 'Pooled across your whole team'], note: 'then $0.05/min · connected time only' },
        band: { title: 'VOICE INTELLIGENCE · FULL POWER', sub: 'Parley reads tone, rapport & temperature on every call.' },
        feats: [
          { t: 'Everything in Team', in: true },
          { t: 'Real-time Voice Behaviour Analysis', in: true, detail: 'momentum · rapport · strain · balance' },
          { t: 'Vocal Resonance rapport tracking', in: true },
          { t: 'Cold → hot lead temperature, live', in: true },
          { t: 'Cultural tone-matching', in: true, detail: '12 locales' },
          { t: 'Behavioural scorecards on every call', in: true },
          { t: 'Premium closer-brain model (frontier LLM)', in: true },
          { t: 'Custom voice-model training', in: false },
        ] },
      { name: 'Scale', custom: true, desc: 'For BPOs and large floors: pooled committed-use minutes, per-tenant isolation, SSO, and a dedicated success team.', ctaLabel: 'Talk to sales', href: '/contact/',
        feats: [{ t: 'Everything in Signal' }, { t: 'DNC scrub + TCPA controls' }, { t: 'Per-tenant isolation & SSO' }, { t: 'Custom rebuttal + voice-model training' }, { t: 'Dedicated CSM + SLA' }] },
    ] },
    { type: 'prose', html: '<div style="max-width:780px;margin:0 auto;border:1px solid rgba(43,255,176,.35);border-left:3px solid var(--green);border-radius:16px;padding:28px 30px;background:linear-gradient(180deg,rgba(43,255,176,.06),rgba(43,255,176,.01))"><div style="font:700 11px/1 var(--mono);letter-spacing:.16em;color:var(--green);margin-bottom:12px">▸ THE 30-DAY GUARANTEE</div><p style="font-size:19px;line-height:1.45;color:var(--txt);margin:0 0 10px"><strong>Put Parley on your floor for 30 days. If your reps use it and your booked-meeting rate doesn’t lift, that month is on us.</strong></p><p style="font-size:14.5px;color:var(--mut);margin:0;line-height:1.55">We only win when your reps book more, so we take the risk off the table. Conditional on active use — hear it on real calls, or don’t pay for the month. Keep your own number the whole time; nothing to rip out.</p></div>' },
    { type: 'faq', h2: 'Pricing questions', items: [
      { q: 'Can I test it before I commit?', a: 'Yes — your first 2 live calls are free, no card. Put a rep on it, hear Parley handle real objections on real calls, then pick a plan before you roll it out to the floor.' },
      { q: 'What is Voice Intelligence and why is it a separate tier?', a: 'It’s the engine listening to <em>how</em> the prospect speaks, not just what they say — tone, hesitation, vocal strain, and a novel Vocal Resonance signal that shows rapport building in the voice before it shows in the words. It runs a live cold→hot temperature and a behavioural scorecard on every call. It’s genuinely heavier compute and a separate benefit, so it lives on the Signal tier.' },
      { q: 'Why did prices go up?', a: 'Because the product closes deals. Pricing to the value it creates — not the cost to run it — keeps us building the sharpest tool on your floor instead of the cheapest.' },
      { q: 'How does usage work?', a: 'Each seat includes a monthly pool of talk-minutes (1,500 on Starter, 3,000 on Team and Signal), pooled across your team so heavy and light callers even out. Go over and it’s a simple per-minute overage — never a call blocked mid-conversation, never a surprise bill. Minutes count connected talk time only; dials that don’t connect are free.' },
      { q: 'Do we need to switch dialers?', a: 'No. Parley works over your existing dialer, softphone, or Zoom.' },
      { q: 'Can reps use their own phone number or SIM?', a: 'Yes — keeping your number is the whole point. Parley doesn’t replace your line, it listens to it. Three ways, all with <strong>your</strong> number and no porting: (1) dial from the softphone or dialer you already use (Kixie, Aircall, RingCentral, JustCall, a browser dialer) and Parley captures the audio — nothing changes for the rep; (2) SIM-only reps use the Parley bridge — Parley rings your own cell, you answer on your normal phone, and it dials the prospect showing your own number (verified once in 60 seconds); (3) optionally add a Parley number if you want a fresh local-presence line. No port, no new SIM, no rip-and-replace.' },
      { q: 'Do we need to buy phone numbers or a Twilio account?', a: 'No. By default Parley listens at the audio layer over the dialer and numbers you already use, so there are zero telephony fees from us — you keep your own carrier. And you don’t need a number per call: a rep dials from one number (or a small rotating pool), so “500 conversations” means volume through that line, not 500 numbers. If you’d rather we provide the line, Parley Numbers is an optional metered add-on — wholesale SIP minutes plus a managed rotating pool with local-area presence and spam-label remediation — billed separately from your seat and priced below what a Twilio account would cost you directly.' },
      { q: 'Can we train it on our own rebuttals?', a: 'On Team and up, yes — Parley learns your winning talk tracks so cards match how your best reps actually sell. Scale adds custom voice-model training.' },
    ] },
    finalCta('Ready to hear the difference?', 'Try it free on your next 2 calls, or book a demo and we’ll run your toughest objections live.'),
  ],
});

/* ============================ RESOURCES ============================ */
add({ slug: 'resources', title: 'Parley resources — cold-calling guides, scripts & tools', desc: 'The cold-calling guide, the objection library, scripts, an ROI calculator, and honest comparisons.',
  crumb: [home, { label: 'Resources' }],
  sections: [
    { type: 'hero', eyebrow: 'Resources', h1: 'Get better on<br>the phone.', sub: 'Guides, scripts, and tools for teams that live on outbound — free, no gate on most of it.', ctas: [['Read the cold-calling guide', '/guides/cold-calling/', 'pri'], ['Objection library', '/resources/objection-library/', 'sec']] },
    { type: 'cards', h2: 'Start here', center: true, cols: 3, items: [
      { icon: '📘', title: 'The cold-calling guide', body: 'The complete 2026 playbook, start to close.', href: '/guides/cold-calling/' },
      { icon: '🎯', title: 'Objection library', body: 'A response to every objection you’ll hear.', href: '/resources/objection-library/' },
      { icon: '📄', title: 'Cold-call scripts', body: 'Battle-tested templates by industry.', href: '/resources/cold-call-scripts/' },
      { icon: '🧮', title: 'ROI calculator', body: 'What real-time coaching is worth to your team.', href: '/resources/roi-calculator/' },
      { icon: '📚', title: 'Glossary', body: 'Every sales-tech term, defined.', href: '/resources/glossary/' },
      { icon: '⚖️', title: 'Parley vs Gong', body: 'Real-time vs. post-call, honestly compared.', href: '/compare/parley-vs-gong/' },
    ] },
    { type: 'cards', eyebrow: 'By buyer stage', h2: 'Wherever you are, start here.', center: true, cols: 3, items: [{ icon: '🌱', title: 'Just learning', body: 'The fundamentals of a modern cold call.', href: '/guides/cold-calling/', more: 'Read the guide' }, { icon: '⚖️', title: 'Comparing tools', body: 'Honest comparisons vs. Gong, Balto, and Cresta.', href: '/compare/parley-vs-gong/', more: 'Compare' }, { icon: '🧮', title: 'Building the case', body: 'Model the ROI for your team.', href: '/resources/roi-calculator/', more: 'Calculate' }] },
    finalCta(),
  ],
});
add({ slug: 'guides/cold-calling', title: 'The Complete Guide to Cold Calling (2026) — Parley', desc: 'A practical, modern cold-calling playbook: openers, discovery, objection handling, and booking the meeting.',
  crumb: [home, { label: 'Resources', href: '/resources/' }, { label: 'Cold-calling guide' }],
  sections: [
    { type: 'hero', eyebrow: 'Pillar guide', h1: 'The complete guide<br>to cold calling.', sub: 'Everything that actually works in 2026 — openers, discovery, objection handling, and the close — with the exact lines to steal.', ctas: [FREE, DEMO], media: box('THE 4 MOVES', 'Opener → Discovery → Objection → Close. Master these four and the rest is reps.') },
    { type: 'playbook', eyebrow: 'The playbook', h2: 'Four moves that win the call.', center: true, items: [
      { title: 'The opener', body: 'You have about eight seconds. Earn the next thirty by being permission-based and specific — name the interruption, then ask for permission instead of barreling into a pitch.', line: 'I know I’m an interruption — can I take fifteen seconds to say why I called, and you can hang up if it’s not relevant?' },
      { title: 'Discovery', body: 'Weak discovery kills more deals than weak closing. Ask one sharp question about the pain you actually solve, then stop talking and let the silence do the work.', line: 'What’s the one thing about how you’re handling this today that’s actually costing you?' },
      { title: 'Objection handling', body: 'Most objections are reflexes, not decisions. Don’t argue and don’t pitch harder — acknowledge it, then redirect to a single specific question that reopens the conversation.', line: 'Totally fair — what’s the one thing you wish your current setup did that it doesn’t?' },
      { title: 'Booking the meeting', body: 'The close is a moment most reps talk right past. Assume the meeting, offer two concrete times, and confirm the next step out loud so it actually sticks.', line: 'Makes sense to grab twenty minutes — does Tuesday at 10 or Thursday at 2 work better?' },
    ] },
    { type: 'cards', eyebrow: 'Keep going', h2: 'Go deeper on the hard parts.', center: true, cols: 2, items: [
      { icon: '🎯', title: 'The objection library', body: 'A proven response to every pushback you’ll hear — “no budget,” “call me next quarter,” “just email me,” and the rest.', href: '/resources/objection-library/', more: 'Handle every objection' },
      { icon: '📄', title: 'Script templates', body: 'Opener-to-close scripts tuned by industry — SaaS, real estate, insurance and more. Free to steal.', href: '/resources/cold-call-scripts/', more: 'Grab a template' },
    ] },
    finalCta('Reading it is easy. Doing it at dial 80 isn’t.', 'That’s the whole point of Parley — it puts the right move on your rep’s screen in the moment, so the playbook actually gets used.'),
  ],
});
add({ slug: 'resources/objection-library', title: 'The Cold-Call Objection Library — Parley', desc: 'A proven response to every common cold-call objection, with the exact line to use.',
  crumb: [home, { label: 'Resources', href: '/resources/' }, { label: 'Objection library' }],
  sections: [
    { type: 'hero', eyebrow: 'Objection library', h1: 'A response to every<br>objection you’ll hear.', sub: 'The exact lines your best reps use — and the ones Parley whispers automatically, live on the call.', ctas: CTAS },
    { type: 'cards', h2: 'Pick an objection', center: true, cols: 3, items: OBJ.map(([slug, q, why]) => ({ icon: '🎯', title: q, body: why.slice(0, 70) + '…', href: `/use-cases/objections/${slug}/`, more: 'See the line' })) },
    finalCta('Want these in your reps’ ears?', 'Parley surfaces the right rebuttal live, the instant the objection lands.'),
  ],
});
add({ slug: 'resources/cold-call-scripts', title: 'Cold-Call Script Templates by Industry — Parley', desc: 'Battle-tested cold-call scripts you can steal — for SaaS, real estate, insurance, and more.',
  crumb: [home, { label: 'Resources', href: '/resources/' }, { label: 'Cold-call scripts' }],
  sections: [
    { type: 'hero', eyebrow: 'Scripts', h1: 'Steal a script<br>that works.', sub: 'Opener-to-close templates, tuned by industry. Free to copy.', ctas: [FREE, DEMO] },
    { type: 'cards', h2: 'By industry', center: true, cols: 3, items: [['SaaS / software', 'saas'], ['Real estate', 'real-estate'], ['Insurance', 'insurance'], ['Financial services', 'finance'], ['Home services', 'home-services'], ['Staffing & recruiting', 'staffing']].map(([n]) => ({ icon: '📄', title: n, body: 'A full opener-to-close template for ' + n.toLowerCase() + '.', href: '/resources/cold-call-scripts/' })) },
    finalCta(),
  ],
});
add({ slug: 'resources/roi-calculator', title: 'ROI Calculator — Parley', desc: 'Estimate what real-time call coaching is worth to your team.',
  crumb: [home, { label: 'Resources', href: '/resources/' }, { label: 'ROI calculator' }],
  sections: [
    { type: 'hero', eyebrow: 'ROI calculator', h1: 'What’s a faster<br>ramp worth?', sub: 'Ballpark the return before you ever talk to us. Most teams recover Parley’s cost in the first few booked meetings.', ctas: CTAS, media: box('EXAMPLE', '10 reps · +2 meetings/rep/wk · $6k avg deal → Parley pays back in week 1.') },
    { type: 'stats', h2: 'The math most teams see', items: [{ big: '2 wks', lbl: 'faster ramp per new rep' }, { big: '+34%', lbl: 'more conversations from objections' }, { big: '3', lbl: 'booked meetings to break even' }, { big: '10×', lbl: 'typical first-year ROI' }] },
    finalCta('Want the exact number for your team?', 'Book a demo — we’ll model it with your real numbers.'),
  ],
});
add({ slug: 'resources/glossary', title: 'Sales-Tech Glossary — Parley', desc: 'Plain-English definitions of the sales and conversation-intelligence terms that matter.',
  crumb: [home, { label: 'Resources', href: '/resources/' }, { label: 'Glossary' }],
  sections: [
    { type: 'hero', eyebrow: 'Glossary', h1: 'Sales-tech,<br>in plain English.', sub: 'The terms behind real-time sales coaching and conversation intelligence — no jargon, no fluff.', ctas: [['Explore the product', '/how-it-works/', 'sec']] },
    { type: 'cards', h2: 'The terms that matter.', center: true, cols: 2, items: [
      { icon: '⚡', title: 'Real-time call coaching', body: 'Software that assists a rep <em>during</em> a live call — surfacing rebuttals and next lines in the moment, not in a report afterward.' },
      { icon: '📊', title: 'Conversation intelligence', body: 'Analysis of sales calls to extract insight. Traditionally post-call (e.g. Gong); Parley does it live, on the call.' },
      { icon: '🎯', title: 'Objection handling', body: 'A rep’s response to a prospect’s pushback. The single biggest skill gap on most floors.', href: '/resources/objection-library/', more: 'See the library' },
      { icon: '🛡️', title: 'DNC scrub', body: 'Checking a number against Do-Not-Call lists before dialing, to stay TCPA-compliant.', href: '/how-it-works/compliance/', more: 'How Parley does it' },
      { icon: '🎧', title: 'Whisper coaching', body: 'A manager sending a one-line prompt only the rep hears, mid-call — coaching in the moment it matters.', href: '/how-it-works/live-coaching/', more: 'Live coaching' },
      { icon: '🚀', title: 'Ramp time', body: 'How long a new rep takes to reach full productivity. Cutting it is Parley’s core promise.', href: '/solutions/rep-onboarding/', more: 'Ramp faster' },
    ] },
    finalCta(),
  ],
});
const CMP = [
  ['parley-vs-cluely', 'Parley vs Cluely', 'A sales system, not a “wing it” tool.', 'Cluely is a horizontal, per-user overlay built to help an individual improvise on any call. Parley is a purpose-built system for outbound sales teams — trained on top closers, with coaching, scoring, CRM sync, compliance, and Voice Intelligence a floor actually needs.', [['', 'Parley', 'Cluely'], ['Real-time on-screen assist', true, true], ['Built for sales teams (coaching, scoring, dashboard)', true, false], ['Rebuttals trained on top closers’ frameworks', true, 'Generic LLM'], ['Undetectable on screen-share', 'Team plan', '$75 add-on'], ['TCPA / DNC compliance for outbound', true, false], ['CRM sync + auto call-logging', true, false], ['Voice behaviour analysis (tone, rapport, temperature)', true, false], ['Priced per rep for teams', true, 'Per user']]],
  ['parley-vs-gong', 'Parley vs Gong', 'Real-time vs. the report card.', 'Gong is a category-defining post-call tool — it tells you what went wrong after the deal is lost. Parley changes the call while it’s still happening.', [['', 'Parley', 'Gong'], ['Helps during the live call', true, false], ['Post-call analytics & scoring', true, true], ['Real-time objection rebuttals', true, false], ['Works over any dialer', true, 'Varies'], ['Built for outbound compliance', true, false]]],
  ['parley-vs-balto', 'Parley vs Balto', 'Both real-time. Different DNA.', 'Balto pioneered real-time guidance for contact centers. Parley is built for outbound sales teams — with the discreet overlay, CRM depth, and compliance an SDR floor needs.', [['', 'Parley', 'Balto'], ['Real-time guidance', true, true], ['Discreet rep-only overlay', true, 'Varies'], ['Outbound CRM sync (FollowUpBoss/kvCORE)', true, false], ['Objection library trained on your lines', true, 'Varies'], ['SDR-first workflow', true, false]]],
  ['parley-vs-cresta', 'Parley vs Cresta', 'Enterprise AI vs. fast to value.', 'Cresta targets large enterprise contact centers with heavy implementation. Parley gets an outbound team live in minutes, over the dialer they already use.', [['', 'Parley', 'Cresta'], ['Live in minutes, any dialer', true, false], ['Real-time rebuttals', true, true], ['Built for SDR/inside-sales', true, 'Varies'], ['Per-seat pricing', true, false], ['Compliance for outbound', true, 'Varies']]],
];
CMP.forEach(([slug, name, h1, body, table]) => add({
  slug: `compare/${slug}`, title: `${name} — honest comparison | Parley`, desc: `${body}`.slice(0, 155),
  crumb: [home, { label: 'Resources', href: '/resources/' }, { label: name }],
  sections: [
    { type: 'hero', eyebrow: 'Compare', h1, sub: body, ctas: CTAS, media: box('THE WEDGE', 'Help during the call — not a report card after it.') },
    { type: 'split', eyebrow: 'The core difference', h2: 'Real-time vs. after the fact.', body, media: box('TIMING', 'Parley changes the outcome while the prospect is still on the line.') },
    { type: 'table', h2: 'Side by side', cols: table[0], rows: table.slice(1) },
    { type: 'cards', eyebrow: 'What you actually get', h2: 'Why teams switch.', center: true, cols: 3, items: [{ icon: '⏱️', title: 'In-call, not post-call', body: 'Rebuttals and coaching arrive while it can still change the result.', href: '/how-it-works/' }, { icon: '🔌', title: 'Any dialer, minutes to live', body: 'No heavy rollout — Parley runs over the stack you have.', href: '/how-it-works/integrations/' }, { icon: '🛡️', title: 'Built for outbound', body: 'TCPA/DNC compliance and SDR-first workflow out of the box.', href: '/how-it-works/compliance/' }] },
    { type: 'faq', h2: 'Common questions', items: [{ q: 'Do we have to rip out our current tool?', a: 'No. Many teams run Parley alongside their post-call analytics — real-time coaching and after-the-fact reporting solve different problems.' }, { q: 'How fast can we be live?', a: 'Minutes, over your existing dialer. There’s no lengthy implementation.' }] },
    finalCta('See the real-time difference.', 'Book a demo and watch Parley work a live objection.'),
  ],
}));

/* ============================ CUSTOMERS ============================ */
add({ slug: 'customers', title: 'Customers — teams winning with Parley', desc: 'How outbound teams use Parley to ramp faster, handle objections, and book more meetings.',
  crumb: [home, { label: 'Customers' }],
  sections: [
    { type: 'hero', eyebrow: 'Customers', h1: 'Teams who live<br>on the phone.', sub: 'Real results from SDR floors, inside-sales teams, and real-estate ISAs.', ctas: CTAS },
    { type: 'logos', items: ['Northwind', 'BeltLine', 'Cadence', 'HarborSDR', 'Rooftop Realty', 'Vantage', 'Meridian', 'Pace'] },
    { type: 'cards', h2: 'Case studies', center: true, cols: 3, items: [
      { icon: '🏠', title: 'Rooftop Realty', body: 'Cut ISA ramp from 8 weeks to 2 and booked 34% more appointments.', href: '/customers/rooftop-realty/', more: 'Read the story' },
      { icon: '📞', title: 'HarborSDR', body: 'Standardized objection handling across 40 SDRs.', href: '/customers/', more: 'Coming soon' },
      { icon: '⚡', title: 'Cadence', body: 'Scored 100% of calls and lifted connect-to-meeting 28%.', href: '/customers/', more: 'Coming soon' },
    ] },
    finalCta(),
  ],
});
add({ slug: 'customers/rooftop-realty', title: 'Rooftop Realty cuts ISA ramp to 2 weeks — Parley', desc: 'How Rooftop Realty used Parley to ramp ISAs 4× faster and book 34% more appointments.',
  crumb: [home, { label: 'Customers', href: '/customers/' }, { label: 'Rooftop Realty' }],
  sections: [
    { type: 'hero', eyebrow: 'Case study · Real estate', h1: 'From 8-week ramp<br>to 2.', sub: 'How Rooftop Realty turned a revolving door of ISAs into a booking machine.', ctas: CTAS, media: box('RESULTS', '+34% appointments · 2-week ramp · 100% calls scored') },
    { type: 'stats', items: [{ big: '4×', lbl: 'faster ISA ramp' }, { big: '+34%', lbl: 'appointments booked' }, { big: '100%', lbl: 'of calls scored' }, { big: '6 wks', lbl: 'to full payback' }] },
    { type: 'prose', html: `<h2>The challenge</h2><p>Rooftop’s ISA team churned constantly, and every new hire took two months to get comfortable on objection-heavy seller calls. Managers couldn’t listen to enough calls to coach effectively.</p><h2>The solution</h2><p>Parley rode along on every kvCORE call, whispering rebuttals for “we’re just looking” and “which agent is this?”, while auto-scoring 100% of calls for the team lead.</p><h2>The results</h2><p>New ISAs hit their first booked appointment in week two instead of week eight, appointments rose 34%, and the tool paid for itself in six weeks.</p><blockquote style="border-left:3px solid var(--green);padding-left:16px;color:var(--txt)">“Our new reps ramp in two weeks instead of two months.” — VP Sales, Rooftop Realty</blockquote>` },
    finalCta(),
  ],
});

/* ============================ COMPANY ============================ */
add({ slug: 'about', title: 'About Parley — the two-sided negotiation', desc: 'A parley is a negotiation between two sides. That’s exactly what we mediate.',
  crumb: [home, { label: 'About' }],
  sections: [
    { type: 'hero', eyebrow: 'About', h1: 'A parley is a negotiation<br>between two sides.', sub: 'That’s exactly what we mediate — listening to both sides of a live call and whispering the move that wins it.', ctas: [DEMO, ['See open roles', '/careers/', 'sec']] },
    { type: 'prose', html: `<h2>Why we built Parley</h2><p>Every sales tool grades the call after it’s over. We thought that was backwards. The moment a rep needs help is <em>during</em> the call — when the prospect pushes back and the clock is ticking. So we built a copilot that’s in the room, in real time.</p><h2>The name</h2><p>A “parley” is a discussion between opposing sides to reach terms. A cold call is exactly that. Parley sits in the middle and helps the rep find the words.</p>` },
    finalCta(),
  ],
});
add({ slug: 'careers', title: 'Careers — Parley', desc: 'Help us put the perfect line in every rep’s ear. Join Parley.',
  crumb: [home, { label: 'Careers' }],
  sections: [
    { type: 'hero', eyebrow: 'Careers', h1: 'Build the copilot<br>for live conversation.', sub: 'We’re a small team obsessed with real-time and the craft of the sales call. Come build it with us.', ctas: [['Email us', '/contact/', 'pri']] },
    { type: 'cards', h2: 'Open roles', center: true, cols: 3, items: [
      { icon: '🎧', title: 'Speech / ML engineer', body: 'Low-latency STT and real-time inference.' },
      { icon: '🖥️', title: 'Product engineer', body: 'The desktop overlay and dashboard.' },
      { icon: '📣', title: 'Founding AE', body: 'Sell the thing to people who live on the phone.' },
    ] },
    finalCta('Don’t see your role?', 'We hire for slope, not just fit. Reach out anyway.'),
  ],
});
add({ slug: 'contact', title: 'Contact Parley', desc: 'Talk to the Parley team — sales, support, or partnerships.',
  crumb: [home, { label: 'Contact' }],
  sections: [
    { type: 'hero', eyebrow: 'Contact', h1: 'Let’s talk.', sub: 'Book a demo for the fastest path, or reach the team directly.', ctas: CTAS, media: box('REACH US', 'Sales: sales@parley.example · Support: help@parley.example') },
    finalCta(),
  ],
});

/* ============================ TRUST / LEGAL ============================ */
add({ slug: 'security', title: 'Security & trust — Parley', desc: 'Encryption, tenant isolation, and a SOC 2 path. How Parley keeps your calls safe.',
  crumb: [home, { label: 'Security' }],
  sections: [
    { type: 'hero', eyebrow: 'Security', h1: 'Your calls,<br>locked down.', sub: 'Enterprise-grade from the edge in — encryption, isolation, and a compliance posture built for regulated outbound.', ctas: [DEMO, ['Read the DPA', '/dpa/', 'sec']] },
    { type: 'cards', h2: 'How we protect your data', center: true, cols: 3, items: [
      { icon: '🔒', title: 'Encrypted everywhere', body: 'In transit and at rest, end to end.' },
      { icon: '🧱', title: 'Tenant isolation', body: 'Row-level security keeps every org’s data separate.' },
      { icon: '🤝', title: 'Signed service auth', body: 'mTLS and signed tokens between every service.' },
      { icon: '📋', title: 'SOC 2 path', body: 'Controls mapped and audit underway.' },
      { icon: '🛡️', title: 'TCPA / DNC', body: 'Compliance controls for outbound baked in.' },
      { icon: '🗄️', title: 'Data retention', body: 'Configurable retention and deletion on your terms.' },
    ] },
    finalCta(),
  ],
});
const LEGAL = [
  ['privacy', 'Privacy Policy', 'How we collect, use, and protect personal data.'],
  ['terms', 'Terms of Service', 'The terms that govern your use of Parley.'],
  ['dpa', 'Data Processing Addendum', 'How Parley processes personal data on your behalf.'],
];
LEGAL.forEach(([slug, name, sub]) => add({
  slug, title: `${name} — Parley`, desc: sub,
  crumb: [home, { label: name }],
  sections: [
    { type: 'hero', eyebrow: 'Legal', h1: name, sub, ctas: [['Contact us', '/contact/', 'sec']] },
    { type: 'prose', html: `<p style="color:var(--dim)"><em>This is placeholder legal content for the site scaffold. Replace with counsel-reviewed language before launch.</em></p><h2>Overview</h2><p>Parley (“we”) provides a real-time sales copilot. This ${name.toLowerCase()} describes the relevant terms. By using Parley you agree to it.</p><h2>Contact</h2><p>Questions? Email legal@parley.example.</p>` },
  ],
}));

/* ============================ CONVERT ============================ */
add({ slug: 'demo', title: 'Book a demo — Parley', desc: 'See Parley handle a live objection. Book a 20-minute demo.',
  sections: [
    { type: 'hero', eyebrow: 'Book a demo', h1: 'Throw us your<br>worst objection.', sub: 'In 20 minutes we’ll run a live call and let Parley handle the pushback your reps hate most. No slides.', ctas: [['Grab a time', '/demo/', 'pri'], ['Try 2 calls free instead', '/signup/', 'sec']], media: box('DEMO', '20 minutes · live call · your objections · no slides') },
    { type: 'stats', items: [{ big: '20 min', lbl: 'that’s the whole demo' }, { big: '<1s', lbl: 'to rebuttal, live' }, { big: '0', lbl: 'slides' }, { big: 'Any', lbl: 'dialer you use' }] },
  ],
});
add({ slug: 'signup', title: 'Try Parley free — your first 2 calls', desc: 'Hear Parley on your next 2 cold calls, free. No credit card.',
  sections: [
    { type: 'hero', eyebrow: 'Free trial', h1: 'Hear it on your<br>next 2 calls.', sub: 'Set up in minutes over your existing dialer. Your first 2 live calls are free — no credit card, no rip-and-replace. After that, pick the plan that fits.', ctas: [['Start my free trial', '/signup/', 'pri'], ['Book a demo', '/demo/', 'sec']], media: box('FREE TRIAL', '2 calls free · any dialer · live in minutes') },
  ],
});
add({ slug: 'login', title: 'Log in — Parley', desc: 'Log in to your Parley account.',
  sections: [{ type: 'hero', eyebrow: 'Log in', h1: 'Welcome back.', sub: 'Log in to your Parley dashboard.', ctas: [['Continue', '/login/', 'pri'], ['Need an account?', '/signup/', 'sec']] }],
});
add({ slug: '404', title: 'Page not found — Parley', desc: 'That page went to voicemail.',
  sections: [{ type: 'hero', eyebrow: 'Error 404', h1: 'That page went<br>to voicemail.', sub: 'The page you’re after doesn’t exist. Let’s get you back on the call.', ctas: [['Back home', '/', 'pri'], ['How it works', '/how-it-works/', 'sec']] }],
});

export { PAGES };
