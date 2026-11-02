import { recipes, dashboard } from "./recipes";
import { metrics, money, type Report } from "./model";
import { paint } from "./chart";
import {
  otherLanguage,
  rowCount,
  sourceUnit,
  switchLabel,
  translator,
  type Language,
} from "./i18n";
const r: Report = JSON.parse(document.getElementById("dataset")!.textContent!);
let language: Language =
  document.documentElement.lang === "zh-CN" ? "zh-CN" : "en";
const month = document.querySelector<HTMLSelectElement>("#month")!,
  category = document.querySelector<HTMLSelectElement>("#category")!,
  canvas = document.querySelector("canvas")!;
const cats = [...new Set(r.rows.map((v) => v.category))].sort((a, b) =>
  (a ?? "").localeCompare(b ?? "", language),
);
for (const m of [...new Set(r.rows.map((v) => v.date.slice(0, 7)))].sort())
  month.add(new Option(m, m));
if (r.hasCategories)
  cats.forEach((c, i) => category.add(new Option(c ?? "", String(i))));
else category.disabled = true;
function localize() {
  const t = translator(language);
  document.documentElement.lang = language;
  document.title = t(recipes[r.recipe ?? "sales"].title) + " · One Page BI";
  document.getElementById("month-label")!.textContent = t("Month");
  document.getElementById("category-label")!.textContent = t("Category");
  month.options[0].text = t("All months");
  category.options[0].text = r.hasCategories
    ? t("All categories")
    : t("Category not mapped");
  const blank = cats.indexOf(null);
  if (r.hasCategories && blank >= 0)
    category.options[blank + 1].text = t("(blank category)");
  document.getElementById("reset")!.textContent = t("Reset");
  document.getElementById("png")!.textContent = t("Export current PNG");
  const button = document.getElementById("language")!;
  button.textContent = switchLabel(language);
  button.lang = otherLanguage(language);
  canvas.setAttribute("aria-label", t(recipes[r.recipe ?? "sales"].title));
}
function render() {
  const t = translator(language);
  const rows = r.rows.filter(
    (v) =>
      (!month.value || v.date.startsWith(month.value)) &&
      (!category.value || v.category === cats[Number(category.value)]),
  );
  const selection =
    [month.value, category.value ? category.selectedOptions[0].text : ""]
      .filter(Boolean)
      .join(" · ") || t("All data");
  paint(canvas, r, rows, language, selection);
  if (r.recipe && r.recipe !== "sales") {
    const values = dashboard(r, rows, language).cards.map(
      ([label, value]) => label + " " + value,
    );
    document.getElementById("summary")!.textContent = [
      selection,
      sourceUnit(r.unit, language),
      ...values,
    ].join(" · ");
    return;
  }
  const m = metrics(rows, r.hasOrders);
  document.getElementById("summary")!.textContent = [
    selection,
    rowCount(m.lines, language),
    t("Net sales") +
      " " +
      money(m.total, language) +
      " " +
      sourceUnit(r.unit, language),
    t("Orders") + " " + (m.count ?? t("Unmapped")),
    t("Average order value") +
      " " +
      (m.average === null ? "—" : money(m.average, language)),
  ].join(" · ");
}
month.onchange = render;
category.onchange = render;
document.getElementById("language")!.onclick = () => {
  language = otherLanguage(language);
  localize();
  render();
};
document.getElementById("reset")!.onclick = () => {
  month.value = "";
  category.value = "";
  render();
};
document.getElementById("png")!.onclick = () => {
  const a = document.createElement("a");
  a.download =
    translator(language)(recipes[r.recipe ?? "sales"].title) +
    "_" +
    (month.value || (language === "en" ? "all" : "全部")) +
    ".png";
  a.href = canvas.toDataURL("image/png");
  a.click();
};
localize();
render();
