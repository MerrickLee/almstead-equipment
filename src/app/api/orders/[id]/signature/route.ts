import { NextResponse } from "next/server";
import { getOrder, updateOrderFields, uploadToStorage } from "@/lib/db";
import { apiSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** JSON body: { dataUrl: "data:image/png;base64,..." } */
export async function POST(request: Request, { params }: Ctx) {
  const { user, error } = await apiSession();
  if (error) return error;
  const { id } = await params;

  const order = await getOrder(id);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (user.role !== "manager" && order.status === "reviewed") {
    return NextResponse.json({ error: "This order has been reviewed and is locked." }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as { dataUrl?: string } | null;
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body?.dataUrl ?? "");
  if (!m) return NextResponse.json({ error: "Signature must be a PNG data URL" }, { status: 400 });

  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Signature image too large" }, { status: 413 });
  }

  const path = `orders/${id}/signature.png`;
  try {
    await uploadToStorage(path, bytes, "image/png");
    await updateOrderFields(id, { signature_path: path });
    return NextResponse.json({ ok: true, signature_path: path });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
