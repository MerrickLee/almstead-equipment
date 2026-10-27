import { NextResponse } from "next/server";
import { listOrders, upsertOrder } from "@/lib/db";
import { apiSession } from "@/lib/session";
import { firstIssue, repairOrderInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Mechanic: my orders. Manager: all orders (filters via query string). */
export async function GET(request: Request) {
  const { user, error } = await apiSession();
  if (error) return error;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  try {
    const result = await listOrders({
      mechanicId: user.role === "manager" ? url.searchParams.get("mechanicId") ?? undefined : user.id,
      truckId: url.searchParams.get("truckId") ?? undefined,
      branch: url.searchParams.get("branch") ?? undefined,
      status: (url.searchParams.get("status") as "submitted" | "reviewed" | null) ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      search: url.searchParams.get("q") ?? undefined,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/** Create (or idempotently re-send) a repair order. */
export async function POST(request: Request) {
  const { user, error } = await apiSession();
  if (error) return error;

  const parsed = repairOrderInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  try {
    const order = await upsertOrder(user.id, parsed.data);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
