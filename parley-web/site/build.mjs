import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PAGES, SITE } from './content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'dist');

const TOPNAV = [
  ['How it works', '/how-it-works/'],
  ['Solutions', '/solutions/'],
  ['Use cases', '/use-cases/'],
  ['Pricing', '/pricing/'],
  ['Resources', '/resources/'],
  ['Customers', '/customers/'],
];

const FOOTER = [
  ['Product', [['How it works', '/how-it-works/'], ['The live tour', '/how-it-works/tour/'], ['Objection rebuttals', '/how-it-works/objection-rebuttals/'], ['Voice Intelligence', '/how-it-works/voice-intelligence/'], ['Call scoring', '/how-it-works/call-scoring/'], ['Integrations', '/how-it-works/integrations/'], ['Pricing', '/pricing/']]],
  ['Solutions', [['SDR teams', '/solutions/sdr-teams/'], ['Inside sales', '/solutions/inside-sales/'], ['Real estate ISA', '/solutions/real-estate-isa/'], ['Sales managers', '/solutions/sales-managers/'], ['Rep onboarding', '/solutions/rep-onboarding/'], ['Agencies / BPO', '/solutions/agencies-bpo/']]],
  ['Use cases', [['Handle objections', '/use-cases/handle-objections-live/'], ['Ramp new reps', '/use-cases/ramp-new-reps/'], ['Book more meetings', '/use-cases/book-more-meetings/'], ['Call QA & scoring', '/use-cases/call-qa-and-scoring/'], ['Compliant calling', '/use-cases/compliant-cold-calling/'], ['Auto-log to CRM', '/use-cases/auto-log-to-crm/']]],
  ['Resources', [['Blog', '/resources/'], ['Cold-calling guide', '/guides/cold-calling/'], ['Objection library', '/resources/objection-library/'], ['Scripts', '/resources/cold-call-scripts/'], ['ROI calculator', '/resources/roi-calculator/'], ['Parley vs Cluely', '/compare/parley-vs-cluely/'], ['Parley vs Gong', '/compare/parley-vs-gong/']]],
  ['Company', [['About', '/about/'], ['Customers', '/customers/'], ['Careers', '/careers/'], ['Contact', '/contact/'], ['Security', '/security/'], ['Privacy', '/privacy/']]],
];

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- Design System iconography (24×24 · 2px stroke · round caps · currentColor) ----------
   Verbatim from Parley Design System.dc.html §05, plus a few product-semantic additions. */
const ICONS = {
  call: '<path d="M5 4 h4 l2 5 l-2.5 1.5 a11 11 0 0 0 5 5 l1.5 -2.5 l5 2 v4 a1 1 0 0 1 -1 1 A16 16 0 0 1 4 5 a1 1 0 0 1 1 -1z"/>',
  'end-call': '<path d="M5 4 h4 l2 5 l-2.5 1.5 a11 11 0 0 0 5 5 l1.5 -2.5 l5 2 v4 a1 1 0 0 1 -1 1 A16 16 0 0 1 4 5 a1 1 0 0 1 1 -1z"/><path d="M3 3 L21 21"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11 a7 7 0 0 0 14 0 M12 18 v3"/>',
  waveform: '<path d="M3 12 v.1 M7 8 v8 M11 4 v16 M15 7 v10 M19 10 v4"/>',
  whisper: '<path d="M4 5 h16 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 h-9 l-5 4 v-4 h-2 a1 1 0 0 1 -1 -1 V6 a1 1 0 0 1 1 -1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20 l-3.5 -3.5"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12 L19 7"/>',
  shield: '<path d="M12 3 l7 3 v5 c0 5 -4 8 -7 9 c-3 -1 -7 -4 -7 -9 V6z"/><path d="M8.5 12 l2.5 2.5 l4.5 -5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11 V8 a4 4 0 0 1 8 0 v3"/>',
  bolt: '<path d="M13 2 L4 14 h6 l-1 8 l9 -12 h-6z"/>',
  chart: '<path d="M3 20 v-6 M9 20 V6 M15 20 v-9 M21 20 V9"/>',
  crm: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9 h18 M8 4 v16"/>',
  sync: '<path d="M4 10 a8 8 0 0 1 14 -3.5 M18 3 v4 h-4"/><path d="M20 14 a8 8 0 0 1 -14 3.5 M6 21 v-4 h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5 20 a7 7 0 0 1 14 0"/>',
  team: '<circle cx="9" cy="8" r="3.4"/><path d="M3 19 a6 6 0 0 1 12 0"/><path d="M16 6 a3 3 0 0 1 0 6 M16 13 a6 6 0 0 1 5 6"/>',
  check: '<path d="M4 12 l5 5 l11 -12"/>',
  alert: '<path d="M12 3 L22 20 H2z"/><path d="M12 10 v4 M12 17 v.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7 v5 l4 2"/>',
  star: '<path d="M12 3 l2.7 5.8 l6.3 .7 l-4.7 4.3 l1.3 6.2 l-5.6 -3.1 l-5.6 3.1 l1.3 -6.2 l-4.7 -4.3 l6.3 -.7z"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3 M5 5 l2 2 M17 17 l2 2 M19 5 l-2 2 M7 17 l-2 2"/>',
  play: '<path d="M7 4 l13 8 l-13 8z"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  book: '<path d="M4 4 h11 a3 3 0 0 1 3 3 v13 H7 a3 3 0 0 1 -3 -3z"/><path d="M18 7 h2 v13 h-13"/>',
  arrow: '<path d="M5 12 h13 M13 6 l6 6 l-6 6"/>',
  // product-semantic additions, drawn to the same 24×24 / 2px grid
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  brain: '<path d="M12 6 a3 3 0 0 0 -5.5 1.7 a3 3 0 0 0 -1 5 a3 3 0 0 0 2.8 3.8 a2.4 2.4 0 0 0 3.7 .3z M12 6 a3 3 0 0 1 5.5 1.7 a3 3 0 0 1 1 5 a3 3 0 0 1 -2.8 3.8 a2.4 2.4 0 0 1 -3.7 .3z M12 6 v11"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12 h18 M12 3 c3 3 3 15 0 18 M12 3 c-3 3 -3 15 0 18"/>',
  flame: '<path d="M12 3 c1.5 3 4.5 4.2 4.5 8 a4.5 4.5 0 0 1 -9 0 c0 -2 1 -3.2 1.2 -3.2 c.2 1.2 1.1 2 2.1 2 c1.2 -1.8 -1 -4 1.2 -6.8z"/>',
  money: '<circle cx="12" cy="12" r="9"/><path d="M12 7 v10 M9.6 9.4 a2.2 2.2 0 0 1 2.4 -1.4 c1.4 0 2.3 1 2.3 2 c0 2.4 -4.7 1.4 -4.7 3.9 c0 1 .9 2 2.3 2 a2.2 2.2 0 0 0 2.4 -1.4"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18 h2"/>',
  headset: '<path d="M4 13 v-1 a8 8 0 0 1 16 0 v1"/><rect x="3" y="13" width="4" height="6" rx="1.6"/><rect x="17" y="13" width="4" height="6" rx="1.6"/><path d="M20 19 a4 4 0 0 1 -4 3 h-2"/>',
  route: '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.4 6 H15 a3 3 0 0 1 0 6 H9 a3 3 0 0 0 0 6 h6.6"/>',
  spark: '<path d="M12 3 v4 M12 17 v4 M3 12 h4 M17 12 h4 M6 6 l2.5 2.5 M15.5 15.5 L18 18 M18 6 l-2.5 2.5 M8.5 15.5 L6 18"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9 h16 M9 3 v4 M15 3 v4"/>',
  doc: '<path d="M6 3 h8 l5 5 v12 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 V4 a1 1 0 0 1 1 -1z"/><path d="M14 3 v5 h5 M8.5 13 h7 M8.5 16.5 h5"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7 h2 M13 7 h2 M9 11 h2 M13 11 h2 M10 21 v-4 h4 v4"/>',
  plug: '<path d="M9 3 v4 M15 3 v4 M7 7 h10 v3 a5 5 0 0 1 -10 0z M12 15 v6"/>',
  desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20 h8 M12 16 v4"/>',
  megaphone: '<path d="M4 10 v4 a1 1 0 0 0 1 1 h2 l9 4 V5 l-9 4 H5 a1 1 0 0 0 -1 1z M18 9 a4 4 0 0 1 0 6"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7 h8 M8 12 h.1 M12 12 h.1 M16 11.5 v5 M8 16 h.1 M12 16 h.1"/>',
  snow: '<path d="M12 3 v18 M4.5 7.5 L19.5 16.5 M19.5 7.5 L4.5 16.5 M12 6 l-2.5 -2 M12 6 l2.5 -2 M12 18 l-2.5 2 M12 18 l2.5 2 M5.2 12 l-.7 -2.6 M5.2 12 l-2.6 .7 M18.8 12 l.7 2.6 M18.8 12 l2.6 -.7"/>',
  handshake: '<path d="M8 12 l3 3 a1.4 1.4 0 0 0 2 0 l4 -4 h2 V7 h-3 l-2 -1 h-3 l-2 2 h-3 v5 h1z M8 12 l-2 2"/>',
};
// Bridge existing emoji content → DS stroke icons (unmapped emoji fall through untouched).
const EMOJI_ICON = {
  '🎯': 'target', '🧠': 'brain', '❓': 'search', '🔥': 'flame', '📏': 'chart', '➕': 'star',
  '⚡': 'bolt', '🛡️': 'shield', '🛡': 'shield', '🔒': 'lock', '🔐': 'lock', '📞': 'call', '☎️': 'call',
  '📈': 'chart', '📊': 'chart', '📉': 'chart', '🤖': 'radar', '💬': 'whisper', '🗣️': 'whisper',
  '🎧': 'headset', '📱': 'phone', '🌐': 'globe', '🌍': 'globe', '💰': 'money', '💵': 'money', '🏆': 'star',
  '⭐': 'star', '⏱️': 'clock', '⏱': 'clock', '⏰': 'clock', '🕐': 'clock', '🔗': 'sync', '🔄': 'sync',
  '👥': 'team', '👤': 'user', '🙋': 'user', '✅': 'check', '✔️': 'check', '⚠️': 'alert', '⚠': 'alert',
  '📚': 'book', '🎓': 'book', '📖': 'book', '▶️': 'play', '⚙️': 'settings', '🔍': 'search', '🔎': 'search',
  '📇': 'crm', '🗂️': 'crm', '🏠': 'radar', '🏡': 'radar', '🎙️': 'mic', '🎤': 'mic', '✨': 'spark',
  '📅': 'calendar', '🗓️': 'calendar', '🧭': 'route', '🚀': 'bolt',
  '📄': 'doc', '📝': 'doc', '📋': 'doc', '🧾': 'doc', '📘': 'book', '📕': 'book', '📗': 'book',
  '🔌': 'plug', '🖥️': 'desktop', '🖥': 'desktop', '💻': 'desktop', '📣': 'megaphone', '📢': 'megaphone',
  '🏢': 'building', '🏛️': 'building', '⚖️': 'shield', '⚖': 'shield', '🌱': 'spark', '🪴': 'spark',
  '🎬': 'play', '🔔': 'alert', '💡': 'spark', '🧩': 'route', '📍': 'radar', '🗺️': 'route', '💎': 'star',
  '🗄️': 'crm', '🗃️': 'crm', '🤝': 'handshake', '🧊': 'snow', '❄️': 'snow', '🧮': 'calc',
  '🧱': 'building', '🫥': 'user', '👻': 'user', '🔉': 'waveform', '🔊': 'waveform', '📡': 'radar',
};
const iconSvg = (id) => ICONS[id]
  ? `<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id]}</svg>`
  : '';
// Render a card icon: explicit DS id → SVG; known emoji → mapped SVG; anything else → as-is.
const renderIcon = (raw) => {
  if (!raw) return '';
  const key = String(raw).trim();
  if (ICONS[key]) return iconSvg(key);
  if (EMOJI_ICON[key]) return iconSvg(EMOJI_ICON[key]);
  return raw;
};
// animated equalizer — vertical audio bars (deterministic organic pattern)
const equalizer = (n = 34) => {
  let bars = '';
  for (let i = 0; i < n; i++) {
    const base = 26 + Math.round(52 * Math.abs(Math.sin(i * 0.9) * 0.6 + Math.sin(i * 0.37) * 0.4)); // 26–78% baseline
    const dur = 620 + ((i * 53) % 520);      // 620–1140ms, varied
    const delay = (i * 41) % 900;            // staggered
    bars += `<i style="height:${base}%;animation-duration:${dur}ms;animation-delay:-${delay}ms"></i>`;
  }
  return `<div class="eq" aria-hidden="true">${bars}</div>`;
};

/* ---------- section renderers ---------- */
function heroSec(s) {
  const ctas = (s.ctas || [['Book a demo', '/demo/', 'pri'], ['Start free', '/signup/', 'sec']])
    .map(([t, h, k]) => `<a class="btn ${k}" href="${h}">${esc(t)}</a>`).join('');
  const panel = s.live ? livePanel(s.live) : (s.media || '');
  return `<section class="hero glow-top grid"><div class="wrap"><div class="${panel ? 'hero-grid' : ''}">
    <div class="reveal in">
      ${s.eyebrow ? `<span class="pill"><span class="dot pulse"></span>${esc(s.eyebrow)}</span>` : ''}
      <h1 class="h1">${s.h1}</h1>
      <p class="lead">${s.sub}</p>
      <div class="hero-cta">${ctas}</div>
      ${s.trust ? `<div class="trust">${esc(s.trust)}</div>` : ''}
    </div>
    ${panel ? `<div class="reveal in">${panel}</div>` : ''}
  </div></div></section>`;
}
function livePanel(l) {
  return `<div class="panel" data-live>
    <div class="panel-hd"><div style="display:flex;gap:9px;align-items:center"><span class="dot red pulse"></span><span class="mono" style="color:var(--txt)">Live call · 02:14</span></div><span class="mono dim">discreet overlay</span></div>
    <div class="panel-bd">
      <div class="side" style="color:var(--blue);margin-top:0">Prospect</div>
      <div class="bubble pros" data-live-pros data-text="${esc(l.pros)}">${esc(l.pros)}</div>
      ${equalizer()}
      <div class="side" style="color:var(--green)">Parley</div>
      <div class="card obj g" data-live-card><div class="card-lbl"><span class="dot red"></span>${esc(l.label)}</div>
        <div class="body" style="color:#ffe9ee">“${esc(l.line)}”</div>
        <div class="mono" style="margin-top:9px;color:var(--dim)">▸ ${esc(l.next)}</div></div>
      <div class="rail"><span class="st">Opener</span><span class="sep">→</span><span class="st on">● Objection</span><span class="sep">→</span><span class="st">Discovery</span><span class="sep">→</span><span class="st">Close</span></div>
    </div></div>`;
}
function headSec(s, center) {
  return `<div class="sec-hd ${center ? 'center' : ''} reveal">${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}${s.h2 ? `<h2 class="h2">${s.h2}</h2>` : ''}${s.sub ? `<p class="lead">${s.sub}</p>` : ''}</div>`;
}
function cardsSec(s) {
  const cols = s.cols || 3;
  const cards = s.items.map(c => {
    const inner = `${c.icon ? `<div class="ic">${renderIcon(c.icon)}</div>` : ''}<h3>${esc(c.title)}</h3><p>${c.body}</p>${c.href ? `<span class="more">${esc(c.more || 'Learn more')} →</span>` : ''}`;
    return c.href ? `<a class="ucard reveal" href="${c.href}">${inner}</a>` : `<div class="ucard reveal">${inner}</div>`;
  }).join('');
  return `<section class="section"><div class="wrap">${s.h2 ? headSec(s, s.center) : ''}<div class="grid-cards cols-${cols}">${cards}</div></div></section>`;
}
function splitSec(s) {
  const bullets = s.bullets ? `<ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
  const media = `<div class="split-media reveal"><div class="media-box">${s.media || ''}</div></div>`;
  const text = `<div class="reveal">${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}<h2 class="h2" style="margin:12px 0 14px">${s.h2}</h2><p class="body">${s.body}</p>${bullets}${s.cta ? `<div class="hero-cta">${s.cta.map(([t, h, k]) => `<a class="btn ${k || 'sec'}" href="${h}">${esc(t)}</a>`).join('')}</div>` : ''}</div>`;
  return `<section class="section"><div class="wrap"><div class="split ${s.flip ? 'flip' : ''}">${text}${media}</div></div></section>`;
}
function stepsSec(s) {
  const steps = s.items.map((x, i) => `<div class="step reveal"><div class="n">0${i + 1}</div><h3>${esc(x.title)}</h3><p>${x.body}</p></div>`).join('');
  return `<section class="section"><div class="wrap">${headSec(s, s.center)}<div class="steps">${steps}</div></div></section>`;
}
function statsSec(s) {
  const st = s.items.map(x => `<div class="stat reveal"><div class="big grad">${esc(x.big)}</div><div class="lbl">${esc(x.lbl)}</div></div>`).join('');
  return `<section class="section"><div class="wrap">${s.h2 ? headSec(s, true) : ''}<div class="stats">${st}</div></div></section>`;
}
function tableSec(s) {
  const head = `<tr><th>${esc(s.cols[0])}</th>${s.cols.slice(1).map((c, i) => `<th class="${i === 0 ? 'col-parley' : ''}">${esc(c)}</th>`).join('')}</tr>`;
  const rows = s.rows.map(r => `<tr><td>${esc(r[0])}</td>${r.slice(1).map((c, i) => cell(c, i === 0)).join('')}</tr>`).join('');
  function cell(v, parley) { const cls = v === true ? 'yes' : v === false ? 'no' : ''; const t = v === true ? '✓' : v === false ? '—' : v; return `<td class="${cls} ${parley ? 'col-parley' : ''}">${esc(t)}</td>`; }
  return `<section class="section"><div class="wrap">${headSec(s, true)}<table class="tbl">${head}${rows}</table></div></section>`;
}
function tiersSec(s) {
  const toggle = s.billing ? `<div class="bill-bar"><span class="bill-lbl">Billing</span><div class="bill-toggle" data-billing role="tablist" aria-label="Billing period">
    <button class="bt" data-bill="monthly" role="tab">Monthly</button>
    <button class="bt on" data-bill="annual" role="tab" aria-selected="true">Annual</button>
  </div><span class="bill-save">Save up to 23%</span></div>` : '';
  const pct = t => Math.round(((t.monthly - t.annual) / t.monthly) * 100);
  const card = t => {
    const cls = t.kind === 'hot' ? 'hot' : t.kind === 'ultra' ? 'ultra' : 'plain';
    const pills = [
      ...(t.pills || []).map(p => `<span class="t-pill ${p.type}">${esc(p.text)}</span>`),
      `<span class="t-pill off" data-annual>${pct(t)}% OFF</span>`,
    ].join('');
    const allow = t.allowance ? `<div class="t-allow">
      <div class="t-allow-amt">${esc(t.allowance.amt)}<span>${esc(t.allowance.unit || '')}</span></div>
      <div class="t-allow-equiv">${(t.allowance.equiv || []).map(e => `<div>${esc(e)}</div>`).join('')}</div>
      ${t.allowance.note ? `<div class="t-allow-note">${esc(t.allowance.note)}</div>` : ''}
    </div>` : '';
    const price = `<div class="t-price">
      <span class="t-was" data-annual>$${t.monthly}</span>
      <span class="t-now" data-annual>$${t.annual}</span><span class="t-now" data-monthly>$${t.monthly}</span>
      <span class="t-per">${esc(t.per || '')}</span></div>
      <div class="t-billed"><span data-annual>billed annually</span><span data-monthly>billed monthly</span></div>`;
    const cta = `<div class="t-cta"><a class="btn ${t.ctaKind || 'sec'}" href="${t.href || '/demo/'}">${esc(t.ctaLabel || 'Get started')}</a></div>`;
    const save = `<div class="t-save" data-annual>Save $${t.saveYear} vs monthly</div><div class="t-save dim" data-monthly>Switch to annual — save ${pct(t)}%</div>`;
    const band = t.band ? `<div class="t-band"><div class="t-band-t">${esc(t.band.title)}</div><div class="t-band-s">${esc(t.band.sub)}</div></div>` : '';
    const feats = `<ul class="t-feats">${(t.feats || []).map(f => `<li class="${f.in ? 'yes' : 'no'}">${esc(f.t)}${f.detail ? `<span class="fd">${esc(f.detail)}</span>` : ''}</li>`).join('')}</ul>`;
    return `<div class="tcard ${cls} reveal"><div class="t-head"><span class="t-name">${esc(t.name)}</span>${pills}</div><div class="t-desc">${esc(t.desc || '')}</div>${allow}${price}${cta}${save}${band}${feats}</div>`;
  };
  const cards = s.items.filter(t => !t.custom);
  const ent = s.items.find(t => t.custom);
  const entBar = ent ? `<div class="t-ent reveal"><div class="t-ent-l"><h3>${esc(ent.name)} <span>— Enterprise</span></h3><p>${esc(ent.desc || '')}</p>${ent.feats ? `<div class="t-ent-feats">${ent.feats.map(f => `<span>${esc(f.t)}</span>`).join('')}</div>` : ''}</div><a class="btn sec" href="${ent.href || '/contact/'}">${esc(ent.ctaLabel || 'Talk to sales')}</a></div>` : '';
  return `<section class="section"><div class="wrap">${headSec(s, true)}<div class="pricing pricing2" data-mode="annual">${toggle}<div class="tiers3">${cards.map(card).join('')}</div>${entBar}</div></div></section>`;
}
function faqSec(s) {
  const items = s.items.map(q => `<details class="reveal"><summary>${esc(q.q)}</summary><p>${q.a}</p></details>`).join('');
  return `<section class="section"><div class="wrap">${headSec(s, true)}<div class="faq">${items}</div></div></section>`;
}
function proseSec(s) { return `<section class="section"><div class="wrap"><div class="prose reveal">${s.html}</div></div></section>`; }
function playbookSec(s) {
  const items = s.items.map((x, i) => `<div class="pb-item reveal"><div class="pb-num">${String(i + 1).padStart(2, '0')}</div><div class="pb-body"><h3>${esc(x.title)}</h3><p>${x.body}</p>${x.line ? `<div class="pb-line"><span class="lbl">The line to steal</span><p>“${esc(x.line)}”</p></div>` : ''}</div></div>`).join('');
  return `<section class="section"><div class="wrap">${headSec(s, true)}<div class="playbook">${items}</div></div></section>`;
}
function logosSec(s) { return `<section class="section"><div class="wrap"><p class="mono" style="text-align:center;margin-bottom:22px">${esc(s.caption || 'Trusted by teams who live on the phone')}</p><div class="logos">${s.items.map(l => `<span class="lg">${esc(l)}</span>`).join('')}</div></div></section>`; }
function arcadeSec(s) {
  const list = s.items.map(o => `<button class="obj-btn" data-label="${esc(o.label)}" data-q-full="${esc(o.qFull)}" data-line="${esc(o.line)}" data-next="${esc(o.next)}"><span class="q">${esc(o.q)}</span>${esc(o.qShort)}</button>`).join('');
  return `<section class="section"><div class="wrap">${headSec(s, true)}<div class="arcade" data-arcade><div class="arcade-list">${list}</div><div class="panel" style="padding:18px 18px 20px"><div data-arcade-out class="reveal in"></div></div></div></div></section>`;
}
function ctaSec(s) {
  const ctas = (s.ctas || [['Book a demo', '/demo/', 'pri'], ['Start free', '/signup/', 'sec']]).map(([t, h, k]) => `<a class="btn ${k}" href="${h}">${esc(t)}</a>`).join('');
  return `<section class="section"><div class="cta-band reveal glow-top"><h2 class="h2">${s.h2}</h2>${s.sub ? `<p class="lead">${s.sub}</p>` : ''}<div class="hero-cta">${ctas}</div></div></section>`;
}

function embedSec(s) {
  // auto-skip if the embedded asset is missing (e.g. the 3D file not present) —
  // reappears automatically once the file is restored to assets/.
  if (s.src && s.src.startsWith('/assets/')) {
    const assetPath = path.join(__dirname, 'assets', s.src.replace('/assets/', ''));
    try { if (!fsSync.existsSync(assetPath)) { console.warn('[embed] asset missing, skipping: ' + s.src); return ''; } } catch { return ''; }
  }
  const cta = s.cta ? `<div class="hero-cta" style="justify-content:center;margin-top:26px">${s.cta.map(([t, h, k]) => `<a class="btn ${k}" href="${h}">${esc(t)}</a>`).join('')}</div>` : '';
  // src is set by app.js only after a 200 HEAD check, so a missing/flaky asset hides the section instead of showing a 404
  return `<section class="section" data-embed-section><div class="wrap">${s.h2 ? headSec(s, true) : ''}<div class="embed-frame reveal"><iframe data-embed-src="${s.src}" title="${esc(s.title || 'Interactive')}" loading="lazy" allow="fullscreen; xr-spatial-tracking"></iframe><div class="embed-cover" aria-hidden="true"></div></div>${cta}</div></section>`;
}
function flowSec(s) {
  const steps = s.items.map((x, i) => `<div class="flow-step reveal">
    <div class="flow-node">${String(i + 1).padStart(2, '0')}</div>
    <div class="flow-visual">${x.visual || ''}</div>
    <h3>${x.title}</h3><p>${x.body}</p></div>`).join('');
  return `<section class="section"><div class="wrap">${headSec(s, true)}<div class="flow">${steps}</div></div></section>`;
}
const RENDER = { hero: heroSec, cards: cardsSec, split: splitSec, steps: stepsSec, stats: statsSec, table: tableSec, tiers: tiersSec, faq: faqSec, prose: proseSec, logos: logosSec, arcade: arcadeSec, cta: ctaSec, embed: embedSec, flow: flowSec, playbook: playbookSec };

/* ---------- layout ---------- */
function header() {
  return `<header class="site-hd"><div class="wrap nav">
    <a class="brand" href="/"><span class="dot"></span>Parley</a>
    <nav class="nav-links">${TOPNAV.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</nav>
    <div class="nav-cta"><a class="login" href="/login/">Log in</a><a class="btn pri" style="padding:10px 16px" href="/demo/">Book a demo</a><button class="burger" aria-label="Menu">☰</button></div>
  </div></header>`;
}
function footer() {
  const cols = FOOTER.map(([h, links]) => `<div class="ft-col"><h4>${h}</h4>${links.map(([t, href]) => `<a href="${href}">${t}</a>`).join('')}</div>`).join('');
  return `<footer class="site-ft"><div class="wrap"><div class="ft-grid">
    <div class="ft-brand"><a class="brand" href="/"><span class="dot"></span>Parley</a><p>The real-time copilot that whispers the perfect line on every cold call.</p></div>
    ${cols}
  </div><div class="ft-btm"><span>© 2026 Parley, Inc.</span><span>Works over any dialer · TCPA &amp; DNC built in</span></div></div></footer>`;
}
function crumb(c) { return c ? `<div class="wrap" style="padding-top:22px"><div class="crumb">${c.map((x, i) => x.href ? `<a href="${x.href}">${esc(x.label)}</a>${i < c.length - 1 ? ' › ' : ''}` : `${esc(x.label)}`).join('')}</div></div>` : ''; }

/* ---------- AEO / SEO: structured data + machine-readable meta ---------- */
const canonical = (p) => `${SITE}/${p.slug}${p.slug ? '/' : ''}`;
const stripTags = (s = '') => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const faqsOf = (p) => (p.sections || []).filter(s => s.type === 'faq').flatMap(s => s.items || []).map(q => ({ q: stripTags(q.q), a: stripTags(q.a) }));

const ORG = {
  '@type': 'Organization', '@id': `${SITE}/#org`, name: 'Parley', url: `${SITE}/`,
  description: 'Parley builds the real-time AI copilot for cold calls — live objection rebuttals, coaching, scoring, and Voice Intelligence for outbound sales teams.',
  slogan: 'Whisper the perfect line. In real time.',
};
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'Parley', url: `${SITE}/`, publisher: { '@id': `${SITE}/#org` }, inLanguage: 'en' };
const softwareNode = (offers) => ({
  '@type': 'SoftwareApplication', '@id': `${SITE}/#software`, name: 'Parley',
  applicationCategory: 'BusinessApplication', applicationSubCategory: 'Sales Enablement · Conversation Intelligence',
  operatingSystem: 'Windows, macOS', url: `${SITE}/`, publisher: { '@id': `${SITE}/#org` },
  description: 'Real-time AI copilot for cold calls. Parley listens to both sides of a live call and whispers the exact objection rebuttal, next line, and coaching on a discreet overlay in under a second — over any dialer. Premium Voice Intelligence reads tone, rapport (Vocal Resonance), and a live cold→hot lead temperature.',
  featureList: ['Real-time objection rebuttals', 'Live whisper coaching & barge-in', 'Automatic call scoring on 100% of calls', 'Voice Behaviour Analysis (tone, rapport, vocal strain)', 'Cold → hot lead temperature', 'Cultural tone-matching across 12 locales', 'TCPA / DNC compliance', 'CRM sync & auto call-logging'],
  ...(offers ? { offers } : {}),
});
// Pull the Offer set from a page's tiers section (keeps schema in sync with displayed prices).
function offersFrom(p) {
  const t = (p.sections || []).find(s => s.type === 'tiers');
  if (!t) return null;
  const priced = t.items.filter(x => x.annual);
  if (!priced.length) return null;
  const prices = priced.map(x => x.annual);
  return {
    '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: Math.min(...prices), highPrice: Math.max(...prices),
    offerCount: t.items.length, unitText: 'per rep per month (billed annually)',
    offers: priced.map(x => ({ '@type': 'Offer', name: `Parley ${x.name}`, price: x.annual, priceCurrency: 'USD', description: stripTags(x.desc || '') })),
  };
}
function jsonLd(p) {
  const url = canonical(p);
  const isHome = p.slug === '';
  const graph = [ORG, WEBSITE];
  graph.push({ '@type': 'WebPage', '@id': `${url}#webpage`, url, name: stripTags(p.title), description: stripTags(p.desc), isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': `${SITE}/#org` }, inLanguage: 'en' });
  if (isHome || p.slug === 'pricing') graph.push(softwareNode(offersFrom(p)));
  if (p.crumb) graph.push({
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
    itemListElement: p.crumb.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: stripTags(c.label), item: c.href ? `${SITE}${c.href}` : url })),
  });
  const faqs = faqsOf(p);
  if (faqs.length) graph.push({
    '@type': 'FAQPage', '@id': `${url}#faq`,
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  });
  const doc = { '@context': 'https://schema.org', '@graph': graph };
  return `<script type="application/ld+json">${JSON.stringify(doc).replace(/</g, '\\u003c')}</script>`;
}
function seoMeta(p) {
  const url = canonical(p);
  return [
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:site_name" content="Parley">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(p.title)}">`,
    `<meta name="twitter:description" content="${esc(p.desc)}">`,
    `<link rel="alternate" type="text/plain" href="${SITE}/llms.txt" title="llms.txt">`,
  ].join('\n');
}

/* ---------- AEO: llms.txt + llms-full.txt (answer-engine corpus) ---------- */
const LLM_INTRO = `> Parley is a real-time AI copilot for cold calls in real estate and high-ticket sales. It listens to both sides of a live call and whispers the exact objection rebuttal, the next line, and the coaching to close — on a discreet on-screen overlay only the rep can see, in under a second, over any dialer. Rebuttals are trained on the proven frameworks of the world's top closers (Alex Hormozi, Chris Voss, Jeremy Miner, Jordan Belfort, Grant Cardone). Premium "Voice Intelligence" reads the prospect's tone, tracks Vocal Resonance (how the two voices sync as rapport builds), runs a live cold→hot lead temperature, and calibrates to 12 cultures.`;
const LLM_FACTS = [
  'Category: real-time sales copilot / live conversation intelligence — help *during* the call, not a post-call report.',
  'Best for: SDR teams, inside sales, real-estate ISAs, high-ticket closers, agencies and BPOs.',
  'Alternative to: Cluely (per-user improvisation overlay) and Gong (post-call analytics).',
  'Pricing per rep/mo, billed annually: Starter $99, Team $249, Signal $499 (Voice Intelligence), Scale custom.',
  'Trial: first 2 live calls free, no credit card required.',
  'Works over any existing dialer, softphone, or Zoom — live in minutes, no rip-and-replace.',
  'Compliance: TCPA-aware, DNC scrub before dialing, consent capture and audit trail.',
  'Signature technology: sub-second objection rebuttals; a novel Vocal Resonance rapport signal; a live cold→hot lead temperature; cultural tone-matching across 12 locales; automatic post-call scorecards with a Voice Behaviour Analysis.',
];
const llmURL = (slug) => slug ? `${SITE}/${slug}/` : `${SITE}/`;
const llmLink = (slug, label, blurb) => {
  const p = PAGES.find(x => x.slug === slug);
  const t = label || (p ? stripTags(p.title).split(/ [—|] /)[0] : slug);
  const d = blurb || (p ? stripTags(p.desc) : '');
  return `- [${t}](${llmURL(slug)})${d ? `: ${d}` : ''}`;
};
function buildLlmsTxt() {
  return `# Parley — real-time AI copilot for cold calls

${LLM_INTRO}

Key facts:
${LLM_FACTS.map(f => `- ${f}`).join('\n')}

## Product
${['how-it-works', 'how-it-works/voice-intelligence', 'how-it-works/objection-rebuttals', 'how-it-works/call-scoring', 'how-it-works/live-coaching', 'how-it-works/integrations', 'how-it-works/compliance'].map(s => llmLink(s)).join('\n')}

## Who it's for
${['solutions/sdr-teams', 'solutions/inside-sales', 'solutions/real-estate-isa', 'solutions/sales-managers', 'solutions/rep-onboarding', 'solutions/agencies-bpo'].map(s => llmLink(s)).join('\n')}

## Comparisons
${['compare/parley-vs-cluely', 'compare/parley-vs-gong', 'compare/parley-vs-balto', 'compare/parley-vs-cresta'].map(s => llmLink(s)).join('\n')}

## Pricing & trial
${['pricing', 'signup', 'demo'].map(s => llmLink(s)).join('\n')}

## Resources
${['resources', 'guides/cold-calling', 'resources/objection-library', 'resources/cold-call-scripts', 'resources/glossary', 'resources/roi-calculator'].map(s => llmLink(s)).join('\n')}

## More
- [Full answer-engine corpus (llms-full.txt)](${SITE}/llms-full.txt): expanded facts, every page, and all FAQs for citation.
- [Sitemap](${SITE}/sitemap.xml)
`;
}
function buildLlmsFullTxt() {
  const faqBlocks = PAGES.map(p => {
    const f = faqsOf(p);
    if (!f.length) return '';
    return `### ${stripTags(p.title).split(/ [—|] /)[0]} — FAQ\n${f.map(x => `**Q: ${x.q}**\nA: ${x.a}`).join('\n\n')}`;
  }).filter(Boolean).join('\n\n');
  const pageList = PAGES.filter(p => p.slug !== '404').map(p => `- ${stripTags(p.title)} — ${llmURL(p.slug)}\n  ${stripTags(p.desc)}`).join('\n');
  return `# Parley — full reference for AI answer engines (llms-full.txt)

${LLM_INTRO}

## Facts
${LLM_FACTS.map(f => `- ${f}`).join('\n')}

## What Parley does (in order, on a live call)
1. Hears both sides of the call at the audio layer, over any dialer — silent, nothing rendered into the call audio, invisible to the prospect.
2. Reads the moment: classifies the objection type and tracks the call stage (opener → discovery → objection → close) in real time.
3. Whispers the move: renders the exact rebuttal or next line — trained on your best reps and the top closers' frameworks — to a discreet overlay in under a second.
4. Voice Intelligence (Signal plan): reads the prospect's tone every turn, tracks Vocal Resonance (voice entrainment = rapport), and runs a live 0–100 cold→hot lead temperature, recalibrated to the prospect's culture.
5. After the call: an automatic scorecard grades opener, discovery, objection handling, and next step, plus a Voice Behaviour Analysis (momentum, rapport, engagement, vocal strain) and the one fix for next time.

## Positioning vs. competitors
- vs Cluely: Cluely is a horizontal, per-user overlay for improvising on any call. Parley is a purpose-built system for outbound sales teams — trained on closers, with coaching, scoring, CRM sync, TCPA/DNC compliance, and Voice Intelligence. Cluely charges $75/mo extra for screen-share undetectability; Parley includes it on the Team plan.
- vs Gong: Gong analyzes calls after they end. Parley changes the call while it is still happening, then also scores it.

## All pages
${pageList}

## Frequently asked questions
${faqBlocks}
`;
}

function page(p) {
  const body = p.sections.map(s => (RENDER[s.type] || (() => ''))(s)).join('\n');
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title><meta name="description" content="${esc(p.desc)}">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.desc)}"><meta property="og:type" content="website">
${seoMeta(p)}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/styles.css">
${jsonLd(p)}
<script>document.documentElement.className+=' js'</script>
</head><body>
${header()}
${p.crumb ? crumb(p.crumb) : ''}
<main>${body}</main>
${footer()}
<script src="/assets/app.js" defer></script>
</body></html>`;
}

/* ---------- write ---------- */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    e.isDirectory() ? await copyDir(s, d) : await fs.copyFile(s, d);
  }
}
async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });
  await copyDir(path.join(__dirname, 'assets'), path.join(OUT, 'assets'));
  let n = 0;
  for (const p of PAGES) {
    const dir = p.slug === '' ? OUT : path.join(OUT, p.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), page(p));
    n++;
  }
  // sitemap.xml
  const urls = PAGES.map(p => `  <url><loc>${SITE}/${p.slug}${p.slug ? '/' : ''}</loc></url>`).join('\n');
  await fs.writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  // robots.txt — classic crawlers + explicit welcome for AI answer engines (AEO/GEO)
  const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'Claude-User', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'Bytespider', 'CCBot', 'cohere-ai', 'Meta-ExternalAgent', 'Meta-ExternalFetcher', 'DuckAssistBot', 'YouBot', 'Diffbot'];
  await fs.writeFile(path.join(OUT, 'robots.txt'),
    `# Parley\nUser-agent: *\nAllow: /\n\n# AI answer engines & assistants — explicitly welcome (AEO/GEO)\n` +
    AI_BOTS.map(b => `User-agent: ${b}\nAllow: /`).join('\n\n') +
    `\n\nSitemap: ${SITE}/sitemap.xml\n`);
  // llms.txt + llms-full.txt — the answer-engine corpus (llmstxt.org standard)
  await fs.writeFile(path.join(OUT, 'llms.txt'), buildLlmsTxt());
  await fs.writeFile(path.join(OUT, 'llms-full.txt'), buildLlmsFullTxt());
  await fs.writeFile(path.join(OUT, '_redirects'), `/*  /404/  404\n`);
  console.log('Built ' + n + ' pages → dist/  (+ llms.txt, llms-full.txt, robots.txt, sitemap.xml)');
}
main().catch(e => { console.error(e); process.exit(1); });
