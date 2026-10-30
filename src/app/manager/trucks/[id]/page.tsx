import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatOrderNumber } from "@/lib/constants";
import { getTruck, listOrders } from "@/lib/db";
import { fmtDate, fmtNumber, unitLabel } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { textFor } from "@/lib/i18n/content";
import { getT } from "@/lib/i18n/server";
import { requireManager } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function TruckHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { lang, t } = await getT();
  const locale = localeOf(lang);
  const { id } = await params;
  const truck = await getTruck(id);
  if (!truck) notFound();
  const { orders, total } = await listOrders({ truckId: id, limit: 200 });

  const hours = orders.reduce((s, o) => s + (Number(o.total_hours) || 0), 0);
  const lastMileage = orders.find((o) => o.mileage !== null)?.mileage ?? null;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/manager/trucks" className="flex w-fit items-center gap-1 text-[13px] font-semibold text-brand">
        <ChevronLeft size={16} /> {t("trucks.history.allTrucks")}
      </Link>
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">
          {t("detail.unit", { unit: unitLabel(truck.truck_number) })}
          {!truck.active ? <span className="badge-reviewed ml-3 align-middle">{t("common.retired")}</span> : null}
        </h1>
        <p className="text-[13px] text-muted">
          {truck.description ?? t("trucks.history.noDesc")}
          {truck.branch ? ` · ${truck.branch}` : ""}
          {truck.asset_id ? ` · ${t("trucks.assetId")} ${truck.asset_id}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">{t("trucks.history.orders")}</span>
          <span className="text-[30px] leading-tight font-bold">{total}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">{t("trucks.history.hours")}</span>
          <span className="text-[30px] leading-tight font-bold">{Math.round(hours * 10) / 10}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">{t("trucks.history.mileage")}</span>
          <span className="text-[30px] leading-tight font-bold">{lastMileage !== null ? fmtNumber(lastMileage, locale) : "—"}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">{t("trucks.history.last")}</span>
          <span className="text-[22px] leading-tight font-bold">{orders[0] ? fmtDate(orders[0].work_date, undefined, locale) : "—"}</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-ground text-left text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">{t("mgr.col.order")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.date")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.mechanic")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.summary")}</th>
              <th className="px-4 py-3 font-semibold">{t("trucks.history.parts")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("form.mileage")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("mgr.col.hours")}</th>
              <th className="px-4 py-3 font-semibold">{t("mgr.col.status")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  {t("trucks.history.none")}
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-[#eef2ee] hover:bg-ground/60">
                  <td className="px-4 py-3">
                    <Link href={`/manager/orders/${o.id}`} className="font-semibold text-brand">
                      {formatOrderNumber(o.order_number)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(o.work_date, undefined, locale)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.mechanic?.full_name ?? "—"}</td>
                  <td className="max-w-[260px] truncate px-4 py-3">{textFor(o, "summary", lang) || textFor(o, "work_performed", lang) || "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted">{textFor(o, "parts_materials", lang)?.replace(/\n+/g, "; ") || "—"}</td>
                  <td className="px-4 py-3 text-right">{o.mileage !== null ? fmtNumber(o.mileage, locale) : "—"}</td>
                  <td className="px-4 py-3 text-right">{o.total_hours ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
