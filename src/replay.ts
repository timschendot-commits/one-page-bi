import { reportBinding } from "./number-format";
import { fieldSpec, isBusiness } from "./catalog";
import { openSQL, tableCSV } from "./stage";
import {
  compile,
  inspect,
  getSheet,
  layout,
  columnsFor,
  isSales,
  type Binding,
  type Kind,
  type Use,
  type Columns,
} from "./materials";
export const materialCsv = (p: Binding) => {
  const keys = columnsFor[p.layout.use].filter(
    (k) => p.layout.columns[k] !== null,
  );
  return tableCSV(
    reportBinding(p).view.table!,
    isBusiness(p.layout.use)
      ? keys.map(
          (k) => fieldSpec(p.layout.use as import("./catalog").Business)[k],
        )
      : keys,
    keys.map((k) => p.layout.columns[k]!),
  );
};
export interface SavedSource {
  name: string;
  sheet: string;
  sha256: string;
  headerRow: number;
  preparation?: { noHeader: boolean };
  use: Use;
  mapping: Record<string, string | null>;
  description: boolean;
  dayFirst: boolean;
  decimalComma?: boolean;
}
export interface SavedRun {
  template: Kind;
  unit: string;
  rules: string;
  sources: SavedSource[];
}
export async function replay(
  config: SavedRun,
  expected: string,
  load: (i: number) => Promise<{ bytes: string; csv: string; staged: string }>,
) {
  const sql = await openSQL();
  const parts: Binding[] = [];
  for (const [i, s] of config.sources.entries()) {
    const { bytes, csv, staged } = await load(i);
    const input = Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0));
    const m = inspect("replay" + i, s.name, s.sha256, input, sql);
    if (!m.source) throw m.error;
    const view = getSheet(
      m.source,
      s.sheet,
      s.headerRow,
      s.preparation?.noHeader ?? false,
    );
    if (!view.table) throw view.error;
    const l = layout(view.table, s.use);
    l.dmy = s.dayFirst;
    l.decimalComma = s.decimalComma === true;
    l.description = s.description;
    for (const k of Object.keys(l.columns) as (keyof Columns)[]) {
      const name = s.mapping[k],
        i = name == null ? null : view.table.headers.indexOf(name);
      if (i === -1) throw Error("Column changed / 字段改变: " + name);
      l.columns[k] = i;
    }
    if (tableCSV(view.table) !== staged)
      throw Error("Staged data differs / 整理快照不一致: " + s.name);
    const p = { material: m, view, layout: l };
    if (materialCsv(p) !== csv)
      throw Error("CSV differs / 中间材料不一致: " + s.name);
    parts.push(p);
  }
  const r = compile(
    {
      id: "replay",
      kind: config.template,
      parts,
      review: false,
      periods: config.rules.startsWith("disjoint periods"),
    },
    config.unit,
  );
  const stored = JSON.parse(expected);
  if (isSales(r)) {
    if (
      JSON.stringify(r.rows) !== JSON.stringify(stored.rows) ||
      r.unit !== stored.unit
    )
      throw Error("Processed rows differ / 处理数据不一致");
  } else {
    if (
      JSON.stringify(r.cases) !== JSON.stringify(stored.cases) ||
      r.currency !== stored.currency
    )
      throw Error("Payout cases differ / 核对结果不一致");
  }
}
