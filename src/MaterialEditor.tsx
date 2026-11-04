import { materialCsv } from "./replay";
import { useMemo,useState } from "react";
import { Modal } from "./Modal";
import { useLanguage } from "./language";
import { errorText } from "./i18n";
import { tableCSV, issueText } from "./stage";
import { call } from "./bridge";
import { cellLabel, sourceHeader } from "./input";
import {
  getSheet,matches,
  layout,
  materialHint,
  useNames,
  columnsFor,
  fieldLabel,
  type Material,
  type Sheet,
  type Use,
  type Layout,
} from "./materials";
interface Props {
  material: Material;
  initial?: Sheet;
  initialLayout?: Layout;
  onClose: () => void;
  onSave: (view: Sheet) => void;
  onRemove: () => void;
}
export function MaterialEditor({
  material: m,
  initial,
  initialLayout,
  onClose,
  onSave,
  onRemove,
}: Props) {
  const { language, t } = useLanguage();
  const first = initial ?? m.views[0];
  const [view, setView] = useState(first),
    [mode, setMode] = useState<Use | "auto">(
      initialLayout?.use ?? first?.manual?.use ?? "auto",
    );
  const [custom, setCustom] = useState<Layout | null>(
    initialLayout ?? first?.manual ?? null,
  );
  const [exportMsg, setExportMsg] = useState("");
  function read(sheet: string, n?: number, noHeader = false) {
    if (!m.source) return;
    const v = getSheet(
      m.source,
      sheet,
      n,
      n === undefined ? undefined : noHeader,
    );
    setView(v);
    setMode("auto");
    setCustom(null);
  }
  const likely=useMemo(()=>view?.table?[...new Set(matches([{...m,views:[{...view,manual:undefined}]}]).flatMap(c=>c.parts.map(p=>p.layout.use)))]:[],[m,view]);
  function changeUse(use: Use | "auto") {
    setMode(use);
    setCustom(use === "auto" || !view?.table ? null : layout(view.table, use));
  }
  return (
    <Modal title={m.name} onClose={onClose}>
      {m.source && view ? (
        <>
          {view.table && (
            <>
              {" "}
              <label className="sheet">
                {t("What does this file contain?")}{" "}
                <select
                  value={mode}
                  onChange={(e) => changeUse(e.target.value as Use | "auto")}
                >
                  <option value="auto">{t("Detect from columns")}</option>
                  {likely.length>0&&<optgroup label={t("Matched fields")}>{likely.map(u=><option key={u} value={u}>{t(useNames[u])}</option>)}</optgroup>}
                  <optgroup label={t("Other uses")}>{(Object.keys(useNames) as Use[]).filter(u=>!likely.includes(u)).map((u) => (
                    <option key={u} value={u}>
                      {t(useNames[u])}
                    </option>
                  ))}</optgroup>
                </select>
              </label>
            </>
          )}
          <details
            className="layout-tools"
            open={view.error ? true : undefined}
          >
            <summary>{t("File layout and SQL")}</summary>
            <div className="sheet">
              <label>
                {t("Worksheet")}{" "}
                <select
                  value={view.sheet}
                  onChange={(e) => {
                    const prev = m.views.find(
                      (x) => x.sheet === e.target.value,
                    );
                    if (prev) {
                      setView(prev);
                      setMode(prev.manual?.use ?? "auto");
                      setCustom(prev.manual ?? null);
                    } else read(e.target.value);
                  }}
                >
                  {m.source.sheets.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {!m.report && view.sheet !== "JSON Lines" && (
                <label>
                  {t("Header row")}{" "}
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={view.headerRow}
                    onChange={(e) =>
                      read(
                        view.sheet,
                        Math.min(50, Math.max(1, +e.target.value || 1)),
                        view.noHeader,
                      )
                    }
                  />
                </label>
              )}
            </div>
            {!m.report && view.sheet !== "JSON Lines" && (
              <label>
                <input
                  type="checkbox"
                  checked={!!view.noHeader}
                  onChange={(e) =>
                    read(view.sheet, view.headerRow, e.target.checked)
                  }
                />
                {t("First selected row is data (no header)")}
              </label>
            )}
          </details>
          {!!view.error && (
            <p className="feedback bad" role="alert">
              {errorText(view.error, language)}
            </p>
          )}
          {view.table && (
            <>
              {!custom && materialHint(view)!=="Choose a business meaning and map custom headers below."&&<p className="help">{t(materialHint(view))}</p>}
              {view.table.audit && (
                <details className="audit">
                  <summary>
                    {t("SQL material preview")} · {view.table.lines.length}{" "}
                    {t("Rows")}
                  </summary>
                  <p>
                    {view.table.audit.format === "jsonl"
                      ? "JSON Lines"
                      : view.table.audit.encoding}{" "}
                    · {JSON.stringify(view.table.audit.delimiter)} ·{" "}
                    {t("Header row")} {view.headerRow}
                    {view.noHeader
                      ? " · " + t("First selected row is data (no header)")
                      : ""}
                  </p>
                  {!!view.table.audit.removed.length && (
                    <p>
                      {t("Blank or repeated header rows removed")} ·{" "}
                      {view.table.audit.removed.slice(0, 20).join(", ")}
                    </p>
                  )}
                  {view.table.audit.issues.slice(0, 5).map((i, idx) => (
                    <p className="feedback bad" key={idx}>
                      {t("Row {row}", { row: i.row })} ·{" "}
                      {issueText(i, language)}
                    </p>
                  ))}
                  <details>
                    <summary>SQL</summary>
                    <code>{view.table.audit.query}</code>
                  </details>
                  <div className="sample-scroll">
                    <table>
                      <thead>
                        <tr>
                          {view.table.headers.map((h, i) => (
                            <th key={i}>
                              {h}
                              <small>{t(view.table!.audit!.hints[i])}</small>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {view.table.lines.slice(0, 3).map((l) => (
                          <tr key={l.n}>
                            {l.cells.map((c, i) => (
                              <td key={i}>{cellLabel(c)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    disabled={!!view.table.audit.issues.length}
                    onClick={async () => {
                      try {
                        const csv = custom
                          ? materialCsv({ material: m, view, layout: custom })
                          : tableCSV(view.table!);
                        if (await call("saveMaterial", { csv }))
                          setExportMsg(t("Saved"));
                      } catch (e) {
                        setExportMsg(errorText(e, language));
                      }
                    }}
                  >
                    {t("Save material CSV")}
                  </button>{" "}
                  {exportMsg}
                </details>
              )}

              {custom && (
                <>
                  {(custom.use === "sales" || custom.use === "lines") && (
                    <p className="help">
                      {t(
                        "Choose the final line value, or clear it to use quantity × unit price less line discount.",
                      )}
                    </p>
                  )}
                  <div className="mapping">
                    {columnsFor[custom.use].map((k) => (
                      <label key={k}>
                        <span>{t(fieldLabel(custom.use, k))}</span>
                        <select
                          aria-label={t(fieldLabel(custom.use, k))}
                          value={custom.columns[k] ?? ""}
                          onChange={(e) =>
                            setCustom({
                              ...custom,
                              columns: {
                                ...custom.columns,
                                [k]:
                                  e.target.value === ""
                                    ? null
                                    : +e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">{t("Unused")}</option>
                          {view.table!.headers.map((h, i) => (
                            <option key={h} value={i}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <small>
                          {custom.columns[k] === null
                            ? "—"
                            : cellLabel(
                                view.table!.lines[0].cells[custom.columns[k]!],
                              )}
                        </small>
                      </label>
                    ))}
                  </div>
                  <label className="sheet">
                    <input
                      type="checkbox"
                      checked={custom.dmy}
                      onChange={(e) =>
                        setCustom({ ...custom, dmy: e.target.checked })
                      }
                    />
                    {t("Also read DD/MM/YYYY dates")}
                  </label>
                  <label className="sheet">
                    <input
                      type="checkbox"
                      checked={custom.decimalComma === true}
                      onChange={(e) =>
                        setCustom({ ...custom, decimalComma: e.target.checked })
                      }
                    />
                    {t("Amounts use a decimal comma (1.234,50 → 1234.50)")}
                  </label>
                  {custom.use === "bank" && (
                    <label className="sheet">
                      <input
                        type="checkbox"
                        checked={custom.description}
                        onChange={(e) =>
                          setCustom({
                            ...custom,
                            description: e.target.checked,
                          })
                        }
                      />
                      {t("Find whole reference codes in the bank description")}
                    </label>
                  )}
                </>
              )}
            </>
          )}
          {m.source.sheets.length > 6 && (
            <p>
              {t(
                "The first six sheets were inspected. Select another sheet here to include it.",
              )}
            </p>
          )}
        </>
      ) : (
        <p className="feedback bad" role="alert">
          {errorText(m.error, language)}
        </p>
      )}
      <div className="modalactions">
        <button onClick={onRemove}>{t("Remove from grid")}</button>
        {view?.table && (
          <button
            className="primary"
            onClick={() => onSave({ ...view, manual: custom ?? undefined })}
          >
            {t("Apply to material")}
          </button>
        )}
      </div>
    </Modal>
  );
}
