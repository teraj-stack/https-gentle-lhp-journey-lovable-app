import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "./lib/webVitals";
import drBujokPicture from "@/assets/dr-bujok.webp?w=360;540;720;1080&format=avif;webp&as=picture";

// Preload the LCP image (Dr Bujok) using the responsive AVIF srcset generated
// by vite-imagetools. `imagesrcset` + `imagesizes` let the browser pick the
// smallest variant that fits the viewport before React mounts.
try {
  const path = window.location.pathname;
  if (path === "/" || path === "/o-nas") {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    // Fallback for browsers that ignore imagesrcset.
    link.href = drBujokPicture.img.src;
    const avifSrcset = drBujokPicture.sources.avif ?? drBujokPicture.sources.webp;
    const type = drBujokPicture.sources.avif ? "image/avif" : "image/webp";
    if (avifSrcset) {
      link.setAttribute("imagesrcset", avifSrcset);
      link.setAttribute("imagesizes", "(min-width: 768px) 320px, 288px");
      link.type = type;
    } else {
      link.type = "image/webp";
    }
    link.setAttribute("fetchpriority", "high");
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
