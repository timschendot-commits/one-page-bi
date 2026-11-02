import React, { useState, useEffect, useRef, type ReactNode } from "react";
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
import "./style.css";

const emptyMap: Mapping = {
  date: null,
  amount: null,
  order: null,
  category: null,
  currency: null,
};
const dateTime = (s: string) =>
  new Date(s).toLocaleString("zh-CN", {
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
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="modalhead">
        <h2>{title}</h2>
        <button aria-label="关闭" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const [tab, setTab] = useState("work"),
    [modal, setModal] = useState(""),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  const [inventory, setInv] = useState<Inventory>({ folder: "", files: [] }),
    [history, setHistory] = useState<History>();
  const [snapshot, setSnap] = useState<{ name: string; token: string } | null>(
      null,
    ),
    [source, setSource] = useState<Source | null>(null),
    [sheet, setSheet] = useState(""),
    [table, setTable] = useState<Table | null>(null);
  const [map, setMap] = useState<Mapping>(emptyMap),
    [unit, setUnit] = useState("原表单位"),
    [report, setReport] = useState<Report | null>(null),
    [id, setId] = useState(""),
    [thumb, setThumb] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [drag, setDrag] = useState(false);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const inv = async (method: string) => {
    setInv(await call<Inventory>(method));
  };
  useEffect(() => {
    void run(() => inv("inventory"));
  }, []);
  const refreshHistory = async () => setHistory(await call<History>("history"));
  function clearOutput() {
    setReport(null);
    setId("");
    setThumb("");
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
    setUnit("原表单位");
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
    const c = document.createElement("canvas");
    paint(c, r, r.rows);
    setReport(r);
    setThumb(c.toDataURL());
    setId("");
    setModal("");
    setNotice("材料齐了，点击右侧成品格合成。");
  }
  async function craft() {
    if (!report || !snapshot || !table) return;
    const r = { ...report, created: new Date().toISOString() };
    const c = document.createElement("canvas");
    paint(c, r, r.rows);
    const png = c.toDataURL("image/png");
    const tpl = {
      appVersion: "0.1.0",
      template: "sales",
      version: 1,
      theme: "field-notes",
      sheet: r.sheet,
      unit: r.unit,
      grain: "一行一条销售明细",
      moneyScale: 2,
      definitions,
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
      html: standalone(r),
      png: png.split(",")[1],
      created: r.created,
      rows: r.rows.length,
      sheet: r.sheet,
    });
    setReport(r);
    setThumb(png);
    setId(archiveId);
    setNotice("合成完成，已存入历史记录。");
  }
  const action = (method: string, archiveId: string) =>
    run(async () => {
      const ok = await call(method, { archiveId });
      if (method === "exportPng" && ok) setNotice("已导出 PNG。");
    });
  const showHistory = () => {
    setModal("");
    setTab("history");
    void run(refreshHistory);
  };
  const openMap = () => {
    if (table) {
      setError("");
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
        {error || notice}
      </div>
    ) : null;
  return (
    <>
      <header className="top">
        <div className="brand">
          <Icon kind="cube" size={35} />
          One Page <b>BI</b>
          <span>V0.1</span>
        </div>
        <nav>
          <button
            className={tab === "work" ? "active" : ""}
            onClick={() => {
              setTab("work");
              setError("");
              setNotice("");
            }}
          >
            工作台
          </button>
          <button
            className={tab === "history" ? "active" : ""}
            onClick={showHistory}
          >
            历史记录
          </button>
        </nav>
        <small>
          <i /> 本地工作空间
        </small>
      </header>
      <main>
        {tab === "history" && <h1>历史记录</h1>}
        {modal !== "mapping" && (error || tab === "history") && status}
        {tab === "history" ? (
          <section className="panel history">
            <div className="panelhead">
              <span>
                <Icon kind="clock" /> 报表档案库
              </span>
              <button onClick={() => run(refreshHistory)}>刷新</button>
            </div>
            <p className="path">{history?.folder}</p>
            {!!history?.skipped && (
              <p>有 {history.skipped} 条损坏的元数据未显示。</p>
            )}
            {history?.items.length ? (
              history.items.map((h) => (
                <article className="histitem" key={h.id}>
                  <Icon kind="chart" size={35} />
                  <div>
                    <strong>{h.source}</strong>
                    <small>
                      {dateTime(h.created)} · {h.sheet} · {h.rows} 行
                    </small>
                  </div>
                  <div className="actions">
                    <button onClick={() => action("report", h.id)}>
                      打开报表
                    </button>
                    <button onClick={() => action("exportPng", h.id)}>
                      导出 PNG
                    </button>
                    <button onClick={() => action("archiveFolder", h.id)}>
                      归档目录
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">
                尚无生成记录。报表合成成功后会出现在这里。
              </div>
            )}
          </section>
        ) : (
          <div className="workcase">
            <aside className="library">
              <h2>模板</h2>
              <div className="bookitem">
                <Icon kind="book" size={43} />
                <b>销售分析</b>
              </div>
              <button className="refbtn" onClick={() => setModal("recipe")}>
                <Icon kind="tree" size={19} />
                配方
              </button>
              <button className="refbtn" onClick={() => setModal("components")}>
                <Icon kind="map" size={19} />
                组件
              </button>
            </aside>
            <section className="bench">
              <h1>报表合成台</h1>
              <div className="craftline">
                <div
                  className={"materials " + (drag ? "over" : "")}
                  aria-label="三乘三材料格"
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
                    else setError("请从背包拖入文件，或点击销售明细格浏览。");
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
                          aria-label="放入销售明细"
                          title={
                            snapshot?.name ?? "从背包拖入，或点击浏览销售明细"
                          }
                          onClick={() => run(() => load())}
                        >
                          <Icon kind="file" size={40} />
                          <b>销售明细</b>
                        </button>
                      );
                    if (i === 4)
                      return (
                        <button
                          key={i}
                          className={
                            "tile material " + (report ? "has-item" : "ghost")
                          }
                          aria-label="核对字段映射"
                          title="核对字段映射"
                          disabled={!table}
                          onClick={openMap}
                        >
                          <Icon kind="map" size={40} />
                          <b>{report ? "已核对" : "字段映射"}</b>
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
                  aria-label={id ? "查看合成的销售报表" : "合成并归档"}
                  title={id ? "打开已生成的销售报表" : "点击合成并自动归档"}
                >
                  <Icon kind="chart" size={54} />
                  <b>{busy ? "处理中" : id ? "销售报表" : "合成"}</b>
                </button>
              </div>
              {source && source.sheets.length > 1 && (
                <label className="sheet">
                  工作表{" "}
                  <select
                    aria-label="工作表"
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
                  {notice ||
                    (report
                      ? "点击成品格合成并归档。"
                      : snapshot
                        ? "点击字段映射格，核对销售明细。"
                        : "从背包拿一份销售明细，放进材料格。")}
                </p>
                {id && (
                  <button
                    className="textbtn"
                    aria-label="再次合成并归档"
                    onClick={() => run(craft)}
                  >
                    再次合成
                  </button>
                )}
              </div>
            </section>
            <section className="preview">
              <h2>成品预览</h2>
              <div className="displayframe">
                {thumb ? (
                  <button
                    className="thumb"
                    aria-label="放大报表预览"
                    onClick={() => setModal("preview")}
                  >
                    <img src={thumb} alt="根据当前销售明细生成的一页报表" />
                  </button>
                ) : (
                  <div className="screenempty">
                    <Icon kind="chart" size={55} />
                    <span>等待销售明细</span>
                  </div>
                )}
              </div>
              {report && (
                <div className="peek">
                  <div>
                    <small>销售额 · {report.unit}</small>
                    <b>{money(total!.total)}</b>
                  </div>
                  <div>
                    <small>订单数</small>
                    <b>{total!.count ?? "—"}</b>
                  </div>
                </div>
              )}
              {id && (
                <div className="prevactions">
                  <button onClick={() => action("report", id)}>
                    打开报表 ↗
                  </button>
                  <button onClick={() => action("exportPng", id)}>
                    导出 PNG
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
          title="核对字段映射"
          onClose={() => {
            setModal("");
            setError("");
          }}
        >
          <p>每行应是一条销售明细。请确认建议列与实际含义一致。</p>
          {source && source.sheets.length > 1 && (
            <label className="sheet">
              工作表{" "}
              <select
                aria-label="工作表"
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
            {snapshot?.name} · {sheet} · {table.lines.length} 条明细
          </small>
          <div className="mapping">
            {fields.map((f) => (
              <label key={f.key}>
                <span>
                  {f.title} <small>{f.required ? "必填" : "选填"}</small>
                </span>
                <select
                  aria-label={f.title}
                  value={map[f.key] ?? ""}
                  onChange={(e) => {
                    setMap({
                      ...map,
                      [f.key]: e.target.value === "" ? null : +e.target.value,
                    });
                    clearOutput();
                    setError("");
                  }}
                >
                  <option value="">{f.required ? "请选择列" : "不使用"}</option>
                  {table.headers.map((h, i) => (
                    <option value={i} key={i}>
                      {h}
                    </option>
                  ))}
                </select>
                <small title="原表第一条明细">
                  {map[f.key] === null
                    ? "—"
                    : cellLabel(table.lines[0].cells[map[f.key]!]) ||
                      "（空白）"}
                </small>
              </label>
            ))}
          </div>
          <label className="sheet">
            金额单位{" "}
            <select
              aria-label="金额单位"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                clearOutput();
              }}
            >
              {["原表单位", "CNY", "MYR", "USD", "SGD", "EUR", "GBP"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
          <p className="help">
            有币种列时自动核对。无币种列时，请确认全表使用同一单位。金额须为行金额，导入前请移除小计和合计行。
          </p>
          {status}
          <div className="modalactions">
            <button
              className="primary"
              onClick={() => run(async () => confirmMap())}
            >
              确认映射并验证
            </button>
          </div>
        </Modal>
      )}
      {(modal === "components" || modal === "recipe") && (
        <Modal
          title={modal === "recipe" ? "销售分析配方" : "报表组件"}
          onClose={() => setModal("")}
        >
          {modal === "recipe" ? (
            <>
              <p>① 选择一份 UTF-8 CSV 或 XLSX 销售明细，第一行为列名。</p>
              <p>
                ②
                映射日期、行销售金额，可补充订单编号、品类和币种。软件不会推算缺失字段。
              </p>
              <p>
                ③ 验证全部行后合成。每次生成独立档案，原始文件可以从归档取回。
              </p>
            </>
          ) : (
            <>
              <p>销售额、不同订单数、平均订单额、有效明细行数。</p>
              <p>
                月度销售额显示最近 6 个有记录的月份；品类按净销售额展示前 6
                类。独立报表支持月份与品类组合筛选。
              </p>
            </>
          )}
          <p className="help">
            V0.1 仅支持单表、单币种。利润、预测、多表关联与 Power BI PBIP
            导出尚未提供。
          </p>
        </Modal>
      )}
      {modal === "preview" && (
        <Modal title="销售分析总览" onClose={() => setModal("")}>
          <img className="largepreview" src={thumb} alt="一页销售分析报表" />
        </Modal>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
