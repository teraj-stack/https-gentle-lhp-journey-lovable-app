import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "./lib/webVitals";
import drBujokImg from "@/assets/dr-bujok.webp";

// Preload hero LCP image (Dr Bujok) — injected synchronously before React mounts
// so the browser starts fetching the LCP candidate as early as possible.
// Only preload on routes where this image is the actual LCP (home + /o-nas).
try {
  const path = window.location.pathname;
  if (path === "/" || path === "/o-nas") {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = drBujokImg;
    link.setAttribute("fetchpriority", "high");
    link.type = "image/webp";
    document.head.appendChild(link);
  }
} catch {
  /* ignore — preload is a best-effort hint, never block app boot */
}

createRoot(document.getElementById("root")!).render(<App />);

// Fire-and-forget: RUM must never block or crash the app.
try {
  initWebVitals();
} catch {
  /* ignore */
}

