import { definitions, metrics, money, type Report, type Sale } from "./model";
import { translator, type Language, type Message } from "./i18n";

export const recipes = {
  sales: {
    name: "Sales",
    title: "Sales overview",
    material: "Sales data",
    grain: "One sales line per row",
    guide:
      "Map a sales date and line amount. Order ID, category and currency are optional.",
    parts:
      "Net sales, distinct orders, average order value and sales line count.",
    footer:
      "Returns reduce net sales. Order metrics show — when no order ID is mapped.",
    definitions,
  },
  orders: {
    name: "Order analysis",
    title: "Order analysis",
    material: "Order lines",
    grain: "One order line per row",
    guide:
      "Map a date, line amount and order ID. Repeated IDs are lines of the same order.",
    parts:
      "Distinct orders, average order value, multi-line orders and net sales. Charts show orders by month and the six largest orders.",
    footer:
      "Counts use distinct order IDs within each filter or month. Multi-line orders have at least two visible lines.",
    definitions: {
      count: definitions.count,
      average: definitions.average,
      multi:
        "Number of order IDs with at least two lines in the filtered data.",
      total: definitions.total,
    },
  },
  cashflow: {
    name: "Cash flow",
    title: "Cash flow statement",
    material: "Cash ledger",
    grain: "One posted cash transaction per row",
    guide:
      "Map a transaction date and a signed amount. Receipts are positive and payments are negative. Category and currency are optional.",
    parts:
      "Cash in, cash out, net movement and transaction count. Charts show monthly net movement and spending by category.",
    footer:
      "Cash out is shown as a positive amount. Net movement excludes any opening balance.",
    definitions: {
      inflow: "Sum of positive transaction amounts.",
      outflow: "Absolute sum of negative transaction amounts.",
      net: "Cash in less cash out.",
      lines: "Number of posted transaction lines in the active filters.",
    },
  },
} as const satisfies Record<
  string,
  {
    name: Message;
    title: Message;
    material: Message;
    grain: Message;
    guide: Message;
    parts: Message;
    footer: Message;
    definitions: Record<string, Message>;
  }
>;
export type RecipeId = keyof typeof recipes;
export function exampleName(recipe: RecipeId, language: Language) {
  if (recipe === "cashflow")
    return language === "en" ? "Cashflow-demo.csv" : "收支流水_演示.csv";
  return language === "en" ? "Sales-demo.csv" : "销售明细_演示.csv";
}
export const recipeIds = Object.keys(recipes) as RecipeId[];
type Series = [string, number][];
export function orderMetrics(rows: Sale[]) {
  const orders = new Map<string, { sum: number; lines: number }>();
  const months = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.order === null)
      throw new Error("Order analysis requires an order ID.");
    const group = orders.get(r.order) ?? { sum: 0, lines: 0 };
    group.sum += r.cents;
    group.lines++;
    orders.set(r.order, group);
    const month = r.date.slice(0, 7);
    const ids = months.get(month) ?? new Set<string>();
    ids.add(r.order);
    months.set(month, ids);
  }
  const ranked: Series = [...orders].map(([id, v]): [string, number] => [
    id,
    v.sum,
  ]);
  ranked.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const monthly: Series = [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ids]) => [month, ids.size]);
  return {
    multi: [...orders.values()].filter((group) => group.lines >= 2).length,
    ranked,
    monthly,
  };
}
export function cashMetrics(rows: Sale[]) {
  let inflow = 0,
    outflow = 0;
  const spending = new Map<string | null, number>();
  for (const r of rows) {
    if (r.cents >= 0) {
      inflow += r.cents;
      continue;
    }
    const paid = -r.cents;
    outflow += paid;
    spending.set(r.category, (spending.get(r.category) ?? 0) + paid);
  }
  return {
    inflow,
    outflow,
    net: inflow - outflow,
    spending: [...spending].sort(
      (a, b) => b[1] - a[1] || (a[0] ?? "").localeCompare(b[0] ?? ""),
    ),
  };
}
interface Panel {
  title: string;
  subtitle: string;
  items: Series;
  empty: string;
  count?: boolean;
}
export function dashboard(
  r: Report,
  rows: Sale[],
  lang: Language,
): { cards: [string, string][]; panels: [Panel, Panel] } {
  const t = translator(lang),
    m = metrics(rows, r.hasOrders),
    amount = (v: number) => money(v, lang);
  const categorySeries = (items: [string | null, number][]): Series =>
    items.slice(0, 6).map(([k, v]) => [k ?? t("(blank category)"), v]);
  const left: Panel = {
    title: t("Monthly sales"),
    subtitle: t("Latest 6 months with recorded sales"),
    items: m.months.slice(-6),
    empty: t("No rows match the filters"),
  };
  const right: Panel = {
    title: t("Sales by category"),
    subtitle: t("Top 6 categories by net sales"),
    items: r.hasCategories ? categorySeries(m.categories) : [],
    empty: t(
      r.hasCategories ? "No rows match the filters" : "Category not mapped",
    ),
  };
  const sales: [string, string] = [t("Net sales"), amount(m.total)];
  const orders: [string, string] = [
    t("Orders"),
    m.count === null ? "—" : String(m.count),
  ];
  const average: [string, string] = [
    t("Average order value"),
    m.average === null ? "—" : amount(m.average),
  ];
  if (r.recipe === "orders") {
    const s = orderMetrics(rows);
    return {
      cards: [
        orders,
        average,
        [t("Multi-line orders"), String(s.multi)],
        sales,
      ],
      panels: [
        {
          ...left,
          title: t("Orders by month"),
          subtitle: t("Latest 6 recorded months"),
          items: s.monthly.slice(-6),
          count: true,
        },
        {
          ...right,
          title: t("Largest orders"),
          subtitle: t("Top 6 orders by net value"),
          items: s.ranked.slice(0, 6),
          empty: left.empty,
        },
      ],
    };
  }
  if (r.recipe === "cashflow") {
    const s = cashMetrics(rows);
    return {
      cards: [
        [t("Cash in"), amount(s.inflow)],
        [t("Cash out"), amount(s.outflow)],
        [t("Net movement"), amount(s.net)],
        [t("Transactions"), String(rows.length)],
      ],
      panels: [
        {
          ...left,
          title: t("Monthly net movement"),
          subtitle: t("Latest 6 recorded months"),
        },
        {
          ...right,
          title: t("Spending by category"),
          subtitle: t("Top 6 categories by payments"),
          items: r.hasCategories ? categorySeries(s.spending) : [],
          empty: t(
            r.hasCategories
              ? "No payments in this selection"
              : "Category not mapped",
          ),
        },
      ],
    };
  }
  return {
    cards: [sales, orders, average, [t("Sales lines"), String(m.lines)]],
    panels: [left, right],
  };
}
