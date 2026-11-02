import {
  business,
  fieldSpec,
  isQuantityReport,
  type Business,
} from "./catalog";
import type { Binding, Columns } from "./materials";
import { raw, dateValue, cents, identifier } from "./input";
import { LocalizedError, errorText } from "./i18n";
import type { Report, Sale } from "./model";
const problem = (en: string, zh: string): never => {
  throw new LocalizedError((l) => (l === "en" ? en : zh));
};
export function businessReport(id: Business, p: Binding, unit: string): Report {
  const tab = p.view.table!,
    c = p.layout.columns,
    seen = new Set<string>(),
    journals = new Map<string, { date: string; balance: number }>();
  const fields = Object.keys(fieldSpec(id)) as (keyof Columns)[];
  for (const k of fields) {
    if (k === "currency" || (id === "margin" && k === "category")) continue;
    if (c[k] === null)
      problem("Map " + fieldSpec(id)[k], "请映射 " + fieldSpec(id)[k]);
  }
  const owners = new Map<string, string>();
  const outletIndex = tab.headers.findIndex((h) =>
    ["store", "storeid", "outletid", "店铺", "门店编号", "门店"].includes(
      h.toLowerCase().replace(/[ _-]/g, ""),
    ),
  );
  let sourceUnit = "",
    cutoff = "",
    absolute = 0;
  const classes = new Set<string>();
  const rows: Sale[] = tab.lines.map((line) => {
    try {
      const cell = (k: keyof Columns) =>
        c[k] === null ? undefined : line.cells[c[k]!];
      const date = dateValue(cell("date"), tab.date1904, p.layout.dmy);
      const category =
        c.category === null ? null : identifier(cell("category"));
      if (c.category !== null && !category)
        problem("Missing group or party.", "分组或往来对象为空。");
      const order = c.order === null ? null : identifier(cell("order"));
      if (c.order !== null && !order)
        problem("Missing record ID.", "记录编号为空。");
      let amount = id === "journal" ? 0 : cents(cell("amount")),
        basis: number | undefined,
        bucket: number | undefined;
      let opening: number | undefined,
        credit: number | undefined,
        accountClass: string | undefined;
      const currency = isQuantityReport(id)
        ? raw(cell("reference"))
        : c.currency === null
          ? unit
          : raw(cell("currency")).toUpperCase();
      if (!currency || (!isQuantityReport(id) && !/^[A-Z]{3}$/.test(currency)))
        problem(
          "Confirm one currency or stock unit.",
          "请确认币种或库存单位。",
        );
      if (
        (sourceUnit && currency !== sourceUnit) ||
        (!isQuantityReport(id) && unit !== "Source units" && unit !== currency)
      )
        problem("Mixed or conflicting units.", "单位或币种冲突。");
      sourceUnit = currency;
      if (isQuantityReport(id) || id === "ar" || id === "ap") {
        const snapshot = isQuantityReport(id)
          ? date
          : dateValue(cell("reference"), tab.date1904, p.layout.dmy);
        if (cutoff && cutoff !== snapshot)
          problem(
            "Different snapshot dates cannot be added.",
            "不能加总多个时点的快照。",
          );
        cutoff = snapshot;
        const key = JSON.stringify([order, category]);
        if (seen.has(key))
          problem(
            "Duplicate snapshot position or invoice.",
            "快照库存项或发票重复。",
          );
        seen.add(key);
        if (!isQuantityReport(id)) {
          if (amount < 0)
            problem(
              "Handle credits separately from open invoices.",
              "贷项与未结发票需分别处理。",
            );
          const days = (Date.parse(cutoff) - Date.parse(date)) / 86400000;
          bucket =
            days <= 0
              ? 0
              : days <= 30
                ? 1
                : days <= 60
                  ? 2
                  : days <= 90
                    ? 3
                    : 4;
        }
      }
      if (
        id === "trial" ||
        id === "income" ||
        id === "position" ||
        id === "budget"
      ) {
        if (cutoff && cutoff !== date)
          problem(
            "Use one reporting period or snapshot.",
            "请使用同一期间或同一快照。",
          );
        cutoff = date;
        if (seen.has(category!))
          problem(
            "Duplicate account or budget group in this period.",
            "同一期间科目或预算分组重复。",
          );
        seen.add(category!);
        if (id === "trial") {
          opening = cents(cell("price"));
          basis = cents(cell("debit"));
          credit = cents(cell("credit"));
          if (basis < 0 || credit < 0 || opening + basis - credit !== amount)
            problem(
              "Opening + debits − credits must equal closing.",
              "期初加借方减贷方须等于期末。",
            );
        }
        if (id === "budget") {
          basis = cents(cell("price"));
        }
        if (id === "income" || id === "position") {
          const code = raw(cell("reference")).toLowerCase();
          const allowed: Record<string, string> =
            id === "income"
              ? {
                  income: "income",
                  revenue: "income",
                  expense: "expense",
                  费用: "expense",
                  收入: "income",
                }
              : {
                  asset: "asset",
                  liability: "liability",
                  equity: "equity",
                  资产: "asset",
                  负债: "liability",
                  权益: "equity",
                };
          if (!Object.hasOwn(allowed, code))
            problem("Unknown account classification.", "科目类别无法核实。");
          accountClass = allowed[code];
          classes.add(accountClass);
        }
      }
      if (id === "reorder") {
        const min = cents(cell("price")),
          target = cents(cell("quantity"));
        if (min < 0 || target < min)
          problem(
            "Target must be at least the nonnegative minimum.",
            "目标库存不能低于最低库存，最低库存须非负。",
          );
        basis = amount;
        amount = amount < min ? target - amount : 0;
      }
      if (id === "repeat") {
        const identity = JSON.stringify([
          category,
          outletIndex < 0 ? null : raw(line.cells[outletIndex]),
        ]);
        if (owners.has(order!) && owners.get(order!) !== identity)
          problem(
            "An order is assigned to multiple customers or stores.",
            "同一订单号对应多个客户或门店。",
          );
        owners.set(order!, identity);
      }
      if (id === "pipeline") {
        if ((cutoff && cutoff !== date) || seen.has(order!))
          problem(
            "Use one snapshot with one row per opportunity.",
            "同一快照内每个商机须只有一行。",
          );
        cutoff = date;
        seen.add(order!);
        if (
          !["open", "active", "在谈", "进行中", "未结"].includes(
            raw(cell("reference")).toLowerCase(),
          )
        )
          problem(
            "Use only explicitly open opportunities.",
            "请只提供明确标记为在谈的商机。",
          );
        const pct = cents(cell("price"));
        if (pct < 0 || pct > 10000 || amount < 0)
          problem(
            "Enter a probability from 0 to 100 and a nonnegative deal amount.",
            "概率须为 0 至 100 的百分数，在谈金额须非负。",
          );
        basis = amount;
        amount = Number((BigInt(amount) * BigInt(pct) + 5000n) / 10000n);
      }
      if (id === "margin") {
        basis = amount;
        const cost = cents(cell("price"));
        if (amount * cost < 0)
          problem("Sales and cost signs conflict.", "销售与成本的正负号冲突。");
        amount -= cost;
      }
      if (id === "journal") {
        const dv = raw(cell("debit")),
          cv = raw(cell("credit"));
        const d = dv ? cents(cell("debit")) : 0,
          cr = cv ? cents(cell("credit")) : 0;
        if (d < 0 || cr < 0 || d > 0 === cr > 0)
          problem(
            "A posting requires one positive debit or credit.",
            "每条分录须有且仅有一侧为正。",
          );
        basis = d;
        amount = d - cr;
        const journal = journals.get(order!) ?? { date, balance: 0 };
        if (journal.date !== date)
          problem(
            "Journal ID spans different posting dates.",
            "同一凭证号跨越多个过账日期。",
          );
        journal.balance += amount;
        journals.set(order!, journal);
      }
      absolute +=
        Math.abs(amount) +
        Math.abs(basis ?? 0) +
        Math.abs(opening ?? 0) +
        Math.abs(credit ?? 0);
      if (absolute > 1e14)
        problem("Amount exceeds precision limit.", "金额超过精度上限。");
      return {
        row: line.n,
        date,
        cents: amount,
        category,
        order,
        basis,
        opening,
        credit,
        accountClass,
        cutoff: cutoff || undefined,
        bucket,
      };
    } catch (e) {
      throw new LocalizedError(
        (lang) =>
          (lang === "en" ? "Row " : "第 ") +
          line.n +
          (lang === "en" ? "" : " 行") +
          " · " +
          errorText(e, lang),
      );
    }
  });
  for (const [key, j] of journals)
    if (j.balance !== 0)
      problem("Unbalanced journal " + key, "凭证借贷不平 " + key);
  if (id === "trial") {
    const sum = (key: "opening" | "basis" | "credit" | "cents") =>
      rows.reduce((n, r) => n + (r[key] ?? 0), 0);
    if (sum("opening") || sum("cents") || sum("basis") !== sum("credit"))
      problem(
        "Trial balance does not balance for this period.",
        "期间试算不平。",
      );
  }
  if (
    (id === "income" && classes.size !== 2) ||
    (id === "position" && classes.size !== 3)
  )
    problem(
      "Supply all required account classes, including explicit zero balances if applicable.",
      "须提供全部相关科目类别；若确为零，请明确提供零余额。",
    );
  if (
    id === "position" &&
    rows.reduce(
      (s, r) => s + (r.accountClass === "asset" ? r.cents : -r.cents),
      0,
    ) !== 0
  )
    problem(
      "Assets do not equal liabilities plus equity.",
      "资产不等于负债加权益。",
    );
  return {
    recipe: id,
    name: p.material.name,
    sheet: p.view.sheet,
    created: new Date().toISOString(),
    unit: sourceUnit,
    rows,
    hasOrders: false,
    hasCategories: c.category !== null,
  };
}
