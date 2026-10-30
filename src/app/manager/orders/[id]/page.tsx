import { ChevronLeft, FileDown, History, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatOrderNumber } from "@/lib/constants";
import { listOrders } from "@/lib/db";
import { fmtDate, fmtDateTime, unitLabel } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { textFor } from "@/lib/i18n/content";
import { getT } from "@/lib/i18n/server";
import { requireManager } from "@/lib/session";
import { getOrderTranslated } from "@/lib/translate";
import { OrderDetail } from "@/components/OrderDetail";
import { StatusBadge } from "@/components/StatusBadge";
import { ReviewPanel } from "@/components/manager/ReviewPanel";

export const dynamic = "force-dynamic";

export default async function ManagerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { lang, t } = await getT();
  const locale = localeOf(lang);
  const { id } = await params;
  const order = await getOrderTranslated(id);
  if (!order) notFound();

  const history = order.truck_id ? (await listOrders({ truckId: order.truck_id, limit: 6 })).orders.filter((o) => o.id !== order.id).slice(0, 5) : [];
  const unit = unitLabel(order.truck_number);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/manager" className="flex w-fit items-center gap-1 text-[13px] font-semibold text-brand">
        <ChevronLeft size={16} /> {t("detail.allOrders")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight">{formatOrderNumber(order.order_number)}</h1>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-[14px] text-muted">
            {t("detail.unit", { unit })} · {t("detail.submittedBy", { name: order.mechanic?.full_name ?? "—", when: fmtDateTime(order.submitted_at, locale) })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/orders/${order.id}/pdf?download=1&lang=${lang}`} className="btn-secondary min-h-10 text-[13px]">
            <FileDown size={16} /> {t("detail.downloadPdf")}
          </a>
          <Link href={`/app/orders/${order.id}/edit`} className="btn-secondary min-h-10 text-[13px]">
            <Pencil size={16} /> {t("common.edit")}
          </Link>
          {order.truck_id ? (
            <Link href={`/manager/trucks/${order.truck_id}`} className="btn-secondary min-h-10 text-[13px]">
              <History size={16} /> {t("detail.unitHistory", { unit })}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <OrderDetail order={order} />
        </div>
        <div className="flex flex-col gap-5">
          <ReviewPanel orderId={order.id} status={order.status} notes={order.manager_notes} />
          {order.truck_id ? (
            <section className="card flex flex-col gap-2 p-4">
              <span className="section-title">{t("detail.unitOtherOrders", { unit })}</span>
              {history.length === 0 ? (
                <p className="text-[13px] text-muted">{t("detail.noOtherOrders")}</p>
              ) : (
                history.map((h) => (
                  <Link key={h.id} href={`/manager/orders/${h.id}`} className="flex justify-between gap-2 text-[13px]">
                    <span className="truncate">
                      {fmtDate(h.work_date, { month: "short", day: "numeric" }, locale)} · {textFor(h, "summary", lang) || textFor(h, "work_performed", lang) || formatOrderNumber(h.order_number)}
                    </span>
                    <span className="shrink-0 text-muted">{h.total_hours ?? "—"} h</span>
                  </Link>
                ))
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
