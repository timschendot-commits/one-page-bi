# One Page BI V0.7.0 for Windows

English · [简体中文](README.zh-CN.md)

[Download for Windows x64](https://github.com/timschendot-commits/one-page-bi/releases/download/v0.7.0/OnePageBI-V0.7.0-Windows-x64.zip). Extract the ZIP and run **OnePageBI.exe**.

## Executive view, catalog and desktop

The finished sales report shows the total, order count, average order value, observed monthly trend and category ranking in the workbench. Select **Full page** to enlarge it. **Desktop copy** saves the standalone file. **Cancel choice** keeps materials on the grid. Star recipes in the catalog to place them first. Searches such as “unpaid customers” and “stockout” use bilingual local aliases and ranked matching. Frequently generated reports appear near the top. New recipes cover customer concentration, supplier concentration and inventory carrying value.

Drag the brand to move the borderless window and its edges or corners to resize. The ◐ menu includes three colors, floating view, optional always-on-top and hide to tray. Double-click the Windows notification icon to restore the current session. Its context menu also opens the full workbench, switches to floating view or exits.

**Professional editing** is available on the result and in checksum-backed history. The working copy includes a Power BI project with native visuals and semantic model, and a Word document with editable tables. Open **Workbench.pbip** and select **Refresh** on first open. The embedded facts require no network or source-directory configuration. Sales/order KPIs use native DAX. Other recipes include snapshot summaries and typed facts for adding measures or relationships. The initial package is a portable snapshot. Open **Executive.docx** in Word or a compatible editor. Save external edits before **Archive saved edits**. This creates a separate ZIP revision under Documents/One Page BI/Editions/<archive-id>/Revisions. **Export editing pack** saves the working files together to a location you select. Extract the whole package together. PBIX binary creation and publishing to the Power BI service are outside this release.

## Make a report in three steps

1. Open the inventory's **Examples** folder and add **Reorder-check.psv** to the grid.
2. Choose **Which items need replenishment?** The review shows exactly which files and original columns are used. One position needs 9 pieces and another needs 6. The position at its minimum needs zero.
3. Choose **Generate report** to validate and archive, or **Preview first**. Use History to inspect the staged data.

V0.6 fixes a Chinese label crash in recipe selection, moves full report validation to the selected combination, and adds searchable business questions, missing-field guidance, and stock replenishment, repeat customer and open sales pipeline reports. The example **Open-deals.jsonl** contains MYR 3,234.50 in open deals and MYR 1,993.80 in probability-weighted value. Flat JSON Lines (.jsonl and .ndjson), pipe-separated .psv and Excel separator declarations are supported. An explicit per-material decimal-comma option converts mapped numeric columns only. Its interpretation is recorded in the archive for replay.

## Preparing data

Drop a CSV, TSV, XLSX or prepared BI report into the square workbench. Open the material to see the SQL result, the first source rows, the presentation rules and the suggested column types. UTF-8 and BOM-marked UTF-16 delimited files can use commas, tabs, semicolons or pipes. Files are identified by structure and values. If there are no headers, the material keeps the first row and shows numbered columns. Choose a meaning and map ambiguous columns yourself. Check the suggested start row, especially when a file contains a cover note. Excel imports retain typed date and ID information.

The **Recipe catalog** contains 27 runnable report types. The four original recipes are joined by sales by customer, SKU, channel or store, purchasing by supplier, expenses, gross profit, stock on hand, receivables aging, payables aging, project billing, posted work-order cost, journal movements, trial balance roll-forward, income and expense statement, balance sheet check, and budget versus actual. Cross-period merging is also available for compatible sales materials. Sector coverage and source conventions are described in [Report rules and verification](REPORT-RULES.md).

Before crafting, safe changes include trimming whitespace, standardizing known labels, ordering fields and removing blank rows and exact repeated headers. Original row numbers and input bytes remain available. Data rows are never filled forward or silently deduplicated. Suspicious duplicates block aggregates. The payout exception report can retain duplicate rows as evidence without confirming them as receipts. Ambiguous dates, mixed entities, status issues, conflicting units and failed accounting checks require correction. Data suppliers remain responsible for completeness and business meaning.

**History → Review staging and verify** opens the exact material used. Switch between the full staging CSV and the report projection, page through rows, or save a CSV copy. **Run verification** starts fresh from archived input bytes, reapplies the recorded layout and mapping, and compares both CSVs and the processed report rows. Checksums detect changes relative to the stored manifest. This is not a signature or an audit of the originating business. Older archives still open but pre-0.5 archives lack this replay manifest. CSV copies guard spreadsheet formula text. Read IDs as text when opening in Excel.

Try **x17.csv**, a real 32-row extract from the UCI Online Retail dataset, with an anonymous filename, reversed columns and a title row. Choose Sales and GBP. The sum of quantity × unit price is **GBP 819.55**. This is a line-value check on the sample. The original field definitions do not establish tax-adjusted or refund-allocated statutory revenue. Attribution is in the sample folder. **17-B.csv** checks a synthetic trial balance. **Q9.csv** contains two synthetic supplier invoices. **NO-HEAD.csv** lets you try manual interpretation while keeping leading-zero IDs.

Drop the files you have onto the nine-slot workbench. One Page BI inspects their columns and offers sales, order, cash flow and payout reports that they could support. Choosing a template first is optional. The app starts in English. **中文** and **English** switch languages and preserve the current session.

## Start and try the joined-order example

1. Extract **OnePageBI-V0.7.0-Windows-x64.zip** and run **OnePageBI.exe**. Keep its DLLs, `ui`, `licenses` and `examples` together. Requires Windows x64, .NET Framework 4.8 and the [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).
2. The square inventory opens on your Desktop. Choose **Examples** from its location menu. Hold Ctrl and select **Order-headers-demo.csv**, **Order-items-demo.tsv**, **Payouts-demo.csv** and **Bank-demo.csv**. Drag the group to the grid, or choose **Add selected**. You can also drop files from Explorer, click an empty slot to browse, or click an inventory data file to load it.
3. The right side lists possible report types, even if you previously chose a different template. Select **Order analysis**. Check which source supplies each field, then check **MYR** and select **Preview first**. Only the two order files participate. Unused materials stay on the grid for the next recipe.
4. Click **Craft** in the output slot. The synthetic example gives **MYR 125.00**, **2** orders and **MYR 62.50** average order value. Open the interactive report, filter it, or export a PNG. Drag the finished item into the inventory (or choose **To inventory**) for a standalone Desktop copy. Choose **Change selection** to use the same materials again.

## What each report can use

| Report | Supported materials and rules |
| --- | --- |
| Sales overview | A date and a signed final line amount. When no final amount is available, confirm whole quantity × nonnegative unit price less an explicit absolute line discount. Order ID and category are optional. Missing order IDs are never estimated. |
| Order analysis | Sales lines with a globally unique order ID. A separate order header can supply the date if each header ID is unique and the complete ID sets agree. Several items may belong to one order. IDs should be stored as text to preserve leading zeroes. |
| Multiple sales periods | Two to nine periods with disjoint date ranges and a common currency. Confirm the files describe the same business and sales definition. For overlapping alternatives the app can offer compatible pairs. An order ID reused across periods stops generation. |
| Cash flow | Posted date and signed cash amount, or separate nonnegative debit and credit columns. A row cannot have a nonzero amount on both sides. The report shows receipts, payments and net movement. |
| Payout check | Platform net settlements and posted bank transactions in one currency. Confirmation requires a unique exact reference and cent amount, and a positive bank credit within 0–7 calendar days from settlement. Duplicates, missing references, reversals, date exceptions and differences stay visible for review. Open the report to inspect the source rows and export filtered exceptions as CSV. |

Mapping explains an input column. It uses no material slot. A date and a generic “Amount” could represent either sales or cash. Review the business meaning before choosing one. **Rows checked** means the proposed mapping passed row checks. **Review meaning** asks for a business decision or a currency choice. **Needs correction** identifies a blocking validation error. Every selection is validated in full before crafting. Net sales uses signed integer cents, orders counts distinct IDs in the current filters, and average order value divides those sales by that count. A missing mapping leaves optional metrics unavailable.

## Unfamiliar files and limits

- Click a material to choose its worksheet, header row (1–50), business meaning and column names. Sample values are shown beside the mapping. A workbook can provide more than one participating worksheet. The first six visible sheets are inspected automatically and additional sheets can be selected in the editor.
- The inventory lists CSV, TSV, XLSX and marked `.onepagebi.html` files. An external standalone One Page BI report can supply its embedded transaction data. Dropping that report reads its data section only. Clicking it in the inventory opens it in the browser.
- The pool holds nine files and skips byte-identical copies. A data file can be up to 5 MiB, a marked report up to 16 MiB. Data tables support up to 10,000 rows and 80 columns. Workbook ZIP limits are 32 MiB unpacked and 2,000 entries. Use nonempty, unique column names and remove subtotal, balance and footer rows. Export formulas as values. Dates support YYYY-MM-DD, YYYY/MM/DD and supported Excel serial dates. Explicitly enable DD/MM/YYYY for that convention.
- For order joins, use a complete set of order headers and matching lines. For derived amounts, provide the final line amount when tax, shipping, percentage discounts, or refund treatment cannot be determined by the supported formula. Input units must agree. Currency conversion, arbitrary table joins, PDF/image extraction, forecasting or statutory filing formats and direct PBIX binary export are outside this milestone.

Many merchant exports mix order-level amounts and product rows. Shopify documents this layout and records refunded amounts at order level. When using these exports, supply verified final line amounts or a single verified net row per order. The app blocks repeated order totals and unallocated refunds in derived sales. [Shopify order export fields](https://help.shopify.com/en/manual/fulfillment/managing-orders/exporting-orders)

## History, exports and local storage

Each successful craft creates a folder in Windows Documents under `One Page BI/Reports/<id>/`. **History** reopens the standalone report, exports its original PNG or opens the archive folder. Archives contain the original bytes of the selected materials in `inputs/`, validated data in `data/processed.json`, interactive `dashboard/report.html`, `exports/report.png` (1800 × 1134), `template.json` with the mapping, worksheet and calculation rules, versioned SQL staging and projected CSVs in `data/`, a SHA-256 manifest, and `metadata.json` with source names and SHA-256 hashes. Multi-period data includes a per-row source index. Joined rows retain the item and header row numbers. Earlier reports stay available in history.

The desktop copy is named `BI-<recipe>-<source>-<id>.onepagebi.html`. Repeated drops reuse an identical file. An edited copy is preserved under its current name and the new copy gets a numbered name. Standalone reports work offline and include transaction details. Their PNG button exports the current view and language. New reports have their own English/Chinese toggle.

## Build and test

The native host uses WinForms and WebView2. The UI uses React and TypeScript, SheetJS CE, csv-parse and bundled SQLite (sql.js). The local build uses Node 24 and pnpm 11. Run these commands from the repository root on Windows:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm build:windows
.\release\OnePageBI.exe
```

The first native build downloads the pinned WebView2 SDK and verifies its SHA-256. With an interactive Windows desktop and Edge available, run `pnpm test:windows`. Set `ONEPAGEBI_RELEASE` to an extracted portable folder to test that exact package. Set `ONEPAGEBI_TEST_DIR` to store the isolated test profile and screenshots outside the repository.
