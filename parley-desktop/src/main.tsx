import React from "react";
import { createRoot } from "react-dom/client";
import { CopilotOverlay } from "./copilot/CopilotOverlay";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CopilotOverlay />
  </React.StrictMode>,
);
