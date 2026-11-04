import { business, type Business } from "./catalog";
import { metrics, money, type Sale, type Report } from "./model";
import { translator, type Language, type Message } from "./i18n";
export function businessDashboard(
  id: Business,
  r: Report,
  rows: Sale[],
  language: Language,
) {
  const t = translator(language),
    m = metrics(rows, false),
    fmt = (n: number) => money(n, language),
    groups = m.categories.map(([k, n]): [string, number] => [k ?? "—", n]),
    baseline = rows.reduce((s, r) => s + (r.basis ?? 0), 0);
  const cards: [string, string][] = [];
  const add = (key: Message, value: string) => cards.push([t(key), value]);
  const panel = (
    title: Message,
    items: [string, number][],
    subtitle: Message,
  ) => ({
    count: false,
    title: t(title),
    items,
    subtitle: t(subtitle),
    empty: t("No rows match the filters"),
  });
  const panels: [ReturnType<typeof panel>, ReturnType<typeof panel>] = [
    panel("Monthly amount", m.months.slice(-6), "Latest 6 recorded months"),
    panel("Amount by group", groups.slice(0, 6), "Six largest groups"),
  ];
  const totalClass = (k: string) =>
    rows.reduce((s, r) => s + (r.accountClass === k ? r.cents : 0), 0);
  if(id==="customerShare"||id==="supplierShare"){const proportion=(n:number)=>m.total>0&&groups.every(([,v])=>v>=0)?(100*n/m.total).toFixed(1)+"%":"—";add("Largest share",proportion(groups[0]?.[1]??0));add("Top three share",proportion(groups.slice(0,3).reduce((n,v)=>n+v[1],0)));add(business[id].amount,fmt(m.total));add("Groups",String(groups.length));}
  else if(id==="stockValue"){add("Carrying value",fmt(m.total));add("Locations",String(groups.length));add("SKUs",String(new Set(rows.map(x=>x.order)).size));add("Rows",String(rows.length));const skus=new Map<string,number>();for(const r of rows)skus.set(r.order!,r.cents+(skus.get(r.order!)??0));panels[0]=panel("Value by location",groups.slice(0,6),"Available in this view");panels[1]=panel("SKUs",[...skus].sort((a,b)=>b[1]-a[1]).slice(0,6),"Six largest groups");}
  else if (id === "reorder") {
    const low = rows.filter((r) => r.cents > 0);
    add("Suggested quantity", fmt(m.total));
    add("Items to replenish", String(low.length));
    add("SKUs", String(new Set(low.map((r) => r.order)).size));
    add("Locations", String(new Set(low.map((r) => r.category)).size));
    const ranks = new Map<string, number>();
    for (const r of low)
      ranks.set(r.order!, (ranks.get(r.order!) ?? 0) + r.cents);
    panels[0] = panel(
      "Required by SKU",
      [...ranks].sort((a, b) => b[1] - a[1]).slice(0, 6),
      "Available in this view",
    );
    panels[1] = panel(
      "Quantity by location",
      groups.filter(([, n]) => n > 0).slice(0, 6),
      "Available in this view",
    );
  } else if (id === "pipeline") {
    add("Open deal amount", fmt(baseline));
    add("Weighted value", fmt(m.total));
    add("Opportunities", String(rows.length));
    add("Groups", String(groups.length));
    const byStage = new Map<string, number>();
    for (const r of rows)
      byStage.set(r.category!, (byStage.get(r.category!) ?? 0) + r.basis!);
    panels[0] = panel(
      "Open value by stage",
      [...byStage].sort((a, b) => b[1] - a[1]).slice(0, 6),
      "Available in this view",
    );
    panels[1] = panel(
      "Weighted value by stage",
      groups.slice(0, 6),
      "Available in this view",
    );
  } else if (id === "repeat") {
    const orders = new Map<string, { customer: string; total: number }>();
    for (const row of rows) {
      const order = orders.get(row.order!) ?? {
        customer: row.category!,
        total: 0,
      };
      order.total += row.cents;
      orders.set(row.order!, order);
    }
    const customers = new Map<string, number>();
    let count = 0;
    for (const { customer, total } of orders.values())
      if (total > 0) {
        customers.set(customer, (customers.get(customer) ?? 0) + 1);
        count++;
      }
    const repeat = [...customers.values()].filter((n) => n >= 2).length;
    add("Repeat customers", String(repeat));
    add("Buying customers", String(customers.size));
    add(
      "Repeat rate",
      customers.size ? ((100 * repeat) / customers.size).toFixed(1) + "%" : "—",
    );
    add("Positive-net orders", String(count));
    panels[1] = {
      ...panel(
        "Orders by customer",
        [...customers].sort((a, b) => b[1] - a[1]).slice(0, 6),
        "Available in this view",
      ),
      count: true,
    };
  } else if (id === "trial") {
    add("Debits", fmt(baseline));
    add("Credits", fmt(rows.reduce((s, r) => s + r.credit!, 0)));
    add(
      "Closing debits",
      fmt(rows.reduce((s, r) => s + Math.max(0, r.cents), 0)),
    );
    add(
      "Closing credits",
      fmt(rows.reduce((s, r) => s + Math.max(0, -r.cents), 0)),
    );
    panels[0] = panel(
      "Closing balance",
      groups.slice(0, 6),
      "Available in this view",
    );
  } else if (id === "income" || id === "position") {
    const names: Message[] =
      id === "income"
        ? ["Income", "Expenses"]
        : ["Assets", "Liabilities", "Equity"];
    const keys =
      id === "income"
        ? ["income", "expense"]
        : ["asset", "liability", "equity"];
    const amounts = keys.map(totalClass);
    names.forEach((k, i) => add(k, fmt(amounts[i])));
    add(
      id === "income" ? "Period result" : "Difference",
      fmt(amounts.slice(1).reduce((n, v) => n - v, amounts[0])),
    );
    if (id === "income") add("Rows", String(rows.length));
    panels[0] = panel(
      "Account class",
      names.map((n, i) => [t(n), amounts[i]]),
      "Available in this view",
    );
  } else if (id === "budget") {
    add("Budget amount", fmt(baseline));
    add("Actual amount", fmt(m.total));
    add("Variance", fmt(m.total - baseline));
    add("Groups", String(groups.length));
    panels[0] = panel(
      "Variance",
      rows
        .map((r): [string, number] => [r.category!, r.cents - r.basis!])
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 6),
      "Available in this view",
    );
  } else if (id === "margin") {
    add("Gross profit", fmt(m.total));
    add("Sales amount", fmt(baseline));
    add("Cost of goods sold", fmt(baseline - m.total));
    add(
      "Gross margin",
      baseline > 0 ? ((100 * m.total) / baseline).toFixed(2) + "%" : "—",
    );
  } else if (id === "ar" || id === "ap") {
    const buckets = [0, 0, 0, 0, 0];
    for (const row of rows) buckets[row.bucket!] += row.cents;
    add("Outstanding", fmt(m.total));
    add("Overdue", fmt(m.total - buckets[0]));
    add("Not yet due", fmt(buckets[0]));
    add("Rows", String(rows.length));
    const labels: Message[] = [
      "Current",
      "1–30 days",
      "31–60 days",
      "61–90 days",
      "Over 90 days",
    ];
    panels[0] = panel(
      "Age by due date",
      buckets.map((n, i) => [t(labels[i]), n]),
      "Aging date is the source snapshot date.",
    );
  } else if (id === "stock") {
    add("Units on hand", fmt(m.total));
    add("SKUs", String(new Set(rows.map((x) => x.order)).size));
    add("Locations", String(groups.length));
    add("Negative positions", String(rows.filter((x) => x.cents < 0).length));
    panels[0] = panel(
      "Quantity by location",
      groups.slice(0, 6),
      "Available in this view",
    );
    const skus = new Map<string, number>();
    for (const row of rows)
      skus.set(row.order!, row.cents + (skus.get(row.order!) ?? 0));
    panels[1] = panel(
      "SKUs",
      [...skus].sort((a, b) => b[1] - a[1]).slice(0, 6),
      "Available in this view",
    );
  } else if (id === "journal") {
    add("Debits", fmt(baseline));
    add("Credits", fmt(baseline - m.total));
    add("Net debit", fmt(m.total));
    add("Rows", String(rows.length));
    panels[1] = panel(
      "Account movement",
      groups.slice(0, 6),
      "Available in this view",
    );
  } else {
    add(business[id].amount, fmt(m.total));
    add("Groups", String(groups.length));
    add("Largest group", groups[0]?.[0] ?? "—");
    add("Rows", String(rows.length));
  }
  return { cards, panels };
}
