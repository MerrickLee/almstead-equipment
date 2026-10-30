"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, tFor, type DictKey, type Lang } from "./index";

interface LangContextValue {
  lang: Lang;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  setLang: (lang: Lang) => Promise<void>;
}

const LangContext = createContext<LangContextValue | null>(null);

/** Wraps the app; the server layout seeds the initial language from the cookie. */
export function LangProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback(
    async (next: Lang) => {
      setLangState(next);
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      document.documentElement.lang = next;
      // Remember it on the account too (ignored when signed out).
      fetch("/api/me/language", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: next }) }).catch(() => {});
      router.refresh(); // re-render server components in the new language
    },
    [router],
  );

  const value = useMemo(() => ({ lang, t: tFor(lang), setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}

export function useT() {
  return useLang().t;
}

/** EN | ES toggle. `tone` picks colors for a dark or light background. */
export function LangToggle({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const { lang, setLang, t } = useLang();
  const base = "min-h-8 rounded-md px-2 text-[12px] font-bold tracking-wide transition";
  const on = tone === "dark" ? "bg-white text-brand" : "bg-brand text-white";
  const off = tone === "dark" ? "text-white/80 hover:bg-white/15" : "text-muted hover:bg-ground";
  return (
    <div role="group" aria-label={t("lang.switch")} className={`inline-flex gap-0.5 rounded-lg p-0.5 ${tone === "dark" ? "bg-white/15" : "border border-line bg-white"} ${className}`}>
      <button type="button" onClick={() => void setLang("en")} aria-pressed={lang === "en"} className={`${base} ${lang === "en" ? on : off}`}>
        EN
      </button>
      <button type="button" onClick={() => void setLang("es")} aria-pressed={lang === "es"} className={`${base} ${lang === "es" ? on : off}`}>
        ES
      </button>
    </div>
  );
}
