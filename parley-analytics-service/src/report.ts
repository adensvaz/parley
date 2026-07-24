// The rep-facing post-call report — a single self-contained page rendered from a Scorecard.
// Same information the desktop overlay shows the rep the second the call ends.
import type { Scorecard, StageGrade, VoiceBehaviour } from "@parley/contracts";

const chip = (s: StageGrade["status"]) =>
  s === "strong" ? `<span class="c ok">✓</span>` :
  s === "ok" ? `<span class="c ok">✓</span>` :
  s === "weak" ? `<span class="c warn">⚠</span>` : `<span class="c bad">✕</span>`;

// Voice Behaviour Analysis block (premium). Reads HOW the call felt — momentum, rapport, strain, balance.
const meter = (label: string, val: number, tint = "var(--green)") =>
  `<div class="mt"><div class="mt-h"><span>${label}</span><span class="mt-v">${val}</span></div><div class="mt-bar"><i style="width:${Math.max(0, Math.min(100, val))}%;background:${tint}"></i></div></div>`;
const behaviourBlock = (b: VoiceBehaviour) => {
  const mTint = b.momentum >= 0 ? "var(--green)" : "var(--red)";
  const mPct = 50 + b.momentum / 2; // map -100..100 → 0..100 around a center line
  return `<div class="vb">
    <div class="vb-h">VOICE BEHAVIOUR ANALYSIS</div>
    <div class="vb-read">${b.read}</div>
    <div class="mt"><div class="mt-h"><span>Momentum (cold → hot)</span><span class="mt-v" style="color:${mTint}">${b.momentum > 0 ? "+" : ""}${b.momentum}</span></div>
      <div class="mt-bar center"><i style="left:${Math.min(50, mPct)}%;width:${Math.abs(mPct - 50)}%;background:${mTint}"></i></div></div>
    ${meter("Rapport · voice sync", b.rapport)}
    ${meter("Engagement", b.engagement)}
    ${meter("Talk-share balance", b.balance)}
    ${meter("Vocal strain", b.stress, "var(--amber)")}
    ${b.flags.length ? `<div class="vb-flags">${b.flags.map((f) => `<span class="fl">${f}</span>`).join("")}</div>` : ""}
  </div>`;
};

export const REPORT_HTML = (sc: Scorecard) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Parley — Call scorecard</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"><style>
:root{--bg:#06080f;--panel:#0f1526;--surface:#141d34;--line:rgba(255,255,255,.1);--txt:#eaf0ff;--mut:#9eaac6;--dim:#5a6787;--green:#2bffb0;--amber:#ffc24b;--red:#ff4d6d;--sans:'Space Grotesk',-apple-system,system-ui,sans-serif;--mono:'JetBrains Mono',ui-monospace,monospace}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--txt);font-family:var(--sans);padding:28px;max-width:560px;margin:0 auto}
.hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px}
.hd .m{font:500 12px/1 var(--mono);color:var(--mut)}
.score{font:700 56px/1 var(--sans);color:var(--green);letter-spacing:-.03em}.score span{font-size:18px;color:var(--mut)}
.row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:1px solid var(--line)}
.row .s{font:600 15px/1 var(--sans)}.row .n{font:500 12.5px/1 var(--mono);color:var(--mut)}
.c{display:inline-block;width:20px;text-align:center;margin-right:8px}.c.ok{color:var(--green)}.c.warn{color:var(--amber)}.c.bad{color:var(--red)}
.fix{margin-top:18px;padding:16px;border:1px solid rgba(43,255,176,.4);border-left:3px solid var(--green);border-radius:12px;background:rgba(43,255,176,.05)}
.fix .l{font:700 11px/1 var(--mono);letter-spacing:.1em;color:var(--green);margin-bottom:8px}
.fix .t{font:700 15px/1.3 var(--sans);margin-bottom:6px}.fix .d{font:400 14px/1.5 var(--sans);color:var(--mut)}
.mo{margin-top:18px}.mo h3{font:700 11px/1 var(--mono);letter-spacing:.1em;color:var(--mut);text-transform:uppercase;margin-bottom:10px}
.moment{padding:11px 14px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;background:var(--panel)}
.moment .q{font:400 13.5px/1.45 var(--sans)}.moment .m{font:500 11px/1 var(--mono);color:var(--mut);margin-top:6px}
.vb{margin-top:22px;padding:18px;border:1px solid rgba(167,123,255,.4);border-left:3px solid var(--green);border-radius:14px;background:linear-gradient(180deg,rgba(43,255,176,.05),rgba(43,255,176,.01))}
.vb-h{font:700 11px/1 var(--mono);letter-spacing:.16em;color:var(--green);margin-bottom:10px}
.vb-read{font:500 15px/1.5 var(--sans);color:var(--txt);margin-bottom:16px}
.mt{margin-bottom:12px}.mt-h{display:flex;justify-content:space-between;font:500 12.5px/1 var(--sans);color:var(--mut);margin-bottom:6px}
.mt-v{font-family:var(--mono);color:var(--txt)}
.mt-bar{position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden}
.mt-bar i{position:absolute;top:0;left:0;height:100%;border-radius:3px}
.mt-bar.center::before{content:"";position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:var(--dim)}
.mt-bar.center i{border-radius:0}
.vb-flags{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}
.fl{font:500 11px/1 var(--mono);color:var(--mut);border:1px solid var(--line);border-radius:999px;padding:6px 11px}
</style></head><body>
  <div class="hd"><div><div class="m">Call scorecard · ${sc.callId.slice(0, 8)}</div></div><div class="m">just now</div></div>
  <div class="row" style="border-top:0"><span class="s" style="color:var(--mut);font-family:var(--mono);font-size:12px;letter-spacing:.14em">OVERALL</span><span class="score">${sc.score}<span>/100</span></span></div>
  ${sc.stages.map((g) => `<div class="row"><span class="s">${g.stage[0].toUpperCase() + g.stage.slice(1)}</span><span class="n">${chip(g.status)}${g.note}</span></div>`).join("")}
  ${sc.fix ? `<div class="fix"><div class="l">▸ FIX BEFORE NEXT CALL</div><div class="t">${sc.fix.title}</div><div class="d">${sc.fix.detail}${sc.fix.playbook ? ` <em>(${sc.fix.playbook})</em>` : ""}</div></div>` : ""}
  ${sc.behaviour ? behaviourBlock(sc.behaviour) : ""}
  ${sc.moments.length ? `<div class="mo"><h3>Key moments</h3>${sc.moments.map((m) => `<div class="moment"><div class="q">“${m.quote}”</div><div class="m">${m.speaker} · ${(m.atMs / 1000 | 0)}s · ${m.tag}</div></div>`).join("")}</div>` : ""}
</body></html>`;
