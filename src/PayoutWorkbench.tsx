import { useState, useRef, useMemo } from "react";
import { call, resultDragType, type Inventory, type Snapshot } from "./bridge";
import { readSource, cellLabel, type Table, type Source } from "./input";
import {
  payoutFields,
  payoutSuggest,
  preparePayout,
  visibleFields,
  type PayoutMap,
} from "./payout-input";
import {
  reconcile,
  payoutTotals,
  type Role,
  type PayoutReport,
} from "./payout-model";
import { payoutHTML } from "./payout-html";
import { summaryPNG } from "./payout-output";
import { recall, remember, readOptions, saveOptions } from "./mapping-memory";
import { keyName, money } from "./model";
import { useLanguage } from "./language";
import { LocalizedError, errorText, translator, type Message } from "./i18n";
import { Icon } from "./icons";
import { Modal } from "./Modal";
import { InventoryPanel } from "./InventoryPanel";
interface Slot {
  token: string;
  hash: string;
  name: string;
  source: Source;
  sheet: string;
  table?: Table;
  map: PayoutMap;
  dmy: boolean;
  description: boolean;
}
interface Props {
  active: boolean;
  inventory: Inventory;
  setInventory: (value: Inventory) => void;
  onFolder: (method: string) => Promise<void>;
}
const roles: Role[] = ["settlement", "bank"];
const roleLabel = (r: Role) =>
  r === "bank" ? "Bank statement" : "Platform payouts";
const prefs = (role: Role) => "payout." + role;
function problem(msg: Message) {
  return new LocalizedError((lang) => translator(lang)(msg));
}
export function PayoutWorkbench({
  active,
  inventory,
  setInventory,
  onFolder,
}: Props) {
  const { t, language } = useLanguage();
  const [slots, setSlots] = useState<Partial<Record<Role, Slot>>>({}),
    [pickName, setPickName] = useState(""),
    [editing, setEditing] = useState<Role | null>(null);
  const [currency, setCurrency] = useState(""),
    [report, setReport] = useState<PayoutReport | null>(null),
    [id, setId] = useState("");
  const [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState<Message | null>(null),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  const [reveal, setReveal] = useState({ name: "", revision: 0 });
  async function run(f: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await f();
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function clear() {
    setId("");
    setReport(null);
    setNotice(null);
    setError(null);
  }
  function update(role: Role, slot: Slot) {
    clear();
    setSlots((prev) => ({ ...prev, [role]: slot }));
  }
  function pickSheet(role: Role, slot: Slot, sheet: string) {
    const reset = { ...slot, sheet, table: undefined };
    update(role, reset);
    const table = slot.source.table(sheet),
      map = recall(
        prefs(role),
        table.headers,
        payoutSuggest(table.headers, role),
      );
    update(role, {
      ...reset,
      table,
      map,
      ...readOptions(prefs(role), table.headers, {
        dmy: false,
        description:
          role === "bank" &&
          map.reference !== null &&
          [
            "description",
            "transactiondescription",
            "narration",
            "摘要",
            "交易描述",
          ].includes(keyName(table.headers[map.reference])),
      }),
    });
  }
  async function load(role: Role, name?: string) {
    const snap = await call<Snapshot | null>(
      name ? "load" : "selectFile",
      name ? { name, role } : { role },
    );
    if (!snap) return;
    clear();
    setSlots((prev) => ({ ...prev, [role]: undefined }));
    if (!name) await onFolder("inventory");
    const source = readSource(
      Uint8Array.from(atob(snap.bytes), (c) => c.charCodeAt(0)),
      snap.name,
    );
    const slot: Slot = {
      token: snap.token,
      name: snap.name,
      hash: snap.sha256,
      source,
      sheet: source.sheets[0],
      map: payoutSuggest([], role),
      dmy: false,
      description: false,
    };
    setEditing(role);
    pickSheet(role, slot, slot.sheet);
  }
  async function craft() {
    const s = slots.settlement,
      b = slots.bank;
    if (!s?.table || !b?.table) return;
    if (!currency) {
      setEditing("bank");
      throw problem("Confirm the common three-letter currency for both files.");
    }
    if (s.hash === b.hash && s.sheet === b.sheet)
      throw problem("The two inputs are the same file and worksheet.");
    const platform = preparePayout(
        s.table,
        s.map,
        s.name,
        "settlement",
        currency,
        s.dmy,
      ),
      bank = preparePayout(b.table, b.map, b.name, "bank", currency, b.dmy);
    const r = reconcile(platform, bank, currency, b.description);
    const mode = (slot: Slot) => ({
      name: slot.name,
      sheet: slot.sheet,
      dayFirst: slot.dmy,
      description: slot.description,
      mapping: Object.fromEntries(
        Object.entries(slot.map).map(([k, i]) => [
          k,
          i === null ? null : slot.table!.headers[i],
        ]),
      ),
    });
    const template = {
      appVersion: "0.3.0",
      recipe: "payout",
      version: 1,
      language,
      currency,
      settlement: mode(s),
      bank: mode(b),
      rules: "unique-reference+exact-cents+positive-credit+0..7-calendar-days",
    };
    const archive = await call<string>("archive", {
      recipe: "payout",
      token: s.token,
      bankToken: b.token,
      processed: JSON.stringify(r),
      template: JSON.stringify(template, null, 2),
      html: payoutHTML(r, language),
      png: summaryPNG(r, language).split(",")[1],
      created: r.created,
      rows: platform.rows.length + bank.rows.length,
      sheet: s.sheet + " / " + b.sheet,
    });
    remember(prefs("settlement"), s.table.headers, s.map);
    remember(prefs("bank"), b.table.headers, b.map);
    saveOptions(prefs("settlement"), s.table.headers, s.dmy, false);
    saveOptions(prefs("bank"), b.table.headers, b.dmy, b.description);
    setId(archive);
    setReport(r);
    setNotice("Check archived. Inspect the exceptions before sharing.");
  }
  async function desktop(value: string) {
    if (!id || value !== id) return;
    const copy = await call<{ name: string; inventory: Inventory }>(
      "putOnDesktop",
      { archiveId: id },
    );
    setInventory(copy.inventory);
    setReveal((x) => ({ name: copy.name, revision: x.revision + 1 }));
    setNotice("Desktop copy ready in your inventory.");
  }
  const edit = editing ? slots[editing] : null,
    totals = report ? payoutTotals(report.cases) : null;
  const message = error ? (
    <div className="feedback bad" role="alert">
      {errorText(error, language)}
    </div>
  ) : null;
  const thumb = useMemo(
    () => (report ? summaryPNG(report, language) : ""),
    [report, language],
  );
  if (!active) return null;
  return (
    <>
      <section className="bench payout-bench">
        <h1>{t("Report workbench")}</h1>
        <div className="craftline">
          <div className="materials" aria-label={t("3 by 3 material grid")}>
            {Array.from({ length: 9 }, (_, i) => {
              if (i !== 3 && i !== 4)
                return (
                  <span key={i} className="tile vacant" aria-hidden="true" />
                );
              const role = roles[i - 3],
                slot = slots[role];
              return (
                <button
                  key={role}
                  className={"tile material " + (slot ? "has-item" : "ghost")}
                  disabled={busy}
                  title={slot?.name ?? t(roleLabel(role))}
                  aria-label={t(roleLabel(role))}
                  onClick={() => {
                    if (slot) {
                      setError(null);
                      setEditing(role);
                    } else void run(() => load(role));
                  }}
                  onDragOver={(e) => {
                    if (
                      e.dataTransfer.types.includes("application/x-onepagebi")
                    ) {
                      e.preventDefault();
                      e.currentTarget.classList.add("over");
                    }
                  }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("over")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("over");
                    const n = e.dataTransfer.getData("application/x-onepagebi");
                    if (n) void run(() => load(role, n));
                  }}
                >
                  <Icon kind={role === "bank" ? "book" : "file"} size={40} />
                  <b>{t(role === "bank" ? "Bank file" : "Payout file")}</b>
                </button>
              );
            })}
          </div>
          <div
            className={
              "recipe-arrow " +
              (slots.bank?.table && slots.settlement?.table ? "ready" : "")
            }
            aria-hidden="true"
          />
          <button
            key={id}
            className={
              "tile result " +
              (slots.bank?.table && slots.settlement?.table ? "ready " : "") +
              (id ? "crafted" : "")
            }
            aria-label={t(id ? "View the finished report" : "Check payouts")}
            disabled={!slots.bank?.table || !slots.settlement?.table || busy}
            draggable={Boolean(id)}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData(resultDragType, id);
            }}
            onClick={() =>
              run(async () => {
                if (id) await call("report", { archiveId: id });
                else await craft();
              })
            }
          >
            <Icon kind="chart" size={54} />
            <b>{t(id ? "Report" : "Craft")}</b>
          </button>
        </div>
        <div className="benchstatus">
          <p className="instruction" role="status">
            {notice
              ? t(notice)
              : t(
                  slots.bank && slots.settlement
                    ? "Both files are ready. Click Craft to check payouts."
                    : "Drop the platform and bank files into their slots.",
                )}
          </p>
          {id && (
            <>
              <button
                className="textbtn"
                onClick={() => run(() => desktop(id))}
              >
                {t("To inventory")}
              </button>
              <button className="textbtn" onClick={() => run(craft)}>
                {t("Craft again")}
              </button>
            </>
          )}
        </div>
        {!editing && message}
      </section>
      <section className="preview">
        <h2>{t("Report preview")}</h2>
        <div className="displayframe">
          {thumb ? (
            <button
              className="thumb"
              aria-label={t("Open detailed report")}
              onClick={() =>
                run(async () => {
                  await call("report", { archiveId: id });
                })
              }
            >
              <img src={thumb} alt={t("Payout check")} />
            </button>
          ) : (
            <div className="screenempty">
              <Icon kind="chart" size={55} />
              <span>{t("Waiting for both files")}</span>
            </div>
          )}
        </div>
        {totals && (
          <>
            <div className="peek">
              <div>
                <small>
                  {t("Confirmed receipts")} · {currency}
                </small>
                <b>{money(totals.confirmed, language)}</b>
              </div>
              <div>
                <small>{t("Payout exceptions")}</small>
                <b>{totals.issues}</b>
              </div>
            </div>
            <div className="prevactions">
              <button
                title={t(
                  "HTML includes transaction details. PNG contains totals only.",
                )}
                onClick={() =>
                  run(async () => {
                    await call("report", { archiveId: id });
                  })
                }
              >
                {t("See exceptions")} ↗
              </button>
              <button
                title={t("Summary only · no transaction details")}
                onClick={() =>
                  run(async () => {
                    await call("exportPng", {
                      archiveId: id,
                      png: thumb.split(",")[1],
                    });
                  })
                }
              >
                {t("Save summary PNG")}
              </button>
            </div>
          </>
        )}
      </section>
      <InventoryPanel
        key={inventory.folder + ":" + reveal.revision}
        inventory={
          inventory.isExamples
            ? {
                ...inventory,
                files: inventory.files.filter(
                  (f) =>
                    f.kind === "report" ||
                    /^(Payouts-demo|Bank-demo|结算单_演示|银行流水_演示)\.csv$/.test(
                      f.name,
                    ),
                ),
              }
            : inventory
        }
        revealName={reveal.name}
        onFolder={(m) => void run(() => onFolder(m))}
        onReport={(name) =>
          void run(async () => {
            await call("inventoryReport", { name });
          })
        }
        onResultDrop={(value) => void run(() => desktop(value))}
        onLoad={(name) => {
          if (inventory.isExamples)
            void run(() =>
              load(
                /^(Bank-demo|银行流水_演示)/.test(name) ? "bank" : "settlement",
                name,
              ),
            );
          else setPickName(name);
        }}
      />
      {pickName && (
        <Modal title={t("Choose a slot")} onClose={() => setPickName("")}>
          <p>{pickName}</p>
          <div className="modalactions">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => {
                  const name = pickName;
                  setPickName("");
                  void run(() => load(role, name));
                }}
              >
                {t(roleLabel(role))}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {editing && edit && (
        <Modal
          title={t(roleLabel(editing)) + " · " + t("Review columns")}
          onClose={() => setEditing(null)}
        >
          <small>{edit.name}</small>
          <p className="help">
            {t(
              "Confirmed mappings are reused for the same headers. Check the sample values each time.",
            )}
          </p>
          <label className="sheet">
            {t("Worksheet")}{" "}
            <select
              value={edit.sheet}
              onChange={(e) =>
                void run(async () => pickSheet(editing, edit, e.target.value))
              }
            >
              {edit.source.sheets.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="sheet">
            {t("Common currency")}{" "}
            <select
              value={currency}
              onChange={(e) => {
                clear();
                setCurrency(e.target.value);
              }}
            >
              <option value="">{t("Confirm currency")}</option>
              {["MYR", "CNY", "SGD", "USD", "EUR", "GBP", "AUD", "HKD"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          {edit.table && (
            <div className="mapping">
              {visibleFields(editing).map((k) => (
                <label key={k}>
                  <span>{t(payoutFields[k])}</span>
                  <select
                    aria-label={t(payoutFields[k])}
                    value={edit.map[k] ?? ""}
                    onChange={(e) =>
                      update(editing, {
                        ...edit,
                        map: {
                          ...edit.map,
                          [k]: e.target.value === "" ? null : +e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">{t("Unused")}</option>
                    {edit.table!.headers.map((h, i) => (
                      <option key={h} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <small>
                    {edit.map[k] === null
                      ? "—"
                      : cellLabel(edit.table!.lines[0].cells[edit.map[k]!])}
                  </small>
                </label>
              ))}
            </div>
          )}
          <label className="sheet">
            <input
              type="checkbox"
              checked={edit.dmy}
              onChange={(e) =>
                update(editing, { ...edit, dmy: e.target.checked })
              }
            />
            {t("Also read DD/MM/YYYY dates")}
          </label>
          {editing === "bank" && (
            <label className="sheet">
              <input
                type="checkbox"
                checked={edit.description}
                onChange={(e) =>
                  update(editing, { ...edit, description: e.target.checked })
                }
              />
              {t("Find whole reference codes in the bank description")}
            </label>
          )}
          <p className="help">
            {t(
              editing === "bank"
                ? "Use a signed amount or map both debit and credit. Whole codes are case-sensitive and separated by spaces, commas, semicolons or pipes."
                : "One row per settlement batch. Map the net bank transfer amount and the bank statement code.",
            )}
          </p>
          {message}
          <div className="modalactions">
            <button onClick={() => void run(() => load(editing))}>
              {t("Replace file…")}
            </button>
            <button className="primary" onClick={() => setEditing(null)}>
              {t("Use these columns")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
