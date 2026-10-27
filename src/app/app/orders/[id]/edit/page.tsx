import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatOrderNumber } from "@/lib/constants";
import { getOrder, listTrucks } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { RepairOrderInput } from "@/lib/types";
import { RepairOrderForm } from "@/components/mechanic/RepairOrderForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit repair order" };

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) notFound();
  if (order.status === "reviewed" && user.role !== "manager") redirect(`/app/orders/${id}`);

  const trucks = await listTrucks({ activeOnly: true }).catch(() => []);
  const values: RepairOrderInput = {
    client_id: order.client_id ?? order.id,
    truck_id: order.truck_id,
    truck_number: order.truck_number,
    branch: order.branch,
    work_date: order.work_date,
    location: order.location ?? "",
    mileage: order.mileage,
    travel_time_minutes: order.travel_time_minutes,
    total_hours: order.total_hours !== null ? Number(order.total_hours) : null,
    summary: order.summary ?? "",
    work_performed: order.work_performed ?? "",
    parts_materials: order.parts_materials ?? "",
    start_time: order.start_time?.slice(0, 5) ?? null,
    finish_time: order.finish_time?.slice(0, 5) ?? null,
  };

  return (
    <div className="flex flex-col gap-3">
      <Link href={`/app/orders/${id}`} className="flex w-fit items-center gap-1 text-[13px] font-semibold text-brand">
        <ChevronLeft size={16} /> {formatOrderNumber(order.order_number)}
      </Link>
      <h1 className="text-[20px] font-bold">Edit {formatOrderNumber(order.order_number)}</h1>
      <RepairOrderForm user={user} initialTrucks={trucks} existing={{ id: order.id, values }} />
    </div>
  );
}
