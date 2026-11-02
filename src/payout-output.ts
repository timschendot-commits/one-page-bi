import { translator, type Language } from "./i18n";
import { money } from "./model";
import {
  payoutTotals,
  statusLabels,
  type PayoutReport,
  type Status,
} from "./payout-model";

// Same paper size and palette as the other one-page reports. This export has
// no source names, settlement codes, bank descriptions or transaction rows.
export function summaryPNG(r: PayoutReport, lang: Language) {
  const c = document.createElement("canvas");
  c.width = 1800;
  c.height = 1134;
  const g = c.getContext("2d")!;
  g.scale(1.5, 1.5);
  const t = translator(lang),
    v = payoutTotals(r.cases),
    ink = "#172f29",
    muted = "#566b61",
    green = "#327964";
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  const label = (
    text: string,
    x: number,
    y: number,
    size: number,
    color = ink,
    bold = false,
    width = 1100,
  ) => {
    g.font =
      (bold ? "700 " : "400 ") +
      size +
      'px "Segoe UI","Microsoft YaHei",sans-serif';
    g.fillStyle = color;
    g.fillText(text, x, y, width);
  };
  rect(0, 0, 1200, 756, "#f7f8f2");
  rect(0, 0, 1200, 10, green);
  label(
    "ONE PAGE BI     /     " + t("Payouts").toUpperCase(),
    44,
    55,
    19,
    green,
    true,
  );
  label(t("Payout check"), 44, 118, 49, ink, true);
  label("ONE PAGE     /     01", 885, 109, 18, muted, true);
  label(t("Amount unit") + " " + r.currency, 44, 157, 20, muted);
  const cards = [
    [t("Expected positive payouts"), money(v.expected, lang)],
    [t("Confirmed receipts"), money(v.confirmed, lang)],
    [t("Payout exceptions"), String(v.issues)],
    [t("Unlinked bank rows"), String(v.bankOnly)],
  ];
  cards.forEach(([text, value], i) => {
    const x = 44 + i * 281;
    rect(x, 192, 269, 115, i === 0 ? ink : "#e9eee5");
    label(text, x + 18, 228, 18, i === 0 ? "#cce0cd" : muted, false, 235);
    label(value, x + 18, 278, 32, i === 0 ? "white" : ink, true, 235);
  });
  rect(44, 339, 1112, 311, "white");
  label(t("Case status"), 65, 378, 25, ink, true);
  const statuses: Status[] = [
    "matched",
    "difference",
    "pending",
    "review",
    "bankOnly",
  ];
  const counts: Record<Status, number> = {
    matched: 0,
    difference: 0,
    pending: 0,
    review: 0,
    bankOnly: 0,
  };
  for (const item of r.cases) counts[item.status]++;
  const max = Math.max(1, ...Object.values(counts));
  statuses.forEach((s, i) => {
    const y = 422 + i * 42;
    label(t(statusLabels[s]), 65, y, 18, ink, false, 266);
    rect(355, y - 13, 616, 13, "#edf1eb");
    rect(
      355,
      y - 13,
      (616 * counts[s]) / max,
      13,
      s === "matched" ? green : s === "bankOnly" ? "#99a699" : "#a87d4d",
    );
    label(String(counts[s]), 1000, y, 18, ink, true);
  });
  rect(44, 676, 1112, 1, "#d7ded3");
  label(t("Summary only · no transaction details"), 44, 711, 17, muted);
  label(
    t("Generated") + "  " + new Date(r.created).toLocaleDateString(lang),
    881,
    711,
    16,
    muted,
    false,
    268,
  );
  label(
    t(
      "Bank-only rows may be unrelated activity. Pending amounts are not confirmed losses.",
    ),
    44,
    740,
    15,
    muted,
  );
  return c.toDataURL("image/png");
}
