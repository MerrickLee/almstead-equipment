import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createStaff, listStaff } from "@/lib/db";
import { apiSession } from "@/lib/session";
import { firstIssue, staffInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await apiSession({ manager: true });
  if (error) return error;
  return NextResponse.json({ staff: await listStaff() });
}

/** Create a mechanic or manager. `passcode` is required on create. */
export async function POST(request: Request) {
  const { error } = await apiSession({ manager: true });
  if (error) return error;

  const parsed = staffInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  if (!parsed.data.passcode) return NextResponse.json({ error: "A PIN or passcode is required" }, { status: 400 });

  try {
    const staff = await createStaff({
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      branch: parsed.data.branch,
      language: parsed.data.language ?? null,
      passcode_hash: await bcrypt.hash(parsed.data.passcode, 10),
    });
    return NextResponse.json({ staff }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
