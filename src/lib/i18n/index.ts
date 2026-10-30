// Runtime-agnostic translation helpers (safe in server, client, proxy, and PDF code).
import { DEFAULT_LANG, LANGS, dictionary, type DictKey, type Lang } from "./dictionary";

export { DEFAULT_LANG, LANGS, type DictKey, type Lang };

export const LANG_COOKIE = "ro_lang";

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

/** Interpolates {name} placeholders. Missing keys fall back to the key itself so a typo is visible, not silent. */
export function translate(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  const entry = dictionary[key];
  let text: string = entry ? entry[lang] ?? entry[DEFAULT_LANG] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}

/** Curried form: const t = tFor(lang); t("form.title") */
export function tFor(lang: Lang) {
  return (key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

export type T = ReturnType<typeof tFor>;

/** BCP-47 locale for Intl formatting. */
export function localeOf(lang: Lang): string {
  return lang === "es" ? "es-US" : "en-US";
}

export function otherLang(lang: Lang): Lang {
  return lang === "es" ? "en" : "es";
}

/** Picks a language from an Accept-Language header. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LANG;
  const first = header.split(",").map((p) => p.trim().split(";")[0].toLowerCase());
  for (const tag of first) {
    if (tag.startsWith("es")) return "es";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LANG;
}
