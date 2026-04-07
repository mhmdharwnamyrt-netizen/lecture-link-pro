import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializePWA } from "@/lib/pwa";

// Initialize PWA functionality
initializePWA().then(() => {
  console.log('[App] PWA initialized');
});

// Hide native splash screen when React is ready
const hideSplash = () => {
  if (typeof window !== 'undefined' && (window as any).hideSplash) {
    (window as any).hideSplash();
  }
};

// Render app
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Hide splash after first render
requestAnimationFrame(() => {
  requestAnimationFrame(hideSplash);
});
