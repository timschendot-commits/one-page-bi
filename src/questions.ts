import type { Kind, Use } from "./materials";
import type { Message } from "./i18n";
export const questionFor: Record<Kind, Message> = {
  sales: "How much did we sell?",
  orders: "How many orders did we get?",
  cashflow: "What came in and what went out?",
  payout: "Did the platform pay us?",
  purchase: "Which suppliers did we buy from?",
  expense: "Where did we spend the money?",
  customer: "Who bought the most?",
  product: "Which products sold the most by value?",
  channel: "Which channels brought in sales?",
  store: "Which stores sold the most?",
  project: "How much did each project invoice?",
  margin: "How much was left after product costs?",
  stock: "What is on the shelf?",
  ar: "Who owes us money?",
  ap: "Whom do we still need to pay?",
  journal: "What was posted to each account?",
  trial: "Do opening and closing balances agree?",
  income: "What did we earn after expenses?",
  position: "Do assets balance with liabilities and equity?",
  budget: "Where are we over budget?",
  workcost: "What did each work order cost?",
  reorder: "Which items need replenishment?",
  pipeline: "What is our open sales pipeline worth?",
  repeat: "Which customers bought again?",
};
export const categories: { title: Message; ids: Kind[] }[] = [
  {
    title: "Sales & customers",
    ids: [
      "sales",
      "orders",
      "product",
      "customer",
      "repeat",
      "channel",
      "store",
      "pipeline",
      "margin",
    ],
  },
  {
    title: "Money & accounts",
    ids: [
      "cashflow",
      "payout",
      "ar",
      "ap",
      "journal",
      "trial",
      "income",
      "position",
    ],
  },
  { title: "Purchasing & stock", ids: ["purchase", "stock", "reorder"] },
  {
    title: "Projects & costs",
    ids: ["expense", "budget", "project", "workcost"],
  },
];
export function usesFor(kind: Kind): Use[] {
  return kind === "payout"
    ? ["settlement", "bank"]
    : kind === "orders" || kind === "sales"
      ? ["sales", "header", "lines"]
      : [kind];
}
