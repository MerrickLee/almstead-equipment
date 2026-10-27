import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatOrderNumber } from "@/lib/constants";
import { getTruck, listOrders } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { requireManager } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function TruckHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  const truck = await getTruck(id);
  if (!truck) notFound();
  const { orders, total } = await listOrders({ truckId: id, limit: 200 });

  const hours = orders.reduce((s, o) => s + (Number(o.total_hours) || 0), 0);
  const lastMileage = orders.find((o) => o.mileage !== null)?.mileage ?? null;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/manager/trucks" className="flex w-fit items-center gap-1 text-[13px] font-semibold text-brand">
        <ChevronLeft size={16} /> All trucks
      </Link>
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">
          Truck #{truck.truck_number}
          {!truck.active ? <span className="badge-reviewed ml-3 align-middle">Inactive</span> : null}
        </h1>
        <p className="text-[13px] text-muted">
          {truck.description ?? "No description"}
          {truck.branch ? ` · ${truck.branch}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">Repair orders</span>
          <span className="text-[30px] leading-tight font-bold">{total}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">Shop hours (all time)</span>
          <span className="text-[30px] leading-tight font-bold">{Math.round(hours * 10) / 10}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">Last recorded mileage</span>
          <span className="text-[30px] leading-tight font-bold">{lastMileage !== null ? lastMileage.toLocaleString("en-US") : "—"}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[12px] font-semibold text-muted">Last repair</span>
          <span className="text-[22px] leading-tight font-bold">{orders[0] ? fmtDate(orders[0].work_date) : "—"}</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-ground text-left text-[12px] text-muted">
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Mechanic</th>
              <th className="px-4 py-3 font-semibold">Summary</th>
              <th className="px-4 py-3 font-semibold">Parts</th>
              <th className="px-4 py-3 text-right font-semibold">Mileage</th>
              <th className="px-4 py-3 text-right font-semibold">Hours</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No repair orders for this truck yet.
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
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(o.work_date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{o.mechanic?.full_name ?? "—"}</td>
                  <td className="max-w-[260px] truncate px-4 py-3">{o.summary || o.work_performed || "—"}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted">{o.parts_materials?.replace(/\n+/g, "; ") || "—"}</td>
                  <td className="px-4 py-3 text-right">{o.mileage !== null ? o.mileage.toLocaleString("en-US") : "—"}</td>
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
