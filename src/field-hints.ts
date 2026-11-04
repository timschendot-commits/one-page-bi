import { keyName } from "./model";
// Semantic suggestions only: keep the original staged headers for historical replay.
export const fieldHints: Record<string, string[]> = {
 "Carrying value":["inventory carrying value","stock balance value","账面价值","库存账面价值"],
  Customer: [
    "customer_id",
    "client id",
    "buyer id",
    "客户编号",
    "客户编码",
    "买家编号",
  ],
  SKU: ["stockcode", "sku code", "item sku", "货品编码", "存货编码"],
  "Order ID": ["sales order no", "merchant order id", "商户订单号", "销售单号"],
  "Sales amount": [
    "net line sales",
    "item net sales",
    "商品行净额",
    "行实收销售额",
  ],
  Currency: ["ccy", "transaction currency", "交易币种"],
  "Signed amount": ["net transaction amount", "交易净发生额"],
  "Booking date": ["booked on", "bank posting date", "银行入账日"],
  "Forecast quantity": [
    "forecasted qty",
    "forecasted quantity",
    "预计可用量",
    "预计可用数量",
  ],
  "Minimum quantity": ["min qty", "min quantity", "最低库存", "最低库存量"],
  "Target quantity": ["max qty", "max quantity", "目标库存", "最高库存量"],
  "Stock unit": ["uom", "库存单位"],
  "Open deal amount": ["open opportunity amount", "在谈金额", "商机金额"],
  "Sales stage": ["pipeline stage", "销售阶段", "商机阶段"],
  "Opportunity ID": ["deal id", "商机编号", "商机ID"],
  "Win probability (%)": [
    "win probability percent",
    "probability pct",
    "赢单概率（%）",
    "赢单概率(%)",
  ],
  "Opportunity status": ["deal status", "商机状态"],
  "Snapshot date": ["snapshot as of", "数据截至日"],
};
const semantic = new Map(
  Object.entries(fieldHints).flatMap(([field, aliases]) =>
    aliases.map((alias) => [keyName(alias.normalize("NFKC")), field] as const),
  ),
);
export function hintName(header: string) {
  return semantic.get(keyName(header.normalize("NFKC"))) ?? header;
}
