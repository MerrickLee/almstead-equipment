import { NextResponse } from "next/server";
import { deleteOrder, getOrder, updateOrderFields } from "@/lib/db";
import { apiSession } from "@/lib/session";
import { firstIssue, repairOrderInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { user, error } = await apiSession();
  if (error) return error;
  const { id } = await params;

  const order = await getOrder(id);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}

/** Edit the form fields. Mechanics may edit their own orders until reviewed; managers any order. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { user, error } = await apiSession();
  if (error) return error;
  const { id } = await params;

  const order = await getOrder(id);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (user.role !== "manager" && order.status === "reviewed") {
    return NextResponse.json({ error: "This order has been reviewed and is locked." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = repairOrderInputSchema.safeParse({ ...body, client_id: order.client_id ?? body?.client_id });
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const updated = await updateOrderFields(id, {
      truck_id: d.truck_id,
      truck_number: d.truck_number,
      branch: d.branch,
      work_date: d.work_date,
      location: d.location || null,
      mileage: d.mileage,
      travel_time_minutes: d.travel_time_minutes,
      total_hours: d.total_hours,
      summary: d.summary || null,
      work_performed: d.work_performed || null,
      parts_materials: d.parts_materials || null,
      start_time: d.start_time,
      finish_time: d.finish_time,
    });
    return NextResponse.json({ order: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { error } = await apiSession({ manager: true });
  if (error) return error;
  const { id } = await params;
  try {
    await deleteOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
