import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { translator, otherLanguage, switchLabel, type Language } from "./i18n";

const preference = "onepagebi.language";
const Context = createContext({ language: "en" as Language, toggle: () => {} });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem(preference) === "zh-CN" ? "zh-CN" : "en",
  );
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.title =
      "One Page BI · " + translator(language)("Report workbench");
    localStorage.setItem(preference, language);
  }, [language]);
  return (
    <Context.Provider
      value={{ language, toggle: () => setLanguage(otherLanguage) }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLanguage() {
  const ctx = useContext(Context);
  return { ...ctx, t: translator(ctx.language) };
}
export function LanguageButton() {
  const { language, toggle } = useLanguage();
  return (
    <button
      type="button"
      className="language-button"
      lang={otherLanguage(language)}
      onClick={toggle}
    >
      {switchLabel(language)}
    </button>
  );
}
