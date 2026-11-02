import {
  layout,
  fieldLabel,
  type Use,
  type Kind,
  type Binding,
  type Layout,
  type Material,
} from "./materials";
import { fieldSpec, isBusiness } from "./catalog";
import { usesFor } from "./questions";
import type { Message } from "./i18n";
function missingFields(kind: Kind, l: Layout): Message[] {
  const c = l.columns;
  const out: Message[] = [];
  const required = (key: keyof typeof c) => {
    if (c[key] == null) out.push(fieldLabel(l.use, key));
  };
  if (isBusiness(l.use)) {
    for (const key of Object.keys(fieldSpec(l.use)) as (keyof typeof c)[]) {
      if (key !== "currency" && !(l.use === "margin" && key === "category"))
        required(key);
    }
    return out;
  }
  if (l.use !== "lines") required("date");
  if (l.use === "lines" || l.use === "header" || kind === "orders")
    required("order");
  if (l.use === "settlement" || l.use === "bank") required("reference");
  if (l.use === "sales" || l.use === "lines") {
    if (c.amount === null && (c.quantity === null || c.price === null))
      out.push("Line amount");
  }
  if (l.use === "settlement") required("amount");
  if (
    (l.use === "bank" || l.use === "cashflow") &&
    c.amount === null &&
    (c.debit === null || c.credit === null)
  )
    out.push("Signed amount");
  return out;
}
export function missingGuide(pool: Material[], kind: Kind) {
  const rows: { part: Binding; missing: Message[]; known: number }[] = [];
  for (const m of pool)
    for (const view of m.views) {
      if (!view.table) continue;
      for (const use of usesFor(kind)) {
        if (view.manual && view.manual.use !== use) continue;
        const l = view.manual ?? layout(view.table, use);
        const missing = missingFields(kind, l),
          known = Object.values(l.columns).filter((i) => i !== null).length;
        rows.push({ part: { material: m, view, layout: l }, missing, known });
      }
    }
  return rows
    .sort(
      (a, b) =>
        Number(!a.known) - Number(!b.known) ||
        a.missing.length - b.missing.length ||
        b.known - a.known,
    )
    .slice(0, 2);
}
export function sourceCurrency(c: import("./materials").Candidate): string {
  let currency = "";
  for (const p of c.parts) {
    const i = p.layout.columns.currency;
    if (i === null) return "";
    for (const row of p.view.table!.lines) {
      const cell = row.cells[i],
        value = (typeof cell === "string" ? cell : String(cell?.v ?? ""))
          .trim()
          .toUpperCase();
      if (!/^[A-Z]{3}$/.test(value) || (currency && value !== currency))
        return "";
      currency = value;
    }
  }
  return currency;
}
