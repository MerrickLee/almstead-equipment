import "server-only";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, isLang, langFromAcceptLanguage, tFor, type Lang } from "./index";

/** The viewer's language: cookie first, then the browser's Accept-Language. */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const c = store.get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const h = await headers();
  return langFromAcceptLanguage(h.get("accept-language"));
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: tFor(lang) };
}
