
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// NOTE: no StrictMode — its dev-only double-invoke of effects tears down the live call socket
// (cleanup runs between the two invocations) and the session never re-establishes.
createRoot(document.getElementById("root")!).render(<App />);
