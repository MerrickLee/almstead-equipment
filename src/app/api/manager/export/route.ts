import { NextResponse } from "next/server";
import { formatOrderNumber } from "@/lib/constants";
import { listOrders } from "@/lib/db";
import { apiSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of repair orders matching the same filters as the dashboard. */
export async function GET(request: Request) {
  const { error } = await apiSession({ manager: true });
  if (error) return error;

  const p = new URL(request.url).searchParams;
  const { orders } = await listOrders({
    mechanicId: p.get("mechanicId") ?? undefined,
    truckId: p.get("truckId") ?? undefined,
    branch: p.get("branch") ?? undefined,
    status: (p.get("status") as "submitted" | "reviewed" | null) ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    search: p.get("q") ?? undefined,
    limit: 500,
  });

  const header = [
    "Order #", "Date", "Mechanic", "Truck #", "Branch", "Location", "Mileage",
    "Travel time (min)", "Total hours", "Start", "Finish", "Summary", "Work performed",
    "Parts/Materials", "Status", "Reviewed by", "Reviewed at", "Manager notes", "Submitted at",
  ];
  const rows = orders.map((o) => [
    formatOrderNumber(o.order_number), o.work_date, o.mechanic?.full_name, o.truck_number, o.branch,
    o.location, o.mileage, o.travel_time_minutes, o.total_hours, o.start_time?.slice(0, 5),
    o.finish_time?.slice(0, 5), o.summary, o.work_performed, o.parts_materials, o.status,
    o.reviewer?.full_name, o.reviewed_at, o.manager_notes, o.submitted_at,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="repair-orders-${stamp}.csv"`,
    },
  });
}
