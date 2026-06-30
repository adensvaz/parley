import { useState } from "react";
import { useSettings } from "./useSettings";
import {
  GeneralTab, ModesTab, KeybindsTab, LanguageTab, AudioTab,
  NotificationsTab, ComplianceTab, AccountTab, BillingTab, AboutTab,
} from "./tabs";

const TABS = [
  { id: "general", label: "General", icon: "⚙️" },
  { id: "modes", label: "Modes", icon: "🎯" },
  { id: "keybinds", label: "Keybinds", icon: "⌨️" },
  { id: "language", label: "Language", icon: "🌐" },
  { id: "audio", label: "Audio", icon: "🎙️" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "compliance", label: "Security & Compliance", icon: "🛡️" },
  { id: "account", label: "Account", icon: "👤" },
  { id: "billing", label: "Billing", icon: "💳" },
  { id: "about", label: "About", icon: "ℹ️" },
] as const;

export function SettingsApp() {
  const [tab, setTab] = useState<string>("general");
  const ctx = useSettings();

  return (
    <div className="settings">
      <nav className="nav">
        <div className="brand">🎯 Parley</div>
        {TABS.map((t) => (
          <button key={t.id} className={`navitem ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <span className="ic">{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
      <main className="content">
        {!ctx.loaded && <div className="loading">Loading…</div>}
        {ctx.loaded && tab === "general" && <GeneralTab {...ctx} />}
        {ctx.loaded && tab === "modes" && <ModesTab {...ctx} />}
        {ctx.loaded && tab === "keybinds" && <KeybindsTab {...ctx} />}
        {ctx.loaded && tab === "language" && <LanguageTab {...ctx} />}
        {ctx.loaded && tab === "audio" && <AudioTab {...ctx} />}
        {ctx.loaded && tab === "notifications" && <NotificationsTab {...ctx} />}
        {ctx.loaded && tab === "compliance" && <ComplianceTab {...ctx} />}
        {ctx.loaded && tab === "account" && <AccountTab {...ctx} />}
        {ctx.loaded && tab === "billing" && <BillingTab {...ctx} />}
        {ctx.loaded && tab === "about" && <AboutTab {...ctx} />}
      </main>
    </div>
  );
}
