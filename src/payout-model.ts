import type { Message } from "./i18n";

export type Role = "settlement" | "bank";
export type Status =
  | "matched"
  | "difference"
  | "pending"
  | "review"
  | "bankOnly";
export const statusLabels: Record<Status, Message> = {
  matched: "Matched",
  difference: "Amount differs",
  pending: "Awaiting bank evidence",
  review: "Needs review",
  bankOnly: "Bank only",
};
export const nextSteps: Record<Status, Message> = {
  matched: "Retain both original lines as evidence.",
  difference:
    "Check fees, adjustments and the bank entry for this payout reference.",
  pending: "Check a later statement before treating the payout as missing.",
  review: "Inspect the source rows and obtain a unique settlement reference.",
  bankOnly: "Confirm whether this bank transaction belongs to the platform.",
};
export interface PayoutLine {
  row: number;
  date: string;
  reference: string;
  cents: number;
}
export interface PayoutSource {
  name: string;
  sheet: string;
  rows: PayoutLine[];
}
export interface PayoutCase {
  status: Status;
  reason: Message;
  settlement: PayoutLine[];
  bank: PayoutLine[];
  candidateRows?: number[];
  candidateCount?: number;
}
export interface PayoutReport {
  created: string;
  currency: string;
  settlement: Pick<PayoutSource, "name" | "sheet">;
  bank: Pick<PayoutSource, "name" | "sheet">;
  cases: PayoutCase[];
}
export const maxLagDays = 7;
function append<T>(map: Map<string, T[]>, key: string, value: T) {
  const items = map.get(key);
  if (items) items.push(value);
  else map.set(key, [value]);
}
function classify(s: PayoutLine[], b: PayoutLine[]): PayoutCase {
  const result = (status: Status, reason: Message) => ({
    status,
    reason,
    settlement: s,
    bank: b,
  });
  if (s.length > 1 || b.length > 1)
    return result("review", "Duplicate or conflicting references");
  if (!s[0].reference || s[0].cents <= 0)
    return result("review", "Missing reference or nonpositive payout");
  if (!b.length)
    return result(
      "pending",
      "No bank line with this reference in the supplied period",
    );
  if (b[0].cents <= 0)
    return result("review", "Bank entry is not a positive receipt");
  const lag = (Date.parse(b[0].date) - Date.parse(s[0].date)) / 86400000;
  if (lag < 0 || lag > maxLagDays)
    return result("review", "Booking date outside the 0–7 day check window");
  if (s[0].cents !== b[0].cents)
    return result("difference", "Reference agrees; bank amount differs");
  return result("matched", "Unique reference, date window and amount agree");
}
// Every input row belongs to exactly one case. A bank description citing two
// references links the whole component for review; neither reference can auto-match.
export function reconcile(
  settlement: PayoutSource,
  bank: PayoutSource,
  currency: string,
  description: boolean,
): PayoutReport {
  const pay = new Map<string, PayoutLine[]>(),
    bankByRef = new Map<string, PayoutLine[]>(),
    linked = new Map<PayoutLine, string[]>();
  const cases: PayoutCase[] = [];
  for (const row of settlement.rows) {
    if (row.reference) append(pay, row.reference, row);
    else cases.push(classify([row], []));
  }
  for (const row of bank.rows) {
    const tokens = description
      ? [row.reference, ...row.reference.split(/[\s,;|]+/)]
      : [row.reference];
    const keys = [...new Set(tokens.filter((key) => pay.has(key)))];
    linked.set(row, keys);
    if (!keys.length)
      cases.push({
        status: "bankOnly",
        reason: "No exact settlement reference in the supplied file",
        settlement: [],
        bank: [row],
      });
    else for (const key of keys) append(bankByRef, key, row);
  }
  const visited = new Set<string>();
  for (const start of pay.keys()) {
    if (visited.has(start)) continue;
    const queue = [start],
      platformRows: PayoutLine[] = [],
      bankRows = new Set<PayoutLine>();
    visited.add(start);
    for (let i = 0; i < queue.length; i++) {
      const key = queue[i];
      platformRows.push(...pay.get(key)!);
      for (const line of bankByRef.get(key) ?? []) {
        if (bankRows.has(line)) continue;
        bankRows.add(line);
        for (const next of linked.get(line)!)
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
      }
    }
    cases.push(classify(platformRows, [...bankRows]));
  }
  // Weak candidates are pointers to bank-only lines, never allocations of a receipt.
  const byAmount = new Map<number, PayoutLine[]>();
  for (const line of bank.rows)
    if (!linked.get(line)?.length && line.cents > 0) {
      const group = byAmount.get(line.cents) ?? [];
      group.push(line);
      byAmount.set(line.cents, group);
    }
  for (const group of byAmount.values())
    group.sort((a, b) => a.date.localeCompare(b.date) || a.row - b.row);
  function lower(group: PayoutLine[], date: string) {
    let lo = 0,
      hi = group.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (group[mid].date < date) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  for (const c of cases) {
    if (c.bank.length || c.settlement.length !== 1) continue;
    const s = c.settlement[0],
      group = byAmount.get(s.cents);
    if (!group) continue;
    const start = lower(group, s.date),
      after = new Date(Date.parse(s.date) + (maxLagDays + 1) * 86400000);
    const end =
      after.getUTCFullYear() > 9999
        ? group.length
        : lower(group, after.toISOString().slice(0, 10));
    if (end > start) {
      c.status = "review";
      c.reason = "Same amount in the date window, but no confirmed reference";
      c.candidateCount = end - start;
      c.candidateRows = group
        .slice(start, Math.min(end, start + 5))
        .map((x) => x.row);
    }
  }
  return {
    created: new Date().toISOString(),
    currency,
    settlement: { name: settlement.name, sheet: settlement.sheet },
    bank: { name: bank.name, sheet: bank.sheet },
    cases,
  };
}
export function payoutTotals(cases: PayoutCase[]) {
  let expected = 0,
    confirmed = 0,
    issues = 0,
    bankOnly = 0;
  for (const c of cases) {
    for (const row of c.settlement) if (row.cents > 0) expected += row.cents;
    if (c.status === "matched") confirmed += c.settlement[0].cents;
    else if (c.status === "bankOnly") bankOnly += c.bank.length;
    else issues++;
  }
  return { expected, confirmed, issues, bankOnly };
}
