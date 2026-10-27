import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { verifySession } from "@/lib/session-core";

// Routes that never need a session.
const PUBLIC_PREFIXES = ["/login", "/offline", "/api/auth/", "/manifest.webmanifest", "/sw.js", "/icons/", "/logo.png"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (!user) {
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // Root: send each role to its home.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(user.role === "manager" ? "/manager" : "/app", request.url));
  }

  // Manager-only areas.
  if ((pathname.startsWith("/manager") || pathname.startsWith("/api/manager/")) && user.role !== "manager") {
    if (isApi) return NextResponse.json({ error: "Managers only" }, { status: 403 });
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files with an extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt|xml)$).*)"],
};
