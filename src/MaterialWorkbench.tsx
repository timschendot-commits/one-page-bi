import {
  business,
  businessIds,
  byKind,
  isBusiness,
  fieldSpec,
} from "./catalog";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  call,
  watchInventory,
  resultDragType,
  type Inventory,
  type Snapshot,
} from "./bridge";
import { InventoryPanel } from "./InventoryPanel";
import { Icon } from "./icons";
import { tableCSV, openSQL } from "./stage";
import { Modal } from "./Modal";
import { MaterialEditor } from "./MaterialEditor";
import { useLanguage } from "./language";
import { errorText, LocalizedError, translator, type Message } from "./i18n";
import {
  inspect,
  matches,
  compile,
  isSales,
  materialHint,
  preflight,
  kinds,
  kindTitles,
  useNames,
  fieldLabel,
  columnsFor,
  type Kind,
  type Material,
  type Candidate,
  type Binding,
} from "./materials";
import { archiveChoice, thumbnail, type Product } from "./material-output";
import { dashboard } from "./recipes";
import { payoutTotals } from "./payout-model";
import { money } from "./model";
type Item = string | File;
const titleFor: Record<Kind, Message> = {
  ...byKind((id) => business[id].title),
  sales: "Sales",
  orders: "Order analysis",
  cashflow: "Cash flow",
  payout: "Payouts",
};
const inputType = "application/x-onepagebi";
const kindsText: Record<Kind, Message> = {
  ...byKind((id) => business[id].material),
  sales: "Date and net line value, or order headers plus matching order items.",
  orders: "Sales lines plus globally unique order IDs.",
  cashflow: "Transaction date and signed cash, or debit and credit.",
  payout:
    "Platform net payouts and bank transactions with a settlement reference.",
};
function bytes64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768)
    s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s);
}
const describe = (p: Binding) =>
  p.material.name +
  (p.material.source!.sheets.length > 1 ? " / " + p.view.sheet : "");
export function MaterialWorkbench({ active }: { active: boolean }) {
  const { language, t } = useLanguage();
  const [pool, setPool] = useState<Material[]>([]),
    [preferred, setPreferred] = useState<Kind | null>(null),
    [selection, select] = useState(""),
    [modal, setModal] = useState(""),
    [editor, setEditor] = useState<{ m: Material; p?: Binding } | null>(null);
  const [product, setProduct] = useState<Product | null>(null),
    [archive, setArchive] = useState(""),
    [unit, setUnit] = useState(""),
    [filter, setFilter] = useState<Kind | null>(null);
  const [notice, setNotice] = useState<Message | null>(null),
    [errors, setErrors] = useState<{ file?: string; error: unknown }[]>([]),
    [busy, setBusy] = useState(false),
    lock = useRef(false),
    picker = useRef<HTMLInputElement>(null);
  const [inv, setInv] = useState<Inventory>({
      folder: "",
      files: [],
      isExamples: false,
    }),
    [reveal, setReveal] = useState({ name: "", seq: 0 });
  const options = useMemo(() => matches(pool), [pool]),
    chosen = options.find((c) => c.id === selection),
    thumb = useMemo(
      () => (product ? thumbnail(product, language) : ""),
      [product, language],
    );
  const checks = useMemo(
    () => new Map(options.slice(0, 24).map((c) => [c.id, preflight(c)])),
    [options],
  );
  const checkLabel = (c: Candidate): Message =>
    checks.get(c.id)?.state === "blocked"
      ? "Needs correction"
      : checks.get(c.id)?.state === "ready"
        ? "Rows checked"
        : "Review meaning";
  const used = new Set(chosen?.parts.map((p) => p.material.token));
  const choices = filter ? options.filter((c) => c.kind === filter) : options;
  const [listPage, setListPage] = useState(0);
  const perPage = 12,
    page = Math.min(
      listPage,
      Math.max(0, Math.ceil(choices.length / perPage) - 1),
    );
  useEffect(() => {
    void call("startPool").catch((err) => setErrors([{ error: err }]));
  }, []);
  useEffect(
    () =>
      watchInventory((next) =>
        setInv((old) => (next.folder === old.folder ? next : old)),
      ),
    [],
  );
  useEffect(() => {
    let live = true;
    call<Inventory>("inventory", { language }).then(
      (v) => {
        if (live) setInv(v);
      },
      (err) => {
        if (live) setErrors([{ error: err }]);
      },
    );
    return () => {
      live = false;
    };
  }, [language]);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setErrors([]);
    setNotice(null);
    try {
      await fn();
    } catch (error) {
      setErrors([{ error }]);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function reset() {
    select("");
    setProduct(null);
    setArchive("");
    setErrors([]);
    setNotice(null);
    setModal("");
    setUnit("");
  }
  async function add(inputs: Item[]) {
    const added: Material[] = [],
      issues: { file: string; error: unknown }[] = [];
    let dup = false;
    for (const input of inputs) {
      const name = typeof input === "string" ? input : input.name;
      try {
        if (pool.length + added.length >= 9) {
          issues.push({
            file: name,
            error: new LocalizedError((l) =>
              translator(l)(
                "Nine slots are full. Remove an item before adding more.",
              ),
            ),
          });
          break;
        }
        if (!/\.(csv|tsv|xlsx|onepagebi\.html)$/i.test(name))
          throw new LocalizedError((l) =>
            translator(l)(
              "Export transaction rows as CSV, TSV or XLSX. Images, PDFs and general HTML cannot supply verified rows.",
            ),
          );
        const sql = await openSQL();
        let snap: Snapshot & { duplicate?: boolean };
        if (typeof input === "string")
          snap = await call("materialLoad", { name });
        else {
          if (input.size > (/\.html$/i.test(name) ? 16 : 5) * 1024 * 1024)
            throw new LocalizedError((l) =>
              translator(l)("This material exceeds the file size limit."),
            );
          snap = await call("materialDrop", {
            name,
            bytes: bytes64(new Uint8Array(await input.arrayBuffer())),
          });
        }
        if (snap.duplicate) {
          dup = true;
          continue;
        }
        const material = inspect(
          snap.token,
          snap.name,
          snap.sha256,
          Uint8Array.from(atob(snap.bytes), (c) => c.charCodeAt(0)),
          sql,
        );
        const entry =
          typeof input === "string" && inv.files.find((f) => f.name === input);
        if (entry)
          material.inventoryOrigin = {
            folder: inv.folder,
            modified: entry.modified,
            size: entry.size,
          };
        try {
          await call("stageMaterial", {
            token: material.token,
            tables: JSON.stringify(
              material.views
                .filter((v) => v.table)
                .map((v) => ({
                  sheet: v.sheet,
                  csv: tableCSV(v.table!),
                  audit: v.table!.audit,
                })),
            ),
          });
        } catch (e) {
          await call("materialRemove", { token: material.token });
          throw e;
        }
        added.push(material);
      } catch (error) {
        issues.push({ file: name, error });
      }
    }
    if (added.length) {
      reset();
      setPool((old) => [...old, ...added]);
    }
    if (dup) setNotice("An identical file is already on the grid.");
    setErrors(issues);
  }
  function begin(c: Candidate) {
    select(c.id);
    setProduct(null);
    setArchive("");
    setUnit("");
    setErrors([]);
    setNotice(null);
    setModal("review");
  }
  function browse(kind: Kind | null) {
    setFilter(kind);
    setListPage(0);
    setErrors([]);
    if (kind && options.filter((c) => c.kind === kind).length === 1) {
      begin(options.find((c) => c.kind === kind)!);
      return;
    }
    setModal("matches");
  }
  function pickTemplate(k: Kind) {
    if (preferred === k && !chosen && !options.some((c) => c.kind === k)) {
      setPreferred(null);
      return;
    }
    setPreferred(k);
    if (options.some((c) => c.kind === k)) browse(k);
    else {
      reset();
      setNotice(
        "Other report types can still match the materials on the grid.",
      );
    }
  }
  function validateChoice() {
    if (!chosen) return;
    const r = compile(chosen, unit || "Source units");
    setProduct(r);
    setModal("");
    setArchive("");
    setNotice("Ready. Click the output slot to craft your report.");
  }
  async function craft() {
    if (!chosen || !product) return;
    const r = { ...product, created: new Date().toISOString() };
    const id = await archiveChoice(chosen, r, language);
    setArchive(id);
    setProduct(r);
    setNotice("Report saved. Drag it into the inventory for a desktop copy.");
  }
  async function put(id: string) {
    if (!archive || id !== archive) return;
    const result = await call<{ name: string; inventory: Inventory }>(
      "putOnDesktop",
      { archiveId: id },
    );
    setInv(result.inventory);
    setReveal((r) => ({ name: result.name, seq: r.seq + 1 }));
    setNotice("Desktop copy ready in your inventory.");
  }
  function edit(m: Material, p?: Binding) {
    setEditor({ m, p });
    setErrors([]);
    setModal("edit");
  }
  const feedback = errors.length ? (
    <div className="feedback bad" role="alert">
      {errors.map((x, i) => (
        <div key={i}>
          {x.file ? x.file + " · " : ""}
          {errorText(x.error, language)}
        </div>
      ))}
    </div>
  ) : null;
  const count = (k: Kind) => options.filter((c) => c.kind === k).length;
  const cards = product
    ? isSales(product)
      ? dashboard(product, product.rows, language).cards.slice(0, 2)
      : [
          [
            t("Confirmed receipts"),
            money(payoutTotals(product.cases).confirmed, language),
          ],
          [t("Payout exceptions"), String(payoutTotals(product.cases).issues)],
        ]
    : [];
  if (!active) return null;
  return (
    <div className="workcase" inert={busy}>
      <aside className="library">
        <h2>{t("Templates")}</h2>
        {kinds
          .filter(
            (k) => !isBusiness(k) || k === chosen?.kind || k === preferred,
          )
          .map((k) => (
            <button
              key={k}
              className={
                "bookitem " +
                (chosen && chosen.kind !== k ? "muted-choice" : "")
              }
              aria-label={t(kindTitles[k])}
              aria-pressed={chosen ? chosen.kind === k : preferred === k}
              disabled={busy}
              title={t(kindsText[k])}
              onClick={() => pickTemplate(k)}
            >
              <Icon
                kind={
                  k === "cashflow"
                    ? "chart"
                    : k === "orders"
                      ? "file"
                      : k === "payout"
                        ? "map"
                        : "book"
                }
                size={23}
              />
              <b>{t(titleFor[k])}</b>
            </button>
          ))}
        <button className="refbtn" onClick={() => setModal("recipe")}>
          <Icon kind="tree" size={19} />
          {t("Recipe catalog")}
        </button>
        <button className="refbtn" onClick={() => setModal("parts")}>
          <Icon kind="map" size={19} />
          {t("Parts")}
        </button>
      </aside>
      <section className="bench">
        <h1>{t("Report workbench")}</h1>
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          accept=".csv,.tsv,.xlsx,.onepagebi.html"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void run(() => add(files));
          }}
        />
        <div className="craftline">
          <div
            className="materials"
            aria-label={t("3 by 3 material grid")}
            onDragOver={(e) => {
              if (
                e.dataTransfer.types.includes(inputType) ||
                e.dataTransfer.types.includes("Files")
              ) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const n = e.dataTransfer.getData(inputType),
                files = Array.from(e.dataTransfer.files);
              const batch = e.dataTransfer.getData(
                "application/x-onepagebi-list",
              );
              if (batch) {
                try {
                  const names: unknown = JSON.parse(batch);
                  if (
                    Array.isArray(names) &&
                    names.every((v) => typeof v === "string")
                  )
                    void run(() => add(names));
                } catch {
                  /* unrelated drag */
                }
                return;
              }
              if (files.length || n)
                void run(() => add(files.length ? files : [n]));
            }}
          >
            {Array.from({ length: 9 }, (_, i) => {
              const m = pool[i];
              if (!m)
                return (
                  <button
                    className={
                      "tile " + (i === 0 ? "material ghost" : "vacant")
                    }
                    disabled={busy}
                    key={i}
                    title={t("Add materials")}
                    aria-label={t("Add to slot {n}", { n: i + 1 })}
                    onClick={() => picker.current?.click()}
                  >
                    {!i && (
                      <>
                        <Icon kind="file" size={38} />
                        <b>{t("Add files")}</b>
                      </>
                    )}
                  </button>
                );
              return (
                <button
                  key={i}
                  className={
                    "tile material pool-item " +
                    (chosen
                      ? used.has(m.token)
                        ? "in-use"
                        : "unused"
                      : "has-item")
                  }
                  title={m.name}
                  aria-label={m.name}
                  disabled={busy}
                  onClick={() => edit(m)}
                >
                  <small className="item-ext">
                    {m.report ? "BI" : m.name.split(".").pop()?.toUpperCase()}
                  </small>
                  <Icon
                    kind={
                      m.report
                        ? "chart"
                        : /\.xlsx$/i.test(m.name)
                          ? "workbook"
                          : "file"
                    }
                    size={38}
                  />
                  <b>{m.name.replace(/(?:\.onepagebi)?\.[^.]+$/i, "")}</b>
                  {chosen && used.has(m.token) && (
                    <span className="using">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          <div
            className={"recipe-arrow " + (options.length ? "ready" : "")}
            aria-hidden="true"
          />
          <button
            className={
              "tile result " +
              (options.length ? "ready " : "") +
              (archive ? "crafted" : "")
            }
            disabled={busy || !options.length}
            draggable={Boolean(archive)}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData(resultDragType, archive);
            }}
            aria-label={t(
              archive
                ? "View the finished report"
                : product
                  ? "Craft and archive"
                  : "Choose a report",
            )}
            onClick={() => {
              if (archive)
                void run(async () => {
                  await call("report", { archiveId: archive });
                });
              else if (product) void run(craft);
              else if (chosen) setModal("review");
              else if (options.length === 1) begin(options[0]);
              else browse(null);
            }}
          >
            <Icon kind="chart" size={50} />
            <b>{t(archive ? "Report" : product ? "Craft" : "Choose report")}</b>
          </button>
        </div>
        <div className="benchstatus">
          <p className="instruction" role="status">
            {notice
              ? t(notice)
              : chosen
                ? t("Bright slots are used in this report.")
                : pool.length
                  ? t("Click a material to review its columns.")
                  : t("Drop files here. A template is optional.")}
          </p>
          {chosen && !product && (
            <button className="textbtn" onClick={reset}>
              {t("Change selection")}
            </button>
          )}
          {archive && (
            <>
              <button
                className="textbtn"
                onClick={() => run(() => put(archive))}
              >
                {t("To inventory")}
              </button>
              <button className="textbtn" onClick={() => run(craft)}>
                {t("Craft again")}
              </button>
            </>
          )}
        </div>
        {!modal && feedback}
      </section>
      <section className="preview">
        <h2>{t(product ? "Report preview" : "Matching reports")}</h2>
        {product ? (
          <>
            <div className="displayframe">
              <button
                className="thumb"
                aria-label={t("Enlarge report preview")}
                onClick={() => setModal("preview")}
              >
                <img src={thumb} alt={t(kindTitles[chosen!.kind])} />
              </button>
            </div>
            <div className="peek">
              {cards.map(([k, v]) => (
                <div key={k}>
                  <small>{k}</small>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          </>
        ) : options.length ? (
          <div className="candidate-list">
            {[...kinds]
              .sort((a, b) => Number(b === preferred) - Number(a === preferred))
              .filter((k) => count(k))
              .map((k) => (
                <button
                  key={k}
                  className={chosen && chosen.kind !== k ? "muted-choice" : ""}
                  onClick={() => browse(k)}
                >
                  <Icon kind="chart" size={22} />
                  <span>
                    {t(kindTitles[k])}
                    <small>
                      {t(
                        options.some(
                          (c) =>
                            c.kind === k && checks.get(c.id)?.state === "ready",
                        )
                          ? "Rows checked"
                          : options
                                .filter((c) => c.kind === k)
                                .every(
                                  (c) => checks.get(c.id)?.state === "blocked",
                                )
                            ? "Needs correction"
                            : "Review meaning",
                      )}
                    </small>
                  </span>
                  <b>{count(k)}</b>
                </button>
              ))}
            <small>
              {t(
                "Based on columns. Confirm meaning and validate all rows before crafting.",
              )}
            </small>
          </div>
        ) : (
          <div className="displayframe">
            <div className="screenempty">
              <Icon kind="chart" size={54} />
              <span>
                {t(
                  pool.length
                    ? "No complete combination yet"
                    : "Waiting for a data file",
                )}
              </span>
            </div>
          </div>
        )}
        {pool.length > 0 && !options.length && (
          <p className="help">
            {pool.map((m) => (
              <span key={m.token} className="material-hint">
                {m.name} ·{" "}
                {m.views[0]?.table
                  ? t(materialHint(m.views[0]))
                  : t(
                      "Click a material to set its header row and column meanings, or add the missing data.",
                    )}
              </span>
            ))}
          </p>
        )}
        {product && (
          <button className="textbtn" onClick={reset}>
            {t("Change selection")}
          </button>
        )}
        {archive && (
          <div className="prevactions">
            <button
              onClick={() =>
                run(async () => {
                  await call("report", { archiveId: archive });
                })
              }
            >
              {t("Open detailed report")} ↗
            </button>
            <button
              onClick={() =>
                run(async () => {
                  if (
                    await call("exportPng", {
                      archiveId: archive,
                      png: thumb.split(",")[1],
                    })
                  )
                    setNotice("PNG exported.");
                })
              }
            >
              {t("Save summary PNG")}
            </button>
          </div>
        )}
      </section>
      <InventoryPanel
        key={inv.folder + reveal.seq}
        inventory={inv}
        usedNames={
          chosen
            ? new Set(
                chosen.parts
                  .filter(
                    ({ material: m }) =>
                      m.inventoryOrigin?.folder === inv.folder &&
                      inv.files.some(
                        (f) =>
                          f.name === m.name &&
                          f.modified === m.inventoryOrigin?.modified &&
                          f.size === m.inventoryOrigin?.size,
                      ),
                  )
                  .map((p) => p.material.name),
              )
            : undefined
        }
        revealName={reveal.name}
        onFolder={(m) => void run(async () => setInv(await call<Inventory>(m)))}
        onBatch={(names) => void run(() => add(names))}
        onLoad={(name) => void run(() => add([name]))}
        onReport={(name) =>
          void run(async () => {
            await call("inventoryReport", { name });
          })
        }
        onResultDrop={(value) => void run(() => put(value))}
      />
      {modal === "matches" && (
        <Modal title={t("Choose a report")} onClose={() => setModal("")}>
          <label className="sheet">
            {t("Report type")}{" "}
            <select
              value={filter ?? ""}
              onChange={(e) => {
                setFilter((e.target.value as Kind) || null);
                setListPage(0);
              }}
            >
              <option value="">{t("All report types")}</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {t(kindTitles[k])} ({count(k)})
                </option>
              ))}
            </select>
          </label>
          <div className="candidate-list">
            {choices.slice(page * perPage, (page + 1) * perPage).map((c) => (
              <button key={c.id} onClick={() => begin(c)}>
                <div>
                  <b>{t(kindTitles[c.kind])}</b>
                  <small>
                    {t(checkLabel(c))} ·{" "}
                    {c.parts
                      .map(
                        (p) => t(useNames[p.layout.use]) + " · " + describe(p),
                      )
                      .join(" + ")}
                  </small>
                  {c.review && (
                    <small>
                      {t("Confirm the business meaning of this amount.")}
                    </small>
                  )}
                </div>
              </button>
            ))}
          </div>
          {choices.length > perPage && (
            <div className="pager">
              <button disabled={!page} onClick={() => setListPage(page - 1)}>
                ‹
              </button>
              {page + 1}/{Math.ceil(choices.length / perPage)}
              <button
                disabled={(page + 1) * perPage >= choices.length}
                onClick={() => setListPage(page + 1)}
              >
                ›
              </button>
            </div>
          )}
        </Modal>
      )}
      {modal === "review" && chosen && (
        <Modal title={t(kindTitles[chosen.kind])} onClose={() => setModal("")}>
          <p>
            {t(
              chosen.periods
                ? "Combine the selected disjoint periods using one currency."
                : kindsText[chosen.kind],
            )}
          </p>
          {chosen.periods && (
            <p className="help">
              {t(
                "Confirm these periods cover the same business and use the same sales definition.",
              )}
            </p>
          )}
          {chosen.review && !chosen.periods && (
            <p className="feedback good">
              {t("Confirm the business meaning of this amount.")}
            </p>
          )}
          {checks.get(chosen.id)?.state === "blocked" && !errors.length && (
            <p className="feedback bad">
              {errorText(checks.get(chosen.id)!.error, language)}
            </p>
          )}
          {chosen.parts.map((p) => (
            <div
              className="source-binding"
              key={p.material.token + p.view.sheet}
            >
              <strong>{describe(p)}</strong>
              <small>
                {t(useNames[p.layout.use])} · {p.view.table!.lines.length}{" "}
                {t("Row")}
              </small>
              <p>
                {columnsFor[p.layout.use]
                  .filter((k) => p.layout.columns[k] !== null)
                  .map(
                    (k) =>
                      t(fieldLabel(p.layout.use, k)) +
                      " ← " +
                      p.view.table!.headers[p.layout.columns[k]!],
                  )
                  .join(" · ")}
              </p>
              <button className="textbtn" onClick={() => edit(p.material, p)}>
                {t("Review columns")}
              </button>
            </div>
          ))}
          {chosen.parts.some(
            (p) =>
              p.layout.columns.quantity !== null &&
              p.layout.columns.amount === null,
          ) && (
            <p className="help">
              {t(
                "Derived line value: whole quantity × unit price − absolute line discount. Confirm the tax and return treatment.",
              )}
            </p>
          )}
          {chosen.kind === "stock" ? (
            <p>
              {t("Stock unit")} · {t("Source units")}
            </p>
          ) : (
            <label className="sheet">
              {t(chosen.kind === "payout" ? "Common currency" : "Amount unit")}{" "}
              <select
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setProduct(null);
                  setArchive("");
                  setErrors([]);
                }}
              >
                <option value="">
                  {t(
                    chosen.kind === "payout" || chosen.periods
                      ? "Confirm currency"
                      : "Source units",
                  )}
                </option>
                {["MYR", "CNY", "USD", "SGD", "EUR", "GBP", "AUD", "HKD"].map(
                  (k) => (
                    <option key={k}>{k}</option>
                  ),
                )}
              </select>
            </label>
          )}
          {feedback}
          <div className="modalactions">
            <button
              className="primary"
              onClick={() => run(async () => validateChoice())}
            >
              {t("Confirm and validate")}
            </button>
          </div>
        </Modal>
      )}
      {modal === "edit" && editor && (
        <MaterialEditor
          key={editor.m.token}
          material={editor.m}
          initial={editor.p?.view}
          initialLayout={editor.p?.layout}
          onClose={() => {
            setEditor(null);
            setModal(chosen ? "review" : "");
          }}
          onSave={(v) => {
            void run(async () => {
              const views = [
                ...editor.m.views.filter((x) => x.sheet !== v.sheet),
                v,
              ];
              await call("stageMaterial", {
                token: editor.m.token,
                tables: JSON.stringify(
                  views
                    .filter((x) => x.table)
                    .map((x) => ({
                      sheet: x.sheet,
                      csv: tableCSV(x.table!),
                      audit: x.table!.audit,
                    })),
                ),
              });
              setPool((old) =>
                old.map((m) =>
                  m.token === editor.m.token
                    ? {
                        ...m,
                        views: [
                          ...m.views.filter((x) => x.sheet !== v.sheet),
                          v,
                        ],
                      }
                    : m,
                ),
              );
              reset();
              setEditor(null);
            });
          }}
          onRemove={() =>
            void run(async () => {
              await call("materialRemove", { token: editor.m.token });
              setPool((old) => old.filter((x) => x.token !== editor.m.token));
              reset();
              setEditor(null);
            })
          }
        />
      )}
      {modal === "preview" && (
        <Modal title={t(kindTitles[chosen!.kind])} onClose={() => setModal("")}>
          <img className="largepreview" src={thumb} alt={t("Report preview")} />
        </Modal>
      )}
      {(modal === "recipe" || modal === "parts") && (
        <Modal
          title={t(modal === "recipe" ? "Recipe" : "Parts")}
          onClose={() => setModal("")}
        >
          {kinds.map((k) => (
            <p key={k}>
              <button
                onClick={() => {
                  setModal("");
                  pickTemplate(k);
                }}
              >
                {t(kindTitles[k])}
              </button>
              <br />
              {t(kindsText[k])}
              {isBusiness(k) &&
                " · " +
                  Object.values(fieldSpec(k))
                    .map((v) => t(v as Message))
                    .join(" / ")}
            </p>
          ))}
          <p className="help">
            {t("Drop up to nine materials. Only selected inputs are archived.")}
          </p>
        </Modal>
      )}
    </div>
  );
}
