import { NextResponse } from "next/server";
import { listStaff } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Names for the sign-in picker. No sensitive fields are returned. */
export async function GET() {
  try {
    const staff = await listStaff({ activeOnly: true });
    return NextResponse.json({
      staff: staff.map((s) => ({ id: s.id, full_name: s.full_name, role: s.role, branch: s.branch })),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
