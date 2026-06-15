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
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // Lazy import sonner so the worker registration code stays light
    const notify = async (worker: ServiceWorker) => {
      try {
        const { toast } = await import("sonner");
        toast("A new version is available", {
          description: "Reload to update the app.",
          duration: 10000,
          action: {
            label: "Reload",
            onClick: () => {
              worker.postMessage({ type: "SKIP_WAITING" });
            },
          },
        });
      } catch {
        // Fallback: ask the worker to skip waiting and reload
        worker.postMessage({ type: "SKIP_WAITING" });
      }
    };

    if (reg.waiting && navigator.serviceWorker.controller) {
      notify(reg.waiting);
    }

    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          notify(installing);
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  } catch (err) {
    console.warn("SW registration failed:", err);
  }
}
