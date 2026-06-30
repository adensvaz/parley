import { useEffect } from "react";
import { useStore } from "../store";
import { MODES } from "../../shared/modes";
import type { ServerEvent } from "../../shared/types";
import { startCapture, stopCapture } from "../audioEngine";
import { CardView, StageBar, CoachMeter, PostCall } from "./components/Cards";

declare global {
  interface Window {
    parley?: {
      getSettings: () => Promise<any>;
      setDiscreet: (on: boolean) => Promise<any>;
      on: (channel: string, cb: (payload: any) => void) => () => void;
    };
  }
}

function applyEvent(ev: ServerEvent) {
  const st = useStore.getState();
  if (ev.type === "card") st.pushCard(ev);
  else if (ev.type === "transcript" && ev.isFinal) st.pushLine({ speaker: ev.speaker, text: ev.text, ts: ev.ts });
  else if (ev.type === "stage") st.setStage(ev.stage);
  else if (ev.type === "metrics") st.setMetrics(ev.talkRatioRep, ev.sentiment);
  else if (ev.type === "postcall") st.setPostcall(ev);
}

export function CopilotOverlay() {
  const s = useStore();

  // Hotkeys + discreet state come from main over IPC; copilot events arrive on the capture socket.
  useEffect(() => {
    const offHotkey = window.parley?.on("hotkey", (a: string) => {
      if (a === "toggleSession") useStore.getState().live ? stop() : start();
    });
    const offState = window.parley?.on("overlay:state", (x: { discreet: boolean }) =>
      useStore.getState().setDiscreet(x.discreet));
    return () => { offHotkey?.(); offState?.(); };
  }, []);

  const start = async () => {
    const cfg = (await window.parley?.getSettings())?.audio ?? {};
    useStore.getState().start();
    try {
      await startCapture({
        modeId: useStore.getState().modeId,
        micDeviceId: cfg.micDeviceId,
        captureSystemAudio: cfg.captureSystemAudio,
        noiseSuppression: cfg.noiseSuppression,
        onEvent: applyEvent,
      });
    } catch {
      useStore.getState().stop(); // gateway unreachable / mic denied — revert UI
    }
  };
  const stop = async () => {
    stopCapture();
    useStore.getState().stop();
  };

  return (
    <div className="overlay">
      <header className="bar">
        <span className={`dot ${s.live ? "on" : ""}`} />
        <select value={s.modeId} onChange={(e) => s.setMode(e.target.value)} disabled={s.live}>
          {MODES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button className="primary" onClick={s.live ? stop : start}>{s.live ? "End call" : "Go live"}</button>
        <span className="discreet" title="Hidden from screen-share">{s.discreet ? "👁️‍🗨️ discreet" : "visible"}</span>
      </header>

      <StageBar stage={s.stage} />
      <CoachMeter ratio={s.talkRatioRep} sentiment={s.sentiment} />

      <div className="cards">
        {s.cards.map((c) => <CardView key={c.id} card={c} />)}
        {!s.live && !s.postcall && <div className="empty">Pick a mode and hit <b>Go live</b> (⌘⇧\).</div>}
      </div>

      {s.postcall && <PostCall data={s.postcall} />}
    </div>
  );
}
