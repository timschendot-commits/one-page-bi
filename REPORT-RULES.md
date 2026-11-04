# 行业、报表和复核范围 · V0.7.0

| 使用者及情境 | 本版可回答的问题 | 生成前要核对什么 |
| --- | --- | --- |
| 小店、电商、连锁零售 | 净销售、订单、客户、商品、渠道和门店分析；平台是否到账 | 商品行与整单金额分开。应收、到账、税额、手续费及退款各有含义，不能用同一列代替。跨主体须拆开。 |
| 贸易、批发与仓管 | 按供应商看采购额；指定日期的实际在手库存；应收和应付账龄 | 在手数量与可售数量分开。库存须按 SKU 和库位唯一，一次只有一个快照和单位。应收/应付需发票、往来方、到期日、快照日和该时点未结额。账龄以到期日计算；已有贷项须单独处理。 |
| 服务商、项目型企业 | 项目已开票金额、费用分类、收支和预算差异 | 开票额不能作为回款或履约收入。预算和实际须同期间、同类别、同币种、同口径，差异为实际减预算。 |
| 加工和小型制造 | 工单已过账成本、库存快照、毛利 | 需要工单实际成本或与销售行对应的已售成本。单价、采购价及物料清单不能独立证明产成品实际成本。本版不执行在制品分摊或 FIFO 成本估值。 |
| 财务人员、规范企业 | 科目借贷发生额、试算平衡勾稽、期间收入费用表、资产负债平衡核查 | 分录须有凭证号且逐单平衡。试算表按有符号的借方减贷方填期初期末，借方和贷方发生额均非负。每个科目须满足期初＋借－贷＝期末，且整表平衡。其他两表使用已分类科目及自然余额，核对分类完整和资产＝负债＋权益。 |

这些规则只验证提供范围内的相符性。恰巧平账不能证明没有漏账，不完整的科目余额表也可能满足等式。期间收入费用表和资产负债核查不含法定报表附注、现金流分类、合并抵销、会计准则认证或电子申报。银行流水无法直接推导上述报表。

## 经营集中度和库存估值

- 客户集中度按客户净销售额、供应商集中度按供应商净采购额分别汇总。第一名和前三名占比均使用当前筛选的总额作分母。某一往来方净额为负时需要复核；分母为零时占比留空。图表保留原始分组和金额，不自动评定经营风险。
- 库存账面价值采用来源表已核实的账面价值和币种。每份快照按 SKU 与库位唯一，禁止合并多个快照日期。不从售价倒推成本。
- 报表图表使用实际记录的月份。趋势线不跨未提供数据的月份；排名和趋势的数轴保留零点，负值绘制在零线另一侧。完整图表和交互预览使用同一组指标定义。

## 补货、复购与在谈商机

- 补货参考 Odoo 的最低量、最高量与预测库存概念。本版在预测可用量低于最低线时计算补到目标值的差额。快照、SKU、库位和单位必须明确，暂不做采购包装倍数、交期或自动下单。[Odoo 补货规则](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/warehouses_storage/replenishment/reordering_rules.html)
- 在谈商机按来源系统的商机号、阶段、在谈金额与百分数计算加权金额。单笔取整到分，再按阶段汇总。概率必须由来源提供；该结果不能当作已确认收入。[Odoo 商机预期收入报表](https://www.odoo.com/documentation/18.0/applications/sales/crm/performance/expected_revenue_report.html)
- 复购按筛选范围内至少两笔净额为正的不同订单统计客户。一笔多行订单仅计一次，全额冲销的订单不计。需要能跨门店区分的订单号与稳定的客户编号。
- 数值的区域格式应由使用者明确选择。启用小数逗号后，规范化的数值写入报表选列 CSV，原格式保留在完整整理快照。对缺失的到期日或快照日，不使用其他日期列替代。[Power Query 的区域与数据类型](https://learn.microsoft.com/en-us/power-query/data-types)

## 真实资料和同类项目

- Shopify 多商品订单会跨行，退款和折扣可能是整单口径。库存在手、可售、承诺和入库中具有不同定义。[订单导出](https://help.shopify.com/en/manual/fulfillment/managing-orders/exporting-orders) · [库存 CSV](https://help.shopify.com/en/manual/inventory-and-locations/setup/inventory-csv)
- Xero 的银行导入区分日期、交易金额和其他对账信息。Excel 的分隔符、日期和数字呈现方式随环境而异。[Xero 银行流水导入](https://central.xero.com/0/article/Import-a-CSV-bank-statement) · [Microsoft 文本导入说明](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files)
- ERPNext 的库存、账龄、总账和试算表，以及 Odoo 的采购报表，是本地配方的业务参照。Peppol 单据分别列示行金额合计、税额相关总额和应付金额。本版没有 Peppol XML 导入或标准符合性声明。[ERPNext 库存代码](https://github.com/frappe/erpnext/blob/develop/erpnext/stock/report/stock_balance/stock_balance.py) · [ERPNext 会计报表](https://docs.frappe.io/erpnext/accounting-reports) · [应收应付](https://docs.frappe.io/erpnext/accounts-receivable-and-payable) · [Odoo 采购代码](https://github.com/odoo/odoo/blob/20.0/addons/purchase/report/purchase_report.py) · [Peppol 发票金额定义](https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/cac-LegalMonetaryTotal/)
- OpenRefine 提供交互式清洗，Frictionless 面向表格结构和质量验证。本软件把导入、受限的 SQL 变换、所需材料高亮、报表及按次归档复算放在同一个离线工作台。SQLite 由 sql.js 执行，另附独立的 pandas 核验脚本。[OpenRefine](https://github.com/OpenRefine/OpenRefine) · [Frictionless](https://github.com/frictionlessdata/frictionless-py) · [sql.js](https://github.com/sql-js/sql.js) · [pandas](https://github.com/pandas-dev/pandas)

## 核查一次生成

1. 在材料编辑器检查起始行、列类型、SQL、清理行号和样例。临时材料按会话保存在系统临时目录。可以在生成报表前另存材料 CSV。
2. 生成后从历史打开核查。每份参与材料都分别保留 `data/staged-N.csv`（完整整理快照）和 `data/material-N.csv`（用于报表的选列），并保留原文件、处理结果和映射。完整快照可能含报表不需要的源字段，转交他人前可选择选列版。
3. 选择“从原件重算验证”。软件读取归档原件、使用记录的表头和角色映射、比较两种 CSV 与处理结果。历史核验不会覆盖原件。校验清单未签名；它能检测普通文件变化，不能认证原件的商业真实性或抵抗整包重签。
4. 已安装 Python 和 pandas 时，还可运行 `python verify_materials.py "<归档目录>"`。这条独立路径以文本读入分隔文件或扁平 JSON Lines，按物理行号与源列重建送入报表的数据，并与导出列、单元格、行序及清单比对。XLSX 和嵌入报表使用桌面复算。此脚本不运行应用保存的 SQL，不更改归档。
5. 用 `scripts/check-public-retail.py` 可从 UCI 原始 ZIP 重建已随包提供的 32 行样本和独立期望数。交易行来自 Daqing Chen (2015)，金额使用十进制计算，CC BY 4.0。变换和署名见样本说明。[数据及许可](https://archive.ics.uci.edu/dataset/352/online%2Bretail)

## 识别边界

- 文件名只定位来源。列名和样例值提供证据；未知数字的业务含义须人工确认。没有表头时不要按列位置猜金额，未知编码或无法唯一识别分隔符时停止。
- 确定性的清理包含去除首尾空白、已知字段别名、字段重排、空行和完全相同的重复表头。识别到重复数据行、合计余额行、混币、混法人或关键状态冲突时会阻止汇总。到账核对会单列重复参考记录，保留异常证据。软件不向下填充空订单号、不静默去重、不把缺失金额置零。
- 一个工作表应是一张连续矩形表。非结构化页眉、多个横排表、嵌套透视、带时区时间、不明确的小数点/千位、旧式本地编码或未覆盖的企业字段名可能需要整理或显式选择。可将源数据导出为 UTF-8 并用无分组十进制金额。9 份文件、单数据文件 5 MiB、每张表 10,000 行和 80 列仍是上限。
- SQLite 规则库随版本离线发布。企业可以在材料编辑器调整具体映射。规则库不会联网自动学习企业口径。高风险行业的合规报表仍需专门定义和验收。
