"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/lib/i18n/client";
import { pickText } from "@/lib/i18n/content";
import type { RepairOrder, TranslatedField } from "@/lib/types";

/**
 * Shows a free-text field in the viewer's language. When the text was written
 * in the other language, a small line says so and lets the reader flip to the
 * original wording.
 */
export function TranslatedText({
  order,
  field,
  className = "",
  emptyLabel = "—",
}: {
  order: Pick<RepairOrder, TranslatedField | "translations">;
  field: TranslatedField;
  className?: string;
  emptyLabel?: string;
}) {
  const { lang, t } = useLang();
  const [showOriginal, setShowOriginal] = useState(false);
  const picked = pickText(order, field, lang);

  if (!picked.text) return <p className={`text-[14px] text-muted ${className}`}>{emptyLabel}</p>;

  const langName = (l: "en" | "es") => t(l === "es" ? "tr.langName.es" : "tr.langName.en");

  return (
    <div className={className}>
      <p className="text-[14px] leading-relaxed whitespace-pre-line">{showOriginal && picked.original ? picked.original : picked.text}</p>
      {picked.translatedFrom ? (
        <button type="button" onClick={() => setShowOriginal((v) => !v)} className="mt-1 inline-flex min-h-7 items-center gap-1 text-[12px] font-semibold text-brand">
          <Languages size={13} />
          {showOriginal ? t("tr.seeTranslation") : `${t("tr.translatedFrom", { lang: langName(picked.translatedFrom) })} · ${t("tr.seeOriginal")}`}
        </button>
      ) : picked.pending ? (
        <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-muted">
          <Languages size={13} />
          {t("tr.unavailable")}
        </span>
      ) : null}
    </div>
  );
}
