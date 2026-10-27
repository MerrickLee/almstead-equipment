"use client";

import { CloudUpload, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { flushOutbox, loadOutbox } from "@/lib/offline";

/**
 * Shows how many orders are waiting to upload and sends them whenever the
 * phone comes back online (or the mechanic taps Retry).
 */
export function OutboxBanner() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const items = await loadOutbox();
    setPending(items.length);
    setLastError(items.find((i) => i.lastError)?.lastError ?? null);
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { sent } = await flushOutbox();
      await refresh();
      if (sent > 0) router.refresh();
    } finally {
      setSyncing(false);
    }
  }, [syncing, refresh, router]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refresh().then(() => {
      if (navigator.onLine) void sync();
    });
    const on = () => {
      setOnline(true);
      void sync();
    };
    const off = () => setOnline(false);
    const changed = () => void refresh();
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("ro:outbox-changed", changed);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("ro:outbox-changed", changed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!online && pending === 0) {
    return <div className="bg-sun-light px-4 py-2 text-center text-[13px] font-medium text-sun-dark">No signal — you can keep working; orders will upload later.</div>;
  }
  if (pending === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-sun-light px-4 py-2.5 text-[13px] text-sun-dark">
      <CloudUpload size={18} className="shrink-0" />
      <span className="flex-1">
        <strong>
          {pending} order{pending === 1 ? "" : "s"} waiting to upload
        </strong>
        {syncing ? " — sending…" : online ? (lastError ? ` — ${lastError}` : "") : " — will send when you have signal."}
      </span>
      {online && !syncing ? (
        <button type="button" onClick={() => void sync()} className="flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold">
          <RefreshCw size={14} /> Retry
        </button>
      ) : null}
    </div>
  );
}
