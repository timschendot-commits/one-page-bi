import { useState } from "react";
import { categories, questionFor } from "./questions";
import { kindTitles, type Kind } from "./materials";
import { translator } from "./i18n";
import { useLanguage } from "./language";
export function RecipeBrowser({ choose }: { choose: (k: Kind) => void }) {
  const { t, language } = useLanguage(),
    [query, setQuery] = useState(""),
    other = translator(language === "en" ? "zh-CN" : "en");
  const terms = query.trim().toLowerCase().split(/\s+/);
  const sections = categories
    .map((c) => ({
      ...c,
      ids: c.ids.filter((k) => {
        const text = [kindTitles[k], questionFor[k], c.title]
          .flatMap((s) => [t(s), other(s)])
          .join(" ")
          .toLowerCase();
        return terms.every((q) => text.includes(q));
      }),
    }))
    .filter((c) => c.ids.length);
  return (
    <div className="recipe-browser">
      <label>
        {t("Browse by business question")}
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Find a report")}
          aria-label={t("Find a report")}
        />
      </label>
      {sections.map((g) => (
        <section key={g.title}>
          <h3>{t(g.title)}</h3>
          <div className="recipe-choices">
            {g.ids.map((k) => (
              <button key={k} onClick={() => choose(k)}>
                <b>{t(questionFor[k])}</b>
                <small>{t(kindTitles[k])}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
      {!sections.length && <p>{t("No reports found")}</p>}
    </div>
  );
}
