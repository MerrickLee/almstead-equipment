import { NextResponse } from "next/server";
import { MAX_PHOTOS_PER_ORDER } from "@/lib/constants";
import { addPhoto, countPhotos, deletePhoto, getOrder, uploadToStorage } from "@/lib/db";
import { apiSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

/** multipart/form-data with `file` (image) and optional `caption`. */
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

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Photos must be JPEG, PNG or WebP" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is larger than 10 MB" }, { status: 413 });
  }
  if ((await countPhotos(id)) >= MAX_PHOTOS_PER_ORDER) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS_PER_ORDER} photos per order` }, { status: 400 });
  }

  const caption = String(form?.get("caption") ?? "").trim() || null;
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `orders/${id}/${crypto.randomUUID()}.${ext}`;

  try {
    await uploadToStorage(path, await file.arrayBuffer(), file.type);
    const photo = await addPhoto(id, path, caption);
    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/** ?photoId=... */
export async function DELETE(request: Request, { params }: Ctx) {
  const { user, error } = await apiSession();
  if (error) return error;
  const { id } = await params;
  const photoId = new URL(request.url).searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const order = await getOrder(id);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!order.photos?.some((p) => p.id === photoId)) {
    return NextResponse.json({ error: "Photo not on this order" }, { status: 404 });
  }
  if (user.role !== "manager" && order.status === "reviewed") {
    return NextResponse.json({ error: "This order has been reviewed and is locked." }, { status: 409 });
  }

  await deletePhoto(photoId);
  return NextResponse.json({ ok: true });
}
