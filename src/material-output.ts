import { reportBinding } from "./number-format";
import { isBusiness, fieldSpec } from "./catalog";
import { dateValue, raw, identifier } from "./input";
import { materialCsv } from "./replay";
import { columnsFor, type Candidate, compile, isSales } from "./materials";
import { call } from "./bridge";
import { paint } from "./chart";
import { standalone } from "./report-html";
import { summaryPNG } from "./payout-output";
import { payoutHTML } from "./payout-html";
import { type Language, translator } from "./i18n";
import { recipes } from "./recipes";
import { remember, saveOptions } from "./mapping-memory";
export type Product = ReturnType<typeof compile>;
export function thumbnail(r: Product, lang: Language) {
  if (!isSales(r)) return summaryPNG(r, lang);
  const canvas = document.createElement("canvas");
  paint(canvas, r, r.rows, lang);
  return canvas.toDataURL("image/png");
}
export async function archiveChoice(
  choice: Candidate,
  r: Product,
  language: Language,
) {
  const t = translator(language);
  const [a, b] = choice.parts;
  const sources = choice.parts.map((p) => ({
    name: p.material.name,
    sha256: p.material.hash,
    sheet: p.view.sheet,
    headerRow: p.view.headerRow,
    use: p.layout.use,
    amountRule:
      p.layout.columns.amount !== null
        ? "mapped amount"
        : p.layout.columns.quantity !== null
          ? "whole quantity * unit price - explicit line discount"
          : p.layout.columns.debit !== null
            ? "credit - debit"
            : undefined,
    exportFields: columnsFor[p.layout.use].filter(
      (k) => p.layout.columns[k] !== null,
    ),
    exportLabels: columnsFor[p.layout.use]
      .filter((k) => p.layout.columns[k] !== null)
      .map((k) => (isBusiness(p.layout.use) ? fieldSpec(p.layout.use)[k] : k)),
    preparation: p.view.table!.audit,
    dayFirst: p.layout.dmy,
    decimalComma: p.layout.decimalComma === true,
    description: p.layout.description,
    mapping: Object.fromEntries(
      Object.entries(p.layout.columns).map(([k, i]) => [
        k,
        i === null ? null : p.view.table!.headers[i],
      ]),
    ),
  }));
  const template = {
    appVersion: "0.7.0",
    template: choice.kind,
    version: 2,
    language,
    sources,
    mapping: Object.fromEntries(
      Object.entries(a.layout.columns).map(([k, col]) => [
        k,
        col === null
          ? null
          : { column: col + 1, header: a.view.table!.headers[col] },
      ]),
    ),
    unit: isSales(r) ? r.unit : r.currency,
    rules: choice.periods
      ? "disjoint periods, single currency, per-row source index"
      : choice.kind === "payout"
        ? "unique-reference+exact-cents+positive-credit+0..7-calendar-days"
        : b
          ? "order-id: unique header for every line, identical ID sets"
          : "single-table",
    amountRule: choice.periods ? "see each source" : sources[0].amountRule,
    definitions:
      choice.kind === "payout"
        ? undefined
        : Object.fromEntries(
            Object.entries(recipes[choice.kind].definitions).map(([k, msg]) => [
              k,
              t(msg),
            ]),
          ),
  };
  if (isSales(r) && isBusiness(choice.kind)) {
    const spec = fieldSpec(choice.kind),
      keys = Object.keys(spec).filter(
        (k) => a.layout.columns[k as keyof typeof a.layout.columns] !== null,
      ) as (keyof typeof a.layout.columns)[];
    r.reusable = {
      headers: keys.map((k) => spec[k]),
      rows: reportBinding(a).view.table!.lines.map((line) =>
        keys.map((k) => {
          const c = line.cells[a.layout.columns[k]!];
          return k === "date" || spec[k] === "Snapshot date"
            ? dateValue(c, a.view.table!.date1904, a.layout.dmy)
            : k === "order" || k === "category"
              ? identifier(c)
              : raw(c);
        }),
      ),
    };
  }
  const id = await call<string>("archive", {
    recipe: choice.kind,
    materialToken: a.material.token,
    ...(choice.periods
      ? { periodTokens: choice.parts.map((p) => p.material.token).join(",") }
      : {}),
    ...(b ? { secondToken: b.material.token } : {}),
    template: JSON.stringify(template, null, 2),
    stageSheets: JSON.stringify(choice.parts.map((p) => p.view.sheet)),
    materials: JSON.stringify(choice.parts.map(materialCsv)),
    processed: JSON.stringify(
      isSales(r)
        ? { schemaVersion: 2, unit: r.unit, amountField: "cents", rows: r.rows }
        : r,
    ),
    html: isSales(r) ? standalone(r, language) : payoutHTML(r, language),
    png: thumbnail(r, language).split(",")[1],
    created: r.created,
    rows: isSales(r)
      ? r.rows.length
      : r.cases.reduce((n, c) => n + c.bank.length + c.settlement.length, 0),
    sheet: sources.map((s) => s.sheet).join(" / "),
  });
  for (const p of choice.parts) {
    const scope = "pool." + p.layout.use;
    remember(scope, p.view.table!.headers, p.layout.columns);
    saveOptions(
      scope,
      p.view.table!.headers,
      p.layout.dmy,
      p.layout.description,
    );
  }
  return id;
}
