import { NextResponse } from "next/server";
import { getTruck, updateTruck } from "@/lib/db";
import { apiSession } from "@/lib/session";
import { firstIssue, truckInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { error } = await apiSession({ manager: true });
  if (error) return error;
  const { id } = await params;

  const existing = await getTruck(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = truckInputSchema.safeParse({
    truck_number: existing.truck_number,
    description: existing.description,
    branch: existing.branch,
    kind: existing.kind,
    asset_id: existing.asset_id,
    ...body,
  });
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  try {
    const { asset_id, ...rest } = parsed.data;
    const truck = await updateTruck(id, { ...rest, ...(asset_id !== undefined ? { asset_id } : {}) });
    return NextResponse.json({ truck });
  } catch (err) {
    const msg = (err as { code?: string; message: string }).code === "23505" ? "That truck number already exists." : (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
