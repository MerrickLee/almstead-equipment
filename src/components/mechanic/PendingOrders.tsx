"use client";

import { useEffect, useState } from "react";
import { fmtDate, unitLabel } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/client";
import { loadOutbox, type OutboxItem } from "@/lib/offline";
import { StatusBadge } from "@/components/StatusBadge";

/** Orders queued on this phone that haven't reached the server yet. */
export function PendingOrders() {
  const { lang, t } = useLang();
  const [items, setItems] = useState<OutboxItem[]>([]);

  useEffect(() => {
    const load = () => void loadOutbox().then(setItems);
    load();
    window.addEventListener("ro:outbox-changed", load);
    window.addEventListener("online", () => setTimeout(load, 1500));
    return () => window.removeEventListener("ro:outbox-changed", load);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => (
        <div key={it.values.client_id} className="card flex items-center gap-3 border-sun/80 p-3.5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{unitLabel(it.values.truck_number)}</span>
            <span className="truncate text-[13px] text-muted">
              {fmtDate(it.values.work_date, undefined, localeOf(lang))} · {it.values.summary || t("orders.noSummary")}
            </span>
          </span>
          <StatusBadge pending />
        </div>
      ))}
    </div>
  );
}
