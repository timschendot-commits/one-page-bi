import { payoutSuggest, preparePayout } from "../src/payout-input";
import { reconcile, payoutTotals, type PayoutLine } from "../src/payout-model";
import { cashMetrics, orderMetrics, dashboard } from "../src/recipes";
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
  ["empty amount", "2026-01-01,,A,K,CNY", "amount"],
  ["calendar date", "2025-02-29,3,A,K,CNY", "date"],
  ["ambiguous date", "3/4/2026,3,A,K,CNY", "date"],
  ["precision", "2026-01-01,1.111,A,K,CNY", "amount"],
  ["empty order", "2026-01-01,4,,K,CNY", "order"],
  ["currency missing", "2026-01-01,4,A,K,", "currency"],
  [
    "mixed currency",
    "2026-01-01,4,A,K,MYR\n2026-01-01,5,B,L,CNY",
    "Mixed currencies",
  ],
  ["safe precision limit", "2026-01-01,1000000000000.01,A,K,CNY", "precision"],
])
  test("rejects " + label, () =>
    assert.throws(() => report(prefix + value), new RegExp(err, "i")),
  );
test("error identifies source row and no partial report is returned", () =>
  assert.throws(
    () => report(prefix + "2026-01-01,1,A,K,CNY\nbad,2,B,K,CNY"),
    /Row 3/i,
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
    /Map/i,
  );
  assert.throws(
    () => validate(t, { ...map, amount: 0 }, "a", "原表单位"),
    /more than one field/i,
  );
  assert.throws(
    () => validate(t, { ...map, currency: null }, "a", "原表单位"),
    /currency/i,
  );
  assert.throws(() => validate(t, map, "a", "MYR"), /does not match/i);
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
    [60, false, /date/i],
    [1462, true, /formula/i],
  ] as const) {
    const t = book(n, false, formula).table("销售明细");
    assert.throws(() => validate(t, suggest(t.headers), "a", "原表单位"), re);
  }
});
test("size cap and unsupported extensions", () => {
  assert.throws(
    () => readSource(new Uint8Array(5 * 1024 * 1024 + 1), "large.csv"),
    /5 MiB/i,
  );
  assert.throws(() => readSource(new Uint8Array([1]), "a.xls"), /XLSX/i);
});
test("order analysis requires IDs and counts each order once per visible scope", () => {
  const t = csv(
    "date,amount,order_id,category\n2026-01-01,10.50,01,A\n2026-01-02,-1.50,01,B\n2026-02-01,2.00,01,A\n2026-02-02,5.00,02,A",
  );
  const map = suggest(t.headers, "orders");
  assert.throws(
    () => validate(t, { ...map, order: null }, "source.csv", "USD", "orders"),
    /Order ID/,
  );
  const r = validate(t, map, "source.csv", "USD", "orders");
  assert.deepEqual(orderMetrics(r.rows), {
    multi: 1,
    ranked: [
      ["01", 1100],
      ["02", 500],
    ],
    monthly: [
      ["2026-01", 1],
      ["2026-02", 2],
    ],
  });
  assert.deepEqual(
    dashboard(r, r.rows, "en").cards.map((x) => x[1]),
    ["2", "8.00", "1", "16.00"],
  );
  assert.deepEqual(
    dashboard(
      r,
      r.rows.filter((x) => x.date.startsWith("2026-02")),
      "en",
    ).cards.map((x) => x[1]),
    ["2", "3.50", "0", "7.00"],
  );
});
test("cash flow uses signed posted amounts, including zero and missing categories", () => {
  const t = csv(
    "交易日期,收支金额,收支类别,币种\n2026-01-01,10.10,A,MYR\n2026-02-01,-1.21,B,MYR\n2026-02-02,-0.12,,MYR\n2026-02-03,0,,MYR",
  );
  const map = suggest(t.headers, "cashflow"),
    r = validate(t, map, "cash.csv", "Source units", "cashflow");
  assert.deepEqual(cashMetrics(r.rows), {
    inflow: 1010,
    outflow: 133,
    net: 877,
    spending: [
      ["B", 121],
      [null, 12],
    ],
  });
  assert.deepEqual(
    dashboard(r, r.rows, "en").cards.map((x) => x[1]),
    ["10.10", "1.33", "8.77", "4"],
  );
  assert.deepEqual(
    dashboard(r, [], "en").cards.map((x) => x[1]),
    ["0.00", "0.00", "0.00", "0"],
  );
  assert.deepEqual(
    dashboard(
      r,
      r.rows.filter((x) => x.category === "B"),
      "en",
    ).cards.map((x) => x[1]),
    ["0.00", "1.21", "-1.21", "1"],
  );
  assert.equal(suggest(["Date", "Debit", "Credit"], "cashflow").amount, null);
});
test("split statement reproducer: 120 in less 35 out is 85; mapping only credit fails", () => {
  const table = csv(
    "Transaction date,Debit,Credit,Currency\n2026-10-05,0,120,MYR\n2026-10-06,35,0,MYR",
  );
  const map = suggest(table.headers, "cashflow");
  assert.equal(map.debit, 1);
  assert.equal(map.credit, 2);
  const r = validate(table, map, "bank.csv", "MYR", "cashflow");
  assert.equal(cashMetrics(r.rows).net, 8500);
  assert.throws(
    () =>
      validate(
        table,
        { ...map, debit: null, credit: null, amount: 2 },
        "bank.csv",
        "MYR",
        "cashflow",
      ),
    /single side/i,
  );
  for (const sides of [",", "-1,0", "1,2"]) {
    const bad = csv("Date,Debit,Credit\n2026-01-01," + sides);
    assert.throws(() =>
      validate(
        bad,
        suggest(bad.headers, "cashflow"),
        "bank.csv",
        "MYR",
        "cashflow",
      ),
    );
  }
});
test("daily short order codes cannot merge distinct orders; known store collisions block", () => {
  const t = csv(
      "Date,Sales Amount,Short Order ID,Long Order ID\n2026-10-04,40,GF-123,A\n2026-10-05,60,GF-123,B",
    ),
    map = suggest(t.headers, "orders");
  assert.equal(map.order, 3);
  const r = validate(t, map, "sales.csv", "MYR", "orders");
  assert.equal(metrics(r.rows, true).average, 5000);
  assert.throws(
    () => validate(t, { ...map, order: 2 }, "sales.csv", "MYR", "orders"),
    /short order/i,
  );
  const s = csv(
    "Date,Amount,Order ID,Store\n2026-01-01,40,001,A\n2026-01-01,60,001,B",
  );
  assert.throws(
    () => validate(s, suggest(s.headers, "orders"), "s.csv", "MYR", "orders"),
    /multiple stores/,
  );
});
const prow = (
  row: number,
  reference: string,
  cents: number,
  date = "2026-10-31",
): PayoutLine => ({ row, date, reference, cents });
const match = (s: PayoutLine[], b: PayoutLine[], desc = false) =>
  reconcile(
    { name: "p.csv", sheet: "CSV", rows: s },
    { name: "b.csv", sheet: "CSV", rows: b },
    "MYR",
    desc,
  );
test("unique positive credit can cross month; one-cent mismatch is visible", () => {
  const r = match(
    [prow(2, "A01", 12000), prow(3, "B01", 9000)],
    [prow(2, "A01", 12000, "2026-11-02"), prow(3, "B01", 8999)],
  );
  assert.deepEqual(
    r.cases.map((c) => c.status),
    ["matched", "difference"],
  );
  assert.deepEqual(payoutTotals(r.cases), {
    expected: 21000,
    confirmed: 12000,
    issues: 1,
    bankOnly: 0,
  });
});
test("duplicate references or a description linking two references quarantine the full group", () => {
  const r = match(
    [prow(2, "A", 100), prow(3, "B", 100)],
    [prow(2, "A", 100), prow(3, "TRANSFER A;B", 100)],
    true,
  );
  assert.equal(r.cases.length, 1);
  assert.equal(r.cases[0].status, "review");
  assert.equal(r.cases[0].bank.length, 2);
  assert.equal(
    match([prow(2, "A", 100), prow(3, "A", 100)], [prow(2, "A", 200)]).cases[0]
      .status,
    "review",
  );
});
test("absent or partial references and equal amounts never auto-match", () => {
  const r = match(
    [prow(2, "ABC1", 500), prow(3, "", 200), prow(4, "ZZ", 900)],
    [prow(2, "ABC10", 500), prow(3, "abc1", 500), prow(4, "", 200)],
    true,
  );
  assert.equal(payoutTotals(r.cases).confirmed, 0);
  const s = r.cases.find((c) => c.settlement[0]?.reference === "ABC1")!;
  assert.equal(s.status, "review");
  assert.deepEqual(s.candidateRows, [2, 3]);
  assert.equal(
    r.cases.find((c) => c.settlement[0]?.reference === "ZZ")!.status,
    "pending",
  );
  assert.equal(r.cases.flatMap((c) => c.bank).length, 3);
});
test("negative receipts, out-of-window or earlier dates require review", () => {
  for (const b of [
    prow(2, "A", 100, "2026-11-08"),
    prow(2, "A", 100, "2026-10-30"),
    prow(2, "A", -100),
  ]) {
    assert.equal(match([prow(2, "A", 100)], [b]).cases[0].status, "review");
  }
  assert.equal(
    match([prow(2, "A", 100)], [prow(2, "A", 100, "2026-11-07")]).cases[0]
      .status,
    "matched",
  );
});
test("payout parsing requires currency confirmation; DMY dates require explicit mode", () => {
  const t = csv(
    "Booking date,Reference,Debit,Credit,Currency\n01/11/2026,0004,,14.55,MYR",
  );
  const map = payoutSuggest(t.headers, "bank");
  assert.throws(
    () => preparePayout(t, map, "b", "bank", "", true),
    /currency/i,
  );
  assert.throws(
    () => preparePayout(t, map, "b", "bank", "USD", true),
    /row currency/i,
  );
  assert.throws(() => preparePayout(t, map, "b", "bank", "MYR", false), /YYYY/);
  assert.deepEqual(preparePayout(t, map, "b", "bank", "MYR", true).rows, [
    { row: 2, reference: "0004", date: "2026-11-01", cents: 1455 },
  ]);
  const p = csv("Date,Reference,Gross sales\n2026-10-01,A,100");
  assert.throws(
    () =>
      preparePayout(
        p,
        { ...payoutSuggest(p.headers, "settlement"), amount: 2 },
        "p",
        "settlement",
        "MYR",
        false,
      ),
    /Gross/,
  );
});
