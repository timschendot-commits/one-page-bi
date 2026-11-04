import { isQuantityReport } from "./catalog";
import { dashboard, recipes } from "./recipes";
import { sourceUnit, translator, type Language } from "./i18n";
import { money, type Report, type Sale } from "./model";
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
  const recipe = recipes[r.recipe ?? "sales"];
  const { cards, panels } = dashboard(r, rows, language);
  rect(0, 0, w, h, "#f7f8f2");
  rect(0, 0, w, 10, green);
  label(
    "ONE PAGE BI     /     " + t(recipe.name).toUpperCase(),
    44,
    55,
    19,
    green,
    true,
  );
  label(t(recipe.title), 44, 118, 49, ink, true);
  const dates=rows.map(v=>v.date).sort();
  label([dates[0],dates.at(-1)].filter((v,i,a)=>v && a.indexOf(v)===i).join(" – "),800,105,19,muted,false,340);
  label(
    selection +
      "   ·   " +
      t(isQuantityReport(r.recipe) ? "Unit" : "Amount unit") +
      " " +
      sourceUnit(r.unit, language),
    45,
    158,
    20,
    muted,
    false,
    1090,
  );
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
    count = false,
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
    if(items.length>1&&[t("Monthly amount"),t("Monthly sales"),t("Orders by month"),t("Monthly net movement")].includes(title)&&items.every(([s])=>/^\d{4}-\d{2}$/.test(s))){
       const months=items.map(([s])=>+s.slice(0,4)*12+(+s.slice(5,7))),first=months[0],last=months[months.length-1];
       const px=(i:number)=>x+55+(last===first?215:430*(months[i]-first)/(last-first)),py=(v:number)=>585-(v-min)/span*132;
       rect(x+38,py(0),468,2,border);g!.lineWidth=4;g!.strokeStyle=color;
       items.forEach(([name,v],i)=>{if(i&&months[i]-months[i-1]===1){g!.beginPath();g!.moveTo(px(i-1),py(items[i-1][1]));g!.lineTo(px(i),py(v));g!.stroke();}g!.beginPath();g!.fillStyle=color;g!.arc(px(i),py(v),5,0,2*Math.PI);g!.fill();const tx=Math.max(x+11,Math.min(x+464,px(i)-30));label(count?String(v):money(v,language),tx,py(v)-12,16,ink,true,78);label(name,tx,620,15,muted,false,80);});
       return;
    }
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
      label(
        count ? String(value) : money(value, language),
        x + 384,
        y + 5,
        17,
        ink,
        true,
        152,
      );
    });
  };
  panels.forEach((p, i) =>
    panel(
      i === 0 ? 44 : 606,
      p.title,
      p.subtitle,
      p.items,
      i === 0 ? green : blue,
      p.empty,
      p.count,
    ),
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
  label(t(recipe.footer), 44, 740, 14, muted);
}
