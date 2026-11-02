import type { Message } from "./i18n";
export const business = {
  reorder: {
    title: "Stock replenishment",
    material: "Stock thresholds",
    amount: "Forecast quantity",
    dimension: "Location",
  },
  pipeline: {
    title: "Open sales pipeline",
    material: "Open opportunities",
    amount: "Open deal amount",
    dimension: "Sales stage",
  },
  repeat: {
    title: "Repeat customers",
    material: "Customer order lines",
    amount: "Sales amount",
    dimension: "Customer",
  },
  purchase: {
    title: "Purchasing by supplier",
    material: "Vendor invoices",
    amount: "Purchase amount",
    dimension: "Supplier",
  },
  expense: {
    title: "Expenses by category",
    material: "Expense register",
    amount: "Expense amount",
    dimension: "Category",
  },
  customer: {
    title: "Sales by customer",
    material: "Customer sales lines",
    amount: "Sales amount",
    dimension: "Customer",
  },
  product: {
    title: "Sales by SKU",
    material: "Item sales lines",
    amount: "Sales amount",
    dimension: "SKU",
  },
  channel: {
    title: "Sales by channel",
    material: "Channel sales lines",
    amount: "Sales amount",
    dimension: "Channel",
  },
  store: {
    title: "Sales by store",
    material: "Store sales lines",
    amount: "Sales amount",
    dimension: "Store",
  },
  project: {
    title: "Project billing",
    material: "Project billing lines",
    amount: "Billed amount",
    dimension: "Project",
  },
  margin: {
    title: "Gross profit",
    material: "Sales with actual line cost",
    amount: "Sales amount",
    dimension: "Category",
  },
  stock: {
    title: "Stock on hand",
    material: "Stock snapshots",
    amount: "On hand",
    dimension: "Location",
  },
  ar: {
    title: "Receivables aging",
    material: "Open customer invoices",
    amount: "Outstanding",
    dimension: "Customer",
  },
  ap: {
    title: "Payables aging",
    material: "Open supplier invoices",
    amount: "Outstanding",
    dimension: "Supplier",
  },
  journal: {
    title: "Journal movements by account",
    material: "Posted journal lines",
    amount: "Debit",
    dimension: "Account",
  },
  trial: {
    title: "Trial balance roll-forward",
    material: "Account opening, movement and closing balances",
    amount: "Closing balance",
    dimension: "Account",
  },
  income: {
    title: "Income and expense statement",
    material: "Classified period account balances",
    amount: "Period amount",
    dimension: "Account",
  },
  position: {
    title: "Balance sheet check",
    material: "Classified balance sheet accounts",
    amount: "Closing balance",
    dimension: "Account",
  },
  budget: {
    title: "Budget versus actual",
    material: "Budget and actuals by period",
    amount: "Actual amount",
    dimension: "Category",
  },
  workcost: {
    title: "Work order costs",
    material: "Posted work order costs",
    amount: "Posted cost",
    dimension: "Work order",
  },
} as const;
export type Business = keyof typeof business;
export const businessIds = Object.keys(business) as Business[];
export function isBusiness(value: unknown): value is Business {
  return typeof value === "string" && Object.hasOwn(business, value);
}
export function byKind<T>(fn: (id: Business) => T): Record<Business, T> {
  return Object.fromEntries(businessIds.map((id) => [id, fn(id)])) as Record<
    Business,
    T
  >;
}
export const extraRecipes = byKind(
  (id) =>
    ({
      name: business[id].title,
      title: business[id].title,
      material: business[id].material,
      grain: "Keep and verify the original rows for each selected field.",
      guide: "Choose the business report for this material.",
      parts: business[id].material,
      footer:
        id === "reorder"
          ? "Quantity needed to reach the target when forecast stock is below the minimum."
          : id === "pipeline"
            ? "Open amounts are weighted by their recorded percentage."
            : id === "repeat"
              ? "Positive-net orders per customer in the selected rows."
              : id === "ar" || id === "ap"
                ? "Aging date is the source snapshot date."
                : "Keep and verify the original rows for each selected field.",
      definitions: {
        amount: business[id].amount,
        group: business[id].dimension,
      },
    }) as const,
);
export function isQuantityReport(id: unknown) {
  return id === "stock" || id === "reorder";
}
export function fieldSpec(id: Business): Record<string, Message> {
  const spec: Record<string, Message> = {
    date: "Date",
    amount: business[id].amount,
    category: business[id].dimension,
    currency: "Currency",
  };
  if (id === "repeat") spec.order = "Order ID";
  if (id === "pipeline") {
    spec.date = "Snapshot date";
    spec.order = "Opportunity ID";
    spec.price = "Win probability (%)";
    spec.reference = "Opportunity status";
  }
  if (id === "reorder") {
    spec.price = "Minimum quantity";
    spec.quantity = "Target quantity";
  }
  if (id === "margin") spec.price = "Cost of goods sold";
  if (isQuantityReport(id)) {
    spec.date = "Snapshot date";
    spec.order = "SKU";
    spec.reference = "Stock unit";
    delete spec.currency;
  }
  if (id === "ar" || id === "ap") {
    spec.date = "Due date";
    spec.reference = "Snapshot date";
    spec.order = "Invoice ID";
  }
  if (id === "journal") {
    spec.order = "Journal ID";
    spec.debit = "Debit";
    spec.credit = "Credit";
    delete spec.amount;
  }
  if (["trial", "income", "budget"].includes(id)) spec.date = "Period end";
  if (id === "position") spec.date = "Snapshot date";
  if (id === "trial") {
    spec.price = "Opening balance";
    spec.debit = "Period debit";
    spec.credit = "Period credit";
  }
  if (id === "position" || id === "income") spec.reference = "Account class";
  if (id === "budget") spec.price = "Budget amount";
  return spec;
}
