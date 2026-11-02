export type Language = "en" | "zh-CN";

const chinese = {
  Currency: "币种",
  "Back to workbench":"返回工作台",
  "This panel could not be displayed. Your files are still on the grid.":"这个窗口未能显示，文件仍保留在合成台上。",
 "Identical to source row":"与原数据行完全相同","Conflicting column meanings":"字段重名","Summary or balance row":"合计或余额行","Blank":"空白","Numeric-looking text":"数字外观","Text":"文本",
  "Trial balance roll-forward": "试算平衡与余额勾稽",
  "Account opening, movement and closing balances":
    "科目期初、发生额与期末余额",
  "Closing balance": "期末余额",
  "Income and expense statement": "期间收入费用表",
  "Classified period account balances": "已分类的期间科目余额",
  "Period amount": "期间金额",
  "Balance sheet check": "资产负债平衡核查",
  "Classified balance sheet accounts": "已分类的资产负债科目",
  "Budget versus actual": "预算与实际对比",
  "Budget and actuals by period": "同口径预算和实际数",
  "Actual amount": "实际金额",
  "Posted cost": "已过账成本",
  "Work order costs": "工单成本",
  "Posted work order costs": "已过账的工单成本明细",
  "Work order": "工单",
  "Period end": "期末日期",
  "Opening balance": "期初余额",
  "Period debit": "本期借方发生额",
  "Period credit": "本期贷方发生额",
  "Account class": "科目类别",
  "Budget amount": "预算金额",
  Variance: "实际减预算",
  Income: "收入",
  Expenses: "费用",
  "Period result": "期间损益",
  Assets: "资产",
  Liabilities: "负债",
  Equity: "权益",
  Difference: "差额",
  "Closing debits": "期末借方余额",
  "Closing credits": "期末贷方余额",
  "Previous rows": "上一页数据",
  "Next rows": "下一页数据",
  "Show all staged columns": "查看合成前的全部整理列",
  "Stock unit": "计量单位",
  "Cost of goods sold": "已售商品成本",
  "Snapshot date": "截至日期",
  "Due date": "到期日",
  "Invoice ID": "发票号",
  "Journal ID": "凭证号",
  Credit: "贷方",
  Rows: "行数",
  Groups: "分组数",
  "Largest group": "最大分组",
  "Total amount": "合计金额",
  "Net billed": "开票净额",
  "Net purchases": "采购净额",
  "Net expenses": "费用净额",
  "Gross margin": "毛利率",
  Overdue: "已逾期",
  "Not yet due": "尚未到期",
  "Age by due date": "按到期日分组",
  "Units on hand": "在手数量",
  Locations: "库位数",
  SKUs: "商品数",
  "Negative positions": "负库存项",
  "Amount by group": "各组金额",
  "Period movements": "期间发生额",
  "Account movement": "科目发生额",
  "Net debit": "借贷差额",
  Debits: "借方发生额",
  Credits: "贷方发生额",
  "Quantity by location": "各库位数量",
  "Monthly amount": "各月金额",
  "Checked materials": "核查中间材料",
  "Keep and verify the original rows for each selected field.":
    "按已选字段核对并保留原始行。",
  "Choose the business report for this material.":
    "按这份材料的业务含义选择报表。",
  "Recipe catalog": "报表目录",
  Unit: "单位",
  "Aging date is the source snapshot date.": "以材料中的快照日计算账龄。",
  "Review staging and verify": "核查材料与重新验证",
  "Run verification": "从原件重算验证",
  "Open or export CSV": "查看或导出材料 CSV",
  "Rule database": "规则库",
  "Sources required": "所需字段",
  "Save a copy": "另存副本",
  "Source row": "来源行",
  Snapshot: "快照",
  "Verification passed": "复算一致",
  "Verification failed": "核验未通过",
  "Exported material": "已导出材料",
  "Report catalog": "报表目录",
  "Number of visible records": "当前筛选行数",
  "Six largest groups": "金额最大的六组",
  "Available in this view": "当前筛选范围",
  Current: "未逾期",
  "1–30 days": "1–30 天",
  "31–60 days": "31–60 天",
  "61–90 days": "61–90 天",
  "Over 90 days": "超过 90 天",
  "Purchasing by supplier": "供应商采购分析",
  "Vendor invoices": "采购发票",
  "Purchase amount": "采购净额",
  Supplier: "供应商",
  "Expenses by category": "费用分类分析",
  "Expense register": "费用明细",
  "Expense amount": "费用金额",
  "Sales by customer": "客户销售分析",
  "Customer sales lines": "客户销售明细",
  "Sales amount": "销售金额",
  Customer: "客户",
  "Sales by SKU": "商品销售分析",
  "Item sales lines": "商品销售明细",
  SKU: "商品编码",
  "Sales by channel": "渠道销售分析",
  "Channel sales lines": "渠道销售明细",
  Channel: "销售渠道",
  "Sales by store": "门店销售分析",
  "Store sales lines": "门店销售明细",
  Store: "门店",
  "Project billing": "项目开票分析",
  "Project billing lines": "项目开票明细",
  "Billed amount": "开票金额",
  Project: "项目",
  "Gross profit": "毛利分析",
  "Sales with actual line cost": "含实际成本的销售明细",
  "Stock on hand": "在手库存快照",
  "Stock snapshots": "库存快照",
  "On hand": "在手数量",
  Location: "库位",
  "Receivables aging": "应收账龄",
  "Open customer invoices": "未结客户发票",
  Outstanding: "未结金额",
  "Payables aging": "应付账龄",
  "Open supplier invoices": "未结供应商发票",
  "Journal movements by account": "科目借贷发生额",
  "Posted journal lines": "已过账凭证明细",
  Debit: "借方",
  Account: "科目",
  Saved: "已保存",
  "SQL material preview": "SQL 整理后的材料",
  "Blank or repeated header rows removed": "已移除空行或完全相同的表头，原行号",
  "Save material CSV": "保存材料 CSV",
  "First selected row is data (no header)": "从所选行开始就是数据（无表头）",
  "Needs correction": "需修正数据",
  "Rows checked": "已检查数据行",
  "Review meaning": "待确认口径",
  "Derived line value: whole quantity × unit price − absolute line discount. Confirm the tax and return treatment.":
    "行金额 = 整数数量 × 单价 − 该行折扣金额。请确认税费和退货口径。",
  "Export transaction rows as CSV, TSV or XLSX. Images, PDFs and general HTML cannot supply verified rows.":
    "请导出 CSV、TSV 或 XLSX 明细。图片、PDF 和普通网页不能作为已核实的交易行。",
  "Confirm a common currency before combining periods.":
    "合并多期资料前，请确认所有材料使用同一币种。",
  "An order ID repeats across periods. Confirm its identity in the source first.":
    "跨期出现相同订单号，需先核对订单是否属于同一笔业务。",
  "Overlapping periods cannot be added together automatically.":
    "日期范围重叠，不能自动相加。",
  "Combined data exceeds the row or precision limit.":
    "合并后的明细超过行数或金额精度上限。",
  "Combine the selected disjoint periods using one currency.":
    "将这些日期不重叠的明细按同一币种合并，保留各行来源。",
  "Add selected ({count})": "放入所选（{count}）",
  "Nine slots are full. Remove an item before adding more.":
    "九个材料格已满。请先移出不需要的材料。",
  "This looks like an order header. Add order items with the same order IDs.":
    "这像订单主表。请补充订单号范围一致、含行金额或数量与单价的订单明细。",
  "These look like order items. Add a header with one date per unique order ID.":
    "这像订单行明细。请补充含日期、订单号唯一的订单主表。",
  "This looks like a settlement file. Add bank transactions with a reference.":
    "这像平台结算单。补充含参考信息的银行流水即可匹配到账核对。",
  "This looks like a bank statement. Add platform net payouts to check receipts.":
    "这像银行流水。补充平台净打款数据可核对到账。",
  "Choose a business meaning and map custom headers below.":
    "可在下面指定业务用途，再映射你自己的列名。",
  "Choose the final line value, or clear it to use quantity × unit price less line discount.":
    "有最终行金额时优先使用它；清空该映射才会用数量 × 单价减行折扣金额。",
  "Duplicate or missing order IDs prevent a safe join. Check both order sets.":
    "订单号重复或缺失会阻止可靠关联，请核对两侧订单范围。",
  "Order headers": "订单主表",
  "Order items": "订单行明细",
  Quantity: "数量",
  "Unit price": "单价",
  "Line discount amount": "行折扣额",
  "No reusable One Page BI dataset was found in this report.":
    "此报表没有可复用的 One Page BI 明细数据。",
  "Unsupported or incomplete embedded report data.":
    "报表中嵌入的明细不完整或格式不受支持。",
  "Map a line amount or both quantity and unit price.":
    "请映射行金额，或同时映射数量和单价。",
  "Derived amounts require whole quantities and nonnegative unit prices.":
    "换算行金额需要整数数量和非负单价。",
  "Invalid line discount or derived amount.": "行折扣额或换算后的金额无效。",
  "Unallocated tax, shipping, fees, discounts or refunds: provide the final line amount.":
    "存在尚未分摊的税费、运费、手续费、折扣或退款，请提供已核实的最终行金额。",
  "An order total needs one row per unique order ID. Use final line values for multi-item orders.":
    "使用整单金额时，每个订单号必须唯一且只有一行。多件商品分行时请使用最终行金额。",
  "This export mixes order totals and product lines. Supply final line values, or one verified net row per order, including refunds.":
    "这张表同时含整单金额和商品行。请提供最终行金额，或每单一行并已计入退款的净额。",
  "Order headers must contain exactly one row per nonblank order ID.":
    "主表每个订单号必须非空且唯一。",
  "An order item has no matching order header.":
    "这条订单明细在主表中找不到对应的订单号。",
  "Currency is missing or conflicts across joined rows.":
    "两表关联行币种缺失或不一致。",
  "Some order headers have no items. Align the order sets before joining.":
    "部分主表订单没有对应明细，请先对齐两份材料的订单范围。",
  "Header row": "表头行",
  "Material meaning": "材料用途",
  "Detect from columns": "自动识别",
  "The first six sheets were inspected. Select another sheet here to include it.":
    "自动检查前六个工作表，也可在此选择其他工作表加入识别。",
  "Remove from grid": "移出合成台",
  "Apply to material": "应用到材料",
  "Date and net line value, or order headers plus matching order items.":
    "交易日期和行金额可来自一张明细表，也可由订单主表与订单行按订单号关联。",
  "Sales lines plus globally unique order IDs.":
    "销售明细需包含全局唯一的订单编号。",
  "Transaction date and signed cash, or debit and credit.":
    "需要交易日期与带符号的收付款金额，或借贷两列。",
  "Platform net payouts and bank transactions with a settlement reference.":
    "需要平台净打款和银行流水，两侧均须有结算参考信息。",
  "Export a detailed CSV or XLSX. Only marked One Page BI HTML with embedded rows can be reused.":
    "请导出含明细的 CSV 或 XLSX。HTML 只支持有标记且包含明细的 One Page BI 报表。",
  "This material exceeds the file size limit.": "材料超过文件大小上限。",
  "An identical file is already on the grid.":
    "这份材料已在合成台上，相同内容只放一次。",
  "Other report types can still match the materials on the grid.":
    "可以继续放材料；其他能合成的报表也会出现。",
  "Add materials": "添加材料",
  "Add to slot {n}": "向第 {n} 格添加材料",
  "Add files": "放入材料",
  "Choose a report": "选择要合成的报表",
  "Choose report": "选报表",
  "Bright slots are used in this report.": "亮色格子里的材料将用于当前报表。",
  "Click a material to review its columns.": "点击材料可查看表头、用途和字段。",
  "Drop files here. A template is optional.": "先把材料放进来，可以不选模板。",
  "Change selection": "取消选择",
  "Matching reports": "可匹配的报表",
  "Based on columns. Confirm meaning and validate all rows before crafting.":
    "按字段匹配；确认口径并通过逐行校验后即可合成。",
  "No complete combination yet": "材料暂未凑齐",
  "Click a material to set its header row and column meanings, or add the missing data.":
    "点击材料指定表头行和字段含义，也可补充缺少的数据。",
  "Other combinations": "其他可选组合",
  "Report type": "报表类型",
  "All report types": "全部报表类型",
  "Confirm the business meaning of this amount.":
    "金额用途不明确，请确认它是销售金额还是收付款。",
  "Drop up to nine materials. Only selected inputs are archived.":
    "最多放入九份材料。归档只收录本次选择的输入。",
  "Automatic matching": "自动匹配",
  Payouts: "到账核对",
  "Payout file": "平台账单",
  "Bank file": "银行流水",
  "Waiting for both files": "等待两份材料",
  "See exceptions": "查看待查明细",
  "Choose a slot": "放到哪个格子？",
  "Replace file…": "换一份文件…",
  "Both files are ready. Click Craft to check payouts.":
    "材料齐了，点击成品格核对到账。",
  "Drop the platform and bank files into their slots.":
    "把平台账单和银行流水分别放进格子。",
  "Compare the platform payout file with the bank statement. Drop each file in its own slot.":
    "把平台结算单与银行流水分别放进材料格，核对每批打款。",
  "A unique matching code, exact positive amount and a bank date within seven days are required.":
    "双方参考码唯一、正数金额相等且在结算当日至其后七天入账，才会标为已核对。",
  "Retain both original lines as evidence.": "保留两侧原始记录作为凭据。",
  "Check fees, adjustments and the bank entry for this payout reference.":
    "按该参考码核查手续费、调整项和银行入账。",
  "Check a later statement before treating the payout as missing.":
    "请补查下一结算期间的流水，再判断是否漏付。",
  "Inspect the source rows and obtain a unique settlement reference.":
    "请查看原始行，并确认可唯一识别该批次的结算参考码。",
  "Confirm whether this bank transaction belongs to the platform.":
    "请先确认这笔银行交易是否属于该平台。",
  "Next action": "下一步",
  "Choose a settlement or bank reference, not an order ID.":
    "请映射结算或银行流水参考码。订单号不能识别打款批次。",
  "Use the net transfer or booked amount. Gross sales and balances cannot be reconciled as payouts.":
    "请选择打款净额或入账发生额。销售总额或账户余额不能用作到账金额。",
  "Confirmed mappings are reused for the same headers. Check the sample values each time.":
    "相同表头会复用已确认的映射。请核对本次样本值。",
  "Same amount in the date window, but no confirmed reference":
    "日期窗口内有同额流水，但没有可确认的参考码",
  "Possible bank rows (first five of {count}): {rows}":
    "疑似银行行号（共 {count} 条，最多显示五条）：{rows}",
  "Possible bank row numbers": "疑似银行行号",
  "Payout check": "平台到账核对",
  "Platform payouts": "平台结算单",
  "Bank statement": "银行流水",
  Matched: "已核对",
  "Amount differs": "金额不符",
  "Awaiting bank evidence": "暂未找到入账",
  "Needs review": "人工复核",
  "Bank only": "仅银行有记录",
  "Duplicate or conflicting references":
    "同一参考码重复出现，或一行涉及多个参考码",
  "Missing reference or nonpositive payout": "缺少参考码或应到账金额非正数",
  "No bank line with this reference in the supplied period":
    "所给期间的银行流水中未找到该参考码",
  "Bank entry is not a positive receipt": "对应的银行记录不是一笔正数入账",
  "Booking date outside the 0–7 day check window":
    "入账日期不在结算当日至其后七天的核对窗口内",
  "Reference agrees; bank amount differs":
    "参考码一致，但银行金额与应到账净额不同",
  "Unique reference, date window and amount agree":
    "双方参考码唯一、日期在窗口内、金额完全一致",
  "No exact settlement reference in the supplied file":
    "所给结算单中未找到可精确匹配的参考码",
  "Debit / money out": "借方／支出",
  "Credit / money in": "贷方／收入",
  "Both debit and credit are blank.": "借方和贷方不能同时为空。",
  "Use nonnegative debit and credit amounts with at most one nonzero side per row.":
    "借贷两列均须为非负数，同一行最多一侧非零。",
  "Map one signed amount OR both debit and credit columns. A single side cannot represent net cash.":
    "请选择一列带正负号的金额，或同时映射借方和贷方。单独一侧不能计算净收支。",
  "Short order IDs may repeat. Map a long or globally unique order ID.":
    "短订单号可能重复。请选择长订单号或全局唯一的订单号。",
  "This order ID occurs in multiple stores. Use a globally unique ID or split by store.":
    "该订单号出现在不同门店。请选择全局唯一订单号，或先按门店拆表。",
  Date: "日期",
  "Settlement reference": "结算参考码",
  "Confirm the common three-letter currency for both files.":
    "请确认两份文件使用的同一个三位币种代码。",
  "Use a different valid column for each field.":
    "每个字段应映射到不同的有效列。",
  "Map the date and reference columns on both sources.":
    "两份文件都需要映射日期列和参考码列。",
  "The row currency does not match the confirmed currency.":
    "本行币种与已确认的币种不一致。",
  "Row {row}": "第 {row} 行",
  "Expected positive payouts": "应到账正数合计",
  "Confirmed receipts": "已核对到账",
  "Payout exceptions": "待查结算事项",
  "Unlinked bank rows": "未对应的银行流水",
  "Bank-only rows may be unrelated activity. Pending amounts are not confirmed losses.":
    "仅在银行出现的行可能属于其他业务。待见入账不等于已少收。",
  "Summary only · no transaction details": "仅汇总图，不含逐笔明细",
  "Cases shown: {count}": "当前显示 {count} 项",
  "Bank minus expected": "实收减应收",
  "No cases in this view.": "当前筛选没有记录。",
  "Save summary PNG": "导出汇总 PNG",
  "Export visible cases as CSV": "导出当前筛选清单 CSV",
  "Click a case to inspect the original rows. This HTML contains mapped transaction details.":
    "点击事项可查看两侧数据的原始行号。本 HTML 含映射后的逐笔明细。",
  "Search reference or date": "搜索参考码或日期",
  "Case status": "核对状态",
  "All cases": "全部事项",
  Reason: "核对依据",
  File: "文件",
  Row: "行",
  Case: "事项",
  "The two inputs are the same file and worksheet.":
    "两份输入是同一文件的同一工作表，请分别选择结算单和银行流水。",
  "Check archived. Inspect the exceptions before sharing.":
    "核对结果已归档，可展开待查事项再分享。",
  "Compare net settlement batches with posted bank transactions. Use one currency.":
    "用同一币种的平台结算批次与银行已入账流水核对。",
  "Drop or browse": "拖入或浏览",
  "Review columns": "核对列映射",
  "Check payouts": "开始核对",
  "Common currency": "共同币种",
  "Confirm currency": "请选择币种",
  "Use a net payout, not gross order sales. No currency conversion.":
    "请使用扣除费用后的实付净额。此处不换汇。",
  "Check results": "核对结果",
  "Load both files and confirm the currency to check payouts.":
    "放入结算单和银行流水，确认共同币种后开始核对。",
  "Open detailed report": "打开含明细报表",
  "HTML includes transaction details. PNG contains totals only.":
    "HTML 含逐行明细；PNG 为汇总图。",
  "Inventory click fills": "点击背包文件时放入",
  "Also read DD/MM/YYYY dates": "同时接受日／月／年格式",
  "Find whole reference codes in the bank description":
    "在银行描述中识别完整参考码",
  "Use a signed amount or map both debit and credit. Whole codes are case-sensitive and separated by spaces, commas, semicolons or pipes.":
    "映射净金额，或同时映射借方和贷方。描述中的完整码区分大小写，可用空格、逗号、分号或竖线分隔。",
  "One row per settlement batch. Map the net bank transfer amount and the bank statement code.":
    "每行应为一个结算批次。请选择实际打款净额与银行流水参考码。",
  "Use these columns": "采用这些列",
  "Report saved. Drag it into the inventory for a desktop copy.":
    "已合成。把成品拖到背包，即可保存到桌面。",
  "Save a desktop copy and show it in the inventory":
    "保存桌面副本并在背包中显示",
  "Order analysis": "订单分析",
  "Order lines": "订单明细",
  "Cash flow": "收支",
  "Cash flow statement": "收支流水",
  "Cash ledger": "收支明细",
  "One order line per row": "一行一条订单明细",
  "One posted cash transaction per row": "一行一笔实际收付款",
  "Map a sales date and line amount. Order ID, category and currency are optional.":
    "映射销售日期和行金额。订单号、品类和币种可选。",
  "Map a date, line amount and order ID. Repeated IDs are lines of the same order.":
    "映射日期、行金额和订单号。同一订单号的多行会归为一笔订单。",
  "Distinct orders, average order value, multi-line orders and net sales. Charts show orders by month and the six largest orders.":
    "统计不同订单数、平均订单额、多行订单数和净销售额，展示每月订单数与金额最高的六笔订单。",
  "Counts use distinct order IDs within each filter or month. Multi-line orders have at least two visible lines.":
    "订单数在当前筛选或单月内去重，多行订单须有至少两条可见明细。",
  "Number of order IDs with at least two lines in the filtered data.":
    "当前筛选内含至少两条明细的不同订单号数量。",
  "Map a transaction date and a signed amount. Receipts are positive and payments are negative. Category and currency are optional.":
    "映射交易日期和带正负号的金额。实收填正数，实付填负数。类别和币种可选。",
  "Cash in, cash out, net movement and transaction count. Charts show monthly net movement and spending by category.":
    "统计流入、流出、净变动和流水笔数，并展示月度净变动和分类支出。",
  "Cash out is shown as a positive amount. Net movement excludes any opening balance.":
    "流出按正数展示，净变动不包含期初余额。",
  "Sum of positive transaction amounts.": "所有正数流水金额之和。",
  "Absolute sum of negative transaction amounts.":
    "所有负数流水金额的绝对值之和。",
  "Cash in less cash out.": "流入减去流出。",
  "Number of posted transaction lines in the active filters.":
    "当前筛选内的实际流水笔数。",
  "Transaction date": "交易日期",
  "Confirm these periods cover the same business and use the same sales definition.":
    "请确认这些期间属于同一业务，并且销售额计算口径一致。",
  "Net payout": "平台净打款金额",
  "Signed amount": "收支金额（带正负号）",
  "Multi-line orders": "多行订单数",
  "Orders by month": "月度订单数",
  "Latest 6 recorded months": "最近有记录的六个月",
  "Largest orders": "大额订单",
  "Top 6 orders by net value": "按净额排名的前六笔订单",
  "Cash in": "流入",
  "Cash out": "流出",
  "Net movement": "净变动",
  Transactions: "流水笔数",
  "Monthly net movement": "月度净变动",
  "Spending by category": "分类支出",
  "Top 6 categories by payments": "按实付金额排名的前六类",
  "No payments in this selection": "当前筛选没有支出",
  "Choose input file": "选择输入文件",
  "Drop a data file here or click to browse": "把数据文件拖到这里，或点击浏览",
  "View the finished report": "查看已合成的报表",
  "Click to open, or drag to the inventory to save on Desktop":
    "点击打开，或拖到背包以保存到桌面",
  "Desktop copy ready in your inventory.": "已放入背包，文件在桌面。",
  "To inventory": "放入背包",
  "Waiting for a data file": "等待数据文件",
  "Drag a data file from the inventory to the grid.":
    "从背包拖一份数据文件到材料格。",
  "Click the mapping slot to review your data.": "点击字段映射格，核对数据。",
  "Drag a data file from the inventory or click the input slot.":
    "从背包拖入数据文件，或点击材料格浏览。",
  "Drag the finished item onto the inventory to save a desktop copy.":
    "把成品拖回背包，即可在桌面保存一份报表。",
  "Items: {count} · Click an item to open it":
    "共 {count} 件 · 点击物品即可打开",
  "No data files or marked reports": "没有数据文件或带标记的报表",
  Close: "关闭",
  Workbench: "工作台",
  History: "历史记录",
  "Local workspace": "本地工作空间",
  "Report archive": "报表档案库",
  Refresh: "刷新",
  "Unreadable archive records: {count}.": "有 {count} 条损坏的元数据未显示。",
  "1 row": "1 行",
  "{count} rows": "{count} 行",
  "Open report": "打开报表",
  "Export PNG": "导出 PNG",
  "Show folder": "归档目录",
  "No reports yet. Craft a report to add it to your history.":
    "尚无生成记录。报表合成成功后会出现在这里。",
  Templates: "模板",
  Sales: "销售分析",
  Recipe: "配方",
  Parts: "组件",
  "Report workbench": "报表合成台",
  "3 by 3 material grid": "三乘三材料格",
  "Drag a file from the inventory or click the sales slot to browse.":
    "请从背包拖入文件，或点击销售明细格浏览。",
  "Add sales data": "放入销售明细",
  "Drag a file here or click to browse for sales data":
    "从背包拖入，或点击浏览销售明细",
  "Sales data": "销售明细",
  "Review field mapping": "核对字段映射",
  Checked: "已核对",
  "Map fields": "字段映射",
  "View the finished sales report": "查看合成的销售报表",
  "Craft and archive": "合成并归档",
  "Open the finished report": "打开已生成的销售报表",
  "Click to craft and archive a report": "点击合成并自动归档",
  "Working…": "处理中",
  Report: "报表",
  Craft: "合成",
  Worksheet: "工作表",
  "Click the output slot to craft and archive your report.":
    "点击成品格合成并归档。",
  "Click the mapping slot to review your sales data.":
    "点击字段映射格，核对销售明细。",
  "Drag a sales file from the inventory to the grid.":
    "从背包拿一份销售明细，放进材料格。",
  "Craft and archive again": "再次合成并归档",
  "Craft again": "再次合成",
  "Report preview": "成品预览",
  "Enlarge report preview": "放大报表预览",
  "One-page report for the selected sales data":
    "根据当前销售明细生成的一页报表",
  "Waiting for sales data": "等待销售明细",
  "Net sales": "销售额",
  Orders: "订单数",
  "Each row should be a sales line. Check that the suggested columns match your data.":
    "每行应是一条销售明细。请确认建议列与实际含义一致。",
  Required: "必填",
  Optional: "选填",
  "Select a column": "请选择列",
  Unused: "不使用",
  "First source row": "原表第一条明细",
  "(blank)": "（空白）",
  "Amount unit": "金额单位",
  "Source units": "原表单位",
  "When mapped, the currency column is checked on every row. Otherwise, confirm all rows share one unit. Use line amounts and remove subtotal and total rows first.":
    "有币种列时自动核对。无币种列时，请确认全表使用同一单位。金额须为行金额，导入前请移除小计和合计行。",
  "Confirm and validate": "确认映射并验证",
  "Sales recipe": "销售分析配方",
  "Report components": "报表组件",
  "1. Choose a UTF-8 CSV or XLSX sales file with column names on the first row.":
    "① 选择一份 UTF-8 CSV 或 XLSX 销售明细，第一行为列名。",
  "2. Map the date and line amount. Order ID, category and currency are optional. Missing fields stay missing.":
    "② 映射日期、行销售金额，可补充订单编号、品类和币种。软件不会推算缺失字段。",
  "3. Validate every row and craft the report. Each run keeps its own archive, including a copy of the source file.":
    "③ 验证全部行后合成。每次生成独立档案，原始文件可以从归档取回。",
  "Net sales, distinct orders, average order value and sales line count.":
    "销售额、不同订单数、平均订单额、有效明细行数。",
  "Charts show the latest six months with sales and the top six categories by net sales. Filter the standalone report by month and category together.":
    "月度销售额显示最近 6 个有记录的月份；品类按净销售额展示前 6 类。独立报表支持月份与品类组合筛选。",
  "Use one table and one currency per report. Profit analysis, forecasting, joins and Power BI PBIP export are not supported.":
    "V0.1 仅支持单表、单币种。利润、预测、多表关联与 Power BI PBIP 导出尚未提供。",
  "Sales overview": "销售分析总览",
  "One-page sales report": "一页销售分析报表",
  "Ready. Click the output slot to craft your report.":
    "材料齐了，点击右侧成品格合成。",
  "Report saved to history.": "合成完成，已存入历史记录。",
  "PNG exported.": "已导出 PNG。",
  "One sales line per row": "一行一条销售明细",
  "Sales date": "销售日期",
  "Line amount": "行销售金额",
  "Order ID": "订单编号",
  "Sales category": "销售品类",
  "Currency code": "币种代码",
  Desktop: "桌面",
  Examples: "示例文件夹",
  "File inventory": "文件背包",
  Inventory: "背包",
  "Inventory location": "背包位置",
  "Choose folder…": "其他文件夹…",
  "Refresh inventory": "刷新背包",
  "18 square inventory slots": "18 个方形物品槽",
  "Click or drag to the workbench": "点击或拖入合成台",
  "Files: {count} · Click or drag to the workbench":
    "{count} 个文件 · 点击或拖入合成台",
  "No matching files": "没有匹配的文件",
  "No CSV or XLSX files": "没有 CSV / XLSX 文件",
  "Try an example": "使用示例",
  "Search filenames": "搜索文件名",
  "Filter filenames": "筛选文件名",
  "Previous page": "上一页",
  "Next page": "下一页",
  "All data": "全部数据",
  "Average order value": "平均订单额",
  "Sales lines": "明细行数",
  "Monthly sales": "月度销售额",
  "Latest 6 months with recorded sales": "最近 6 个有记录月份",
  "No rows match the filters": "当前筛选无明细",
  "Sales by category": "品类销售额",
  "Top 6 categories by net sales": "按净销售额排名 · 前 6 类",
  "(blank category)": "（品类空白）",
  "Category not mapped": "未映射品类",
  Source: "来源",
  Generated: "生成",
  "Returns reduce net sales. Order metrics show — when no order ID is mapped.":
    "金额含负数退货；缺少订单编号时，订单指标显示 —。",
  Month: "月份",
  Category: "品类",
  "All months": "全部月份",
  "All categories": "全部品类",
  Reset: "重置",
  "Export current PNG": "导出当前 PNG",
  Unmapped: "未映射",
  "Sales, orders, monthly totals and category totals":
    "销售额、订单、月度与品类报表",
  "Sum of line amounts, including negative returns.":
    "逐行累加销售金额，保留退货负数。",
  "Distinct order IDs within the current filters.":
    "当前筛选内不同订单编号的数量。",
  "Filtered sales divided by distinct orders, rounded to the nearest cent.":
    "当前筛选销售额除以不同订单数，以分为单位四舍五入。",
  "Number of valid sales lines within the current filters.":
    "当前筛选内有效数据行数。",
  "Paste formula cells as values before importing.":
    "公式单元格不能验证，请先粘贴为值",
  "Errors and Boolean values are not supported.": "不支持错误值或布尔值",
  "The first row must contain column headers.": "第一行必须是表头。",
  "Headers must be nonempty and unique. Check the first row.":
    "表头有空白或重名，请修正第一行。",
  "The table exceeds the 80-column limit.": "超过 80 列上限。",
  "The file has only headers or blank rows.": "文件只有表头或空行。",
  "The table exceeds the 10,000-row limit.": "超过 10,000 条明细上限。",
  "The file exceeds the 5 MiB limit.": "文件超过 5 MiB 上限。",
  "Save the CSV using UTF-8 encoding.": "CSV 必须保存为 UTF-8 编码。",
  "The CSV contains a null character. Save it as UTF-8.":
    "CSV 含有空字符，请另存为 UTF-8。",
  "The table exceeds 80 columns or 10,000 data rows.":
    "超过 80 列或 10,000 条明细上限。",
  "Invalid CSV near row {row}. Check row lengths, quotes and comma delimiters.":
    "CSV 第 {row} 行附近格式有误。请检查列数、引号和逗号分隔符。",
  "The workbook could not be read. Save a valid, unencrypted XLSX file and try again.":
    "工作簿无法读取。请另存为有效的未加密 XLSX 文件后重试。",
  "Invalid CSV. Check row lengths, quotation marks and comma delimiters.":
    "CSV 行列数、引号或分隔符有误，请使用逗号分隔。",
  "Choose an XLSX workbook or a UTF-8 CSV file.":
    "仅支持真正的 .xlsx 工作簿或 UTF-8 CSV。",
  "The workbook has no readable visible worksheet.": "没有可读取的可见工作表。",
  "Choose a visible worksheet.": "请选择可见工作表。",
  "The worksheet is empty.": "工作表为空。",
  "Reduce the worksheet to 10,001 rows including headers and 80 columns.":
    "工作表范围超过 10,001 行（含表头）或 80 列，请缩小范围。",
  "Unmerge the cells and use a single header row.":
    "工作表含合并单元格，请先整理为单行表头的明细表。",
  "The date does not exist or is outside the supported range.":
    "日期不存在或不在支持范围内",
  "Invalid date serial or a time component is present.":
    "日期序号无效或包含时间",
  "Invalid Excel date serial.": "Excel 日期序号无效",
  "Use YYYY-MM-DD or YYYY/MM/DD for dates.":
    "日期应为 YYYY-MM-DD 或 YYYY/MM/DD",
  "Enter a numeric amount with up to two decimal places and no currency symbol.":
    "金额须为数字且最多两位小数，不能为空或含货币符号",
  "The amount exceeds the supported precision.": "金额超出精度范围",
  "Map the required field “{field}”.": "请映射「{field}」。",
  "The mapped column does not exist.": "映射的列不存在。",
  "A column cannot be used for more than one field.":
    "同一列不能映射到多个字段。",
  "Map the detected currency column to check for mixed currencies.":
    "检测到币种列，请映射币种以核对是否混币。",
  "Mapped order IDs cannot be blank.": "已映射的订单编号不能为空",
  "Save order IDs with ambiguous formatting as text.":
    "编号格式不明确，请将编号保存为文本",
  "Use a three-letter currency code, such as CNY.":
    "币种应为三位字母代码，例如 CNY",
  "Mixed currencies. Split the file or convert to a single currency first.":
    "含多种币种，请先分开或统一换算",
  "Row {row} · {field}: {detail}": "第 {row} 行 · {field}：{detail}",
  "Validation failed on {count} row(s). No report was generated.":
    "{count} 行未通过，已停止生成。",
  "The sum of absolute amounts exceeds the supported precision.":
    "金额绝对值合计超出 V0.1 精度范围。",
  "The selected unit does not match the source currency ({currency}).":
    "所选单位与原表币种 {currency} 不一致。",
  "Start the desktop workbench using OnePageBI.exe.":
    "请用 OnePageBI.exe 启动桌面工作台。",
  "Could not initialize the report canvas.": "无法初始化报表绘图。",
} as const;
export type Message = keyof typeof chinese;
export function translator(language: Language) {
  return (
    key: Message,
    values: Record<string, string | number> = {},
  ): string => {
    const text = language === "zh-CN" && Object.hasOwn(chinese,key) ? chinese[key] : key;
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      String(values[name] ?? match),
    );
  };
}
export const otherLanguage = (language: Language): Language =>
  language === "en" ? "zh-CN" : "en";
export const switchLabel = (language: Language) =>
  language === "en" ? "中文" : "English";
export const sourceUnit = (unit: string, language: Language) =>
  unit === "原表单位" || unit === "Source units"
    ? translator(language)("Source units")
    : unit;

export const rowCount = (count: number, language: Language) =>
  count === 1
    ? translator(language)("1 row")
    : translator(language)("{count} rows", { count });

export class LocalizedError extends Error {
  constructor(readonly render: (language: Language) => string) {
    super(render("en"));
  }
}
export function errorText(error: unknown, language: Language): string {
  return error instanceof LocalizedError
    ? error.render(language)
    : error instanceof Error
      ? error.message
      : String(error);
}
