import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { startCapture, stopCapture, sendTranscript, type GatewayMessage } from "./audioEngine";

// In production these come from Clerk auth + the dialer; dev token for now.
const TOKEN = (import.meta as any).env?.VITE_DEV_TOKEN ?? "dev:user_demo:org_demo";

const MODES = [
  { id: "expired", ic: "🏠", n: "Expired Listings", d: "Failed to sell, frustrated. Empathy → diagnose → relist." },
  { id: "fsbo", ic: "🏷️", n: "FSBO", d: "For-sale-by-owner. Sell net proceeds, not price." },
  { id: "circle", ic: "📍", n: "Circle Prospecting", d: "Just-listed / just-sold neighborhood calls." },
  { id: "buyer", ic: "👤", n: "Buyer Follow-up", d: "Internet leads. Speed-to-lead, qualify, book." },
  { id: "investor", ic: "📈", n: "Investor / Wholesale", d: "As-is, cash, motivation & numbers." },
  { id: "sdr", ic: "📞", n: "B2B SDR", d: "Pattern-interrupt opener, book the meeting." },
];
const SLIDES = [
  { ic: "🎯", h: "Meet Parley", p: "The AI copilot that whispers the perfect line on every cold call — so you never freeze, never lose the appointment, and never wing it again.", chips: [] as string[][] },
  { ic: "🛡️", h: "It hears the objection before you panic", p: "Parley listens to both sides and hands you the proven rebuttal the instant the prospect pushes back.", chips: [["Speculative", "Rebuttals pre-warmed → ~100ms"], ["Self-optimizing", "Learns the best line, live"]] },
  { ic: "🌐", h: "Built for how you actually sell", p: "Expired, FSBO, circle prospecting, SDR — each mode loads its own objections, script, and compliance. English & Arabic.", chips: [["Compliant", "DNC + consent built in"], ["Discreet", "Out of your screen-share"]] },
  { ic: "📈", h: "Every call makes you better", p: "Auto-scored, auto-logged to your CRM, follow-up drafted. Your manager sees the whole floor light up.", chips: [] as string[][] },
];
const STAGES = ["intro", "discovery", "value", "objection", "close", "wrap"];

function useToast() {
  const [msg, setMsg] = useState("");
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2200); };
  const node = <div className={`toast ${msg ? "show" : ""}`}>{msg}</div>;
  return { show, node };
}

export default function App() {
  const s = useStore();
  const toast = useToast();
  return (
    <div className="app">
      {s.screen === "onboard" && <Onboarding />}
      {s.screen === "mode" && <ModePicker />}
      {s.screen === "call" && <Call toast={toast.show} />}
      {s.screen === "post" && <PostCall toast={toast.show} />}
      {toast.node}
    </div>
  );
}

function Onboarding() {
  const { onboard, setOnboard, go } = useStore();
  const sl = SLIDES[onboard];
  const nav = (d: number) => { const n = onboard + d; if (n < 0) return; if (n >= SLIDES.length) return go("mode"); setOnboard(n); };
  return (
    <section className="screen">
      <button className="skip" onClick={() => go("mode")}>Skip intro →</button>
      <div className="hero">
        <div className="slide">
          <div className="slide-ic">{sl.ic}</div>
          <h2>{sl.h}</h2>
          <p>{sl.p}</p>
          {sl.chips.length > 0 && <div className="chips">{sl.chips.map((c, i) => <div key={i}><b>{c[0]}</b>{c[1]}</div>)}</div>}
        </div>
        <div className="dots">{SLIDES.map((_, i) => <span key={i} className={i === onboard ? "on" : ""} />)}</div>
        <div className="navrow">
          <button className="btn ghost sm" onClick={() => nav(-1)} style={{ visibility: onboard === 0 ? "hidden" : "visible" }}>Back</button>
          <button className="btn" onClick={() => nav(1)}>{onboard === SLIDES.length - 1 ? "Get started →" : "Continue"}</button>
        </div>
      </div>
    </section>
  );
}

function ModePicker() {
  const { modeId, setMode, go } = useStore();
  return (
    <section className="screen">
      <div className="topbar"><div className="logo"><b>Parley</b></div><span className="pill">👋 Aden</span></div>
      <h1>What are you calling today?</h1>
      <div className="sub">Pick a playbook. Parley loads the objections, script, and compliance profile for it.</div>
      <div className="grid">
        {MODES.map((m) => (
          <div key={m.id} className={`mode ${m.id === modeId ? "sel" : ""}`} onClick={() => setMode(m.id)}>
            <span className="check">✓</span>
            <div className="mic">{m.ic}</div><h3>{m.n}</h3><small>{m.d}</small>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn" onClick={() => go("call")}>Go live →</button>
      </div>
    </section>
  );
}

function Call({ toast }: { toast: (m: string) => void }) {
  const s = useStore();
  const mode = MODES.find((m) => m.id === s.modeId)!;
  const [secs, setSecs] = useState(0);
  const [practice, setPractice] = useState("");
  const [status, setStatus] = useState("connecting…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; started.current = true;
    useStore.getState().startLive();
    const t = setInterval(() => setSecs((n) => n + 1), 1000);

    const onEvent = (ev: GatewayMessage) => {
      const st = useStore.getState();
      if (ev.type === "card") st.pushCard({ id: ev.id, kind: ev.kind, title: ev.title, body: ev.body, urgency: ev.urgency });
      else if (ev.type === "transcript" && ev.isFinal) {
        st.pushLine({ speaker: ev.speaker, text: ev.text, ts: ev.ts });
        // rough live talk-ratio from word counts
        const words = st.transcript.reduce((a, l) => { const w = l.text.split(/\s+/).length; return { rep: a.rep + (l.speaker === "rep" ? w : 0), all: a.all + w }; }, { rep: 0, all: 1 });
        st.setTalk(words.rep / words.all);
      } else if (ev.type === "lead") st.setLead(ev);
      else if (ev.type === "blocked") st.setBlocked(ev.reason);
      else if (ev.type === "audioStatus" && !ev.mic) setStatus("live · practice mode");
    };

    startCapture({ token: TOKEN, modeId: s.modeId, phone: "+15550001234", onEvent })
      .then(() => setStatus((cur) => (cur.startsWith("live") ? cur : "live")))
      .catch(() => setStatus("backend offline — run ./DEMO.sh"));

    return () => { clearInterval(t); stopCapture(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const end = () => { stopCapture(); s.go("post"); };
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  const you = Math.round(s.talkRatio * 100), warn = you > 68;
  const sendPractice = () => { if (!practice.trim()) return; sendTranscript("prospect", practice.trim()); setPractice(""); };

  return (
    <section className="screen">
      <div className="topbar"><div className="logo" style={{ fontSize: 16 }}><b>Parley</b></div><span className="pill">{mode.ic} {mode.n}</span></div>
      <div className="callgrid">
        <div className="stage">
          <div className="callhead">
            <div className="avatar">{(s.lead?.name ?? "Prospect").slice(0, 2).toUpperCase()}</div>
            <div className="who"><b>{s.lead?.name ?? "Prospect"}</b><small>{s.lead ? `${s.lead.address ?? ""} · ${s.lead.lead_type ?? ""}`.trim() : status}</small></div>
            <span className="rec" /><span className="timer">{mm}:{ss}</span>
          </div>
          <div className="stagebar">
            {STAGES.map((st) => { const i = STAGES.indexOf(s.stage); const j = STAGES.indexOf(st); return <div key={st} className={`stg ${j < i ? "done" : ""} ${st === s.stage ? "on" : ""}`}>{st}</div>; })}
          </div>
          <div className="transcript">
            {s.transcript.length === 0 && <div className="empty">Waiting for the call…<br />{status === "live" ? "Speak, or type the prospect's line below to practice." : status}</div>}
            {s.transcript.map((l, i) => <div key={i} className={`t ${l.speaker}`}><div className="lbl">{l.speaker === "rep" ? "You" : (s.lead?.name ?? "Prospect")}</div>{l.text}</div>)}
          </div>
          <div className="callfoot">
            <input value={practice} onChange={(e) => setPractice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendPractice()}
              placeholder="Type the prospect's line (practice)…" style={{ flex: 1, background: "var(--panel2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 11, padding: "11px 14px", fontSize: 14 }} />
            <button className="btn sm" onClick={sendPractice}>Send</button>
            <button className="end" onClick={end}>End call</button>
          </div>
        </div>

        <div className="rail">
          <div className="railhead"><span className="logo">🎯 <b>Parley</b></span><span className="pill" style={{ marginLeft: "auto", padding: "3px 9px" }}>● {status}</span></div>
          <div className="coach">
            <div className="meter"><i style={{ width: `${you}%`, background: warn ? "var(--warn)" : "var(--accent)" }} /><i style={{ width: `${100 - you}%`, background: "#39445c" }} /></div>
            <small>You {you}% · Them {100 - you}% · {warn ? "slow down — ask a question" : "listening well"}</small>
          </div>
          {s.lead && <div className="leadctx"><b>{s.lead.name}</b><span>{s.lead.address} · {s.lead.lead_type}</span></div>}
          {s.blocked && <div className="blocked">⛔ Call blocked — {s.blocked}. Upgrade your plan to continue.</div>}
          <div className="cards">
            {s.cards.length === 0 && <div className="empty">Parley is pre-warming likely objections…</div>}
            {s.cards.map((c) => {
              const ic = { objection: "🛡️", script: "🧭", coach: "🎯", coach2: "🎯", answer: "💬", signal: "📈" }[c.kind] ?? "💬";
              return <div key={c.id} className={`card ${c.kind}`}><div className="h"><span>{ic} <b>{c.title}</b></span>{c.urgency === "now" && <span className="badge">NOW</span>}</div><p>{c.body}</p></div>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function PostCall({ toast }: { toast: (m: string) => void }) {
  const s = useStore();
  const objections = s.cards.filter((c) => c.kind === "objection").length;
  const you = Math.round(s.talkRatio * 100);
  return (
    <section className="screen"><div className="post">
      <div className="topbar"><div className="logo" style={{ fontSize: 16 }}><b>Parley</b></div><span className="pill">Call wrap-up</span></div>
      <h1>Call complete.</h1>
      <div className="sub">Auto-scored, logged, and your follow-up is drafted.</div>
      <div className="kpis">
        <div className="kpi"><div className="n good">{Math.min(100, 40 + objections * 10 + (you >= 40 && you <= 60 ? 15 : 0))}</div><small>Call score</small></div>
        <div className="kpi"><div className="n">{objections}</div><small>Objections handled</small></div>
        <div className="kpi"><div className="n">{you}%</div><small>Your talk time</small></div>
        <div className="kpi"><div className="n good">{s.transcript.length}</div><small>Exchanges</small></div>
      </div>
      <div className="sumcard">
        <h3>✉️ Follow-up (ready to send)</h3>
        <div style={{ background: "var(--panel2)", borderRadius: 12, padding: 14, fontSize: 14, lineHeight: 1.5, color: "#cdd6e6" }}>
          Hi {s.lead?.name ?? "there"} — great talking just now. Confirming our next step; I'll bring the plan we discussed. Talk soon — Aden.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn sm" onClick={() => toast("Sent & logged to CRM ✓")}>Send &amp; log to CRM</button>
          <button className="btn ghost sm" onClick={() => toast("Added to calendar ✓")}>Add to calendar</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
        <button className="btn" onClick={() => { s.reset(); s.go("mode"); }}>Next call →</button>
      </div>
    </div></section>
  );
}
