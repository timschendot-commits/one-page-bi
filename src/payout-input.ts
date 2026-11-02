import {
  cents,
  dateValue,
  identifier,
  raw,
  splitCents,
  type Table,
} from "./input";
import { keyName, debitNames, creditNames, directionHeader } from "./model";
import { errorText, LocalizedError, translator, type Message } from "./i18n";
import type { PayoutSource, Role } from "./payout-model";

export type PayoutField =
  | "date"
  | "reference"
  | "amount"
  | "debit"
  | "credit"
  | "currency";
export type PayoutMap = Record<PayoutField, number | null>;
export const payoutFields: Record<PayoutField, Message> = {
  date: "Date",
  reference: "Settlement reference",
  amount: "Signed amount",
  debit: "Debit / money out",
  credit: "Credit / money in",
  currency: "Currency code",
};
export const visibleFields = (role: Role): PayoutField[] =>
  role === "bank"
    ? ["date", "reference", "amount", "debit", "credit", "currency"]
    : ["date", "reference", "amount", "currency"];
const aliases = {
  settlement: {
    date: [
      "payoutdate",
      "settlementdate",
      "transferdate",
      "date",
      "结算日期",
      "打款日期",
      "日期",
    ],
    reference: [
      "bankstatementcode",
      "settlementreference",
      "payoutreference",
      "reference",
      "结算参考码",
      "银行流水参考码",
      "参考码",
    ],
    amount: [
      "netpayout",
      "netsettlement",
      "netamount",
      "transferamount",
      "payoutamount",
      "应到账净额",
      "结算净额",
      "打款金额",
    ],
  },
  bank: {
    date: [
      "bookingdate",
      "postingdate",
      "transactiondate",
      "date",
      "入账日期",
      "记账日期",
      "交易日期",
      "日期",
    ],
    reference: [
      "bankreference",
      "reference",
      "bankstatementcode",
      "参考码",
      "银行参考码",
      "交易参考号",
    ],
    amount: [
      "signedamount",
      "amount",
      "transactionamount",
      "带符号金额",
      "收支金额",
      "交易金额",
      "金额",
    ],
  },
};
export function payoutSuggest(headers: string[], role: Role): PayoutMap {
  const column = (names: string[]) => {
    const hits = headers.flatMap((h, i) =>
      names.includes(keyName(h)) ? [i] : [],
    );
    return hits.length === 1 ? hits[0] : null;
  };
  const fields = aliases[role];
  const debit = role === "bank" ? column(debitNames) : null,
    credit = role === "bank" ? column(creditNames) : null;
  const ref = column(fields.reference);
  return {
    date: column(fields.date),
    reference:
      role === "bank" && ref === null
        ? column([
            "description",
            "transactiondescription",
            "narration",
            "摘要",
            "交易描述",
          ])
        : ref,
    amount: debit !== null && credit !== null ? null : column(fields.amount),
    debit,
    credit,
    currency: column(["currency", "currencycode", "币种", "货币"]),
  };
}
function invalid(key: Message): never {
  throw new LocalizedError((lang) => translator(lang)(key));
}
export function preparePayout(
  table: Table,
  map: PayoutMap,
  name: string,
  role: Role,
  currency: string,
  dayFirst: boolean,
): PayoutSource {
  if (!/^[A-Z]{3}$/.test(currency))
    invalid("Confirm the common three-letter currency for both files.");
  const selected = visibleFields(role)
    .map((k) => map[k])
    .filter((v) => v !== null);
  if (
    selected.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= table.headers.length,
    ) ||
    new Set(selected).size !== selected.length
  )
    invalid("Use a different valid column for each field.");
  if (map.date === null || map.reference === null)
    invalid("Map the date and reference columns on both sources.");
  if (
    [
      "shortorderid",
      "longorderid",
      "orderid",
      "bookingid",
      "短订单号",
      "长订单号",
      "订单号",
    ].includes(keyName(table.headers[map.reference]))
  )
    invalid("Choose a settlement or bank reference, not an order ID.");
  const split = role === "bank" && map.debit !== null && map.credit !== null;
  if (
    map.amount === null
      ? !split
      : map.debit !== null ||
        map.credit !== null ||
        directionHeader(table.headers[map.amount])
  )
    invalid(
      "Map one signed amount OR both debit and credit columns. A single side cannot represent net cash.",
    );
  if (
    map.amount !== null &&
    [
      "gross",
      "grossamount",
      "grosssales",
      "salesamount",
      "balance",
      "runningbalance",
      "availablebalance",
      "销售总额",
      "余额",
      "可用余额",
    ].includes(keyName(table.headers[map.amount]))
  )
    invalid(
      "Use the net transfer or booked amount. Gross sales and balances cannot be reconciled as payouts.",
    );
  if (
    table.headers.some((h) =>
      ["currency", "currencycode", "币种", "货币"].includes(keyName(h)),
    ) &&
    map.currency === null
  )
    invalid("Map the detected currency column to check for mixed currencies.");
  let magnitude = 0;
  const rows = table.lines.map(({ n, cells }) => {
    try {
      if (
        map.currency !== null &&
        raw(cells[map.currency]).toUpperCase() !== currency
      )
        invalid("The row currency does not match the confirmed currency.");
      const value = split
        ? splitCents(cells[map.debit!], cells[map.credit!])
        : cents(cells[map.amount!]);
      magnitude += Math.abs(value);
      return {
        row: n,
        date: dateValue(cells[map.date!], table.date1904, dayFirst),
        reference: identifier(cells[map.reference!]),
        cents: value,
      };
    } catch (err) {
      throw new LocalizedError(
        (lang) =>
          name +
          " / " +
          table.sheet +
          " / " +
          translator(lang)("Row {row}", { row: n }) +
          " — " +
          errorText(err, lang),
      );
    }
  });
  if (magnitude > 1e14)
    invalid("The sum of absolute amounts exceeds the supported precision.");
  return { name, sheet: table.sheet, rows };
}
