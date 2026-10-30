import "server-only";
import { getOrder, updateOrderFields } from "./db";
import { isLang, type Lang } from "./i18n";
import { TRANSLATED_FIELDS, type FieldTranslation, type OrderTranslations, type RepairOrder, type TranslatedField } from "./types";

/**
 * Machine translation of the free-text fields on a repair order, English ⇄ Spanish.
 *
 * Every field is stored exactly as the mechanic (or manager) typed it. Alongside,
 * `repair_orders.translations` keeps `{ field: { src, en, es } }` so a Spanish
 * reader sees Spanish, an English reader sees English, and either can tap through
 * to the original. Translation runs on the server with Claude (Haiku) right after
 * a save, and fails soft: if the API key is missing or the call fails, the order
 * is saved anyway and the reader sees the original with a "not translated yet"
 * note; the next read retries.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.TRANSLATE_MODEL || "claude-haiku-5-5";
const TIMEOUT_MS = 8000;

type Translatable = Pick<RepairOrder, TranslatedField | "translations">;

/** Text that has nothing to translate: blank, or no letters at all (e.g. "12345", "—"). */
function untranslatable(text: string | null | undefined): boolean {
  return !text || !/\p{L}/u.test(text);
}

/** A stored entry is current when it was made from exactly this text. */
function isCurrent(tr: FieldTranslation | undefined, text: string): tr is FieldTranslation {
  return !!tr && isLang(tr.src) && tr[tr.src] === text && !!tr[tr.src === "en" ? "es" : "en"];
}

/** Fields whose translation is missing or stale. */
export function fieldsNeedingTranslation(order: Translatable): TranslatedField[] {
  return TRANSLATED_FIELDS.filter((f) => {
    const text = order[f];
    if (untranslatable(text)) return false;
    return !isCurrent(order.translations?.[f], text!);
  });
}

export function translationEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

interface ApiResult {
  [field: string]: { src?: string; translation?: string } | undefined;
}

function extractJson(text: string): ApiResult | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as ApiResult;
  } catch {
    return null;
  }
}

const SYSTEM = `You translate fields from an equipment repair order at Almstead Tree & Shrub Care, written by a mechanic or shop manager in English or Spanish.

For each field you receive:
1. Detect whether it is written in English ("en") or Spanish ("es"). If it mixes both, pick the dominant language.
2. Translate it into the other language, keeping the mechanic's meaning and tone. Use the everyday shop Spanish of the US Northeast (e.g. "troca" is fine to keep as "truck"; "chipper", "bucket truck", "stump grinder" are commonly left in English).
3. Keep verbatim: unit/truck numbers, part numbers, quantities and units (qt, gal, ft, psi, mm), brand and model names, abbreviations, prices, dates, times and people's names. Keep line breaks and list structure exactly.
4. Do not add, summarize, or explain anything. Do not correct the content.

Reply with ONLY a JSON object, no prose and no code fences:
{ "<field>": { "src": "en" | "es", "translation": "<text in the other language>" }, ... }`;

/**
 * Calls Claude once for all the given fields. Returns the translation records,
 * or null if translation isn't configured or the call fails.
 */
export async function translateFields(texts: Partial<Record<TranslatedField, string>>): Promise<OrderTranslations | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  const entries = Object.entries(texts).filter(([, v]) => !untranslatable(v)) as [TranslatedField, string][];
  if (!key || entries.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(Object.fromEntries(entries), null, 2) }],
      }),
    });
    if (!res.ok) {
      console.error(`[translate] ${res.status} ${await res.text().catch(() => "")}`.slice(0, 500));
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = extractJson(text);
    if (!parsed) {
      console.error("[translate] unparseable response", text.slice(0, 300));
      return null;
    }

    const out: OrderTranslations = {};
    for (const [field, original] of entries) {
      const r = parsed[field];
      if (!r || !isLang(r.src) || typeof r.translation !== "string" || !r.translation.trim()) continue;
      const src: Lang = r.src;
      const other: Lang = src === "en" ? "es" : "en";
      out[field] = { src, [src]: original, [other]: r.translation.trim() } as FieldTranslation;
    }
    return out;
  } catch (err) {
    console.error("[translate]", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Brings an order's translations up to date and saves them. Returns the order
 * with the merged `translations` (unchanged if nothing was needed or the call
 * failed). Never throws.
 */
export async function ensureTranslations<T extends Translatable & { id: string }>(order: T): Promise<T> {
  try {
    const stale = fieldsNeedingTranslation(order);
    // Drop entries for fields that were cleared or changed.
    const kept: OrderTranslations = {};
    for (const f of TRANSLATED_FIELDS) {
      const tr = order.translations?.[f];
      const text = order[f];
      if (tr && !untranslatable(text) && isCurrent(tr, text!)) kept[f] = tr;
    }
    const keptChanged = JSON.stringify(kept) !== JSON.stringify(order.translations ?? {});

    if (stale.length === 0) {
      if (keptChanged) await updateOrderFields(order.id, { translations: kept });
      return keptChanged ? { ...order, translations: kept } : order;
    }
    if (!translationEnabled()) {
      if (keptChanged) await updateOrderFields(order.id, { translations: kept });
      return { ...order, translations: kept };
    }

    const texts: Partial<Record<TranslatedField, string>> = {};
    for (const f of stale) texts[f] = order[f]!;
    const fresh = await translateFields(texts);
    const merged: OrderTranslations = { ...kept, ...(fresh ?? {}) };
    if (JSON.stringify(merged) === JSON.stringify(order.translations ?? {})) return order;
    await updateOrderFields(order.id, { translations: merged });
    return { ...order, translations: merged };
  } catch (err) {
    console.error("[translate] ensureTranslations", (err as Error).message);
    return order;
  }
}

/**
 * getOrder + a lazy retry: if the background translation after a save didn't
 * happen (no key at the time, API hiccup, cold start), the first reader who
 * opens the order gets it translated on the spot.
 */
export async function getOrderTranslated(id: string) {
  const order = await getOrder(id);
  if (!order) return null;
  if (!translationEnabled() || fieldsNeedingTranslation(order).length === 0) return order;
  return ensureTranslations(order);
}
