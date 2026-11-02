import { useState } from "react";
import { Modal } from "./Modal";
import { useLanguage } from "./language";
import { errorText } from "./i18n";
import { cellLabel } from "./input";
import {
  getSheet,
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
  function read(sheet: string, n: number) {
    if (!m.source) return;
    const v = getSheet(m.source, sheet, n);
    setView(v);
    setMode("auto");
    setCustom(null);
  }
  function changeUse(use: Use | "auto") {
    setMode(use);
    setCustom(use === "auto" || !view?.table ? null : layout(view.table, use));
  }
  return (
    <Modal title={m.name} onClose={onClose}>
      {m.source && view ? (
        <>
          <div className="sheet">
            <label>
              {t("Worksheet")}{" "}
              <select
                value={view.sheet}
                onChange={(e) => {
                  const prev = m.views.find((x) => x.sheet === e.target.value);
                  if (prev) {
                    setView(prev);
                    setMode(prev.manual?.use ?? "auto");
                    setCustom(prev.manual ?? null);
                  } else read(e.target.value, 1);
                }}
              >
                {m.source.sheets.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {!m.report && (
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
                    )
                  }
                />
              </label>
            )}
          </div>
          {!!view.error && (
            <p className="feedback bad" role="alert">
              {errorText(view.error, language)}
            </p>
          )}
          {view.table && (
            <>
              <p className="help">{t(materialHint(view))}</p>
              <p className="help">{view.table.headers.join(" · ")}</p>
              <label className="sheet">
                {t("Material meaning")}{" "}
                <select
                  value={mode}
                  onChange={(e) => changeUse(e.target.value as Use | "auto")}
                >
                  <option value="auto">{t("Detect from columns")}</option>
                  {(Object.keys(useNames) as Use[]).map((u) => (
                    <option key={u} value={u}>
                      {t(useNames[u])}
                    </option>
                  ))}
                </select>
              </label>
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
