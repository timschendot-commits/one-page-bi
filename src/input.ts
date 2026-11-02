import { errorText, translator, LocalizedError, type Message } from "./i18n";
import { parse } from "csv-parse/browser/esm/sync";
import * as XLSX from "xlsx";
import { fields, suggest, type Mapping, type Sale, type Report } from "./model";
type Cell = string | XLSX.CellObject | undefined;
type Line = { n: number; cells: Cell[] };
export interface Table {
  headers: string[];
  lines: Line[];
  sheet: string;
  date1904: boolean;
}
export interface Source {
  sheets: string[];
  table: (sheet: string) => Table;
}
const limit = 10000,
  width = 80;
function fail(key: Message, values?: Record<string, string | number>): never {
  throw new LocalizedError((lang) => translator(lang)(key, values));
}
const blank = (c: Cell) =>
  c === undefined ||
  (typeof c === "string"
    ? !c.trim()
    : !c.f && (c.v === undefined || String(c.v).trim() === ""));
function raw(c: Cell): string {
  if (typeof c === "string") return c.trim();
  if (!c) return "";
  if (c.f || c.F) fail("Paste formula cells as values before importing.");
  if (c.t === "e" || c.t === "b")
    fail("Errors and Boolean values are not supported.");
  return String(c.v ?? "").trim();
}
function table(lines: Line[], sheet: string, date1904: boolean): Table {
  const first = lines[0];
  if (!first || first.n !== 1 || !first.cells.length)
    fail("The first row must contain column headers.");
  const headers = Array.from(first.cells, (c) => raw(c));
  if (
    headers.some((h) => !h) ||
    new Set(headers.map((h) => h.toLowerCase())).size !== headers.length
  )
    fail("Headers must be nonempty and unique. Check the first row.");
  if (headers.length > width) fail("The table exceeds the 80-column limit.");
  const records = lines.slice(1).filter((l) => l.cells.some((c) => !blank(c)));
  if (!records.length) fail("The file has only headers or blank rows.");
  if (records.length > limit) fail("The table exceeds the 10,000-row limit.");
  return { headers, lines: records, sheet, date1904 };
}
export function readSource(bytes: Uint8Array, name: string): Source {
  if (bytes.length > 5 * 1024 * 1024) fail("The file exceeds the 5 MiB limit.");
  if (/\.csv$/i.test(name)) {
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return fail("Save the CSV using UTF-8 encoding.");
    }
    if (content.includes("\0"))
      fail("The CSV contains a null character. Save it as UTF-8.");
    let rows: { record: string[]; info: { bytes: number } }[];
    let records = 0;
    try {
      rows = parse(content, {
        bom: true,
        info: true,
        skip_empty_lines: true,
        max_record_size: 100000,
        on_record: (row, context) => {
          if (context.index > width || ++records > limit + 1)
            fail("The table exceeds 80 columns or 10,000 data rows.");
          return row;
        },
      }) as unknown as typeof rows;
    } catch (e) {
      if (e instanceof LocalizedError) throw e;
      const row = (e as { lines?: number }).lines;
      if (typeof row === "number")
        return fail(
          "Invalid CSV near row {row}. Check row lengths, quotes and comma delimiters.",
          { row },
        );
      return fail(
        "Invalid CSV. Check row lengths, quotation marks and comma delimiters.",
      );
    }
    const data =
      bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
        ? bytes.subarray(3)
        : bytes;
    let offset = 0,
      physicalLine = 1;
    const lines = rows.map(({ record, info }) => {
      let lastLine = physicalLine;
      while (offset < info.bytes) {
        lastLine = physicalLine;
        const b = data[offset++];
        if (b === 13 && data[offset] === 10) offset++;
        if (b === 13 || b === 10) physicalLine++;
      }
      return { n: lastLine, cells: record };
    });
    const t = table(lines, "CSV", false);
    return { sheets: ["CSV"], table: () => t };
  }
  if (!/\.xlsx$/i.test(name) || bytes[0] !== 80 || bytes[1] !== 75)
    fail("Choose an XLSX workbook or a UTF-8 CSV file.");
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(bytes, {
      type: "array",
      cellNF: true,
      cellFormula: true,
      cellDates: false,
      cellText: true,
    });
  } catch {
    return fail(
      "The workbook could not be read. Save a valid, unencrypted XLSX file and try again.",
    );
  }
  const sheets = wb.SheetNames.filter(
    (n, i) =>
      !wb.Workbook?.Sheets?.[i]?.Hidden && wb.Sheets[n]?.["!type"] !== "chart",
  );
  if (!sheets.length) fail("The workbook has no readable visible worksheet.");
  return {
    sheets,
    table: (sheet: string) => {
      if (!sheets.includes(sheet)) fail("Choose a visible worksheet.");
      const ws = wb.Sheets[sheet],
        ref = ws["!ref"];
      if (!ref) return fail("The worksheet is empty.");
      const range = XLSX.utils.decode_range(ref);
      if (range.e.r > limit || range.e.c >= width)
        fail(
          "Reduce the worksheet to 10,001 rows including headers and 80 columns.",
        );
      if (ws["!merges"]?.length)
        fail("Unmerge the cells and use a single header row.");
      const lines: Line[] = [];
      for (let r = 0; r <= range.e.r; r++) {
        const cells: Cell[] = [];
        for (let c = 0; c <= range.e.c; c++)
          cells.push(ws[XLSX.utils.encode_cell({ r, c })]);
        lines.push({ n: r + 1, cells });
      }
      return table(lines, sheet, Boolean(wb.Workbook?.WBProps?.date1904));
    },
  };
}
function ymd(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    y < 1900 ||
    y > 9999 ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  )
    fail("The date does not exist or is outside the supported range.");
  return [y, String(m).padStart(2, "0"), String(d).padStart(2, "0")].join("-");
}
function dateValue(cell: Cell, date1904: boolean) {
  const s = raw(cell);
  if (typeof cell === "object" && cell.t === "n") {
    if (!Number.isInteger(cell.v) || (!date1904 && Number(cell.v) === 60))
      fail("Invalid date serial or a time component is present.");
    const d = XLSX.SSF.parse_date_code(Number(cell.v), { date1904 });
    if (!d) return fail("Invalid Excel date serial.");
    return ymd(d.y, d.m, d.d);
  }
  const match = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(s);
  if (!match) return fail("Use YYYY-MM-DD or YYYY/MM/DD for dates.");
  return ymd(+match[1], +match[3], +match[4]);
}
function cents(cell: Cell) {
  const s = raw(cell);
  if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s))
    fail(
      "Enter a numeric amount with up to two decimal places and no currency symbol.",
    );
  const [whole, fraction = ""] = s.replace(/[+,\-]/g, "").split(".");
  const n =
    Number(whole + fraction.padEnd(2, "0")) * (s.startsWith("-") ? -1 : 1);
  if (!Number.isSafeInteger(n))
    fail("The amount exceeds the supported precision.");
  return n;
}
export function cellLabel(c: Cell): string {
  return typeof c === "object"
    ? c.f
      ? "=" + c.f
      : (c.w ?? String(c.v ?? ""))
    : (c ?? "");
}
export function validate(
  t: Table,
  map: Mapping,
  name: string,
  unit: string,
): Report {
  for (const f of fields) {
    const i = map[f.key];
    if (i === null) {
      if (f.required)
        throw new LocalizedError((lang) =>
          translator(lang)("Map the required field “{field}”.", {
            field: translator(lang)(f.title),
          }),
        );
    } else if (!Number.isInteger(i) || i < 0 || i >= t.headers.length)
      fail("The mapped column does not exist.");
  }
  const used = Object.values(map).filter((i) => i !== null);
  if (new Set(used).size !== used.length)
    fail("A column cannot be used for more than one field.");
  if (suggest(t.headers).currency !== null && map.currency === null)
    fail("Map the detected currency column to check for mixed currencies.");
  const rows: Sale[] = [],
    errors: { row: number; field: Message; detail: unknown }[] = [];
  let magnitude = 0,
    detected: string | undefined,
    errorCount = 0;
  for (const { n, cells } of t.lines) {
    let field: Message = "Sales date";
    try {
      const date = dateValue(cells[map.date!], t.date1904);
      field = "Line amount";
      const amount = cents(cells[map.amount!]);
      field = "Order ID";
      let order = map.order === null ? null : raw(cells[map.order]);
      if (order === "") fail("Mapped order IDs cannot be blank.");
      if (map.order !== null) {
        const c = cells[map.order];
        if (typeof c === "object" && c.t === "n") {
          if (
            !Number.isSafeInteger(c.v) ||
            Math.abs(Number(c.v)) >= 1e15 ||
            !/^\d+$/.test(c.w ?? String(c.v))
          )
            fail("Save order IDs with ambiguous formatting as text.");
          order = c.w ?? String(c.v);
        }
      }
      field = "Sales category";
      const category =
        map.category === null ? null : raw(cells[map.category]) || null;
      field = "Currency code";
      if (map.currency !== null) {
        const currency = raw(cells[map.currency]).toUpperCase();
        if (!/^[A-Z]{3}$/.test(currency))
          fail("Use a three-letter currency code, such as CNY.");
        if (detected && detected !== currency)
          fail(
            "Mixed currencies. Split the file or convert to a single currency first.",
          );
        detected = currency;
      }
      magnitude += Math.abs(amount);
      rows.push({ row: n, date, cents: amount, order, category });
    } catch (e) {
      errorCount++;
      if (errors.length < 6) errors.push({ row: n, field, detail: e });
    }
  }
  if (errorCount)
    throw new LocalizedError((lang) => {
      const t = translator(lang);
      return [
        t("Validation failed on {count} row(s). No report was generated.", {
          count: errorCount,
        }),
        ...errors.map((e) =>
          t("Row {row} · {field}: {detail}", {
            row: e.row,
            field: t(e.field),
            detail: errorText(e.detail, lang),
          }),
        ),
      ].join("\n");
    });
  if (magnitude > 1e14)
    fail("The sum of absolute amounts exceeds the supported precision.");
  if (
    detected &&
    unit !== "Source units" &&
    unit !== "原表单位" &&
    detected !== unit
  )
    fail("The selected unit does not match the source currency ({currency}).", {
      currency: detected,
    });
  return {
    name,
    sheet: t.sheet,
    created: new Date().toISOString(),
    unit: detected ?? unit,
    rows,
    hasOrders: map.order !== null,
    hasCategories: map.category !== null,
  };
}
