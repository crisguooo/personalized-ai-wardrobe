import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  LOCALE_KEY,
  normalizeLocale,
  readLocale,
  saveLocale,
  translate,
} from "./translate.js";
import "./language.css";

const LanguageContext = createContext(null);
const browserStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};
export function LanguageProvider({ children }) {
  const [locale, updateLocale] = useState(() =>
    readLocale(browserStorage(), navigator.language),
  );
  const value = useMemo(
    () => ({
      locale,
      t: (message, values) => translate(message, locale, values),
      setLocale: (next) => {
        const normalized = normalizeLocale(next);
        saveLocale(browserStorage(), normalized);
        updateLocale(normalized);
      },
    }),
    [locale],
  );
  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = translate("Wearwell — your wardrobe, understood", locale);
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        translate(
          "A wardrobe that learns your taste. Build your closet, discover your style, and make more of what you own.",
          locale,
        ),
      );
  }, [locale]);
  useEffect(() => {
    const sync = (event) => {
      if (event.key === LOCALE_KEY)
        updateLocale(readLocale(browserStorage(), navigator.language));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  return useContext(LanguageContext);
}
export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  return (
    <div
      className="language-switcher"
      role="group"
      aria-label={locale === "zh" ? "界面语言" : "Interface language"}
    >
      <button
        type="button"
        lang="en"
        aria-label="English"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        lang="zh-CN"
        aria-label="简体中文"
        aria-pressed={locale === "zh"}
        onClick={() => setLocale("zh")}
      >
        中文
      </button>
    </div>
  );
}
