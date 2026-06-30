import { useEffect, useState } from "react";
import type { Settings } from "../../shared/settings";
import type { DeepPartial } from "../../shared/ipc-contract";
import type { ProspectingMode } from "../../shared/modes";
import { modeApi, secretApi } from "./useSettings";

type Ctx = {
  settings: Settings;
  patch: (p: DeepPartial<Settings>) => Promise<void>;
  reset: () => Promise<void>;
};

// ── reusable controls ───────────────────────────────────────────────────────
const Section = (p: { title: string; desc?: string; children: any }) => (
  <section className="sec"><h2>{p.title}</h2>{p.desc && <p className="desc">{p.desc}</p>}<div className="rows">{p.children}</div></section>
);
const Row = (p: { label: string; hint?: string; children: any }) => (
  <div className="row"><div><div className="lbl">{p.label}</div>{p.hint && <div className="hint">{p.hint}</div>}</div><div className="ctl">{p.children}</div></div>
);
const Toggle = (p: { on: boolean; onChange: (v: boolean) => void }) => (
  <button className={`toggle ${p.on ? "on" : ""}`} onClick={() => p.onChange(!p.on)}><span /></button>
);
const Select = (p: { value: string; options: [string, string][]; onChange: (v: string) => void }) => (
  <select value={p.value} onChange={(e) => p.onChange(e.target.value)}>{p.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
);

// ── General ─────────────────────────────────────────────────────────────────
export function GeneralTab({ settings, patch }: Ctx) {
  const g = settings.general;
  return (
    <Section title="General">
      <Row label="Theme"><Select value={g.theme} onChange={(v) => patch({ general: { theme: v as any } })} options={[["system","System"],["dark","Dark"],["light","Light"]]} /></Row>
      <Row label="Launch at login"><Toggle on={g.launchAtLogin} onChange={(v) => patch({ general: { launchAtLogin: v } })} /></Row>
      <Row label="Discreet overlay" hint="Hide the overlay from screen-share & recordings by default"><Toggle on={g.overlayDiscreet} onChange={(v) => patch({ general: { overlayDiscreet: v } })} /></Row>
      <Row label={`Overlay opacity (${Math.round(g.overlayOpacity*100)}%)`}><input type="range" min={40} max={100} value={g.overlayOpacity*100} onChange={(e) => patch({ general: { overlayOpacity: +e.target.value/100 } })} /></Row>
      <Row label="Automatic updates"><Toggle on={g.autoUpdate} onChange={(v) => patch({ general: { autoUpdate: v } })} /></Row>
    </Section>
  );
}

// ── Modes (with custom-mode editor) ──────────────────────────────────────────
export function ModesTab({ settings, patch }: Ctx) {
  const [modes, setModes] = useState<ProspectingMode[]>([]);
  const [editing, setEditing] = useState<ProspectingMode | null>(null);
  const active = settings.copilot.activeModeId;
  useEffect(() => { modeApi.list().then(setModes).catch(() => setModes([])); }, []);

  const blank = (): ProspectingMode => ({
    id: `custom-${Date.now()}`, name: "New Custom Mode", icon: "star", category: "sales",
    version: 1, builtIn: false, systemPrompt: "", scriptSkeleton: [{ stage: "intro", cue: "" }],
    objections: [{ triggers: [""], label: "", rebuttal: "" }], summaryTemplate: ["Next step"],
  });

  return (
    <Section title="Modes" desc="Prompt presets that shape what the copilot says. Built-ins are read-only; create your own custom modes.">
      <div className="moderow">
        <div className="modelist">
          {modes.map((m) => (
            <div key={m.id} className={`modecard ${active === m.id ? "active" : ""}`}>
              <div onClick={() => patch({ copilot: { activeModeId: m.id } })}>
                <b>{m.name}</b><span className={`pill ${m.category}`}>{m.category}</span>
                {!m.builtIn && <span className="pill custom">custom</span>}
                {active === m.id && <span className="pill on">active</span>}
                <div className="hint">{m.objections.length} objections · {m.scriptSkeleton.length} stages</div>
              </div>
              {!m.builtIn && <button className="link" onClick={() => setEditing(m)}>edit</button>}
            </div>
          ))}
        </div>
        <button className="primary" onClick={() => setEditing(blank())}>+ New custom mode</button>
      </div>
      {editing && <ModeEditor mode={editing} onClose={() => setEditing(null)} onSaved={(list) => { setModes(list); setEditing(null); }} />}
    </Section>
  );
}

function ModeEditor({ mode, onClose, onSaved }: { mode: ProspectingMode; onClose: () => void; onSaved: (l: ProspectingMode[]) => void }) {
  const [m, setM] = useState<ProspectingMode>(structuredClone(mode));
  const save = async () => onSaved(await modeApi.upsert(m));
  const del = async () => onSaved(await modeApi.remove(m.id));
  return (
    <div className="editor">
      <div className="erow"><label>Name</label><input value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></div>
      <div className="erow"><label>Category</label>
        <Select value={m.category} onChange={(v) => setM({ ...m, category: v as any })} options={[["real-estate","Real estate"],["sales","Sales"]]} /></div>
      <div className="erow"><label>System prompt</label><textarea rows={4} value={m.systemPrompt} onChange={(e) => setM({ ...m, systemPrompt: e.target.value })} /></div>
      <div className="erow"><label>Objections</label>
        <div className="objs">
          {m.objections.map((o, i) => (
            <div key={i} className="obj">
              <input placeholder="label" value={o.label} onChange={(e) => { const x=[...m.objections]; x[i]={...o,label:e.target.value}; setM({...m,objections:x}); }} />
              <input placeholder="triggers (comma-sep)" value={o.triggers.join(", ")} onChange={(e) => { const x=[...m.objections]; x[i]={...o,triggers:e.target.value.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean)}; setM({...m,objections:x}); }} />
              <input placeholder="rebuttal" value={o.rebuttal} onChange={(e) => { const x=[...m.objections]; x[i]={...o,rebuttal:e.target.value}; setM({...m,objections:x}); }} />
            </div>
          ))}
          <button className="link" onClick={() => setM({ ...m, objections: [...m.objections, { triggers: [], label: "", rebuttal: "" }] })}>+ add objection</button>
        </div>
      </div>
      <div className="ebtns">
        <button className="primary" onClick={save}>Save mode</button>
        <button className="ghost" onClick={onClose}>Cancel</button>
        <button className="danger" onClick={del}>Delete</button>
      </div>
    </div>
  );
}

// ── Keybinds ─────────────────────────────────────────────────────────────────
export function KeybindsTab({ settings, patch }: Ctx) {
  return (
    <Section title="Keybinds" desc="Click a shortcut and press the new combination.">
      {settings.keybinds.map((k, i) => (
        <Row key={k.id} label={k.label}>
          <input className="kb" value={k.accelerator} onChange={(e) => { const x=[...settings.keybinds]; x[i]={...k,accelerator:e.target.value}; patch({ keybinds: x as any }); }} />
        </Row>
      ))}
    </Section>
  );
}

// ── Language ─────────────────────────────────────────────────────────────────
const LANGS: [string,string][] = [["en-US","English (US)"],["en-GB","English (UK)"],["es-ES","Spanish"],["es-419","Spanish (LatAm)"],["fr-FR","French"],["pt-BR","Portuguese (BR)"],["de-DE","German"],["hi-IN","Hindi"],["ar-SA","Arabic"]];
export function LanguageTab({ settings, patch }: Ctx) {
  return (
    <Section title="Language" desc="How Parley listens and responds on calls.">
      <Row label="Transcription language" hint="The language you speak on calls"><Select value={settings.language.transcription} options={LANGS} onChange={(v) => patch({ language: { transcription: v } })} /></Row>
      <Row label="Output language" hint="Language for AI suggestions & notes"><Select value={settings.language.output} options={LANGS} onChange={(v) => patch({ language: { output: v } })} /></Row>
    </Section>
  );
}

// ── Audio ────────────────────────────────────────────────────────────────────
export function AudioTab({ settings, patch }: Ctx) {
  const [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => { (globalThis as any).parley?.listAudioDevices?.().then(setDevices).catch(() => {}); }, []);
  const a = settings.audio;
  return (
    <Section title="Audio" desc="Test your input before you hop on a call.">
      <Row label="Microphone">
        <Select value={a.micDeviceId ?? ""} options={[["","System default"], ...devices.map(d => [d.id, d.label] as [string,string])]} onChange={(v) => patch({ audio: { micDeviceId: v || null } })} />
      </Row>
      <Row label="Capture prospect audio" hint="Listen to the other side via system loopback"><Toggle on={a.captureSystemAudio} onChange={(v) => patch({ audio: { captureSystemAudio: v } })} /></Row>
      <Row label="Noise suppression"><Toggle on={a.noiseSuppression} onChange={(v) => patch({ audio: { noiseSuppression: v } })} /></Row>
    </Section>
  );
}

// ── Notifications ────────────────────────────────────────────────────────────
export function NotificationsTab({ settings, patch }: Ctx) {
  const n = settings.notifications;
  const set = (k: keyof typeof n, v: boolean) => patch({ notifications: { [k]: v } as any });
  return (
    <Section title="Notifications">
      <Row label="Appointment set"><Toggle on={n.appointmentSet} onChange={(v) => set("appointmentSet", v)} /></Row>
      <Row label="DNC requested" hint="Alert when a prospect asks to be removed"><Toggle on={n.dncRequested} onChange={(v) => set("dncRequested", v)} /></Row>
      <Row label="Coaching nudges"><Toggle on={n.coachingNudges} onChange={(v) => set("coachingNudges", v)} /></Row>
      <Row label="Sound"><Toggle on={n.sound} onChange={(v) => set("sound", v)} /></Row>
    </Section>
  );
}

// ── Security & Compliance (TCPA) ─────────────────────────────────────────────
export function ComplianceTab({ settings, patch }: Ctx) {
  const c = settings.compliance;
  return (
    <Section title="Security & Compliance" desc="Call-recording and TCPA posture. Defaults are conservative — change with care.">
      <Row label="Recording disclosure" hint="Prompt you to disclose recording at call start"><Toggle on={c.recordingDisclosure} onChange={(v) => patch({ compliance: { recordingDisclosure: v } })} /></Row>
      <Row label="Enforce DNC scrub" hint="Block dialing numbers on the Do-Not-Call list"><Toggle on={c.enforceDncScrub} onChange={(v) => patch({ compliance: { enforceDncScrub: v } })} /></Row>
      <Row label="Calling window"><span><input type="time" value={c.callWindowStart} onChange={(e) => patch({ compliance: { callWindowStart: e.target.value } })} /> – <input type="time" value={c.callWindowEnd} onChange={(e) => patch({ compliance: { callWindowEnd: e.target.value } })} /></span></Row>
      <Row label="Retain transcripts"><Toggle on={c.retainTranscripts} onChange={(v) => patch({ compliance: { retainTranscripts: v } })} /></Row>
      <Row label="Retention (days)"><input type="number" min={0} max={3650} value={c.transcriptRetentionDays} onChange={(e) => patch({ compliance: { transcriptRetentionDays: +e.target.value } })} /></Row>
    </Section>
  );
}

// ── Account (sign-in + API keys via secure storage) ──────────────────────────
export function AccountTab({}: Ctx) {
  const [status, setStatus] = useState<{ signedIn: boolean; email?: string; plan?: string }>({ signedIn: false });
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const refresh = () => {
    (globalThis as any).parley?.accountStatus?.().then(setStatus).catch(() => {});
    ["openaiApiKey","deepgramApiKey","anthropicApiKey"].forEach((k) => secretApi.has(k).then((r: any) => setKeys((s) => ({ ...s, [k]: !!r?.present }))));
  };
  useEffect(refresh, []);
  const saveKey = async (key: string, value: string) => { if (value) { await secretApi.set(key, value); refresh(); } };

  return (
    <Section title="Account" desc="Sign-in and credentials. API keys are encrypted in your OS keychain — never stored in plaintext.">
      <Row label="Signed in as">{status.signedIn ? <b>{status.email}</b> : <button className="primary">Sign in with Google</button>}</Row>
      {["openaiApiKey","deepgramApiKey"].map((k) => (
        <Row key={k} label={k} hint={keys[k] ? "🔒 stored securely" : "not set"}>
          <input type="password" placeholder={keys[k] ? "••••••••" : "paste key"} onBlur={(e) => saveKey(k, e.target.value)} />
        </Row>
      ))}
    </Section>
  );
}

// ── Billing ──────────────────────────────────────────────────────────────────
export function BillingTab({}: Ctx) {
  return (
    <Section title="Billing" desc="Manage your plan.">
      <div className="plan"><div><b>Pro</b> · Unlimited calls & live copilot</div><button className="primary">Manage subscription</button></div>
    </Section>
  );
}

// ── About ────────────────────────────────────────────────────────────────────
export function AboutTab({ reset }: Ctx) {
  return (
    <Section title="About">
      <Row label="Version">Parley 0.1.0</Row>
      <Row label="Reset all settings" hint="Restore defaults (does not delete secrets)"><button className="danger" onClick={reset}>Reset</button></Row>
    </Section>
  );
}
