import {EditReport} from "./EditReport";
import {ShellControls,restorePalette} from "./shell-controls";
import { ArchiveReview } from "./ArchiveReview";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { call, type History } from "./bridge";
import { recipes } from "./recipes";
import { Icon } from "./icons";
import { MaterialWorkbench } from "./MaterialWorkbench";
import { LanguageProvider, useLanguage, LanguageButton } from "./language";
import { errorText, rowCount, type Language } from "./i18n";
import "./style.css";
const dateTime = (s: string, language: Language) =>
  new Date(s).toLocaleString(language, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
restorePalette();
function App() {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState("work"),
    [history, setHistory] = useState<History>(),
    [error, setError] = useState<unknown>(null),
    [exported, setExported] = useState(false);
  async function run(fn: () => Promise<void>) {
    setError(null);
    setExported(false);
    try {
      await fn();
    } catch (e) {
      setError(e);
    }
  }
  const [review, setReview] = useState(""),[edition,setEdition]=useState("");
  const refreshHistory = async () => setHistory(await call<History>("history"));
  const action = (method: string, archiveId: string) =>
    run(async () => {
      const result = await call(method, { archiveId });
      if (result && method === "exportPng") setExported(true);
    });
  return (
    <>
      <header className="top">
        <div className="brand" onMouseDown={e=>{if(e.button===0&&e.detail===1)void call("windowAction",{action:"drag"})}} onDoubleClick={()=>void call("windowAction",{action:"maximize"})}>
          <Icon kind="cube" size={35} />
          One Page <b>BI</b>
          <span>V0.7.0</span>
        </div>
        <nav>
          <button
            className={tab === "work" ? "active" : ""}
            onClick={() => setTab("work")}
          >
            {t("Workbench")}
          </button>
          <button
            className={tab === "history" ? "active" : ""}
            onClick={() => {
              setTab("history");
              void run(refreshHistory);
            }}
          >
            {t("History")}
          </button>
        </nav>
        <small>
          <i />
          {t("Local workspace")}
        </small>
        <LanguageButton /><ShellControls/>
      </header>
      <main>
        <MaterialWorkbench active={tab === "work"} />
        {tab === "history" && (
          <>
            <h1>{t("History")}</h1>
            {!!error && (
              <p role="alert" className="feedback bad">
                {errorText(error, language)}
              </p>
            )}
            {exported && <p role="status">{t("PNG exported.")}</p>}
            <section className="panel history">
              <div className="panelhead">
                <span>
                  <Icon kind="clock" /> {t("Report archive")}
                </span>
                <button onClick={() => run(refreshHistory)}>
                  {t("Refresh")}
                </button>
              </div>
              <p className="path">{history?.folder}</p>
              {!!history?.skipped && (
                <p>
                  {t("Unreadable archive records: {count}.", {
                    count: history.skipped,
                  })}
                </p>
              )}
              {history?.items.length ? (
                history.items.map((h) => (
                  <article className="histitem" key={h.id}>
                    <Icon kind="chart" size={35} />
                    <div>
                      <strong>{h.source}</strong>
                      <small>
                        {t(
                          h.recipe === "payout"
                            ? "Payout check"
                            : (recipes[h.recipe ?? "sales"] ?? recipes.sales)
                                .name,
                        )}{" "}
                        · {dateTime(h.created, language)} · {h.sheet} ·{" "}
                        {rowCount(h.rows, language)}
                      </small>
                    </div>
                    <div className="actions">
                      <button onClick={() => action("report", h.id)}>
                        {t("Open detailed report")}
                      </button>
                      <button onClick={() => action("exportPng", h.id)}>
                        {t("Save summary PNG")}
                      </button>
                      <button onClick={() => setReview(h.id)}>
                        {t("Review staging and verify")}
                      </button>
                      {h.editable&&<button onClick={()=>setEdition(h.id)}>{t("Professional editing")}</button>}<button onClick={() => action("archiveFolder", h.id)}>
                        {t("Show folder")}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty">
                  {t(
                    "No reports yet. Craft a report to add it to your history.",
                  )}
                </div>
              )}
            </section>
          </>
        )}
        {edition&&<EditReport id={edition} close={()=>setEdition("")}/>}
        {review && <ArchiveReview id={review} close={() => setReview("")} />}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>,
);
