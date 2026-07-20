import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "./lib/webVitals";

createRoot(document.getElementById("root")!).render(<App />);

// Fire-and-forget: RUM must never block or crash the app.
try {
  initWebVitals();
} catch {
  /* ignore */
}
