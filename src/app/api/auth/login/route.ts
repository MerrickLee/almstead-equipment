import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS } from "@/lib/constants";
import { getStaffForLogin, recordLoginResult } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { firstIssue, loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const { staffId, passcode } = parsed.data;

  try {
    const staff = await getStaffForLogin(staffId);
    if (!staff || !staff.active) {
      return NextResponse.json({ error: "That account is not active." }, { status: 401 });
    }

    if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(staff.locked_until).getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` },
        { status: 423 },
      );
    }

    const ok = await bcrypt.compare(passcode, staff.passcode_hash);
    if (!ok) {
      const attempts = staff.failed_attempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null;
      await recordLoginResult(staff.id, false, lock);
      const left = MAX_FAILED_ATTEMPTS - attempts;
      return NextResponse.json(
        {
          error: lock
            ? `Too many wrong attempts. Locked for ${LOCKOUT_MINUTES} minutes.`
            : `Wrong PIN. ${left} attempt${left === 1 ? "" : "s"} left.`,
        },
        { status: 401 },
      );
    }

    await recordLoginResult(staff.id, true);
    const user = { id: staff.id, name: staff.full_name, role: staff.role, branch: staff.branch };
    const res = NextResponse.json({ user, home: staff.role === "manager" ? "/manager" : "/app" });
    await setSessionCookie(res, user);
    return res;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
