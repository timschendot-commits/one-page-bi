import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { readSource, validate } from "../src/input";
import { metrics, suggest } from "../src/model";
const csv = (s: string) =>
  readSource(new TextEncoder().encode(s), "test.csv").table("CSV");
function report(s: string) {
  const t = csv(s);
  return validate(t, suggest(t.headers), "test.csv", "原表单位");
}
const prefix = "日期,销售额,订单号,品类,币种\n";
test("exact cents, returns, distinct orders, and scoped averages", () => {
  const r = report(
    prefix +
      "2024-02-29,0.10,001,A,CNY\n2024/02/29,0.20,001,B,CNY\n2024-03-01,-0.10,002,A,CNY",
  );
  const m = metrics(r.rows, true);
  assert.deepEqual([m.total, m.count, m.average, m.lines], [20, 2, 10, 3]);
  assert.deepEqual(m.months, [
    ["2024-02", 30],
    ["2024-03", -10],
  ]);
  assert.equal(
    metrics(
      r.rows.filter((x) => x.category === "A"),
      true,
    ).total,
    0,
  );
  assert.equal(r.rows[0].order, "001");
  assert.equal(r.unit, "CNY");
});
test("signed average rounds half a cent away from zero", () => {
  for (const [amount, result] of [
    ["0.01", 1],
    ["-0.01", -1],
  ] as const) {
    const r = report(
      "date,amount,order_id\n2026-02-01," + amount + ",A\n2026-02-02,0.00,B",
    );
    assert.equal(metrics(r.rows, true).average, result);
  }
});
test("unmapped order and category produce missing values, zero remains zero", () => {
  const r = report("日期,金额\n2026-01-01,0.00");
  const m = metrics(r.rows, false);
  assert.deepEqual(
    [m.total, m.count, m.average, r.rows[0].category],
    [0, null, null, null],
  );
});
test("CSV BOM, quoted thousands, comma, newline, quotes and physical CSV line", () => {
  const r = report(
    '\ufeff日期,销售额,品类\r\n2026-01-01,"1,234.50","A,\r\n""B"""\r\n',
  );
  assert.equal(r.rows[0].cents, 123450);
  assert.equal(r.rows[0].category, 'A,\r\n"B"');
  assert.equal(r.rows[0].row, 3);
});
for (const [label, value, err] of [
  ["empty amount", "2026-01-01,,A,K,CNY", "金额"],
  ["calendar date", "2025-02-29,3,A,K,CNY", "日期"],
  ["ambiguous date", "3/4/2026,3,A,K,CNY", "日期"],
  ["precision", "2026-01-01,1.111,A,K,CNY", "金额"],
  ["empty order", "2026-01-01,4,,K,CNY", "编号"],
  ["currency missing", "2026-01-01,4,A,K,", "币种"],
  ["mixed currency", "2026-01-01,4,A,K,MYR\n2026-01-01,5,B,L,CNY", "多种币种"],
  ["safe precision limit", "2026-01-01,1000000000000.01,A,K,CNY", "精度范围"],
])
  test("rejects " + label, () =>
    assert.throws(() => report(prefix + value), new RegExp(err)),
  );
test("error identifies source row and no partial report is returned", () =>
  assert.throws(
    () => report(prefix + "2026-01-01,1,A,K,CNY\nbad,2,B,K,CNY"),
    /第 3 行/,
  ));
test("strict CSV structure, duplicate or missing headers, invalid encoding", () => {
  for (const s of [
    "日期,销售额\n2026-01-01,1,2",
    "金额,金额\n1,2",
    "日期,\n2026-01-01,2",
    "日期,金额",
  ])
    assert.throws(() => report(s));
  assert.throws(() => readSource(new Uint8Array([0xff]), "a.csv"), /UTF-8/);
});
test("mapping is explicit and one-to-one; a detected currency must be checked", () => {
  const t = csv(prefix + "2026-01-01,4,A,K,CNY");
  const map = suggest(t.headers);
  assert.throws(
    () => validate(t, { ...map, date: null }, "a", "原表单位"),
    /映射/,
  );
  assert.throws(
    () => validate(t, { ...map, amount: 0 }, "a", "原表单位"),
    /同一列/,
  );
  assert.throws(
    () => validate(t, { ...map, currency: null }, "a", "原表单位"),
    /币种/,
  );
  assert.throws(() => validate(t, map, "a", "MYR"), /不一致/);
});
function book(serial: number, date1904: boolean, formula = false) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["日期", "金额", "订单号"],
    [serial, 20.01, 23],
  ]);
  ws.C2.z = "0000";
  if (formula) ws.B2.f = "10+10.01";
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["other"]]),
    "封面",
  );
  XLSX.utils.book_append_sheet(wb, ws, "销售明细");
  wb.Workbook = { WBProps: { date1904 } };
  return readSource(
    XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
    "book.xlsx",
  );
}
test("XLSX worksheets, both date systems and zero-padded ids", () => {
  for (const mode of [false, true]) {
    const s = book(mode ? 0 : 1462, mode);
    assert.deepEqual(s.sheets, ["封面", "销售明细"]);
    const t = s.table("销售明细"),
      r = validate(t, suggest(t.headers), "a", "原表单位");
    assert.deepEqual(
      [r.rows[0].date, r.rows[0].order, r.rows[0].cents],
      ["1904-01-01", "0023", 2001],
    );
  }
});
test("XLSX fabricated leap day and cached formulas are blocked", () => {
  for (const [n, formula, re] of [
    [60, false, /日期/],
    [1462, true, /公式/],
  ] as const) {
    const t = book(n, false, formula).table("销售明细");
    assert.throws(() => validate(t, suggest(t.headers), "a", "原表单位"), re);
  }
});
test("size cap and unsupported extensions", () => {
  assert.throws(
    () => readSource(new Uint8Array(5 * 1024 * 1024 + 1), "large.csv"),
    /5 MiB/,
  );
  assert.throws(() => readSource(new Uint8Array([1]), "a.xls"), /xlsx/);
});
