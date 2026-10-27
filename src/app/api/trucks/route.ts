import { NextResponse } from "next/server";
import { listTrucks } from "@/lib/db";
import { apiSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Active trucks for the picker on the phone. */
export async function GET() {
  const { error } = await apiSession();
  if (error) return error;
  try {
    const trucks = await listTrucks({ activeOnly: true });
    return NextResponse.json({ trucks });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
