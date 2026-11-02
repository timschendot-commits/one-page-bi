import { jsonRows } from "./json-lines";
import initSql, { type Sql } from "sql.js";
import { parse } from "csv-parse/browser/esm/sync";
import { readSource, raw, identifier, type Table, type Source } from "./input";
import {
  LocalizedError,
  translator,
  type Message,
  type Language,
} from "./i18n";
export interface Audit {
  start: number;
  noHeader: boolean;
  delimiter: string;
  encoding: string;
  format?: "jsonl";
  original: string[];
  columnOrder?: number[];
  headers: string[];
  removed: number[];
  issues: {
    row: number;
    reason:
      | "Identical to source row"
      | "Conflicting column meanings"
      | "Summary or balance row";
    detail?: string;
  }[];
  query: string;
  hints: Message[];
}
export function issueText(i: Audit["issues"][number], lang: Language) {
  return translator(lang)(i.reason) + (i.detail ? " · " + i.detail : "");
}
const error = (en: string, zh: string) =>
  new LocalizedError((lang) => (lang === "en" ? en : zh));
let loading: Promise<Sql> | undefined;
export const openSQL = () =>
  (loading ??= (async () => {
    const sql = await initSql(
      typeof window === "undefined"
        ? {}
        : { locateFile: () => "./sql-wasm.wasm" },
    );
    if (typeof window !== "undefined") {
      const res = await fetch("./profiles.sqlite");
      if (!res.ok) throw Error("Cannot open the local rules database.");
      const db = new sql.Database(new Uint8Array(await res.arrayBuffer()));
      try {
        const rows = db.exec(
          "SELECT alias,canonical FROM aliases ORDER BY alias",
        )[0]?.values;
        if (
          !rows?.length ||
          db.exec("PRAGMA user_version")[0]?.values[0][0] !== 5
        )
          throw Error("Unsupported rules database.");
        aliases.clear();
        for (const [a, b] of rows) aliases.set(String(a), String(b));
      } finally {
        db.close();
      }
    }
    return sql;
  })().catch((e) => {
    loading = undefined;
    throw e;
  }));
export const normalizeHeading = (x: string) =>
  x
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_.-]/g, "");
export const groups: Record<string, string[]> = {
  "Invoice date": ["invoicedate", "发票日期"],
  "Closing balance": ["期末余额"],
  "Period amount": ["期间金额"],
  "Actual amount": ["实际金额"],
  "Posted cost": ["已过账成本"],
  "Work order": ["工单"],
  "Period end": ["期末日期"],
  "Opening balance": ["期初余额"],
  "Period debit": ["本期借方发生额"],
  "Period credit": ["本期贷方发生额"],
  "Account class": ["科目类别"],
  "Budget amount": ["预算金额"],
  "Sales date": ["sale date", "销售日期", "成交日期"],
  "Sales amount": [
    "net line value",
    "net line amount",
    "实销金额",
    "行净额",
    "行销售净额",
    "销售金额",
    "销售额",
  ],
  "Order ID": ["order number", "order no", "订单编号", "订单号码", "订单号"],
  Currency: ["currency code", "货币代码", "币种"],
  "Booking date": ["posted date", "posting date", "入账日期", "记账日期"],
  "Signed amount": ["transaction amount", "收支金额", "交易金额"],
  Debit: ["withdrawals", "借方", "支出金额"],
  Credit: ["deposits", "贷方", "收入金额"],
  Customer: ["customer name", "客户名称", "客户"],
  Supplier: ["vendor", "vendor name", "supplier name", "供应商", "供应商名称"],
  SKU: ["item code", "product code", "商品编码", "货号"],
  Location: ["warehouse", "仓库", "库位"],
  "Purchase amount": ["purchase line amount", "采购金额", "采购净额"],
  "Expense amount": ["expense amount", "费用金额", "报销金额"],
  "Cost of goods sold": ["cogs", "line cost", "已售商品成本", "销售成本"],
  "Snapshot date": ["as of date", "as of", "快照日期", "截至日期"],
  "On hand": ["on hand (current)", "on hand quantity", "在手数量", "库存数量"],
  "Stock unit": ["stock uom", "计量单位"],
  "Due date": ["到期日期", "到期日"],
  "Invoice ID": ["invoice number", "invoice no", "发票号", "发票编号"],
  Outstanding: [
    "outstanding amount",
    "open balance",
    "未结金额",
    "未付余额",
    "未收余额",
  ],
  Account: ["account code", "account name", "科目编号", "会计科目"],
  "Journal ID": ["journal entry", "voucher no", "凭证号"],
  "Billed amount": ["net billed", "开票金额"],
  Project: ["project name", "项目名称", "项目"],
  Channel: ["sales channel", "销售渠道", "渠道"],
  Store: ["门店", "店铺"],
  Category: ["类别", "品类", "费用类别"],
  Date: ["日期"],
  Amount: ["金额"],
};
const key = normalizeHeading;
const aliases = new Map(
  Object.entries(groups).flatMap(([target, values]) =>
    [target, ...values].map((x) => [key(x), target] as const),
  ),
);
const dateLike = (s: string) =>
  /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4})$/.test(s.trim());
const numeric = (s: string) => /^[+-]?\d+(?:[.,]\d+)?$/.test(s.trim());
type RecordRow = { n: number; cells: string[] };
function decode(bytes: Uint8Array) {
  const encoding =
    bytes[0] === 255 && bytes[1] === 254
      ? "utf-16le"
      : bytes[0] === 254 && bytes[1] === 255
        ? "utf-16be"
        : "utf-8";
  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    if (text.includes("\0")) throw Error();
    return { text, encoding };
  } catch {
    throw error(
      "Unknown text encoding. Save as UTF-8 or BOM-marked UTF-16.",
      "文本编码不明确。请另存为 UTF-8 或带 BOM 的 UTF-16。",
    );
  }
}
function records(text: string, delimiter: string, sample = false): RecordRow[] {
  // info.lines is the final physical line of each quoted record. Keep its first line for tracing.
  const data = parse(text, {
    delimiter,
    relax_column_count: true,
    info: true,
    skip_empty_lines: false,
    max_record_size: 100000,
    to: sample ? 50 : undefined,
    on_record: (record, ctx) => {
      if (ctx.records > 10100 || ctx.index > 80)
        throw Error("10,000 rows / 80 columns");
      return record;
    },
  }) as unknown as { record: string[]; info: { lines: number } }[];
  let start = 1;
  return data.map((r) => {
    const n = start;
    start = r.info.lines + 1;
    return { n, cells: r.record };
  });
}
function delimiterFor(text: string) {
  const candidates = [",", ";", "\t", "|"]
    .map((delimiter) => {
      try {
        const histogram = new Map<number, number>();
        for (const r of records(text, delimiter, true)) {
          if (r.cells.length > 1)
            histogram.set(
              r.cells.length,
              (histogram.get(r.cells.length) ?? 0) + 1,
            );
        }
        return { delimiter, score: Math.max(0, ...histogram.values()) };
      } catch {
        return { delimiter, score: 0 };
      }
    })
    .sort((a, b) => b.score - a.score);
  if (!candidates[0].score || candidates[0].score === candidates[1].score)
    throw error(
      "The column separator is ambiguous. Re-export with one consistent delimiter.",
      "无法唯一确定分隔符，请用一致的分隔符重新导出。",
    );
  return candidates[0].delimiter;
}
function plan(rows: RecordRow[]) {
  const nonempty = rows.filter((r) => r.cells.some((s) => s.trim()));
  const first = nonempty.find((r) => r.cells.length > 1);
  if (!first || first.n > 50)
    throw error(
      "No table in the first 50 rows.",
      "前 50 行没有找到可识别的表格。",
    );
  if (
    nonempty.some(
      (r) => r.n < first.n && r.cells.some((x) => dateLike(x) || numeric(x)),
    )
  )
    throw error(
      "Possible data before the header. Check the file before importing.",
      "表头前可能已有数据，请先核查原件。",
    );
  const known = first.cells.some((h) => aliases.has(key(h)));
  // Preserve possible data even if a line also contains a label such as “Store”.
  const noHeader =
    first.cells.some((x) => dateLike(x) || numeric(x)) ||
    (!known &&
      nonempty[0] === first &&
      !first.cells.some((v) =>
        /date|amount|invoice|price|quantity|debit|credit|order|货币|金额|日期|数量/i.test(
          v,
        ),
      ));
  return { row: first.n, noHeader };
}
function standardize(sql: Sql, table: Table, audit: Audit): Table {
  const width = table.headers.length;
  if (!width || width > 80 || table.lines.length > 10000)
    throw error(
      "Limit: 10,000 rows and 80 columns.",
      "上限为 10,000 行、80 列。",
    );
  const seen = new Set<string>();
  const cols = table.headers
    .map((source, i) => {
      const candidate =
        aliases.get(key(source)) ?? source.trim().normalize("NFKC");
      let name = candidate || "Column " + (i + 1);
      if (seen.has(key(name))) {
        audit.issues.push({
          row: audit.start,
          reason: "Conflicting column meanings",
          detail: name,
        });
        name = name + " [" + (i + 1) + "]";
      }
      while (seen.has(key(name))) name += "_";
      seen.add(key(name));
      return { i, name };
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const db = new sql.Database();
  try {
    db.run(
      "CREATE TABLE raw (source_row INTEGER PRIMARY KEY," +
        cols.map((_, i) => "c" + i + " TEXT").join(",") +
        ")",
    );
    const statement = db.prepare(
      "INSERT INTO raw VALUES (" +
        Array(width + 1)
          .fill("?")
          .join(",") +
        ")",
    );
    const originals = new Map(table.lines.map((r) => [r.n, r]));
    try {
      db.run("BEGIN");
      for (const r of table.lines) {
        if (r.cells.length !== width)
          throw error(
            "Uneven column count at row " + r.n + ".",
            "第 " + r.n + " 行列数不一致。",
          );
        const values = r.cells.map((c) => (typeof c === "string" ? c : raw(c)));
        if (
          !values.some((x) => x.trim()) ||
          (!audit.noHeader &&
            values.every((v, i) => v.trim() === table.headers[i].trim()))
        ) {
          audit.removed.push(r.n);
          continue;
        }
        statement.run([r.n, ...values]);
      }
      db.run("COMMIT");
    } finally {
      statement.free();
    }
    const quote = (x: string) => '"' + x.replaceAll('"', '""') + '"';
    audit.query =
      "SELECT source_row," +
      cols
        .map(
          (c) =>
            "trim(c" +
            c.i +
            ", char(9,10,13,32,160,12288)) AS " +
            quote(c.name),
        )
        .join(",") +
      " FROM raw ORDER BY source_row";
    const result = db.exec(audit.query)[0];
    if (!result?.values.length)
      throw error("No data records remain.", "整理后没有数据记录。");
    const fingerprints = new Map<string, number>();
    audit.headers = cols.map((c) => c.name);
    audit.columnOrder = cols.map((c) => c.i);
    const lines = result.values.map((row) => {
      const n = Number(row[0]),
        vals = row.slice(1).map(String),
        original = originals.get(n)!;
      const fingerprint = JSON.stringify(vals);
      const prev = fingerprints.get(fingerprint);
      if (prev)
        audit.issues.push({
          row: n,
          reason: "Identical to source row",
          detail: String(prev),
        });
      else fingerprints.set(fingerprint, n);
      if (
        vals.some((v) =>
          /^(?:grand total|subtotal|total|opening balance|closing balance|期初余额|期末余额|小计|合计|总计)$/i.test(
            v,
          ),
        )
      )
        audit.issues.push({
          row: n,
          reason: "Summary or balance row",
        });
      return {
        n,
        cells: cols.map((c, j) =>
          typeof original.cells[c.i] === "object"
            ? original.cells[c.i]
            : vals[j],
        ),
      };
    });
    audit.hints = cols.map((_, j) => {
      const v = result.values
        .slice(0, 30)
        .map((r) => String(r[j + 1]))
        .filter(Boolean);
      if (!v.length) return "Blank";
      return v.every(dateLike)
        ? "Date"
        : v.every((x) => /^(USD|MYR|CNY|SGD|EUR|GBP|AUD|HKD)$/.test(x))
          ? "Currency code"
          : v.every(numeric)
            ? "Numeric-looking text"
            : "Text";
    });
    return { ...table, headers: audit.headers, lines, audit };
  } finally {
    db.close();
  }
}
export function preparedSource(
  sql: Sql,
  bytes: Uint8Array,
  name: string,
): Source {
  if (bytes.length > 5 * 1024 * 1024)
    throw error("Data file exceeds 5 MiB.", "数据文件超过 5 MiB。");
  if (/\.(jsonl|ndjson)$/i.test(name)) {
    const { text, encoding } = decode(bytes),
      { table, blanks } = jsonRows(text);
    return {
      sheets: [table.sheet],
      table: () =>
        standardize(sql, table, {
          start: 1,
          noHeader: true,
          format: "jsonl",
          original: table.headers,
          headers: [],
          hints: [],
          issues: [],
          removed: [...blanks],
          query: "",
          delimiter: "",
          encoding,
        }),
    };
  }
  if (!/\.(csv|tsv|psv)$/i.test(name))
    return wrapWorkbook(sql, readSource(bytes, name));
  const { text, encoding } = decode(bytes);
  const declaration = /^sep=([,;|\t])(?:\r\n|\n|\r)/i.exec(text);
  const delimiter = declaration?.[1] ?? delimiterFor(text);
  let rows: RecordRow[];
  try {
    rows = records(
      declaration ? text.slice(declaration[0].length) : text,
      delimiter,
    );
    if (declaration) for (const row of rows) row.n++;
  } catch (e) {
    throw error(
      "Invalid delimited file: " + (e as Error).message,
      "分隔文件格式异常：" + (e as Error).message,
    );
  }
  const suggestion = plan(rows);
  const sheet = /\.tsv$/i.test(name) ? "TSV" : "CSV";
  return {
    sheets: [sheet],
    suggest: () => suggestion,
    table: (_, start = suggestion.row, noHeader = suggestion.noHeader) => {
      const header = rows.find((r) => r.n === start);
      if (!header || header.cells.length < 2)
        throw error(
          "Select the first row of the table.",
          "请选择表格的起始行。",
        );
      const headers = noHeader
        ? header.cells.map((_, i) => "Column " + (i + 1))
        : header.cells.map((x) => x.trim());
      const slice = rows.filter((r) => r.n >= start + (noHeader ? 0 : 1));
      const blanks = slice
        .filter((r) => r.cells.every((x) => !x.trim()))
        .map((r) => r.n);
      const emptySet = new Set(blanks);
      return standardize(
        sql,
        {
          headers,
          lines: slice.filter((r) => !emptySet.has(r.n)),
          sheet,
          date1904: false,
        },
        {
          start,
          noHeader,
          delimiter,
          encoding,
          original: header.cells.map((v, i) =>
            noHeader ? "Column " + (i + 1) : v,
          ),
          headers: [],
          removed: blanks,
          issues: [],
          query: "",
          hints: [],
        },
      );
    },
  };
}
export function wrapWorkbook(sql: Sql, source: Source): Source {
  return {
    ...source,
    table: (sheet, start = 1, noHeader = false) => {
      const tab = source.table(sheet, start, noHeader);
      return standardize(sql, tab, {
        start,
        noHeader,
        delimiter: "",
        encoding: "Workbook / dataset",
        original: tab.headers,
        headers: [],
        removed: [],
        issues: [],
        query: "",
        hints: [],
      });
    },
  };
}
export function tableCSV(
  t: Table,
  fields = t.headers,
  indices = t.headers.map((_, i) => i),
) {
  const escape = (x: string) => {
    const guarded =
      /^\s*[=+@\-\t\r]/.test(x) && !/^[-+]?\d+(?:\.\d+)?$/.test(x)
        ? "'" + x
        : x;
    return '"' + guarded.replaceAll('"', '""') + '"';
  };
  return (
    [
      ["source_row", ...fields],
      ...t.lines.map((r) => [
        String(r.n),
        ...indices.map((i) => {
          const c = r.cells[i];
          return typeof c === "object" && c.t === "n"
            ? identifierForCsv(c)
            : raw(c);
        }),
      ]),
    ]
      .map((r) => r.map(escape).join(","))
      .join("\r\n") + "\r\n"
  );
}
function identifierForCsv(
  c: Exclude<Table["lines"][0]["cells"][0], string | undefined>,
) {
  return c.w && /^0\d+$/.test(c.w) ? identifier(c) : raw(c);
}
