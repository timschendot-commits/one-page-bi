# One Page BI V0.2.0 · Local milestone

English · [简体中文](README.zh-CN.md)

One Page BI is a local Windows workbench for turning CSV and XLSX data into an interactive one-page dashboard. It opens in English. Select **中文** in the top-right corner to switch to Simplified Chinese, or **English** to switch back. The workbench remembers your choice.

## Run the portable app

1. Use the local **OnePageBI-V0.2.0-local-Windows-x64.zip** package. Extract the whole folder and run **OnePageBI.exe**. Keep the DLLs, `ui` and `examples` with it. Windows x64, .NET Framework 4.8 and the [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) are required.
2. The inventory starts at your Desktop and lists CSV, XLSX and marked report files. To try the bundled sample, select **Examples** in the inventory location menu. Drag **Sales-demo.csv** onto the grid or click its slot.
3. Confirm the column mapping. Sales date and line amount are required. Order ID, category and currency are optional. Check the sample values, then select **Confirm and validate**.
4. Click **Craft** in the output slot. Open the finished report to filter by month and category or export the current view as a PNG.

The example should give **CNY 3,393.00** in net sales, **10** distinct orders, **CNY 339.30** average order value and **12** sales lines. February totals **CNY 1,058.00**, including a return of CNY 120.00.

## Craft a desktop report

After crafting, drag the finished item from the output slot to any part of the inventory, or select **To inventory**. The app writes the archived standalone HTML to your actual Windows Desktop, switches the inventory to Desktop and shows the saved item. Click the BI item to open the file in the default browser. The desktop file still works when copied elsewhere.

Generated names follow `BI-<recipe>-<source>-<short-id>.onepagebi.html`. The inventory recognizes any nonempty name ending in **.onepagebi.html**, ignoring case. Regular HTML, shortcuts and unrelated files stay out of the grid. The current folder is watched for additions, removals and renames. A repeat drop reuses an identical file. A conflicting or edited copy receives a numbered sibling.

| Recipe | Input | Output |
| --- | --- | --- |
| Sales | Date and signed line amount. Order ID and category are optional. | Net sales, orders, average order value and sales lines. |
| Order analysis | Date, line amount and order ID. Preserve leading zeroes in text IDs. | Distinct orders, average value, multi-line orders, monthly order counts and largest orders. IDs are grouped within the selected rows. An order can appear in more than one month. |
| Cash flow | Posted date and signed transaction amount. Receipts are positive and payments negative. | Cash in, cash out (positive magnitude), net movement, transaction count and spending by category. The example has CNY 1,400.25 in, 465.25 out and a net increase of 935.00. |

Changing recipes keeps the input available and requires checking its mapping again. The cash ledger accepts one signed amount column. Provide posted transactions in one currency, with no opening-balance or subtotal rows.

## Language and exports

Switching languages preserves the loaded file, field mapping and report values. Input filenames, column names and categories are displayed as supplied. Built-in examples are available in both languages. New standalone HTML reports open in the language used to craft them and have their own offline language button. Changing the report language retains its filters. PNG export uses the current preview or report language. History exports the original archived PNG. Existing V0.1.0 archives open as originally generated.

## Input and calculations

- Use one table and one currency per report. Each nonempty row is a line item. Remove subtotals, totals and explanatory rows before import. Every mapped line must pass validation.
- Use a UTF-8, comma-delimited CSV (BOM and quoted multiline fields supported) or select one visible XLSX worksheet. Headers must be nonempty and unique. Use YYYY-MM-DD, YYYY/MM/DD or supported Excel date serials. Convert formulas to values and unmerge cells first.
- Maximum file size is 5 MiB, with up to 10,000 data rows and 80 columns. XLSX archives are limited to 32 MiB unpacked and 2,000 entries.
- Net sales sums signed line amounts, including returns, in integer cents. Amounts have at most two decimal places. Orders counts distinct IDs within the active filters. Average order value is filtered net sales divided by distinct orders, rounded to cents. Missing order mapping leaves order metrics blank. Blank IDs in a mapped order column stop validation.
- Charts show up to six recorded months and up to six ranked categories or orders, depending on the recipe. KPIs cover all filtered rows. PNGs are 1800 × 1134 pixels. Profit analysis, forecasting, joins, currency conversion and Power BI PBIP/PBIX export are outside this version.

## History and archives

Open **History** to reopen a report, export its original PNG or open its folder. Each successful run creates a separate directory under the Windows Documents folder at `One Page BI/Reports/<id>/`. It contains the original input bytes in `inputs/`, validated rows in `data/processed.json`, a standalone `dashboard/report.html`, `exports/report.png`, `template.json` and `metadata.json`. The metadata includes the input SHA-256, sheet, row count and software version. A run only enters history after its archive is complete. The HTML includes the mapped transaction data and can be opened offline without the desktop app.

## Build and test on Windows

The desktop host uses WinForms and WebView2. The UI uses React and TypeScript, with SheetJS CE and csv-parse for input. Tested on Windows 11 x64 with Node 24 and pnpm 11. From the repository root, run:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm build:windows
.\release\OnePageBI.exe
```

The first build downloads the pinned WebView2 SDK and checks its SHA-256. To run the desktop end-to-end tests on an interactive Windows desktop with Edge, use `pnpm test:windows`. The tests use an isolated profile and archive directory. Set `ONEPAGEBI_RELEASE` to test a different extracted release and `ONEPAGEBI_TEST_DIR` to choose a test output location.
