import {
  readSource,
  identifier,
  raw,
  cents,
  dateValue,
  validate,
  type Table,
  type Source,
} from "./input";
import {
  keyName,
  suggest,
  shortOrderHeader,
  type Mapping,
  type Report,
} from "./model";
import { payoutSuggest, preparePayout, type PayoutMap } from "./payout-input";
import { reconcile } from "./payout-model";
import { recall, readOptions } from "./mapping-memory";
import { translator, LocalizedError, errorText, type Message } from "./i18n";
import type { RecipeId } from "./recipes";

export type Kind = RecipeId | "payout";
export type Use =
  | "sales"
  | "cashflow"
  | "settlement"
  | "bank"
  | "header"
  | "lines";
export type Columns = Mapping & {
  reference: number | null;
  quantity: number | null;
  price: number | null;
  discount: number | null;
};
export interface Layout {
  use: Use;
  columns: Columns;
  dmy: boolean;
  description: boolean;
}
export interface Sheet {
  sheet: string;
  headerRow: number;
  table?: Table;
  error?: unknown;
  manual?: Layout;
}
export interface Material {
  token: string;
  name: string;
  hash: string;
  source?: Source;
  views: Sheet[];
  error?: unknown;
  report: boolean;
  inventoryOrigin?: { folder: string; modified: string; size: number };
  origin?: "sales" | "orders" | "cashflow" | "payout";
}
export interface Binding {
  material: Material;
  view: Sheet;
  layout: Layout;
}
export interface Candidate {
  id: string;
  kind: Kind;
  parts: Binding[];
  review: boolean;
  periods?: boolean;
}
export const kinds: Kind[] = ["sales", "orders", "cashflow", "payout"];
export const kindTitles: Record<Kind, Message> = {
  sales: "Sales overview",
  orders: "Order analysis",
  cashflow: "Cash flow statement",
  payout: "Payout check",
};
export const useNames: Record<Use, Message> = {
  sales: "Sales lines",
  cashflow: "Cash ledger",
  settlement: "Platform payouts",
  bank: "Bank statement",
  header: "Order headers",
  lines: "Order items",
};
export const colNames: Record<keyof Columns, Message> = {
  date: "Date",
  amount: "Line amount",
  order: "Order ID",
  category: "Category",
  currency: "Currency code",
  debit: "Debit / money out",
  credit: "Credit / money in",
  reference: "Settlement reference",
  quantity: "Quantity",
  price: "Unit price",
  discount: "Line discount amount",
};
export const columnsFor: Record<Use, (keyof Columns)[]> = {
  sales: [
    "date",
    "amount",
    "quantity",
    "price",
    "discount",
    "order",
    "category",
    "currency",
  ],
  cashflow: ["date", "amount", "debit", "credit", "category", "currency"],
  settlement: ["date", "reference", "amount", "currency"],
  bank: ["date", "reference", "amount", "debit", "credit", "currency"],
  header: ["order", "date", "currency"],
  lines: [
    "order",
    "amount",
    "quantity",
    "price",
    "discount",
    "category",
    "currency",
  ],
};
function problem(key: Message): never {
  throw new LocalizedError((lang) => translator(lang)(key));
}
function column(headers: string[], aliases: string[]) {
  const hits = headers.flatMap((h, i) =>
    aliases.includes(keyName(h)) ? [i] : [],
  );
  return hits.length === 1 ? hits[0] : null;
}
export function layout(table: Table, use: Use): Layout {
  const headers = table.headers,
    role = use === "bank" || use === "settlement" ? use : null;
  const base = recall(
    use === "cashflow" ? "cashflow" : "sales",
    headers,
    suggest(headers, use === "cashflow" ? "cashflow" : "sales"),
  );
  const p = role ? payoutSuggest(headers, role) : null;
  const cols: Columns = {
    ...base,
    reference: null,
    quantity: null,
    price: null,
    discount: null,
  };
  if (role && p) Object.assign(cols, p, { order: null, category: null });
  if (use === "sales" || use === "lines" || use === "header") {
    cols.quantity = column(headers, [
      "quantity",
      "qty",
      "units",
      "数量",
      "销量",
      "销售数量",
    ]);
    cols.price = column(headers, [
      "unitprice",
      "priceperunit",
      "单价",
      "销售单价",
    ]);
    cols.discount = column(headers, [
      "linediscountamount",
      "discountamount",
      "行折扣额",
      "折扣金额",
    ]);
    cols.order ??= column(headers, [
      "ordernumber",
      "订单号码",
      "交易单号",
      "订单编码",
    ]);
    cols.amount ??= column(headers, [
      "linetotal",
      "netlineamount",
      "netlinevalue",
      "行净额",
      "实销金额",
      "行小计",
    ]);
    cols.date ??= column(headers, ["businessdate", "业务日期", "成交日期"]);
  }
  if (use === "cashflow")
    cols.date ??= column(headers, ["bookingdate", "valuedate", "入账日"]);
  for (const k of Object.keys(cols) as (keyof Columns)[])
    if (!columnsFor[use].includes(k)) cols[k] = null;
  const saved = recall("pool." + use, headers, cols);
  const options = readOptions("pool." + use, headers, {
    dmy: false,
    description:
      use === "bank" &&
      saved.reference !== null &&
      [
        "description",
        "transactiondescription",
        "narration",
        "摘要",
        "交易描述",
      ].includes(keyName(headers[saved.reference])),
  });
  return { use, columns: saved, ...options };
}
export function fieldLabel(use: Use, key: keyof Columns): Message {
  if (key === "amount" && (use === "cashflow" || use === "bank"))
    return "Signed amount";
  if (key === "amount" && use === "settlement") return "Net payout";
  return colNames[key];
}
export function getSheet(source: Source, sheet: string, headerRow = 1): Sheet {
  try {
    return { sheet, headerRow, table: source.table(sheet, headerRow) };
  } catch (error) {
    return { sheet, headerRow, error };
  }
}
function extracted(bytes: Uint8Array): {
  source: Source;
  origin: Material["origin"];
} {
  const html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  // Only parse the inert JSON emitted by our offline reports. Never render imported markup.
  const match =
    /<script\s+type="application\/json"\s+id="dataset"\s*>([\s\S]*?)<\/script>/i.exec(
      html,
    );
  if (!match)
    problem("No reusable One Page BI dataset was found in this report.");
  const data = JSON.parse(match[1]);
  const tables = new Map<string, Table>();
  function make(name: string, headers: string[], rows: unknown[][]) {
    if (!rows.length || rows.length > 10000)
      problem("Unsupported or incomplete embedded report data.");
    tables.set(name, {
      sheet: name,
      headers,
      date1904: false,
      lines: rows.map((r, i) => ({
        n: i + 2,
        cells: r.map((v) => {
          if (v == null) return "";
          if (typeof v !== "string" && typeof v !== "number")
            problem("Unsupported or incomplete embedded report data.");
          return String(v);
        }),
      })),
    });
  }
  const numeric = (v: unknown) => {
    if (typeof v !== "number" || !Number.isSafeInteger(v) || Math.abs(v) > 1e14)
      problem("Unsupported or incomplete embedded report data.");
    return (v / 100).toFixed(2);
  };
  const currency = (unit: unknown) =>
    typeof unit === "string" && /^[A-Z]{3}$/.test(unit) ? unit : null;
  if (Array.isArray(data.cases) && currency(data.currency)) {
    for (const role of ["settlement", "bank"] as const) {
      const rows: unknown[][] = [];
      for (const c of data.cases) {
        if (!Array.isArray(c[role]))
          problem("Unsupported or incomplete embedded report data.");
        for (const r of c[role])
          rows.push([r.date, r.reference, numeric(r.cents), data.currency]);
      }
      make(
        role,
        role === "bank"
          ? ["Booking date", "Description", "Signed amount", "Currency"]
          : [
              "Settlement date",
              "Bank statement code",
              "Net payout",
              "Currency",
            ],
        rows,
      );
    }
    return {
      source: {
        sheets: [...tables.keys()],
        table: (name) => tables.get(name)!,
      },
      origin: "payout",
    };
  }
  if (
    !Array.isArray(data.rows) ||
    !["sales", "cashflow", "orders"].includes(data.recipe ?? "sales")
  )
    problem("Unsupported or incomplete embedded report data.");
  const cash = data.recipe === "cashflow",
    unit = currency(data.unit);
  const headers = [
    cash ? "Transaction date" : "Sales date",
    cash ? "Signed amount" : "Sales amount",
    ...(data.hasOrders ? ["Order ID"] : []),
    ...(data.hasCategories ? ["Category"] : []),
    ...(unit ? ["Currency"] : []),
  ];
  make(
    "Report data",
    headers,
    data.rows.map((r: Record<string, unknown>) => [
      r.date,
      numeric(r.cents),
      ...(data.hasOrders ? [r.order] : []),
      ...(data.hasCategories ? [r.category] : []),
      ...(unit ? [unit] : []),
    ]),
  );
  return {
    source: { sheets: [...tables.keys()], table: (name) => tables.get(name)! },
    origin: data.recipe ?? "sales",
  };
}
export function inspect(
  token: string,
  name: string,
  hash: string,
  bytes: Uint8Array,
): Material {
  const m: Material = {
    token,
    name,
    hash,
    report: /\.onepagebi\.html$/i.test(name),
    views: [],
  };
  try {
    if (m.report) {
      const r = extracted(bytes);
      m.source = r.source;
      m.origin = r.origin;
    } else m.source = readSource(bytes, name);
    // More sheets are available through the material inspector, without scanning
    // every worksheet of a large workbook on the UI thread.
    m.views = m.source.sheets.slice(0, 6).map((s) => getSheet(m.source!, s));
  } catch (error) {
    m.error = error;
  }
  return m;
}
export function materialHint(v: Sheet): Message {
  if (v.table) {
    if (
      v.table.headers.some((h) => keyName(h).startsWith("lineitem")) &&
      v.table.headers.some((h) =>
        ["total", "refundedamount"].includes(keyName(h)),
      )
    )
      return "This export mixes order totals and product lines. Supply final line values, or one verified net row per order, including refunds.";
    const s = layout(v.table, "sales").columns,
      p = layout(v.table, "settlement").columns,
      b = layout(v.table, "bank").columns;
    if (p.reference !== null && p.amount !== null)
      return "This looks like a settlement file. Add bank transactions with a reference.";
    if (
      b.reference !== null &&
      (b.amount !== null || (b.debit !== null && b.credit !== null))
    )
      return "This looks like a bank statement. Add platform net payouts to check receipts.";
    if (
      s.order !== null &&
      s.date !== null &&
      s.amount === null &&
      s.quantity === null
    )
      return "This looks like an order header. Add order items with the same order IDs.";
    if (
      s.order !== null &&
      s.date === null &&
      (s.amount !== null || (s.quantity !== null && s.price !== null))
    )
      return "These look like order items. Add a header with one date per unique order ID.";
  }
  return "Choose a business meaning and map custom headers below.";
}
export function matches(materials: Material[]): Candidate[] {
  const output: Candidate[] = [],
    headers: Binding[] = [],
    lines: Binding[] = [],
    settlements: Binding[] = [],
    banks: Binding[] = [];
  const add = (kind: Kind, parts: Binding[], review = false, periods = false) =>
    output.push({
      id: JSON.stringify([
        kind,
        periods,
        ...parts.map((p) => [p.material.token, p.view.sheet, p.layout.use]),
      ]),
      kind,
      parts,
      review,
      periods,
    });
  for (const material of materials)
    for (const view of material.views) {
      if (!view.table) continue;
      for (const use of Object.keys(useNames) as Use[]) {
        if (view.manual && use !== view.manual.use) continue;
        const l = view.manual ?? layout(view.table, use),
          c = l.columns,
          b = { material, view, layout: l };
        const tagged = (i: number | null) =>
          i === null ? "" : keyName(view.table!.headers[i]);
        const hasValue =
          c.amount !== null || (c.quantity !== null && c.price !== null);
        const salesSignal =
          c.order !== null ||
          c.price !== null ||
          [
            "salesdate",
            "orderdate",
            "销售日期",
            "订单日期",
            "成交日期",
          ].includes(tagged(c.date)) ||
          [
            "销售额",
            "销售金额",
            "sales",
            "salesamount",
            "revenue",
            "linetotal",
            "lineamount",
            "netlineamount",
            "行净额",
            "实销金额",
          ].includes(tagged(c.amount));
        const cashSignal =
          (c.debit !== null && c.credit !== null) ||
          [
            "signedamount",
            "cashamount",
            "transactionamount",
            "收支金额",
            "交易金额",
            "发生额",
          ].includes(tagged(c.amount)) ||
          [
            "transactiondate",
            "postingdate",
            "bookingdate",
            "交易日期",
            "入账日期",
            "记账日期",
          ].includes(tagged(c.date));
        if (
          use === "sales" &&
          hasValue &&
          c.date !== null &&
          (view.manual || !cashSignal) &&
          (material.origin !== "cashflow" || view.manual)
        ) {
          add(
            "sales",
            [b],
            !view.manual && (!salesSignal || c.amount === null),
          );
          if (c.order !== null && !shortOrderHeader(tagged(c.order)))
            add("orders", [b], !view.manual && c.amount === null);
        }
        if (
          use === "cashflow" &&
          c.date !== null &&
          (c.amount !== null || (c.debit !== null && c.credit !== null)) &&
          (view.manual ||
            cashSignal ||
            (!salesSignal &&
              !material.origin &&
              !view.table.headers.some((h) => /sale|order|销售|订单/i.test(h))))
        )
          add("cashflow", [b], !cashSignal && !view.manual);
        if (
          use === "header" &&
          c.date !== null &&
          c.order !== null &&
          (view.manual ||
            (layout(view.table, "sales").columns.amount === null &&
              layout(view.table, "sales").columns.quantity === null)) &&
          !shortOrderHeader(tagged(c.order))
        )
          headers.push(b);
        if (
          use === "lines" &&
          c.order !== null &&
          hasValue &&
          (view.manual || layout(view.table, "sales").columns.date === null) &&
          !shortOrderHeader(tagged(c.order))
        )
          lines.push(b);
        if (
          use === "settlement" &&
          c.date !== null &&
          c.reference !== null &&
          c.amount !== null
        )
          settlements.push(b);
        if (
          use === "bank" &&
          c.date !== null &&
          c.reference !== null &&
          (c.amount !== null || (c.credit !== null && c.debit !== null))
        )
          banks.push(b);
      }
    }
  const distinct = (a: Binding, b: Binding) =>
    a.material.hash !== b.material.hash || a.view.sheet !== b.view.sheet;
  // Index actual IDs before offering a two-table recipe. A shared-looking column
  // name alone cannot establish a relationship between unrelated businesses.
  const signature = (p: Binding, unique: boolean) => {
    try {
      const ids = p.view.table!.lines.map((row) =>
        identifier(row.cells[p.layout.columns.order!]),
      );
      const distinctIds = new Set(ids);
      if (distinctIds.has("") || (unique && distinctIds.size !== ids.length))
        return null;
      return JSON.stringify([...distinctIds].sort());
    } catch {
      return null;
    }
  };
  const heads = headers.map((h) => ({ h, ids: signature(h, true) }));
  for (const l of lines) {
    const ids = signature(l, false);
    if (ids === null) continue;
    for (const { h, ids: other } of heads)
      if (distinct(l, h) && ids === other) {
        add("sales", [l, h], true);
        add("orders", [l, h], true);
      }
  }
  // Stack only non-overlapping periods, grouped by the verified currency.
  const periods = new Map<
    string,
    { p: Binding; from: string; to: string; orders: boolean; rows: number }[]
  >();
  for (const c of output.filter(
    (c) => c.kind === "sales" && c.parts.length === 1 && !c.review,
  )) {
    try {
      const r = compile(c, "Source units");
      if (!isSales(r)) continue;
      let from = "9999",
        to = "";
      for (const row of r.rows) {
        if (row.date < from) from = row.date;
        if (row.date > to) to = row.date;
      }
      const group = periods.get(r.unit) ?? [];
      group.push({
        p: c.parts[0],
        from,
        to,
        orders: r.hasOrders,
        rows: r.rows.length,
      });
      periods.set(r.unit, group);
    } catch {
      /* Invalid single inputs retain a mapping review path. */
    }
  }
  for (const group of periods.values()) {
    group.sort((a, b) => a.from.localeCompare(b.from));
    const offer = (items: typeof group) => {
      if (
        items.length < 2 ||
        items.length > 9 ||
        items.reduce((n, v) => n + v.rows, 0) > 10000
      )
        return;
      const parts = items.map((v) => v.p);
      add("sales", parts, true, true);
      if (items.every((v) => v.orders)) add("orders", parts, true, true);
    };
    if (
      group.every((v, i) => i === 0 || v.from > group[i - 1].to) &&
      group.length <= 9
    )
      offer(group);
    else
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++)
          if (group[j].from > group[i].to) offer([group[i], group[j]]);
  }
  for (const s of settlements)
    for (const b of banks) if (distinct(s, b)) add("payout", [s, b]);
  return output;
}
function amountFor(t: Table, c: Columns, i: number) {
  const cells = t.lines[i].cells;
  if (c.amount !== null) return cents(cells[c.amount]);
  if (c.price === null || c.quantity === null)
    problem("Map a line amount or both quantity and unit price.");
  const qty = raw(cells[c.quantity]),
    price = cents(cells[c.price]);
  if (!/^[+-]?\d+$/.test(qty) || !Number.isSafeInteger(+qty) || price < 0)
    problem(
      "Derived amounts require whole quantities and nonnegative unit prices.",
    );
  const discount = c.discount === null ? 0 : cents(cells[c.discount]);
  const gross = Number(qty) * price;
  if (
    !Number.isSafeInteger(gross) ||
    discount < 0 ||
    discount > Math.max(0, gross)
  )
    problem("Invalid line discount or derived amount.");
  return gross - discount;
}
function checked(t: Table, c: Columns) {
  const cols = Object.values(c).filter((n): n is number => n !== null);
  if (
    cols.some((i) => !Number.isInteger(i) || i < 0 || i >= t.headers.length) ||
    new Set(cols).size !== cols.length
  )
    problem("Use a different valid column for each field.");
}
export function compile(candidate: Candidate, unit: string) {
  if (candidate.periods) {
    if (!unit || unit === "Source units")
      problem("Confirm a common currency before combining periods.");
    const reports = candidate.parts.map((p) =>
      compileSingle(candidate.kind as RecipeId, p, unit),
    );
    const seen = new Set<string>();
    let end = "",
      absolute = 0;
    const rows: Report["rows"] = [];
    for (const [i, r] of reports.entries()) {
      const ids = new Set<string>();
      let start = "9999",
        last = "";
      for (const row of r.rows) {
        if (row.date < start) start = row.date;
        if (row.date > last) last = row.date;
        if (row.order !== null) {
          if (seen.has(row.order))
            problem(
              "An order ID repeats across periods. Confirm its identity in the source first.",
            );
          ids.add(row.order);
        }
        absolute += Math.abs(row.cents);
        rows.push({ ...row, sourceIndex: i + 1 } as Report["rows"][number]);
      }
      if (start <= end)
        problem("Overlapping periods cannot be added together automatically.");
      end = last;
      for (const id of ids) seen.add(id);
    }
    if (absolute > 1e14 || rows.length > 10000)
      problem("Combined data exceeds the row or precision limit.");
    return {
      ...reports[0],
      name: reports.map((r) => r.name).join(" + "),
      sheet: "Combined",
      rows,
      hasOrders: reports.every((r) => r.hasOrders),
      hasCategories: reports.every((r) => r.hasCategories),
    };
  }
  if (candidate.kind !== "payout" && candidate.parts.length === 1)
    return compileSingle(candidate.kind, candidate.parts[0], unit);
  const [a, b] = candidate.parts;
  const t = a.view.table!,
    c = a.layout.columns;
  checked(t, c);
  if (b) checked(b.view.table!, b.layout.columns);
  if (candidate.kind === "payout") {
    const source = (x: Binding, role: "settlement" | "bank") =>
      preparePayout(
        x.view.table!,
        x.layout.columns as PayoutMap,
        x.material.name,
        role,
        unit,
        x.layout.dmy,
      );
    return reconcile(
      source(a, "settlement"),
      source(b, "bank"),
      unit,
      b.layout.description,
    );
  }
  return normalizeSales(candidate.kind, a, b, unit);
}
function compileSingle(kind: RecipeId, a: Binding, unit: string): Report {
  const t = a.view.table!,
    c = a.layout.columns;
  checked(t, c);
  if (kind === "cashflow")
    return validate(t, c, a.material.name, unit, kind, a.layout.dmy);
  return normalizeSales(kind, a, undefined, unit);
}
function normalizeSales(
  kind: RecipeId,
  a: Binding,
  b: Binding | undefined,
  unit: string,
): Report {
  const t = a.view.table!,
    c = a.layout.columns;
  if (c.order !== null && shortOrderHeader(t.headers[c.order]))
    problem(
      "Short order IDs may repeat. Map a long or globally unique order ID.",
    );
  if (c.amount === null) {
    for (const part of b ? [a, b] : [a]) {
      const adjustable = part.view.table!.headers.some(
        (name, index) =>
          (part !== a || index !== c.discount) &&
          /discount|折扣|税|tax|运费|shipping|优惠|refund|退款|voucher|fee|手续费/i.test(
            name,
          ),
      );
      if (adjustable)
        problem(
          "Unallocated tax, shipping, fees, discounts or refunds: provide the final line amount.",
        );
    }
  } else if (
    [
      "total",
      "ordertotal",
      "orderamount",
      "grandtotal",
      "subtotal",
      "订单总金额",
      "订单金额",
      "订单总额",
      "整单金额",
      "小计",
      "订单小计",
    ].includes(keyName(t.headers[c.amount]))
  ) {
    const ids =
      c.order === null
        ? []
        : t.lines.map((line) => identifier(line.cells[c.order!]));
    if (
      !ids.length ||
      ids.some((id) => !id) ||
      new Set(ids).size !== ids.length
    )
      problem(
        "An order total needs one row per unique order ID. Use final line values for multi-item orders.",
      );
  }
  if (!b && c.amount !== null)
    return validate(t, c, a.material.name, unit, kind, a.layout.dmy);
  const header = b?.view.table,
    h = b?.layout.columns;
  const lookup = new Map<string, NonNullable<typeof header>["lines"][number]>(),
    seen = new Set<string>();
  if (header && h) {
    for (const line of header.lines) {
      const id = identifier(line.cells[h.order!]);
      if (!id || lookup.has(id))
        problem(
          "Order headers must contain exactly one row per nonblank order ID.",
        );
      lookup.set(id, line);
    }
  }
  for (const part of [a, b])
    if (part) {
      const cols = part.layout.columns,
        ht = part.view.table!.headers;
      if (
        cols.currency === null &&
        ht.some((h) =>
          ["currency", "currencycode", "币种", "货币"].includes(keyName(h)),
        )
      )
        problem(
          "Map the detected currency column to check for mixed currencies.",
        );
      if (cols.order !== null && shortOrderHeader(ht[cols.order]))
        problem(
          "Short order IDs may repeat. Map a long or globally unique order ID.",
        );
    }
  const storeCol = t.headers.findIndex((h) =>
    ["store", "storeid", "outletid", "门店", "门店编号"].includes(keyName(h)),
  );
  const orderStores = new Map<string, string>();
  const canonical = [
    "Sales date",
    "Sales amount",
    ...(c.order !== null ? ["Order ID"] : []),
    ...(c.category !== null ? ["Category"] : []),
    ...(c.currency !== null || (h && h.currency !== null) ? ["Currency"] : []),
  ];
  const provenance: { lineRow: number; headerRow?: number }[] = [];
  const normalized: Table = {
    sheet: t.sheet,
    date1904: false,
    headers: canonical,
    lines: t.lines.map((line, i) => {
      try {
        const id = c.order === null ? null : identifier(line.cells[c.order]);
        const hdr = id !== null ? lookup.get(id) : undefined;
        if (id && storeCol >= 0) {
          const outlet = raw(line.cells[storeCol]);
          if (orderStores.has(id) && orderStores.get(id) !== outlet)
            problem(
              "This order ID occurs in multiple stores. Use a globally unique ID or split by store.",
            );
          orderStores.set(id, outlet);
        }
        if (header && !hdr)
          problem("An order item has no matching order header.");
        if (id) seen.add(id);
        const dt =
          hdr && h
            ? dateValue(hdr.cells[h.date!], header!.date1904, b!.layout.dmy)
            : dateValue(line.cells[c.date!], t.date1904, a.layout.dmy);
        const u =
            c.currency === null
              ? null
              : raw(line.cells[c.currency]).toUpperCase(),
          hu =
            h && h.currency !== null
              ? raw(hdr!.cells[h.currency]).toUpperCase()
              : null;
        if ((u !== null && hu !== null && u !== hu) || u === "" || hu === "")
          problem("Currency is missing or conflicts across joined rows.");
        provenance.push({ lineRow: line.n, headerRow: hdr?.n });
        return {
          n: line.n,
          cells: [
            dt,
            (amountFor(t, c, i) / 100).toFixed(2),
            ...(id === null ? [] : [id]),
            ...(c.category === null ? [] : [raw(line.cells[c.category])]),
            ...(u !== null || hu !== null ? [u ?? hu!] : []),
          ],
        };
      } catch (e) {
        throw new LocalizedError(
          (lang) =>
            a.material.name +
            " / " +
            t.sheet +
            " / " +
            translator(lang)("Row {row}", { row: line.n }) +
            " — " +
            errorText(e, lang),
        );
      }
    }),
  };
  if (seen.size !== lookup.size && header)
    problem(
      "Some order headers have no items. Align the order sets before joining.",
    );
  const report = validate(
    normalized,
    suggest(canonical, kind),
    a.material.name,
    unit,
    kind,
  );
  if (header && b) {
    report.name = a.material.name + " + " + b.material.name;
    report.sheet = t.sheet + " + " + header.sheet;
    report.rows.forEach((row, i) =>
      Object.assign(row, { headerRow: provenance[i].headerRow }),
    );
  }
  return report;
}
export function preflight(c: Candidate): {
  state: "ready" | "confirm" | "blocked";
  error?: unknown;
} {
  try {
    let unit = "Source units";
    if (c.kind === "payout" || c.periods) {
      const observed = new Set<string>();
      for (const p of c.parts) {
        const i = p.layout.columns.currency;
        if (i === null) return { state: "confirm" };
        for (const r of p.view.table!.lines)
          observed.add(raw(r.cells[i]).toUpperCase());
      }
      if (observed.size !== 1 || !Array.from(observed)[0]?.match(/^[A-Z]{3}$/))
        problem("Currency is missing or conflicts across joined rows.");
      unit = [...observed][0];
    }
    compile(c, unit);
    return { state: c.review ? "confirm" : "ready" };
  } catch (error) {
    return { state: "blocked", error };
  }
}
export function isSales(report: ReturnType<typeof compile>): report is Report {
  return "rows" in report;
}
