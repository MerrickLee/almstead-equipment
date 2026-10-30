"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

interface Props {
  value: string | null; // PNG data URL
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

/** Finger/stylus signature capture on a canvas. Emits a PNG data URL on each stroke end. */
export function SignaturePad({ value, onChange, disabled }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(value));

  // Size the canvas to its CSS box at device pixel ratio, and restore any existing signature.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const snapshot = hasInk ? canvas.toDataURL("image/png") : null;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#14271b";
      const src = snapshot ?? value;
      if (src) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = src;
      }
    };
    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onChange(e.currentTarget.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-line bg-white">
        <canvas
          ref={canvasRef}
          className="block h-36 w-full touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          aria-label={t("sig.area")}
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-7 border-t border-dashed border-line" />
        {!hasInk && !disabled ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] text-muted">
            {t("sig.hint")}
          </div>
        ) : null}
      </div>
      {!disabled ? (
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={clear} className="min-h-10 px-2 text-[13px] font-semibold text-brand">
            {t("common.clear")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
