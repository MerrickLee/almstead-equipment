"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useT } from "@/lib/i18n/client";
import { compressImage } from "@/lib/images";
import { MAX_PHOTOS_PER_ORDER } from "@/lib/constants";
import type { LocalPhoto } from "@/lib/offline";

interface Props {
  photos: LocalPhoto[];
  onChange: (photos: LocalPhoto[]) => void;
  disabled?: boolean;
}

/** Camera / gallery capture with client-side compression. Photos are kept as blobs until submit. */
export function PhotoCapture({ photos, onChange, disabled }: Props) {
  const t = useT();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const urls = useMemo(() => photos.map((p) => URL.createObjectURL(p.blob)), [photos]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS_PER_ORDER - photos.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    const next: LocalPhoto[] = [];
    for (const f of picked) {
      const blob = await compressImage(f);
      next.push({ id: crypto.randomUUID(), blob, caption: "" });
    }
    onChange([...photos, ...next]);
  };

  const update = (id: string, patch: Partial<LocalPhoto>) => onChange(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id: string) => onChange(photos.filter((p) => p.id !== id));

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((p, i) => (
          <div key={p.id} className="relative overflow-hidden rounded-xl border border-line bg-ground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[i]} alt={p.caption || `${t("common.photo")} ${i + 1}`} className="aspect-square w-full object-cover" />
            {!disabled ? (
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={t("photos.remove")}
                className="absolute top-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X size={16} />
              </button>
            ) : null}
            <input
              type="text"
              value={p.caption}
              onChange={(e) => update(p.id, { caption: e.target.value })}
              placeholder={t("photos.caption")}
              disabled={disabled}
              className="w-full border-t border-line bg-white px-2 py-1.5 text-[13px] outline-none"
            />
          </div>
        ))}
        {!disabled && photos.length < MAX_PHOTOS_PER_ORDER ? (
          <div className="flex aspect-square flex-col gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 bg-ground text-[12px] font-semibold text-brand"
            >
              <Camera size={22} />
              {t("photos.camera")}
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-line bg-white text-[12px] font-semibold text-muted"
            >
              <ImagePlus size={16} />
              {t("photos.gallery")}
            </button>
          </div>
        ) : null}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void addFiles(e.target.files).then(() => (e.target.value = ""))} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addFiles(e.target.files).then(() => (e.target.value = ""))} />
      <p className="mt-2 text-[12px] text-muted">
        {t("photos.count", { n: photos.length, max: MAX_PHOTOS_PER_ORDER })}
      </p>
    </div>
  );
}
