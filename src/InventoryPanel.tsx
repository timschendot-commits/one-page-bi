import { useState } from "react";
import type { Inventory } from "./bridge";
import { Icon } from "./icons";

interface Props {
  inventory: Inventory;
  onFolder: (method: string) => void;
  onLoad: (name: string) => void;
}
const pageSize = 18;
export function InventoryPanel({ inventory, onFolder, onLoad }: Props) {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState("");
  const files = inventory.files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(files.length / pageSize)),
    current = Math.min(page, pages - 1);
  const slots = files.slice(current * pageSize, (current + 1) * pageSize);
  const location =
    inventory.folder.split(/[\\/]/).filter(Boolean).at(-1) ?? "桌面";
  const folderLabel =
    location === "examples"
      ? "示例文件夹"
      : location === "Desktop"
        ? "桌面"
        : location;
  return (
    <section className="inventory" aria-label="文件背包">
      <div className="sectionhead">
        <h2>
          <Icon kind="folder" size={24} />
          背包
        </h2>
        <div className="folder-controls">
          <select
            aria-label="背包位置"
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
            <option value="desktop">桌面</option>
            <option value="examples">示例文件夹</option>
            <option value="folder">其他文件夹…</option>
          </select>
          <button
            className="refresh"
            aria-label="刷新背包"
            title="刷新背包"
            onClick={() => onFolder("inventory")}
          >
            ↻
          </button>
        </div>
      </div>
      <div className="bag-grid" aria-label="18 个方形物品槽">
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
                " KB · 点击或拖入合成台"
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
            ? files.length + " 个文件 · 点击或拖入合成台"
            : search
              ? "没有匹配的文件"
              : "没有 CSV / XLSX 文件"}
        </span>
        {!inventory.files.length && (
          <button className="textbtn" onClick={() => onFolder("examples")}>
            使用示例
          </button>
        )}
        {(inventory.files.length > pageSize || search) && (
          <input
            aria-label="搜索文件名"
            placeholder="筛选文件名"
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
              aria-label="上一页"
              disabled={!current}
              onClick={() => setPage(current - 1)}
            >
              ‹
            </button>
            {current + 1}/{pages}
            <button
              aria-label="下一页"
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
