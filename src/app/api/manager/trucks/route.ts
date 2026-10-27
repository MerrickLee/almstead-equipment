import { NextResponse } from "next/server";
import { createTruck, listTrucks } from "@/lib/db";
import { apiSession } from "@/lib/session";
import { firstIssue, truckInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await apiSession({ manager: true });
  if (error) return error;
  return NextResponse.json({ trucks: await listTrucks() });
}

export async function POST(request: Request) {
  const { error } = await apiSession({ manager: true });
  if (error) return error;

  const parsed = truckInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  try {
    const truck = await createTruck({
      truck_number: parsed.data.truck_number,
      description: parsed.data.description,
      branch: parsed.data.branch,
    });
    return NextResponse.json({ truck }, { status: 201 });
  } catch (err) {
    const msg = (err as { code?: string; message: string }).code === "23505" ? "That truck number already exists." : (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
