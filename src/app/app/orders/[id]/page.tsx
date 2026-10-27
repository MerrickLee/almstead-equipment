import { ChevronLeft, FileDown, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatOrderNumber } from "@/lib/constants";
import { getOrder } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { OrderDetail } from "@/components/OrderDetail";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderAttachments } from "@/components/mechanic/OrderAttachments";

export const dynamic = "force-dynamic";

export default async function MechanicOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) notFound();

  const locked = order.status === "reviewed";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/app/orders" className="flex w-fit items-center gap-1 text-[13px] font-semibold text-brand">
        <ChevronLeft size={16} /> My orders
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold">{formatOrderNumber(order.order_number)}</h1>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-[13px] text-muted">
            Truck {order.truck_number} · {fmtDate(order.work_date)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/orders/${order.id}/pdf`} target="_blank" rel="noopener" className="btn-secondary text-[14px]">
          <FileDown size={18} /> PDF
        </a>
        {!locked ? (
          <Link href={`/app/orders/${order.id}/edit`} className="btn-secondary text-[14px]">
            <Pencil size={18} /> Edit details
          </Link>
        ) : null}
      </div>

      {locked ? <p className="rounded-xl bg-slate-light px-4 py-2.5 text-[13px] text-slate-ink">This order was reviewed by a manager and is locked.</p> : null}

      <OrderDetail order={order} dense />

      {!locked ? <OrderAttachments orderId={order.id} hasSignature={Boolean(order.signature_path)} /> : null}
    </div>
  );
}
