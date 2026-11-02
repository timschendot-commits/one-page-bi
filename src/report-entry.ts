import { metrics, money, type Report } from "./model";
import { paint } from "./chart";
const r: Report = JSON.parse(document.getElementById("dataset")!.textContent!);
const month = document.querySelector<HTMLSelectElement>("#month")!,
  category = document.querySelector<HTMLSelectElement>("#category")!,
  canvas = document.querySelector("canvas")!;
const cats = [...new Set(r.rows.map((v) => v.category))].sort((a, b) =>
  (a ?? "").localeCompare(b ?? "", "zh-CN"),
);
for (const m of [...new Set(r.rows.map((v) => v.date.slice(0, 7)))].sort())
  month.add(new Option(m, m));
if (r.hasCategories)
  cats.forEach((c, i) =>
    category.add(new Option(c ?? "（品类空白）", String(i))),
  );
else {
  category.options[0].text = "未映射品类";
  category.disabled = true;
}
function render() {
  const rows = r.rows.filter(
    (v) =>
      (!month.value || v.date.startsWith(month.value)) &&
      (!category.value || v.category === cats[Number(category.value)]),
  );
  const selection =
    [month.value, category.value ? category.selectedOptions[0].text : ""]
      .filter(Boolean)
      .join(" · ") || "全部数据";
  paint(canvas, r, rows, selection);
  const m = metrics(rows, r.hasOrders);
  document.querySelector("#summary")!.textContent =
    selection +
    " · " +
    rows.length +
    " 行 · 销售额 " +
    money(m.total) +
    " " +
    r.unit +
    " · 订单数 " +
    (m.count ?? "未映射") +
    " · 平均订单额 " +
    (m.average === null ? "—" : money(m.average));
}
month.onchange = render;
category.onchange = render;
document.getElementById("reset")!.onclick = () => {
  month.value = "";
  category.value = "";
  render();
};
document.getElementById("png")!.onclick = () => {
  const a = document.createElement("a");
  a.download = "销售分析_" + (month.value || "全部") + ".png";
  a.href = canvas.toDataURL("image/png");
  a.click();
};
render();
