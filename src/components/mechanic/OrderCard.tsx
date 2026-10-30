"use client";

import Link from "next/link";
import { formatOrderNumber } from "@/lib/constants";
import { fmtDate, unitLabel } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/client";
import { textFor } from "@/lib/i18n/content";
import type { RepairOrderWithNames } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export function OrderCard({ order, href }: { order: RepairOrderWithNames; href: string }) {
  const { lang } = useLang();
  const [y, m, d] = order.work_date.split("-").map(Number);
  const month = new Date(y, m - 1, d).toLocaleDateString(localeOf(lang), { month: "short" }).replace(".", "").toUpperCase();
  const summary = textFor(order, "summary", lang) || textFor(order, "work_performed", lang) || fmtDate(order.work_date, undefined, localeOf(lang));
  return (
    <Link href={href} className="card flex items-center gap-3 p-3.5 text-ink">
      <span className="flex min-w-[52px] flex-col items-center rounded-xl bg-ground py-1.5">
        <span className="text-[11px] font-semibold text-muted">{month}</span>
        <span className="text-[20px] leading-none font-bold">{d}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">
          {unitLabel(order.truck_number)}
          <span className="font-normal text-muted"> · {formatOrderNumber(order.order_number)}</span>
        </span>
        <span className="truncate text-[13px] text-muted">{summary}</span>
      </span>
      <StatusBadge status={order.status} />
    </Link>
  );
}
