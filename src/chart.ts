import { sourceUnit, translator, type Language } from "./i18n";
import { metrics, money, type Report, type Sale } from "./model";
const ink = "#172f29",
  muted = "#566b61",
  green = "#327964",
  blue = "#608590",
  border = "#d7ded3";
export function paint(
  canvas: HTMLCanvasElement,
  r: Report,
  rows: Sale[],
  language: Language,
  selection = translator(language)("All data"),
) {
  const t = translator(language);
  const w = 1200,
    h = 756;
  canvas.width = w * 1.5;
  canvas.height = h * 1.5;
  const g = canvas.getContext("2d");
  if (!g) throw Error(t("Could not initialize the report canvas."));
  g.scale(1.5, 1.5);
  function rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) {
    g!.fillStyle = color;
    g!.fillRect(x, y, width, height);
  }
  function label(
    s: string,
    x: number,
    y: number,
    size: number,
    color = ink,
    bold = false,
    width = 1080,
  ) {
    g!.font =
      (bold ? "700 " : "400 ") +
      size +
      'px "Segoe UI","Microsoft YaHei",sans-serif';
    g!.fillStyle = color;
    if (g!.measureText(s).width > width) {
      let a = 0,
        b = s.length;
      while (a < b) {
        const m = Math.ceil((a + b) / 2);
        if (g!.measureText(s.slice(0, m) + "…").width <= width) a = m;
        else b = m - 1;
      }
      s = s.slice(0, a) + "…";
    }
    g!.fillText(s, x, y);
  }
  const m = metrics(rows, r.hasOrders);
  rect(0, 0, w, h, "#f7f8f2");
  rect(0, 0, w, 10, green);
  label("ONE PAGE BI     /     SALES SERIES", 44, 55, 19, green, true);
  label(t("Sales overview"), 44, 118, 49, ink, true);
  label("SALES OVERVIEW     /     01", 885, 109, 18, muted, true, 275);
  label(
    selection +
      "   ·   " +
      t("Amount unit") +
      " " +
      sourceUnit(r.unit, language),
    45,
    158,
    20,
    muted,
    false,
    1090,
  );
  const cards = [
    [t("Net sales"), money(m.total, language)],
    [t("Orders"), m.count === null ? "—" : String(m.count)],
    [
      t("Average order value"),
      m.average === null ? "—" : money(m.average, language),
    ],
    [t("Sales lines"), String(m.lines)],
  ];
  cards.forEach(([k, v], i) => {
    const x = 44 + i * 281;
    rect(x, 192, 269, 115, i === 0 ? ink : "#e9eee5");
    label(k, x + 19, 228, 20, i === 0 ? "#cce0cd" : muted);
    label(
      v,
      x + 18,
      278,
      v.length > 12 ? 25 : 34,
      i === 0 ? "#ffffff" : ink,
      true,
      236,
    );
  });
  const panel = (
    x: number,
    title: string,
    kicker: string,
    items: [string, number][],
    color: string,
    empty: string,
  ) => {
    rect(x, 339, 550, 317, "#ffffff");
    rect(x, 339, 550, 2, border);
    label(title, x + 21, 379, 25, ink, true);
    label(kicker, x + 21, 408, 16, muted);
    if (!items.length) {
      label(empty, x + 21, 508, 20, muted);
      return;
    }
    const max = Math.max(0, ...items.map((v) => v[1])),
      min = Math.min(0, ...items.map((v) => v[1]));
    const span = max - min || 1,
      left = x + 160,
      graph = 207,
      axis = left + (graph * -min) / span;
    items.forEach(([name, value], i) => {
      const y = 444 + i * 35;
      label(name, x + 21, y + 5, 17, ink, false, 131);
      rect(left, y - 10, graph, 12, "#edf1eb");
      const dx = (graph * value) / span;
      if (value)
        rect(
          Math.min(axis, axis + dx),
          y - 10,
          Math.max(1, Math.abs(dx)),
          12,
          value < 0 ? "#a65040" : color,
        );
      rect(axis, y - 13, 1, 18, "#85958a");
      label(money(value, language), x + 384, y + 5, 17, ink, true, 152);
    });
  };
  panel(
    44,
    t("Monthly sales"),
    t("Latest 6 months with recorded sales"),
    m.months.slice(-6),
    green,
    t("No rows match the filters"),
  );
  panel(
    606,
    t("Sales by category"),
    t("Top 6 categories by net sales"),
    r.hasCategories
      ? m.categories
          .slice(0, 6)
          .map(([k, v]) => [k === null ? t("(blank category)") : k, v])
      : [],
    blue,
    r.hasCategories ? t("No rows match the filters") : t("Category not mapped"),
  );
  rect(44, 683, 1112, 1, border);
  label(
    t("Source") + "  " + r.name + "  /  " + r.sheet,
    44,
    714,
    16,
    muted,
    false,
    738,
  );
  label(
    t("Generated") + "  " + new Date(r.created).toLocaleDateString(language),
    891,
    714,
    16,
    muted,
    false,
    259,
  );
  label(
    t(
      "Returns reduce net sales. Order metrics show — when no order ID is mapped.",
    ),
    44,
    740,
    14,
    muted,
  );
}
