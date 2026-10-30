import { readFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { formatOrderNumber } from "@/lib/constants";
import { downloadFromStorage } from "@/lib/db";
import { isLang } from "@/lib/i18n";
import { getLang } from "@/lib/i18n/server";
import { RepairOrderPdf, type PdfAssets } from "@/lib/pdf/RepairOrderPdf";
import { apiSession } from "@/lib/session";
import { getOrderTranslated } from "@/lib/translate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

let logoCache: string | null | undefined;
async function logoDataUrl(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "logo-horizontal.png"));
    logoCache = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    logoCache = null;
  }
  return logoCache;
}

function toDataUrl(buf: Buffer, storagePath: string): string {
  const ext = storagePath.split(".").pop()?.toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Renders the order as a PDF laid out like the paper form. ?download=1 forces a download. */
export async function GET(request: Request, { params }: Ctx) {
  const { user, error } = await apiSession();
  if (error) return error;
  const { id } = await params;

  const order = await getOrderTranslated(id);
  if (!order || (user.role !== "manager" && order.mechanic_id !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [logo, signature, ...photoBufs] = await Promise.all([
    logoDataUrl(),
    order.signature_path ? downloadFromStorage(order.signature_path) : Promise.resolve(null),
    ...(order.photos ?? []).map((p) => downloadFromStorage(p.storage_path)),
  ]);

  const assets: PdfAssets = {
    logoDataUrl: logo,
    signatureDataUrl: signature ? toDataUrl(signature, order.signature_path!) : null,
    photos: (order.photos ?? [])
      .map((p, i) => (photoBufs[i] ? { dataUrl: toDataUrl(photoBufs[i]!, p.storage_path), caption: p.caption } : null))
      .filter((p): p is { dataUrl: string; caption: string | null } => p !== null),
  };

  const params_ = new URL(request.url).searchParams;
  const requested = params_.get("lang");
  const lang = isLang(requested) ? requested : await getLang();

  try {
    const element = React.createElement(RepairOrderPdf, { order, assets, lang }) as unknown as React.ReactElement<DocumentProps>;
    const pdf = await renderToBuffer(element);
    const filename = `${formatOrderNumber(order.order_number)}-${order.work_date}${lang === "es" ? "-es" : ""}.pdf`;
    const download = params_.get("download") === "1";
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
