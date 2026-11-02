import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { openSQL, preparedSource, tableCSV } from "../src/stage";
import {
  inspect,
  matches,
  compile,
  isSales,
  getSheet,
  layout,
  preflight,
} from "../src/materials";
import { businessIds, fieldSpec } from "../src/catalog";
import { dashboard } from "../src/recipes";
const sql = await openSQL(),
  b = (s: string) => new TextEncoder().encode(s);
function item(s: string, name = "000.csv") {
  return inspect(name, name, name, b(s), sql);
}
function pick(s: string, id: string) {
  const list = matches([item(s)]);
  const c = list.find((c) => c.kind === id);
  assert.ok(c, JSON.stringify(list.map((c) => c.kind)));
  return c;
}
test("SQL import handles semicolon, pipe, TSV, arbitrary columns, BOM, preamble, blank and exactly repeated headers", () => {
  for (const sep of [";", "|", "\t", ","]) {
    const line = (...v: string[]) => v.join(sep);
    const head = line("订单号", "销售额", "日期", "币种");
    const m = item(
      [
        "材料导出",
        head,
        line("0007", "30.10", "2026-01-01", "MYR"),
        "",
        head,
        line("0008", "-1.25", "2026-01-02", "MYR"),
      ].join("\r\n"),
    );
    const view = m.views[0];
    assert.equal(view.headerRow, 2);
    assert.deepEqual(view.table!.audit!.removed, [4, 5]);
    assert.match(view.table!.audit!.query, /SELECT source_row/);
    const r = compile(matches([m]).find((c) => c.kind === "orders")!, "MYR");
    assert.ok(isSales(r));
    assert.deepEqual(
      r.rows.map((x) => [x.row, x.order, x.cents]),
      [
        [3, "0007", 3010],
        [6, "0008", -125],
      ],
    );
  }
});
test("headerless keeps row one, exposes evidence, requires a human to identify amounts", () => {
  const m = item("2026-05-01|0010|9.25|MYR\n2026-05-02|0011|0.25|MYR");
  const v = m.views[0];
  assert.equal(v.noHeader, true);
  assert.equal(v.table!.lines[0].n, 1);
  assert.equal(matches([m]).length, 0);
  const l = layout(v.table!, "sales");
  assert.equal(l.columns.date, 0);
  assert.equal(l.columns.currency, 3);
  l.columns.amount = 2;
  l.columns.order = 1;
  v.manual = l;
  const r = compile(matches([m]).find((c) => c.kind === "sales")!, "MYR");
  assert.ok(isSales(r));
  assert.deepEqual(
    r.rows.map((r) => r.order),
    ["0010", "0011"],
  );
});
test("dirty rows block the complete report; dangerous fields stay data", () => {
  for (const data of [
    "Date,Sales amount,Category\n2026-01-01,10,A\n2026-01-01,10,A",
    "Date,Sales amount,Category\n2026-01-01,10,A\n2026-01-02,10,Subtotal",
  ]) {
    const c = pick(data, "sales");
    assert.equal(preflight(c).state, "blocked");
    assert.throws(() => compile(c, "MYR"), /Row 3/);
  }
  const m = item("Date,Sales amount,Customer\n2026-01-01,3,=1+2");
  assert.match(tableCSV(m.views[0].table!), /'=1\+2/);
  const a = item("Date;Amount|Currency\n2026-01-01;1.00|MYR");
  assert.ok(a.error);
  const malformed = item(
    "Date;Amount;Currency\n2026-01-01;1;MYR\n2026-01-02;1",
  );
  assert.ok(malformed.views[0].error);
});
const data: Record<string, string> = {
  Date: "2026-05-01",
  "Snapshot date": "2026-05-21",
  "Due date": "2026-05-01",
  "Invoice ID": "001",
  "Journal ID": "J1",
  SKU: "00007",
  Location: "North",
  "Stock unit": "pieces",
  Currency: "MYR",
  "Purchase amount": "42.10",
  "Expense amount": "12",
  "Sales amount": "100",
  "Billed amount": "25",
  "On hand": "12",
  Outstanding: "20",
  "Cost of goods sold": "60",
  Debit: "10",
  Credit: "0",
  Category: "Food",
  Supplier: "V",
  Customer: "C",
  Project: "P",
  Channel: "Web",
  Store: "S",
  Account: "1000",
  "Period end": "2026-05-31",
  "Closing balance": "10",
  "Opening balance": "0",
  "Period debit": "10",
  "Period credit": "0",
  "Account class": "income",
  "Period amount": "20",
  "Budget amount": "12",
  "Actual amount": "15",
  "Work order": "WO01",
  "Posted cost": "5",
};
for (const id of businessIds)
  test("real recipe path: " + id, () => {
    const fields = Object.values(fieldSpec(id));
    let text = fields.join(",") + "\n" + fields.map((k) => data[k]).join(",");
    if (id === "journal")
      text +=
        "\n" +
        fields
          .map((k) =>
            k === "Debit"
              ? "0"
              : k === "Credit"
                ? "10"
                : k === "Account"
                  ? "4000"
                  : data[k],
          )
          .join(",");
    if (id === "trial")
      text +=
        "\n" +
        fields
          .map((k) =>
            k === "Account"
              ? "4000"
              : k === "Closing balance"
                ? "-10"
                : k === "Period debit"
                  ? "0"
                  : k === "Period credit"
                    ? "10"
                    : data[k],
          )
          .join(",");
    if (id === "income")
      text +=
        "\n" +
        fields
          .map((k) =>
            k === "Account"
              ? "5000"
              : k === "Account class"
                ? "expense"
                : k === "Period amount"
                  ? "6"
                  : data[k],
          )
          .join(",");
    if (id === "position") {
      text = text.replace(",income", ",asset");
      for (const [i, cls] of ["liability", "equity"].entries())
        text +=
          "\n" +
          fields
            .map((k) =>
              k === "Account"
                ? "40" + i
                : k === "Account class"
                  ? cls
                  : k === "Closing balance"
                    ? "5"
                    : data[k],
            )
            .join(",");
    }
    const c = pick(text, id),
      r = compile(c, "MYR");
    assert.ok(isSales(r));
    const kpis = dashboard(r, r.rows, "en").cards;
    assert.equal(kpis.length, 4);
    const expected: Record<string, string> = {
      trial: "10.00",
      income: "20.00",
      position: "10.00",
      budget: "12.00",
      workcost: "5.00",
      journal: "10.00",
      margin: "40.00",
      stock: "12.00",
      ar: "20.00",
      ap: "20.00",
      expense: "12.00",
      purchase: "42.10",
      project: "25.00",
    };
    assert.equal(kpis[0][1], expected[id] ?? "100.00");
  });
test("blocks unbalanced journal, mixed snapshots and overlapping positions", () => {
  const a = pick(
    "Date,Journal ID,Account,Debit,Credit,Currency\n2026-01-01,J,01,10,0,MYR",
    "journal",
  );
  assert.throws(() => compile(a, "MYR"), /Unbalanced/);
  for (const dt of ["2026-02-02", "2026-02-01"]) {
    const c = pick(
      "Snapshot date,On hand,Location,SKU,Stock unit\n2026-02-01,3,N,X,pieces\n" +
        dt +
        ",4,N,X,pieces",
      "stock",
    );
    assert.throws(() => compile(c, "Source units"), /snapshot/i);
  }
});
test(
  "published UCI consecutive sales lines agree with independently computed pandas/Decimal total",
  { skip: !existsSync(".cache/public-case/x17.csv") },
  () => {
    const m = inspect(
      "x",
      "x17.csv",
      "src",
      readFileSync(".cache/public-case/x17.csv"),
      sql,
    );
    const expected = JSON.parse(
      readFileSync(".cache/public-case/expected.json", "utf8"),
    );
    const c = matches([m]).find((c) => c.kind === "sales");
    assert.ok(c, JSON.stringify(m.views));
    const r = compile(c, "GBP");
    assert.ok(isSales(r));
    assert.equal(r.rows.length, expected.rows);
    assert.equal(
      r.rows.reduce((n, x) => n + x.cents, 0),
      expected.value_pence,
    );
  },
);
test("known mixed entities, unposted lines and comma-decimal uncertainty stop reported totals", () => {
  for (const [source, err] of [
    ["Date,Sales amount,Company\n2026-01-01,10,A\n2026-01-02,20,B", /entities/],
    ["Date,Sales amount,Status\n2026-01-01,10,Draft", /posting/],
    ["Date;Sales amount\n2026-01-01;1,234", /Ambiguous comma/],
  ] as const) {
    assert.throws(() => compile(pick(source, "sales"), "MYR"), err);
  }
});
test("unbalanced statement equations cannot publish", () => {
  const trial =
    "Period end,Closing balance,Account,Currency,Opening balance,Period debit,Period credit\n2026-05-01,100,1000,MYR,0,10,0";
  assert.throws(() => compile(pick(trial, "trial"), "MYR"), /closing/);
  const bs =
    "Snapshot date,Closing balance,Account,Currency,Account class\n2026-05-01,99,A,MYR,asset\n2026-05-01,50,L,MYR,liability\n2026-05-01,50,E,MYR,equity";
  assert.throws(() => compile(pick(bs, "position"), "MYR"), /Assets/);
});
