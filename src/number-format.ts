import type { Binding } from "./materials";
import { LocalizedError } from "./i18n";
export const numericFields = [
  "amount",
  "debit",
  "credit",
  "discount",
  "quantity",
  "price",
] as const;
// Apply an expressly selected convention to value columns only. Keep the staged snapshot intact.
export function reportBinding(p: Binding): Binding {
  if (!p.layout.decimalComma) return p;
  const tab = p.view.table!;
  const indices = [
    ...new Set(
      numericFields
        .map((k) => p.layout.columns[k])
        .filter((i): i is number => i !== null),
    ),
  ];
  const lines = tab.lines.map((line) => {
    const cells = line.cells.slice();
    for (const i of indices) {
      const cell = cells[i];
      if (typeof cell !== "string" || !cell.trim()) continue;
      const v = cell.trim();
      if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(v))
        throw new LocalizedError(
          (lang) =>
            p.material.name +
            " · " +
            (lang === "en" ? "Row " : "第 ") +
            line.n +
            " · " +
            tab.headers[i] +
            (lang === "en"
              ? " does not use the selected decimal-comma format."
              : " 不符合已选的小数逗号格式。"),
        );
      cells[i] = v.replaceAll(".", "").replace(",", ".");
    }
    return { ...line, cells };
  });
  return {
    ...p,
    view: { ...p.view, table: { ...tab, lines } },
    layout: { ...p.layout, decimalComma: false },
  };
}
