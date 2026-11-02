import { resultDragType } from "./bridge";
import { useState } from "react";
import type { Inventory } from "./bridge";
import { useLanguage } from "./language";
import { Icon } from "./icons";

interface Props {
  inventory: Inventory;
  onReport: (name: string) => void;
  onResultDrop: (id: string) => void;
  revealName: string;
  onFolder: (method: string) => void;
  onLoad: (name: string) => void;
  usedNames?: ReadonlySet<string>;
  onBatch?: (names: string[]) => void;
}
const pageSize = 18;
export function InventoryPanel({
  inventory,
  onFolder,
  onLoad,
  onBatch,
  usedNames,
  onReport,
  onResultDrop,
  revealName,
}: Props) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState<string[]>([]),
    [anchor, setAnchor] = useState("");
  const selected = picked.filter((name) =>
    inventory.files.some((f) => f.name === name),
  );
  const [over, setOver] = useState(false);
  const [page, setPage] = useState(() =>
      Math.max(
        0,
        Math.floor(
          inventory.files.findIndex((f) => f.name === revealName) / pageSize,
        ),
      ),
    ),
    [search, setSearch] = useState("");
  const files = inventory.files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(files.length / pageSize)),
    current = Math.min(page, pages - 1);
  const slots = files.slice(current * pageSize, (current + 1) * pageSize);
  const location =
    inventory.folder.split(/[\\/]/).filter(Boolean).at(-1) ?? t("Desktop");
  const folderLabel = inventory.isExamples
    ? t("Examples")
    : location === "Desktop"
      ? t("Desktop")
      : location;
  return (
    <section
      className={"inventory" + (over ? " accepting" : "")}
      aria-label={t("File inventory")}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(resultDragType)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (
          !(e.relatedTarget instanceof Node) ||
          !e.currentTarget.contains(e.relatedTarget)
        )
          setOver(false);
      }}
      onDrop={(e) => {
        setOver(false);
        const id = e.dataTransfer.getData(resultDragType);
        if (id) {
          e.preventDefault();
          onResultDrop(id);
        }
      }}
    >
      <div className="sectionhead">
        <h2>
          <Icon kind="folder" size={24} />
          {t("Inventory")}
        </h2>
        <div className="folder-controls">
          <select
            aria-label={t("Inventory location")}
            title={inventory.folder}
            value=""
            onChange={(e) => {
              setPage(0);
              setSearch("");
              onFolder(e.target.value);
            }}
          >
            <option value="" hidden>
              {folderLabel}
            </option>
            <option value="desktop">{t("Desktop")}</option>
            <option value="examples">{t("Examples")}</option>
            <option value="folder">{t("Choose folder…")}</option>
          </select>
          <button
            className="refresh"
            aria-label={t("Refresh inventory")}
            title={t("Refresh inventory")}
            onClick={() => onFolder("inventory")}
          >
            ↻
          </button>
        </div>
      </div>
      <div className="bag-grid" aria-label={t("18 square inventory slots")}>
        {Array.from({ length: pageSize }, (_, i) => {
          const f = slots[i];
          if (!f)
            return <span className="tile vacant" key={i} aria-hidden="true" />;
          const isReport = f.kind === "report";
          const ext = f.name.split(".").at(-1)?.toUpperCase();
          return (
            <button
              key={i}
              className={
                "tile filetile" +
                (isReport ? " report-item" : "") +
                (onBatch && selected.includes(f.name) ? " in-batch" : "") +
                (usedNames
                  ? usedNames.has(f.name)
                    ? " used-source"
                    : " other-source"
                  : "")
              }
              autoFocus={f.name === revealName}
              draggable
              title={
                f.name +
                " · " +
                Math.max(1, Math.ceil(f.size / 1024)) +
                " KB · " +
                t(isReport ? "Open report" : "Click or drag to the workbench")
              }
              aria-label={f.name}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData("application/x-onepagebi", f.name);
                if (onBatch && selected.includes(f.name))
                  e.dataTransfer.setData(
                    "application/x-onepagebi-list",
                    JSON.stringify(selected),
                  );
              }}
              onDragEnd={() => {
                if (onBatch) {
                  setPicked([]);
                  setAnchor("");
                }
              }}
              onClick={(e) => {
                if (onBatch && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                  const a = files.findIndex((x) => x.name === anchor),
                    b = files.findIndex((x) => x.name === f.name);
                  if (e.shiftKey && a >= 0)
                    setPicked([
                      ...new Set([
                        ...selected,
                        ...files
                          .slice(Math.min(a, b), Math.max(a, b) + 1)
                          .map((x) => x.name),
                      ]),
                    ]);
                  else
                    setPicked(
                      selected.includes(f.name)
                        ? selected.filter((n) => n !== f.name)
                        : [...selected, f.name],
                    );
                  setAnchor(f.name);
                  return;
                }
                setPicked([]);
                setAnchor(f.name);
                if (isReport) onReport(f.name);
                else onLoad(f.name);
              }}
            >
              <span className="item-ext">{isReport ? "BI" : ext}</span>
              <Icon
                kind={isReport ? "chart" : ext === "XLSX" ? "workbook" : "file"}
                size={36}
              />
              <b>
                {isReport
                  ? f.name
                      .replace(/\.onepagebi\.html$/i, "")
                      .replace(/^BI-/, "")
                  : f.name.replace(/\.[^.]+$/, "")}
              </b>
            </button>
          );
        })}
      </div>
      <div className="bagfoot">
        {onBatch && selected.length > 0 && (
          <button
            className="textbtn"
            onClick={() => {
              onBatch(selected);
              setPicked([]);
            }}
          >
            {t("Add selected ({count})", { count: selected.length })}
          </button>
        )}
        <span>
          {files.length
            ? t("Items: {count} · Click an item to open it", {
                count: files.length,
              })
            : search
              ? t("No matching files")
              : t("No data files or marked reports")}
        </span>
        {!inventory.files.length && (
          <button className="textbtn" onClick={() => onFolder("examples")}>
            {t("Try an example")}
          </button>
        )}
        {(inventory.files.length > pageSize || search) && (
          <input
            aria-label={t("Search filenames")}
            placeholder={t("Filter filenames")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        )}
        {pages > 1 && (
          <div className="pager">
            <button
              aria-label={t("Previous page")}
              disabled={!current}
              onClick={() => setPage(current - 1)}
            >
              ‹
            </button>
            {current + 1}/{pages}
            <button
              aria-label={t("Next page")}
              disabled={current === pages - 1}
              onClick={() => setPage(current + 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
