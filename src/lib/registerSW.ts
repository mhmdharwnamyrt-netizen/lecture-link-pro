// Guarded service worker registration. Skips Lovable preview/dev/iframe contexts.
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const shouldSkip = () => {
    if (!import.meta.env.PROD) return true;
    if (window.top !== window.self) return true; // iframe (preview)
    const h = window.location.hostname;
    if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
    if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
    if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
    if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
    return false;
  };

  if (shouldSkip()) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        if (r.active?.scriptURL?.endsWith("/sw.js")) await r.unregister();
      }
    } catch {}
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("SW registration failed:", err);
  }
}
