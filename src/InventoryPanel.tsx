import { useState } from "react";
import type { Inventory } from "./bridge";
import { useLanguage } from "./language";
import { Icon } from "./icons";

interface Props {
  inventory: Inventory;
  onFolder: (method: string) => void;
  onLoad: (name: string) => void;
}
const pageSize = 18;
export function InventoryPanel({ inventory, onFolder, onLoad }: Props) {
  const { t } = useLanguage();
  const [page, setPage] = useState(0),
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
    <section className="inventory" aria-label={t("File inventory")}>
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
          const ext = f.name.split(".").at(-1)?.toUpperCase();
          return (
            <button
              key={i}
              className="tile filetile"
              draggable
              title={
                f.name +
                " · " +
                Math.max(1, Math.ceil(f.size / 1024)) +
                " KB · " +
                t("Click or drag to the workbench")
              }
              aria-label={f.name}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData("application/x-onepagebi", f.name);
              }}
              onClick={() => onLoad(f.name)}
            >
              <span className="item-ext">{ext}</span>
              <Icon kind={ext === "XLSX" ? "workbook" : "file"} size={36} />
              <b>{f.name.replace(/\.[^.]+$/, "")}</b>
            </button>
          );
        })}
      </div>
      <div className="bagfoot">
        <span>
          {files.length
            ? t("Files: {count} · Click or drag to the workbench", {
                count: files.length,
              })
            : search
              ? t("No matching files")
              : t("No CSV or XLSX files")}
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
