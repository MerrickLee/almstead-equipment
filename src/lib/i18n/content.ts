// Picks the right version of a free-text field for the viewer's language.
// Runtime-agnostic (server, client, PDF).
import type { Lang } from "./index";
import type { RepairOrder, TranslatedField } from "../types";

export interface PickedText {
  /** What to show. */
  text: string | null;
  /** Set when `text` is a translation — the language it was written in. */
  translatedFrom: Lang | null;
  /** The text as written, when it differs from `text`. */
  original: string | null;
  /** True when the field was written in another language but no translation exists yet. */
  pending: boolean;
}

export function pickText(order: Pick<RepairOrder, TranslatedField | "translations">, field: TranslatedField, lang: Lang): PickedText {
  const original = order[field] ?? null;
  const tr = order.translations?.[field];
  if (!original || !tr || tr.src === lang) {
    return { text: original, translatedFrom: null, original: null, pending: false };
  }
  // A translation made from different text (the field was edited since) is stale — never show it.
  const alt = tr[tr.src] === original ? tr[lang] : undefined;
  if (alt) return { text: alt, translatedFrom: tr.src, original, pending: false };
  return { text: original, translatedFrom: null, original: null, pending: true };
}

/** Shorthand when only the display string is needed (lists, CSV). */
export function textFor(order: Pick<RepairOrder, TranslatedField | "translations">, field: TranslatedField, lang: Lang): string | null {
  return pickText(order, field, lang).text;
}
