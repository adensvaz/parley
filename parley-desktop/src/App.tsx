import { useEffect, useRef, useState } from "react";
import { useStore, type Screen } from "./store";
import { startCapture, stopCapture, sendTranscript, type GatewayMessage } from "./audioEngine";
import { startVoice, stopVoice, type ToneRead } from "./voice";

const TOKEN = (import.meta as any).env?.VITE_DEV_TOKEN ?? "dev:user_demo:org_demo";
const win = () => (window as any).parley;

const BOOKS = [
  { id: "expired", cat: "Listings", nm: "Expired Listings", desc: "Failed to sell, frustrated. Empathy → diagnose → relist.", o: 18, c: 4 },
  { id: "fsbo", cat: "Listings", nm: "FSBO", desc: "For-sale-by-owner. Sell net proceeds, not price.", o: 22, c: 4 },
  { id: "circle", cat: "Farming", nm: "Circle Prospecting", desc: "Just-listed / just-sold neighborhood calls.", o: 14, c: 5 },
  { id: "buyer", cat: "Inbound", nm: "Buyer Follow-up", desc: "Internet leads. Speed-to-lead, qualify, book.", o: 16, c: 3 },
  { id: "investor", cat: "Off-market", nm: "Investor", desc: "Cash buyers and absentee owners. Numbers first.", o: 20, c: 4 },
  { id: "sdr", cat: "Outbound", nm: "B2B SDR", desc: "Gatekeepers, budget stalls, “send me an email.”", o: 27, c: 2 },
];

export default function App() {
  const s = useStore();
  const isRail = s.screen === "call" || s.screen === "wrap";
  return isRail ? <Rail /> : (
    <div className="win">
      <Chrome title={s.screen === "floor" ? "Parley — Floor" : s.screen === "signin" ? "Parley" : "Parley — Setup"} />
      <div className="win-body">
        {s.screen === "signin" && <SignIn />}
        {s.screen === "book" && <PickBook />}
        {s.screen === "connect" && <Connect />}
        {s.screen === "floor" && <Floor />}
      </div>
    </div>
  );
}

/* ── window chrome: real close / minimise / maximise ─────────────────────────── */
function Chrome({ title }: { title: string }) {
  const go = useStore((z) => z.go);
  return (
    <div className="chrome">
      <button className="dot close" title="Close" onClick={() => win()?.windowAction?.("close")} />
      <button className="dot min" title="Minimise" onClick={() => win()?.windowAction?.("minimize")} />
      <button className="dot max" title="Zoom" onClick={() => win()?.windowAction?.("maximize")} />
      <span className="title">{title}</span>
      <span className="right">
        <button className="btn ghost xs" onClick={() => go("floor")}>Floor</button>
      </span>
    </div>
  );
}

/* ── 01 · sign in ────────────────────────────────────────────────────────────── */
function SignIn() {
  const go = useStore((z) => z.go);
  const [email, setEmail] = useState("aden@parley.ai");
  return (
    <div className="signin">
      <div className="brandside">
        <div className="mark">Parley</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="quote">“I'm not interested.”</div>
          <div className="claim">Parley hands you the next line in about a tenth of a second — before the pause gets awkward.</div>
          <div className="stats">
            <div><b>2.4×</b><span>appts / 100 dials</span></div>
            <div><b>~100ms</b><span>objection → line</span></div>
          </div>
        </div>
        <div className="foot">Recording &amp; consent rules follow your playbook's compliance profile.</div>
      </div>
      <div className="form">
        <div>
          <h2>Welcome back</h2>
          <p className="sub">Three steps: playbook, dialer, done.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="btn ghost" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} onClick={() => go("book")}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: "var(--verm)" }} />Continue with Google
          </button>
          <div className="or"><span /><b>OR</b><span /></div>
          <div className="field">
            <label>Work email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go("book")} />
          </div>
          <button className="btn" onClick={() => go("book")}>Send magic link</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--faint)" }}>Managers can invite the floor after setup.</p>
      </div>
    </div>
  );
}

/* ── 02 · pick a playbook ────────────────────────────────────────────────────── */
function PickBook() {
  const { modeId, setMode, go } = useStore();
  return (
    <div className="step rise">
      <div className="headrow">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="eyebrow">Step 2 of 3</span>
            <span className="pips"><i className="on" /><i className="on" /><i /></span>
          </div>
          <h2>What are you calling today?</h2>
          <p className="lede">Each playbook loads its own objections, script skeleton and compliance profile.</p>
        </div>
        <button className="btn pine sm" onClick={() => go("connect")}>Continue →</button>
      </div>
      <div className="books">
        {BOOKS.map((b) => (
          <button key={b.id} className={`book ${b.id === modeId ? "on" : ""}`} onClick={() => setMode(b.id)}>
            {b.id === modeId && <span className="tick">✓</span>}
            <span className="cat">{b.cat}</span>
            <span className="nm">{b.nm}</span>
            <span className="desc">{b.desc}</span>
            <span className="meta">{b.o} objections · {b.c} compliance rules</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 03 · connect the stack ──────────────────────────────────────────────────── */
function Connect() {
  const { go, startLive } = useStore();
  const [cal, setCal] = useState(false);
  const begin = () => { startLive(); win()?.setWindowMode?.("call"); go("call"); };
  return (
    <div className="step rise">
      <div className="two">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="eyebrow">Step 3 of 3</span>
            <h2>Plug Parley into your stack</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="integ">
              <span className="ic" style={{ background: "var(--pine)" }}>M</span>
              <div className="txt"><b>Mojo Dialer</b><span>Triple-line · audio tap enabled</span></div>
              <span className="pill-ok"><i />Connected</span>
            </div>
            <div className="integ">
              <span className="ic" style={{ background: "var(--verm)" }}>F</span>
              <div className="txt"><b>Follow Up Boss</b><span>Notes, tasks and outcomes write back here</span></div>
              <span className="pill-ok"><i />Connected</span>
            </div>
            <div className={`integ ${cal ? "" : "todo"}`}>
              <span className="ic" style={{ background: cal ? "var(--pine)" : "var(--clay)", color: cal ? "#fff" : "var(--muted)" }}>C</span>
              <div className="txt"><b>Google Calendar</b><span>So Parley can offer real open slots on the call</span></div>
              {cal ? <span className="pill-ok"><i />Connected</span>
                   : <button className="btn ghost xs" style={{ borderColor: "var(--ink)" }} onClick={() => setCal(true)}>Connect</button>}
            </div>
          </div>
          <div className="note">
            <b>Consent</b>
            <span>Expired Listings requires one-party consent disclosure in 11 states. Parley will surface the line automatically on the rail when the number's area code hits one.</span>
          </div>
        </div>
        <div className="preview">
          <span className="lbl">The rail, once you dial</span>
          <div className="card">
            <span className="k">OBJECTION · NOT INTERESTED</span>
            <span className="l">“Totally fair — most people aren't. Can I ask what made you take it off the market?”</span>
          </div>
          <p>The rail floats over your dialer at 420px wide. No setup, no dashboards — just the next line.</p>
          <button className="btn" style={{ marginTop: "auto" }} onClick={begin}>Start calling</button>
        </div>
      </div>
    </div>
  );
}

/* ── 04 · the rail (live call) ───────────────────────────────────────────────── */
function Rail() {
  const s = useStore();
  const [secs, setSecs] = useState(0);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState("connecting");
  const [tone, setTone] = useState<ToneRead | null>(null);
  const [mic, setMic] = useState(false);
  const started = useRef(false);
  const book = BOOKS.find((b) => b.id === s.modeId)!;

  useEffect(() => {
    if (s.screen !== "call" || started.current) return;
    started.current = true;
    const t = setInterval(() => setSecs((n) => n + 1), 1000);

    const onEvent = (ev: GatewayMessage) => {
      const z = useStore.getState();
      if (ev.type === "card") z.pushCard({ id: ev.id, kind: ev.kind, title: ev.title, body: ev.body, urgency: ev.urgency });
      else if (ev.type === "transcript" && ev.isFinal) {
        z.pushLine({ speaker: ev.speaker, text: ev.text, ts: ev.ts });
        const w = z.transcript.reduce((a, l) => { const n = l.text.split(/\s+/).length; return { rep: a.rep + (l.speaker === "rep" ? n : 0), all: a.all + n }; }, { rep: 0, all: 1 });
        z.setTalk(w.rep / w.all);
      } else if (ev.type === "lead") z.setLead(ev);
      else if (ev.type === "blocked") z.setBlocked(ev.reason);
    };

    startCapture({ token: TOKEN, modeId: s.modeId, phone: "+15550001234", captureSystemAudio: false, onEvent })
      .then(() => setStatus("live")).catch(() => setStatus("offline"));

    // Real voice: local tone always; words when the runtime has a speech provider.
    startVoice(setTone, (text, isFinal) => { if (isFinal && text) sendTranscript("prospect", text); })
      .then((r) => { setMic(r.mic); if (r.mic) setStatus(r.words ? "listening" : "tone only"); });

    return () => { clearInterval(t); stopCapture(); stopVoice(); };
  }, [s.screen]);

  const end = () => { stopCapture(); stopVoice(); useStore.getState().go("wrap"); };
  const nextCall = () => { stopVoice(); const z = useStore.getState(); z.reset(); win()?.setWindowMode?.("setup"); z.go("book"); };
  const send = () => { if (!typed.trim()) return; sendTranscript("prospect", typed.trim()); setTyped(""); };

  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  const you = Math.round(s.talkRatio * 100), hot = you > 55;

  // triage: signals are telemetry, instructions are cards; newest wins, de-duped.
  const signal = s.cards.find((c) => c.kind === "signal");
  const seen = new Set<string>();
  const say = s.cards.filter((c) => c.kind !== "signal")
    .filter((c) => (seen.has(c.title) ? false : (seen.add(c.title), true))).slice(0, 3);
  const hero = say[0];

  if (s.screen === "wrap") return <Wrap onNext={nextCall} secs={secs} />;

  return (
    <div className="rail">
      <div className="railbar">
        <div className="l">
          <span className={`live ${status === "offline" ? "warn" : ""}`} />
          <b>Parley</b><span className="t">{mm}:{ss}</span>
        </div>
        <div className="r">
          <span className="chip">{book.nm.split(" ")[0]} ▾</span>
          <button className="mini" title="Minimise" onClick={() => win()?.windowAction?.("minimize")}>—</button>
          <button className="mini" title="End" onClick={end}>×</button>
        </div>
      </div>

      <div className="mic">
        <span className={`rec ${mic ? "" : "off"}`} />
        <div className="vu"><i style={{ width: `${Math.round((tone?.level ?? 0) * 100)}%` }} /></div>
        <span className="tone">
          {mic ? (tone ? `${tone.emotion} · ${tone.pitchHz || "–"}Hz` : "listening…") : "no mic"}
        </span>
      </div>

      <div className="lead">
        <div className="top">
          <span className="nm">{s.lead?.name ?? "Dana Whitfield"}</span>
          <span className="att">2nd attempt</span>
        </div>
        <div className="sub">{s.lead?.address ?? "412 Ash Grove"} · expired 19 days · was $615k · 2 price cuts</div>
        <div className="talk">
          <div className="bar">
            <i className={hot ? "hot" : ""} style={{ width: `${you}%` }} /><i className="rest" style={{ width: `${100 - you}%` }} />
          </div>
          <small>You {you}% · {hot ? "slow down" : "good"}</small>
        </div>
      </div>

      <div className="feed">
        {s.blocked && <div className="note"><b>Blocked</b><span>{s.blocked}</span></div>}
        {!hero && <div className="railempty">Parley is listening.<br />Speak, or type what they said below.</div>}

        {hero && (() => {
          const [line, ...rest] = hero.body.split("▸");
          return (
            <div className="say rise" key={hero.id}>
              <div className="hd">
                <span className="k">HEARD · {hero.title.replace(/^Objection:\s*/i, "").toUpperCase()}</span>
                <span className="b">SAY THIS</span>
              </div>
              <div className="bd">
                <span className="line">{line.trim()}</span>
                <div className="chips">
                  <span className="c">books 31%</span><span className="c">used 214×</span>
                  <button className="next" onClick={() => useStore.getState().pushCard({ ...hero, id: hero.id + "r" })}>next line ⟳</button>
                </div>
              </div>
            </div>
          );
        })()}

        {signal && (
          <div className="coach">
            <span>◔</span>
            <div><b>Reading the room</b><span>{signal.title}{signal.body ? ` — ${signal.body}` : ""}</span></div>
          </div>
        )}

        {say.slice(1, 2).map((c) => (
          <div className="coach" key={c.id}>
            <span>◔</span><div><b>Coach</b><span>{c.body.split("▸")[0].trim()}</span></div>
          </div>
        ))}

        <div className="close">
          <b>Close when warm</b>
          <span className="l">“I have Thursday 4:15 or Friday 11 — 15 minutes, no pitch.”</span>
          <div className="slots"><button>Thu 4:15</button><button>Fri 11:00</button></div>
        </div>
      </div>

      <div className="composer">
        <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type what they said…" />
        <button className="btn pine xs" onClick={send}>Send</button>
      </div>
      <div className="railfoot">
        <button className="btn pine grow" onClick={end}>Booked</button>
        <button className="btn ghost" onClick={end}>Not now</button>
        <button className="btn ghost" onClick={end}>DNC</button>
      </div>
    </div>
  );
}

/* ── rail · wrap-up ──────────────────────────────────────────────────────────── */
function Wrap({ onNext, secs }: { onNext: () => void; secs: number }) {
  const s = useStore();
  const objections = s.cards.filter((c) => c.kind === "objection").length;
  const you = Math.round(s.talkRatio * 100);
  const score = Math.min(100, 55 + objections * 8 + (you >= 30 && you <= 50 ? 15 : 0));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  return (
    <div className="rail">
      <div className="railbar">
        <div className="l"><span className="live warn" /><b>Parley</b><span className="t">wrapping</span></div>
        <div className="r"><span className="t" style={{ color: "#DFEDE7", fontWeight: 700 }}>{mm}:{ss}</span></div>
      </div>
      <div className="feed">
        <div className="score">
          <div className="ring" style={{ background: `conic-gradient(var(--green) 0 ${score}%, var(--line-4) ${score}% 100%)` }}>
            <i>{score}</i>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Appointment booked</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Thu 4:15pm · logged to Follow Up Boss</div>
          </div>
        </div>
        <div className="wrapcard">
          <span className="k">WHAT WORKED</span>
          <span>The “what's different this time?” pivot flipped her at 2:10. You held silence for 4 seconds — best of the day.</span>
        </div>
        <div className="wrapcard bad">
          <span className="k">FIX NEXT CALL</span>
          <span>{you > 55 ? `You talked ${you}% of the call. Ask, then let it land.` : "You quoted commission unprompted. Let them ask."}</span>
        </div>
      </div>
      <div className="railfoot">
        <button className="btn grow" onClick={onNext}>Next call →</button>
        <button className="btn ghost" onClick={onNext}>Edit note</button>
      </div>
    </div>
  );
}

/* ── 05 · manager floor ──────────────────────────────────────────────────────── */
function Floor() {
  const go = useStore((z) => z.go);
  const reps = [
    { n: "Dana K.", d: 168, a: 9, t: 36, live: true }, { n: "Marcus R.", d: 151, a: 7, t: 41 },
    { n: "Priya S.", d: 143, a: 6, t: 58 }, { n: "Tom B.", d: 139, a: 5, t: 33, live: true },
    { n: "Alicia N.", d: 121, a: 4, t: 61 },
  ];
  return (
    <div className="floor rise">
      <div className="hdr">
        <h2>The floor today</h2>
        <div className="kpi">
          <div><b>1,204</b><span>dials</span></div>
          <div><b>37</b><span>appointments</span></div>
          <div><b className="up">+41%</b><span>vs. pre-Parley</span></div>
        </div>
      </div>
      <div className="floorgrid">
        <div className="tbl">
          <div className="r h"><span>Rep</span><span>Dials</span><span>Appts</span><span>Talk %</span></div>
          {reps.map((r) => (
            <div className="r" key={r.n}>
              <b>{r.live && <span className="dot" />}{!r.live && <span style={{ width: 7 }} />}{r.n}{r.live && <span className="live">live</span>}</b>
              <span>{r.d}</span><span style={{ fontWeight: 700 }}>{r.a}</span>
              <span className={r.t > 50 ? "hi" : "ok"}>{r.t}%</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="panel">
            <span className="k">Lines that booked today</span>
            <div className="row"><b>31%</b><span>“What's different this time?”</span></div>
            <div className="row"><b>24%</b><span>“Would you sell if the right buyer showed up?”</span></div>
            <div className="row"><b style={{ color: "var(--muted)" }}>9%</b><span style={{ color: "var(--muted)" }}>“Just checking in on the property.” <em>retiring</em></span></div>
          </div>
          <div className="panel amber">
            <span className="k">Coach the floor</span>
            <p>Two reps are over 55% talk time. Parley drafted a 6-minute silence drill — send it?</p>
            <button className="btn pine xs" style={{ alignSelf: "flex-start" }}>Send drill</button>
          </div>
        </div>
      </div>
      <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => go("book")}>← Back to calling</button>
    </div>
  );
}
