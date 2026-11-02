import { translator, otherLanguage, switchLabel, type Language } from "./i18n";
import { money } from "./model";
import { summaryPNG } from "./payout-output";
import {
  payoutTotals,
  statusLabels,
  nextSteps,
  type PayoutReport,
  type PayoutCase,
  type Status,
  type Role,
} from "./payout-model";
const el = (id: string) => document.getElementById(id)!;
const report: PayoutReport = JSON.parse(el("dataset").textContent!);
let lang: Language = document.documentElement.lang === "zh-CN" ? "zh-CN" : "en",
  page = 0;
const filter = el("filter") as HTMLSelectElement,
  search = el("search") as HTMLInputElement;
const totals = payoutTotals(report.cases);
const statuses = Object.keys(statusLabels) as Status[];
function matching() {
  const q = search.value.trim().toLowerCase(),
    mode = filter.value;
  return report.cases.filter(
    (c) =>
      (mode === "all" ||
        (mode === "issues"
          ? c.status !== "matched" && c.status !== "bankOnly"
          : c.status === mode)) &&
      (!q ||
        [...c.settlement, ...c.bank].some(
          (r) => r.reference.toLowerCase().includes(q) || r.date.includes(q),
        )),
  );
}
function difference(c: PayoutCase) {
  return c.status === "difference" || c.status === "matched"
    ? c.bank[0].cents - c.settlement[0].cents
    : null;
}
function paintRows() {
  const t = translator(lang),
    rows = matching(),
    size = 35,
    totalPages = Math.max(1, Math.ceil(rows.length / size));
  page = Math.min(page, totalPages - 1);
  el("scope").textContent = t("Cases shown: {count}", { count: rows.length });
  const container = el("cases");
  container.replaceChildren();
  for (const c of rows.slice(page * size, (page + 1) * size)) {
    const box = document.createElement("details"),
      title = document.createElement("summary"),
      delta = difference(c);
    const key =
      c.settlement[0]?.reference || c.bank[0]?.reference || t("(blank)");
    title.textContent = [
      t(statusLabels[c.status]),
      key,
      delta !== null
        ? t("Bank minus expected") + " " + money(delta, lang)
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    box.append(title);
    const reason = document.createElement("p");
    reason.textContent = t(c.reason) + " · " + t(nextSteps[c.status]);
    box.append(reason);
    if (c.candidateRows) {
      const p = document.createElement("p");
      p.textContent =
        t("Possible bank rows (first five of {count}): {rows}", {
          count: c.candidateCount!,
          rows: c.candidateRows.join(", "),
        }) +
        " · " +
        report.bank.name +
        " / " +
        report.bank.sheet;
      box.append(p);
    }
    for (const role of ["settlement", "bank"] as const) {
      const src = report[role];
      for (const row of c[role]) {
        const p = document.createElement("p");
        p.textContent = [
          t(role === "bank" ? "Bank statement" : "Platform payouts"),
          src.name + " / " + src.sheet,
          t("Row {row}", { row: row.row }),
          row.date,
          row.reference || "—",
          money(row.cents, lang) + " " + report.currency,
        ].join(" · ");
        box.append(p);
      }
    }
    container.append(box);
  }
  if (!rows.length) container.textContent = t("No cases in this view.");
  el("page").textContent = page + 1 + " / " + totalPages;
  (el("prev") as HTMLButtonElement).disabled = page === 0;
  (el("next") as HTMLButtonElement).disabled = page + 1 === totalPages;
}
function localize() {
  const t = translator(lang),
    mode = filter.value || "issues";
  document.documentElement.lang = lang;
  document.title = t("Payout check") + " · One Page BI";
  el("title").textContent = t("Payout check");
  el("lang").textContent = switchLabel(lang);
  el("png").textContent = t("Save summary PNG");
  el("csv").textContent = t("Export visible cases as CSV");
  el("sources").textContent = [
    report.settlement.name,
    report.bank.name,
    report.currency,
    new Date(report.created).toLocaleString(lang),
  ].join(" · ");
  el("hint").textContent =
    t(
      "Bank-only rows may be unrelated activity. Pending amounts are not confirmed losses.",
    ) +
    " " +
    t(
      "Click a case to inspect the original rows. This HTML contains mapped transaction details.",
    );
  search.placeholder = t("Search reference or date");
  search.setAttribute("aria-label", search.placeholder);
  filter.setAttribute("aria-label", t("Case status"));
  filter.replaceChildren(
    new Option(t("Payout exceptions"), "issues"),
    new Option(t("All cases"), "all"),
    ...statuses.map((s) => new Option(t(statusLabels[s]), s)),
  );
  filter.value = mode;
  const cards = el("cards");
  cards.replaceChildren();
  for (const [label, value] of [
    [t("Expected positive payouts"), money(totals.expected, lang)],
    [t("Confirmed receipts"), money(totals.confirmed, lang)],
    [t("Payout exceptions"), String(totals.issues)],
    [t("Unlinked bank rows"), String(totals.bankOnly)],
  ]) {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = label;
    const b = document.createElement("b");
    b.textContent = value;
    card.append(b);
    cards.append(card);
  }
  paintRows();
}
function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}
el("csv").onclick = () => {
  const t = translator(lang);
  const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const safe = (s: string) => (/^[\s]*[=+@-]|^[\t\r\n]/.test(s) ? "'" + s : s);
  const lines = [
    [
      t("Case status"),
      t("Reason"),
      t("Source"),
      t("File"),
      t("Worksheet"),
      t("Row"),
      t("Date"),
      t("Settlement reference"),
      t("Signed amount"),
      t("Currency code"),
      t("Case"),
      t("Possible bank row numbers"),
      t("Bank minus expected"),
      t("Next action"),
    ]
      .map(quote)
      .join(","),
  ];
  matching().forEach((c) => {
    let first = true;
    const caseID = c.settlement.length
      ? "P" + c.settlement[0].row
      : "B" + c.bank[0].row;
    const delta = difference(c);
    for (const role of ["settlement", "bank"] as Role[])
      for (const r of c[role]) {
        const src = report[role];
        lines.push(
          [
            t(statusLabels[c.status]),
            t(c.reason),
            t(role === "bank" ? "Bank statement" : "Platform payouts"),
            safe(src.name),
            safe(src.sheet),
            String(r.row),
            r.date,
            safe(r.reference),
            (r.cents / 100).toFixed(2),
            report.currency,
            caseID,
            (c.candidateRows ?? []).join(" "),
            first && delta !== null ? (delta / 100).toFixed(2) : "",
            t(nextSteps[c.status]),
          ]
            .map(quote)
            .join(","),
        );
        first = false;
      }
  });
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  download(url, "OnePageBI-payout-cases.csv");
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
el("png").onclick = () =>
  download(summaryPNG(report, lang), "OnePageBI-payout-summary.png");
el("lang").onclick = () => {
  lang = otherLanguage(lang);
  localize();
};
el("prev").onclick = () => {
  if (page > 0) page--;
  paintRows();
};
el("next").onclick = () => {
  page++;
  paintRows();
};
filter.onchange = search.oninput = () => {
  page = 0;
  paintRows();
};
localize();
