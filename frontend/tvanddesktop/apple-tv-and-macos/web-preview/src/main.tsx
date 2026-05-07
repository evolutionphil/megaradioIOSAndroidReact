import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initGA } from "./lib/analytics";

// Initialize Google Analytics
if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
  initGA();
}

// Auto-fit 1920x1080 canvas to any window size while preserving 16:9 aspect ratio.
// Fixes blank space on >1920 desktops (e.g. Windows fullscreen on 4K/ultrawide monitors).
function applyTvScale() {
  const root = document.getElementById("root");
  if (!root) return;
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  const offsetX = Math.max(0, (window.innerWidth - 1920 * scale) / 2);
  const offsetY = Math.max(0, (window.innerHeight - 1080 * scale) / 2);
  root.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}
window.addEventListener("resize", applyTvScale);
window.addEventListener("orientationchange", applyTvScale);
applyTvScale();

createRoot(document.getElementById("root")!).render(<App />);
