import { ChevronLeft, FileDown, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatOrderNumber } from "@/lib/constants";
import { getOrderTranslated } from "@/lib/translate";
import { fmtDate, unitLabel } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { requireSession } from "@/lib/session";
import { OrderDetail } from "@/components/OrderDetail";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderAttachments } from "@/components/mechanic/OrderAttachments";

export const dynamic = "force-dynamic";

export default async function MechanicOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { lang, t } = await getT();
  const { id } = await params;
  const order = await getOrderTranslated(id);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) notFound();

  const locked = order.status === "reviewed";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/app/orders" className="flex w-fit items-center gap-1 text-[13px] font-semibold text-brand">
        <ChevronLeft size={16} /> {t("detail.myOrders")}
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold">{formatOrderNumber(order.order_number)}</h1>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-[13px] text-muted">
            {t("detail.unit", { unit: unitLabel(order.truck_number) })} · {fmtDate(order.work_date, undefined, localeOf(lang))}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/orders/${order.id}/pdf?lang=${lang}`} target="_blank" rel="noopener" className="btn-secondary text-[14px]">
          <FileDown size={18} /> {t("detail.pdf")}
        </a>
        {!locked ? (
          <Link href={`/app/orders/${order.id}/edit`} className="btn-secondary text-[14px]">
            <Pencil size={18} /> {t("detail.editDetails")}
          </Link>
        ) : null}
      </div>

      {locked ? <p className="rounded-xl bg-slate-light px-4 py-2.5 text-[13px] text-slate-ink">{t("detail.locked")}</p> : null}

      <OrderDetail order={order} dense />

      {!locked ? <OrderAttachments orderId={order.id} hasSignature={Boolean(order.signature_path)} /> : null}
    </div>
  );
}
