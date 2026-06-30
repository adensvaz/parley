import type { CopilotCard, CallStage, PostCallEvent } from "../../../shared/types";

const STAGES: CallStage[] = ["intro", "discovery", "value", "objection", "close", "wrap"];

export function StageBar({ stage }: { stage: CallStage }) {
  return (
    <div className="stagebar">
      {STAGES.map((st) => (
        <span key={st} className={`stage ${st === stage ? "active" : ""}`}>{st}</span>
      ))}
    </div>
  );
}

export function CoachMeter({ ratio, sentiment }: { ratio: number; sentiment: string }) {
  const pct = Math.round(ratio * 100);
  const warn = ratio > 0.7;
  return (
    <div className="coach">
      <div className="talkbar">
        <div className={`fill ${warn ? "warn" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <small>You {pct}% · Them {100 - pct}% · {sentiment}</small>
    </div>
  );
}

const ICON: Record<CopilotCard["kind"], string> = {
  objection: "🛡️", script: "🧭", coach: "🎯", answer: "💬", signal: "📈",
};

export function CardView({ card }: { card: CopilotCard }) {
  return (
    <div className={`card ${card.kind} ${card.urgency}`}>
      <div className="card-h">
        <span>{ICON[card.kind]} {card.title}</span>
        {card.urgency === "now" && <span className="badge">NOW</span>}
      </div>
      <p>{card.body}</p>
    </div>
  );
}

export function PostCall({ data }: { data: PostCallEvent }) {
  return (
    <div className="postcall">
      <h3>Call wrap-up</h3>
      <p>{data.summary}</p>
      <div className="row"><b>Disposition:</b> {data.disposition}</div>
      <div className="row"><b>Next step:</b> {data.nextStep}</div>
      <div className="followup">
        <b>Follow-up ({data.followUpDraft.channel}):</b>
        <p>{data.followUpDraft.body}</p>
        <button>Send & log to CRM</button>
      </div>
    </div>
  );
}
