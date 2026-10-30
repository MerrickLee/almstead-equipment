import { NextResponse } from "next/server";
import { updateStaff } from "@/lib/db";
import { LANG_COOKIE, isLang } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Remembers the viewer's language on their account (and in the cookie). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { language?: unknown } | null;
  if (!body || !isLang(body.language)) {
    return NextResponse.json({ error: "language must be en or es" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, language: body.language });
  res.cookies.set({ name: LANG_COOKIE, value: body.language, path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const user = await getSession();
  if (user) {
    try {
      await updateStaff(user.id, { language: body.language });
    } catch {
      // Cookie still set; the account preference is best-effort.
    }
  }
  return res;
}
