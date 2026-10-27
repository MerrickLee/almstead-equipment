import { NextResponse } from "next/server";
import { getOrder, signedUrl } from "@/lib/db";
import { apiSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Serves a private storage object (photo or signature) to an authorized user
 * by redirecting to a short-lived signed URL. ?path=orders/<orderId>/<file>
 */
export async function GET(request: Request) {
  const { user, error } = await apiSession();
  if (error) return error;

  const path = new URL(request.url).searchParams.get("path") ?? "";
  const m = /^orders\/([0-9a-f-]{36})\/[A-Za-z0-9._-]+$/.exec(path);
  if (!m) return NextResponse.json({ error: "Bad path" }, { status: 400 });

  const order = await getOrder(m[1]);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const belongs = order.signature_path === path || order.photos?.some((p) => p.storage_path === path);
  if (!belongs) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await signedUrl(path, 300);
  if (!url) return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  return NextResponse.redirect(url, { status: 302 });
}
