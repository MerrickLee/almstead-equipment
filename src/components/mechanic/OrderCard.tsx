import Link from "next/link";
import { formatOrderNumber } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { RepairOrderWithNames } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export function OrderCard({ order, href }: { order: RepairOrderWithNames; href: string }) {
  const [y, m, d] = order.work_date.split("-").map(Number);
  const month = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return (
    <Link href={href} className="card flex items-center gap-3 p-3.5 text-ink">
      <span className="flex min-w-[52px] flex-col items-center rounded-xl bg-ground py-1.5">
        <span className="text-[11px] font-semibold text-muted">{month}</span>
        <span className="text-[20px] leading-none font-bold">{d}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">
          Truck {order.truck_number}
          <span className="font-normal text-muted"> · {formatOrderNumber(order.order_number)}</span>
        </span>
        <span className="truncate text-[13px] text-muted">{order.summary || order.work_performed || fmtDate(order.work_date)}</span>
      </span>
      <StatusBadge status={order.status} />
    </Link>
  );
}
