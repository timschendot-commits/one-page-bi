import {
  dashboard,
  recipes,
  recipeIds,
  exampleName,
  type RecipeId,
} from "./recipes";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  call,
  resultDragType,
  watchInventory,
  type History,
  type Inventory,
  type Snapshot,
} from "./bridge";
import {
  readSource,
  validate,
  cellLabel,
  type Source,
  type Table,
} from "./input";
import { fieldsFor, suggest, type Mapping, type Report } from "./model";
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
  const [recipeId, setRecipeId] = useState<RecipeId>("sales"),
    recipe = recipes[recipeId],
    fields = fieldsFor(recipeId);
  const [reveal, setReveal] = useState({ name: "", revision: 0 });
  useEffect(
    () =>
      watchInventory((next) =>
        setInv((current) => (current.folder === next.folder ? next : current)),
      ),
    [],
  );
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
    setMap(suggest(t.headers, recipeId));
  }
  function chooseRecipe(next: RecipeId) {
    if (next === recipeId || busy) return;
    setRecipeId(next);
    clearOutput();
    setError(null);
    setNotice("");
    setMap(table ? suggest(table.headers, next) : emptyMap);
  }
  async function putInBag(archiveId: string) {
    if (!archiveId || archiveId !== id) return;
    const saved = await call<{ name: string; inventory: Inventory }>(
      "putOnDesktop",
      { archiveId },
    );
    setInv(saved.inventory);
    setReveal((prev) => ({ name: saved.name, revision: prev.revision + 1 }));
    setNotice("Desktop copy ready in your inventory.");
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
    const r = validate(table, map, snapshot.name, unit, recipeId);
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
      appVersion: "0.2.0",
      language,
      template: recipeId,
      version: 1,
      theme: "field-notes",
      sheet: r.sheet,
      unit: sourceUnit(r.unit, language),
      grain: t(recipe.grain),
      moneyScale: 2,
      definitions: Object.fromEntries(
        Object.entries(recipe.definitions).map(([key, label]) => [
          key,
          t(label),
        ]),
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
      recipe: recipeId,
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
    setNotice("Report saved. Drag it into the inventory for a desktop copy.");
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
  const previewCards = report
    ? dashboard(report, report.rows, language).cards.slice(0, 2)
    : [];
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
          <span>V0.2.0</span>
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
                      {t((recipes[h.recipe ?? "sales"] ?? recipes.sales).name)}{" "}
                      · {dateTime(h.created, language)} · {h.sheet} ·{" "}
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
              {recipeIds.map((k) => (
                <button
                  key={k}
                  className="bookitem"
                  title={t(recipes[k].title)}
                  aria-pressed={recipeId === k}
                  disabled={busy}
                  onClick={() => chooseRecipe(k)}
                >
                  <Icon
                    kind={
                      k === "cashflow"
                        ? "chart"
                        : k === "orders"
                          ? "file"
                          : "book"
                    }
                    size={23}
                  />
                  <b>{t(recipes[k].name)}</b>
                </button>
              ))}
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
                    if (
                      !e.dataTransfer.types.includes("application/x-onepagebi")
                    )
                      return;
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
                            "Drag a data file from the inventory or click the input slot.",
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
                          aria-label={t("Choose input file")}
                          title={
                            snapshot?.name ??
                            t("Drop a data file here or click to browse")
                          }
                          onClick={() => run(() => load())}
                        >
                          <Icon kind="file" size={40} />
                          <b>{t(recipe.material)}</b>
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
                  draggable={Boolean(id) && !busy}
                  onDragStart={(e) => {
                    if (!id) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData(resultDragType, id);
                  }}
                  className={
                    "tile result " +
                    (report ? "ready " : "") +
                    (id ? "crafted" : "")
                  }
                  disabled={!report || busy}
                  onClick={() => (id ? action("report", id) : run(craft))}
                  aria-label={
                    id ? t("View the finished report") : t("Craft and archive")
                  }
                  title={
                    id
                      ? t(
                          "Click to open, or drag to the inventory to save on Desktop",
                        )
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
                        ? t("Click the mapping slot to review your data.")
                        : t(
                            "Drag a data file from the inventory to the grid.",
                          ))}
                </p>
                {id && (
                  <button
                    className="textbtn"
                    disabled={busy}
                    onClick={() => run(() => putInBag(id))}
                    title={t(
                      "Save a desktop copy and show it in the inventory",
                    )}
                  >
                    {t("To inventory")}
                  </button>
                )}
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
                    <img src={thumb} alt={t(recipe.title)} />
                  </button>
                ) : (
                  <div className="screenempty">
                    <Icon kind="chart" size={55} />
                    <span>{t("Waiting for a data file")}</span>
                  </div>
                )}
              </div>
              {report && (
                <div className="peek">
                  {previewCards.map(([label, value]) => (
                    <div key={label}>
                      <small>{label}</small>
                      <b>{value}</b>
                    </div>
                  ))}
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
              key={inventory.folder + ":" + reveal.revision}
              revealName={reveal.name}
              onResultDrop={(value) => void run(() => putInBag(value))}
              onReport={(name) =>
                void run(async () => {
                  await call("inventoryReport", { name });
                })
              }
              inventory={
                inventory.isExamples
                  ? {
                      ...inventory,
                      files: inventory.files.filter(
                        (f) =>
                          f.kind === "report" ||
                          f.name === exampleName(recipeId, language),
                      ),
                    }
                  : inventory
              }
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
          <p>{t(recipe.guide)}</p>
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
          title={modal === "recipe" ? t(recipe.title) : t("Report components")}
          onClose={() => setModal("")}
        >
          <p>{t(modal === "recipe" ? recipe.guide : recipe.parts)}</p>
          <p>{t(recipe.footer)}</p>
          <p>
            {t(
              "Drag the finished item onto the inventory to save a desktop copy.",
            )}
          </p>
          <p className="help">
            {t(
              "Use one table and one currency per report. Profit analysis, forecasting, joins and Power BI PBIP export are not supported.",
            )}
          </p>
        </Modal>
      )}
      {modal === "preview" && (
        <Modal title={t(recipe.title)} onClose={() => setModal("")}>
          <img className="largepreview" src={thumb} alt={t(recipe.title)} />
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
