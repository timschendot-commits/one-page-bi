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
  selection = "全部数据",
) {
  const w = 1200,
    h = 756;
  canvas.width = w * 1.5;
  canvas.height = h * 1.5;
  const g = canvas.getContext("2d");
  if (!g) throw Error("无法初始化报表绘图。");
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
  label("销售分析总览", 44, 118, 49, ink, true);
  label("SALES OVERVIEW     /     01", 885, 109, 18, muted, true, 275);
  label(
    selection + "   ·   金额单位 " + r.unit,
    45,
    158,
    20,
    muted,
    false,
    1090,
  );
  const cards = [
    ["销售额", money(m.total)],
    ["订单数", m.count === null ? "—" : String(m.count)],
    ["平均订单额", m.average === null ? "—" : money(m.average)],
    ["明细行数", String(m.lines)],
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
      label(money(value), x + 384, y + 5, 17, ink, true, 152);
    });
  };
  panel(
    44,
    "月度销售额",
    "最近 6 个有记录月份",
    m.months.slice(-6),
    green,
    "当前筛选无明细",
  );
  panel(
    606,
    "品类销售额",
    "按净销售额排名 · 前 6 类",
    r.hasCategories
      ? m.categories
          .slice(0, 6)
          .map(([k, v]) => [k === null ? "（品类空白）" : k, v])
      : [],
    blue,
    r.hasCategories ? "当前筛选无明细" : "未映射品类",
  );
  rect(44, 683, 1112, 1, border);
  label("来源  " + r.name + "  /  " + r.sheet, 44, 714, 16, muted, false, 738);
  label(
    "生成  " + new Date(r.created).toLocaleDateString("zh-CN"),
    891,
    714,
    16,
    muted,
    false,
    259,
  );
  label("金额含负数退货；缺少订单编号时，订单指标显示 —。", 44, 740, 14, muted);
}
