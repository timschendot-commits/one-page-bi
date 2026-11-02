import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { call, type History, type Inventory, type Snapshot } from "./bridge";
import {
  readSource,
  validate,
  cellLabel,
  type Source,
  type Table,
} from "./input";
import {
  fields,
  suggest,
  metrics,
  money,
  definitions,
  type Mapping,
  type Report,
} from "./model";
import { standalone } from "./report-html";
import { paint } from "./chart";
import { Icon } from "./icons";
import { InventoryPanel } from "./InventoryPanel";
import { useLanguage, LanguageButton, LanguageProvider } from "./language";
import {
  errorText,
  LocalizedError,
  rowCount,
  sourceUnit,
  translator,
  type Language,
  type Message,
} from "./i18n";
import "./style.css";

const emptyMap: Mapping = {
  date: null,
  amount: null,
  order: null,
  category: null,
  currency: null,
};
const dateTime = (s: string, language: Language) =>
  new Date(s).toLocaleString(language, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="modalhead">
        <h2>{title}</h2>
        <LanguageButton />
        <button aria-label={t("Close")} onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const { language, t } = useLanguage();
  const [tab, setTab] = useState("work"),
    [modal, setModal] = useState(""),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  const [inventory, setInv] = useState<Inventory>({
      folder: "",
      files: [],
      isExamples: false,
    }),
    [history, setHistory] = useState<History>();
  const [snapshot, setSnap] = useState<{ name: string; token: string } | null>(
      null,
    ),
    [source, setSource] = useState<Source | null>(null),
    [sheet, setSheet] = useState(""),
    [table, setTable] = useState<Table | null>(null);
  const [map, setMap] = useState<Mapping>(emptyMap),
    [unit, setUnit] = useState("Source units"),
    [report, setReport] = useState<Report | null>(null),
    [id, setId] = useState("");
  const thumb = useMemo(() => {
    if (!report) return "";
    const canvas = document.createElement("canvas");
    paint(canvas, report, report.rows, language);
    return canvas.toDataURL("image/png");
  }, [report, language]);
  const [error, setError] = useState<Error | null>(null),
    [notice, setNotice] = useState<Message | "">(""),
    [drag, setDrag] = useState(false);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const inv = async (method: string) => {
    setInv(await call<Inventory>(method));
  };
  useEffect(() => {
    let current = true;
    call<Inventory>("inventory", { language }).then(
      (value) => {
        if (current) setInv(value);
      },
      (err) => {
        if (current) setError(err);
      },
    );
    return () => {
      current = false;
    };
  }, [language]);
  const refreshHistory = async () => setHistory(await call<History>("history"));
  function clearOutput() {
    setReport(null);
    setId("");
  }
  function selectSheet(s: Source, name: string) {
    setSheet(name);
    setTable(null);
    setMap(emptyMap);
    clearOutput();
    const t = s.table(name);
    setTable(t);
    setMap(suggest(t.headers));
  }
  async function load(name?: string) {
    const snap = await call<Snapshot | null>(
      name ? "load" : "selectFile",
      name ? { name } : {},
    );
    if (!snap) return;
    setSnap({ name: snap.name, token: snap.token });
    setSource(null);
    setTable(null);
    setSheet("");
    setMap(emptyMap);
    setUnit("Source units");
    clearOutput();
    if (!name) await inv("inventory");
    const bytes = Uint8Array.from(atob(snap.bytes), (c) => c.charCodeAt(0));
    const src = readSource(bytes, snap.name);
    setSource(src);
    selectSheet(src, src.sheets[0]);
    setModal("mapping");
  }
  function confirmMap() {
    if (!table || !snapshot) return;
    const r = validate(table, map, snapshot.name, unit);
    setReport(r);
    setId("");
    setModal("");
    setNotice("Ready. Click the output slot to craft your report.");
  }
  async function craft() {
    if (!report || !snapshot || !table) return;
    const r = { ...report, created: new Date().toISOString() };
    const c = document.createElement("canvas");
    paint(c, r, r.rows, language);
    const png = c.toDataURL("image/png");
    const tpl = {
      appVersion: "0.1.1",
      language,
      template: "sales",
      version: 1,
      theme: "field-notes",
      sheet: r.sheet,
      unit: sourceUnit(r.unit, language),
      grain: t("One sales line per row"),
      moneyScale: 2,
      definitions: Object.fromEntries(
        Object.entries(definitions).map(([key, label]) => [key, t(label)]),
      ),
      mapping: Object.fromEntries(
        fields.map((f) => [
          f.key,
          map[f.key] === null
            ? null
            : { column: map[f.key]! + 1, header: table.headers[map[f.key]!] },
        ]),
      ),
    };
    const archiveId = await call<string>("archive", {
      token: snapshot.token,
      processed: JSON.stringify({
        schemaVersion: 1,
        unit: r.unit,
        amountField: "cents",
        rows: r.rows,
      }),
      template: JSON.stringify(tpl, null, 2),
      html: standalone(r, language),
      png: png.split(",")[1],
      created: r.created,
      rows: r.rows.length,
      sheet: r.sheet,
    });
    setReport(r);
    setId(archiveId);
    setNotice("Report saved to history.");
  }
  const action = (method: string, archiveId: string) =>
    run(async () => {
      const options =
        method === "exportPng" && archiveId === id && tab === "work"
          ? { png: thumb.split(",")[1] }
          : {};
      const ok = await call(method, { archiveId, ...options });
      if (method === "exportPng" && ok) setNotice("PNG exported.");
    });
  const showHistory = () => {
    setModal("");
    setTab("history");
    void run(refreshHistory);
  };
  const openMap = () => {
    if (table) {
      setError(null);
      setModal("mapping");
    }
  };
  const total = report ? metrics(report.rows, report.hasOrders) : null;
  const status =
    error || notice ? (
      <div
        className={error ? "feedback bad" : "feedback good"}
        role={error ? "alert" : "status"}
      >
        {error ? errorText(error, language) : notice && t(notice)}
      </div>
    ) : null;
  return (
    <>
      <header className="top">
        <div className="brand">
          <Icon kind="cube" size={35} />
          One Page <b>BI</b>
          <span>V0.1.1</span>
        </div>
        <nav>
          <button
            className={tab === "work" ? "active" : ""}
            onClick={() => {
              setTab("work");
              setError(null);
              setNotice("");
            }}
          >
            {t("Workbench")}
          </button>
          <button
            className={tab === "history" ? "active" : ""}
            onClick={showHistory}
          >
            {t("History")}
          </button>
        </nav>
        <small>
          <i /> {t("Local workspace")}
        </small>
        <LanguageButton />
      </header>
      <main>
        {tab === "history" && <h1>{t("History")}</h1>}
        {modal !== "mapping" && (error || tab === "history") && status}
        {tab === "history" ? (
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
                      {dateTime(h.created, language)} · {h.sheet} ·{" "}
                      {rowCount(h.rows, language)}
                    </small>
                  </div>
                  <div className="actions">
                    <button onClick={() => action("report", h.id)}>
                      {t("Open report")}
                    </button>
                    <button onClick={() => action("exportPng", h.id)}>
                      {t("Export PNG")}
                    </button>
                    <button onClick={() => action("archiveFolder", h.id)}>
                      {t("Show folder")}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">
                {t("No reports yet. Craft a report to add it to your history.")}
              </div>
            )}
          </section>
        ) : (
          <div className="workcase">
            <aside className="library">
              <h2>{t("Templates")}</h2>
              <div className="bookitem">
                <Icon kind="book" size={43} />
                <b>{t("Sales")}</b>
              </div>
              <button className="refbtn" onClick={() => setModal("recipe")}>
                <Icon kind="tree" size={19} />
                {t("Recipe")}
              </button>
              <button className="refbtn" onClick={() => setModal("components")}>
                <Icon kind="map" size={19} />
                {t("Parts")}
              </button>
            </aside>
            <section className="bench">
              <h1>{t("Report workbench")}</h1>
              <div className="craftline">
                <div
                  className={"materials " + (drag ? "over" : "")}
                  aria-label={t("3 by 3 material grid")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={(e) => {
                    if (
                      !(e.relatedTarget instanceof Node) ||
                      !e.currentTarget.contains(e.relatedTarget)
                    )
                      setDrag(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    const name = e.dataTransfer.getData(
                      "application/x-onepagebi",
                    );
                    if (name) void run(() => load(name));
                    else
                      setError(
                        new LocalizedError((lang) =>
                          translator(lang)(
                            "Drag a file from the inventory or click the sales slot to browse.",
                          ),
                        ),
                      );
                  }}
                >
                  {Array.from({ length: 9 }, (_, i) => {
                    if (i === 3)
                      return (
                        <button
                          key={i}
                          className={
                            "tile material " + (snapshot ? "has-item" : "ghost")
                          }
                          aria-label={t("Add sales data")}
                          title={
                            snapshot?.name ??
                            t(
                              "Drag a file here or click to browse for sales data",
                            )
                          }
                          onClick={() => run(() => load())}
                        >
                          <Icon kind="file" size={40} />
                          <b>{t("Sales data")}</b>
                        </button>
                      );
                    if (i === 4)
                      return (
                        <button
                          key={i}
                          className={
                            "tile material " + (report ? "has-item" : "ghost")
                          }
                          aria-label={t("Review field mapping")}
                          title={t("Review field mapping")}
                          disabled={!table}
                          onClick={openMap}
                        >
                          <Icon kind="map" size={40} />
                          <b>{report ? t("Checked") : t("Map fields")}</b>
                        </button>
                      );
                    return (
                      <span
                        className="tile vacant"
                        key={i}
                        aria-hidden="true"
                      />
                    );
                  })}
                </div>
                <div
                  className={"recipe-arrow " + (report ? "ready" : "")}
                  aria-hidden="true"
                />
                <button
                  key={id}
                  className={
                    "tile result " +
                    (report ? "ready " : "") +
                    (id ? "crafted" : "")
                  }
                  disabled={!report || busy}
                  onClick={() => (id ? action("report", id) : run(craft))}
                  aria-label={
                    id
                      ? t("View the finished sales report")
                      : t("Craft and archive")
                  }
                  title={
                    id
                      ? t("Open the finished report")
                      : t("Click to craft and archive a report")
                  }
                >
                  <Icon kind="chart" size={54} />
                  <b>{busy ? t("Working…") : id ? t("Report") : t("Craft")}</b>
                </button>
              </div>
              {source && source.sheets.length > 1 && (
                <label className="sheet">
                  {t("Worksheet")}{" "}
                  <select
                    aria-label={t("Worksheet")}
                    value={sheet}
                    onChange={(e) =>
                      run(async () => {
                        selectSheet(source, e.target.value);
                        setModal("mapping");
                      })
                    }
                  >
                    {source.sheets.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="benchstatus">
                <p className="instruction" role="status">
                  {(notice && t(notice)) ||
                    (report
                      ? t(
                          "Click the output slot to craft and archive your report.",
                        )
                      : snapshot
                        ? t("Click the mapping slot to review your sales data.")
                        : t(
                            "Drag a sales file from the inventory to the grid.",
                          ))}
                </p>
                {id && (
                  <button
                    className="textbtn"
                    aria-label={t("Craft and archive again")}
                    onClick={() => run(craft)}
                  >
                    {t("Craft again")}
                  </button>
                )}
              </div>
            </section>
            <section className="preview">
              <h2>{t("Report preview")}</h2>
              <div className="displayframe">
                {thumb ? (
                  <button
                    className="thumb"
                    aria-label={t("Enlarge report preview")}
                    onClick={() => setModal("preview")}
                  >
                    <img
                      src={thumb}
                      alt={t("One-page report for the selected sales data")}
                    />
                  </button>
                ) : (
                  <div className="screenempty">
                    <Icon kind="chart" size={55} />
                    <span>{t("Waiting for sales data")}</span>
                  </div>
                )}
              </div>
              {report && (
                <div className="peek">
                  <div>
                    <small>
                      {t("Net sales")} · {sourceUnit(report.unit, language)}
                    </small>
                    <b>{money(total!.total, language)}</b>
                  </div>
                  <div>
                    <small>{t("Orders")}</small>
                    <b>{total!.count ?? "—"}</b>
                  </div>
                </div>
              )}
              {id && (
                <div className="prevactions">
                  <button onClick={() => action("report", id)}>
                    {t("Open report")} ↗
                  </button>
                  <button onClick={() => action("exportPng", id)}>
                    {t("Export PNG")}
                  </button>
                </div>
              )}
            </section>
            <InventoryPanel
              key={inventory.folder}
              inventory={inventory}
              onFolder={(m) => void run(() => inv(m))}
              onLoad={(n) => void run(() => load(n))}
            />
          </div>
        )}
      </main>
      {modal === "mapping" && table && (
        <Modal
          title={t("Review field mapping")}
          onClose={() => {
            setModal("");
            setError(null);
          }}
        >
          <p>
            {t(
              "Each row should be a sales line. Check that the suggested columns match your data.",
            )}
          </p>
          {source && source.sheets.length > 1 && (
            <label className="sheet">
              {t("Worksheet")}{" "}
              <select
                aria-label={t("Worksheet")}
                value={sheet}
                onChange={(e) =>
                  run(async () => {
                    try {
                      selectSheet(source, e.target.value);
                    } catch (err) {
                      setModal("");
                      throw err;
                    }
                  })
                }
              >
                {source.sheets.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          )}
          <small className="hint">
            {snapshot?.name} · {sheet} ·{" "}
            {rowCount(table.lines.length, language)}
          </small>
          <div className="mapping">
            {fields.map((f) => (
              <label key={f.key}>
                <span>
                  {t(f.title)}{" "}
                  <small>{f.required ? t("Required") : t("Optional")}</small>
                </span>
                <select
                  aria-label={t(f.title)}
                  value={map[f.key] ?? ""}
                  onChange={(e) => {
                    setMap({
                      ...map,
                      [f.key]: e.target.value === "" ? null : +e.target.value,
                    });
                    clearOutput();
                    setError(null);
                  }}
                >
                  <option value="">
                    {f.required ? t("Select a column") : t("Unused")}
                  </option>
                  {table.headers.map((h, i) => (
                    <option value={i} key={i}>
                      {h}
                    </option>
                  ))}
                </select>
                <small title={t("First source row")}>
                  {map[f.key] === null
                    ? "—"
                    : cellLabel(table.lines[0].cells[map[f.key]!]) ||
                      t("(blank)")}
                </small>
              </label>
            ))}
          </div>
          <label className="sheet">
            {t("Amount unit")}{" "}
            <select
              aria-label={t("Amount unit")}
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                clearOutput();
              }}
            >
              {["Source units", "CNY", "MYR", "USD", "SGD", "EUR", "GBP"].map(
                (s) => (
                  <option key={s} value={s}>
                    {sourceUnit(s, language)}
                  </option>
                ),
              )}
            </select>
          </label>
          <p className="help">
            {t(
              "When mapped, the currency column is checked on every row. Otherwise, confirm all rows share one unit. Use line amounts and remove subtotal and total rows first.",
            )}
          </p>
          {status}
          <div className="modalactions">
            <button
              className="primary"
              onClick={() => run(async () => confirmMap())}
            >
              {t("Confirm and validate")}
            </button>
          </div>
        </Modal>
      )}
      {(modal === "components" || modal === "recipe") && (
        <Modal
          title={
            modal === "recipe" ? t("Sales recipe") : t("Report components")
          }
          onClose={() => setModal("")}
        >
          {modal === "recipe" ? (
            <>
              <p>
                {t(
                  "1. Choose a UTF-8 CSV or XLSX sales file with column names on the first row.",
                )}
              </p>
              <p>
                {t(
                  "2. Map the date and line amount. Order ID, category and currency are optional. Missing fields stay missing.",
                )}
              </p>
              <p>
                {t(
                  "3. Validate every row and craft the report. Each run keeps its own archive, including a copy of the source file.",
                )}
              </p>
            </>
          ) : (
            <>
              <p>
                {t(
                  "Net sales, distinct orders, average order value and sales line count.",
                )}
              </p>
              <p>
                {t(
                  "Charts show the latest six months with sales and the top six categories by net sales. Filter the standalone report by month and category together.",
                )}
              </p>
            </>
          )}
          <p className="help">
            {t(
              "Use one table and one currency per report. Profit analysis, forecasting, joins and Power BI PBIP export are not supported.",
            )}
          </p>
        </Modal>
      )}
      {modal === "preview" && (
        <Modal title={t("Sales overview")} onClose={() => setModal("")}>
          <img
            className="largepreview"
            src={thumb}
            alt={t("One-page sales report")}
          />
        </Modal>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>,
);
