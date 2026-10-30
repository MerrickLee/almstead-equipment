"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { LocalPhoto } from "@/lib/offline";
import { PhotoCapture } from "@/components/PhotoCapture";
import { SignaturePad } from "@/components/SignaturePad";

/** Add photos or (re)sign an order that has already been submitted. Online only. */
export function OrderAttachments({ orderId, hasSignature }: { orderId: string; hasSignature: boolean }) {
  const router = useRouter();
  const t = useT();
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSign, setShowSign] = useState(!hasSignature);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    setBusy(true);
    setError(null);
    try {
      for (const p of photos) {
        const form = new FormData();
        form.append("file", p.blob, `${p.id}.jpg`);
        form.append("caption", p.caption);
        const res = await fetch(`/api/orders/${orderId}/photos`, { method: "POST", body: form });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Photo upload failed");
      }
      if (signature) {
        const res = await fetch(`/api/orders/${orderId}/signature`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: signature }),
        });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Signature upload failed");
      }
      setPhotos([]);
      setSignature(null);
      setShowSign(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const dirty = photos.length > 0 || Boolean(signature);

  return (
    <section className="card flex flex-col gap-4 p-4">
      <h2 className="section-title">{t("detail.addToOrder")}</h2>
      <div>
        <span className="label">{t("detail.morePhotos")}</span>
        <PhotoCapture photos={photos} onChange={setPhotos} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <span className="label">{hasSignature ? t("detail.replaceSignature") : t("form.signature")}</span>
          {hasSignature && !showSign ? (
            <button type="button" onClick={() => setShowSign(true)} className="text-[13px] font-semibold text-brand">
              {t("detail.signAgain")}
            </button>
          ) : null}
        </div>
        {showSign ? <SignaturePad value={signature} onChange={setSignature} /> : null}
      </div>
      {error ? <p className="text-[14px] font-medium text-danger">{error}</p> : null}
      <button type="button" onClick={() => void upload()} disabled={!dirty || busy} className="btn-primary">
        {busy ? t("common.uploading") : t("common.upload")}
      </button>
    </section>
  );
}
