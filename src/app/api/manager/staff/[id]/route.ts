import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { countManagers, getStaff, updateStaff } from "@/lib/db";
import { apiSession } from "@/lib/session";
import { firstIssue, staffInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Edit name/role/branch, reset the PIN, or deactivate. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { user, error } = await apiSession({ manager: true });
  if (error) return error;
  const { id } = await params;

  const existing = await getStaff(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = staffInputSchema.safeParse({
    full_name: existing.full_name,
    role: existing.role,
    branch: existing.branch,
    ...body,
  });
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const d = parsed.data;

  // Don't let the last active manager lock everyone out.
  const demoting = existing.role === "manager" && (d.role !== "manager" || d.active === false);
  if (demoting && (await countManagers()) <= 1) {
    return NextResponse.json({ error: "There must be at least one active manager." }, { status: 400 });
  }
  if (id === user.id && d.active === false) {
    return NextResponse.json({ error: "You can't deactivate yourself." }, { status: 400 });
  }

  try {
    const staff = await updateStaff(id, {
      full_name: d.full_name,
      role: d.role,
      branch: d.branch,
      ...(d.active !== undefined ? { active: d.active } : {}),
      ...(d.passcode ? { passcode_hash: await bcrypt.hash(d.passcode, 10), failed_attempts: 0, locked_until: null } : {}),
    });
    return NextResponse.json({ staff });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
