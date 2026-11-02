import type { Language, Message } from "./i18n";
export type Field = "date" | "amount" | "order" | "category" | "currency";
export type Mapping = Record<Field, number | null>;
export interface Sale {
  row: number;
  date: string;
  cents: number;
  order: string | null;
  category: string | null;
}
export interface Report {
  name: string;
  sheet: string;
  created: string;
  unit: string;
  rows: Sale[];
  hasOrders: boolean;
  hasCategories: boolean;
}
export const fields: {
  key: Field;
  title: Message;
  required?: boolean;
  aliases: string[];
}[] = [
  {
    key: "date",
    title: "Sales date",
    required: true,
    aliases: ["销售日期", "日期", "订单日期", "date", "salesdate", "orderdate"],
  },
  {
    key: "amount",
    title: "Line amount",
    required: true,
    aliases: [
      "销售额",
      "销售金额",
      "金额",
      "amount",
      "sales",
      "revenue",
      "salesamount",
      "lineamount",
    ],
  },
  {
    key: "order",
    title: "Order ID",
    aliases: ["订单编号", "订单号", "订单ID", "orderid", "orderno"],
  },
  {
    key: "category",
    title: "Sales category",
    aliases: ["品类", "产品类别", "类别", "category", "productcategory"],
  },
  {
    key: "currency",
    title: "Currency code",
    aliases: ["币种", "货币", "currency", "currencycode"],
  },
];
export function suggest(headers: string[]): Mapping {
  const key = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
  return Object.fromEntries(
    fields.map((f) => {
      const hits = headers.flatMap((h, i) =>
        f.aliases.some((a) => key(a) === key(h)) ? [i] : [],
      );
      return [f.key, hits.length === 1 ? hits[0] : null];
    }),
  ) as Mapping;
}
export function metrics(rows: Sale[], hasOrders: boolean) {
  let total = 0;
  const orders = new Set<string>(),
    months = new Map<string, number>(),
    categories = new Map<string | null, number>();
  for (const r of rows) {
    total += r.cents;
    if (r.order !== null) orders.add(r.order);
    const month = r.date.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + r.cents);
    categories.set(r.category, (categories.get(r.category) ?? 0) + r.cents);
  }
  const count = hasOrders ? orders.size : null;
  const average = count
    ? Math.sign(total) * Math.floor((Math.abs(total) * 2 + count) / (2 * count))
    : null;
  return {
    total,
    count,
    average,
    lines: rows.length,
    months: [...months].sort(([a], [b]) => a.localeCompare(b)),
    categories: [...categories].sort(
      (a, b) => b[1] - a[1] || (a[0] ?? "").localeCompare(b[0] ?? "", "zh-CN"),
    ),
  };
}
export const money = (cents: number, language: Language = "en") =>
  (cents / 100).toLocaleString(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const definitions = {
  total: "Sum of line amounts, including negative returns.",
  count: "Distinct order IDs within the current filters.",
  average:
    "Filtered sales divided by distinct orders, rounded to the nearest cent.",
  lines: "Number of valid sales lines within the current filters.",
} as const;
