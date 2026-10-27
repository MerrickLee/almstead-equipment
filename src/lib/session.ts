import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS } from "./constants";
import { signSession, verifySession } from "./session-core";
import type { SessionUser } from "./types";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** For pages: redirect to /login when signed out. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** For pages: managers only. Mechanics are sent to their own home. */
export async function requireManager(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "manager") redirect("/app");
  return user;
}

/** For route handlers: returns a 401/403 response instead of redirecting. */
export async function apiSession(opts?: { manager?: boolean }): Promise<
  { user: SessionUser; error: null } | { user: null; error: NextResponse }
> {
  const user = await getSession();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (opts?.manager && user.role !== "manager") {
    return { user: null, error: NextResponse.json({ error: "Managers only" }, { status: 403 }) };
  }
  return { user, error: null };
}

export async function setSessionCookie(res: NextResponse, user: SessionUser): Promise<void> {
  const token = await signSession(user);
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
}
