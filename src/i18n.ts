export type Language = "en" | "zh-CN";

const chinese = {
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
    const text = language === "en" ? key : chinese[key];
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
