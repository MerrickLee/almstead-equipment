"use client";

import { useEffect } from "react";

/** Registers /sw.js and warms the app-shell cache so the phone works offline. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // avoids stale-cache confusion in dev

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        const warm = () => reg.active?.postMessage({ type: "WARM" });
        if (reg.active) warm();
        else navigator.serviceWorker.addEventListener("controllerchange", warm, { once: true });
      })
      .catch(() => {
        /* offline support is best-effort */
      });
  }, []);

  return null;
}
