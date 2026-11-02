import { payoutOffline } from "./payout-windows.mjs";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  mkdir,
  mkdtemp,
  rename,
  writeFile,
  readFile,
  readdir,
  copyFile,
  unlink,
  stat,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
const out = path.resolve(process.env.ONEPAGEBI_TEST_DIR || "test-results"),
  release = path.resolve(process.env.ONEPAGEBI_RELEASE || "release");
await mkdir(out, { recursive: true });
const profile = await mkdtemp(path.join(out, "profile-")),
  desktop = path.join(profile, "Desktop"),
  reports = path.join(profile, "Reports");
await mkdir(desktop);
console.log("Isolated workspace", profile);
const original = Buffer.from(
  "日期,销售额,订单号,品类,币种\r\n2024-02-29,10.10,001,Coffee,MYR\r\n2024-02-29,0.20,001,Tea,MYR\r\n2024-03-01,-1.30,002,Coffee,MYR\r\n",
);
await writeFile(path.join(desktop, "actual.csv"), original);
await writeFile(path.join(desktop, "wrong.csv"), "date,amount\n2026-01-01,\n");
await writeFile(path.join(desktop, "icon.lnk"), "ignored");
await writeFile(path.join(desktop, "~$hidden.xlsx"), "ignored");
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["封面"]]), "封面");
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet([
    ["日期", "销售额", "品类"],
    ["2026-02-03", 45.95, "</script><script>window.pwned=true</script>"],
  ]),
  "销售",
);
await writeFile(
  path.join(desktop, "actual.xlsx"),
  XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let child, browser, edge, page;
async function launch(language = "en") {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  child = spawn(path.join(release, "OnePageBI.exe"), ["--profile", profile], {
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=" + port,
    },
  });
  let last = "";
  for (let i = 0; i < 100; i++) {
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:" + port, {
        timeout: 700,
      });
      break;
    } catch (e) {
      last = e.message;
      await delay(180);
    }
  }
  assert.ok(browser, "Cannot attach to desktop window. " + last);
  const ctx = browser.contexts()[0];
  page = ctx.pages()[0] || (await ctx.waitForEvent("page"));
  page.setDefaultTimeout(7500);
  await page
    .getByRole("heading", {
      name: language === "en" ? "Report workbench" : "报表合成台",
    })
    .waitFor();
  await page.locator(".filetile").first().waitFor();
}
async function closeApp() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = undefined;
  }
  if (child && child.exitCode === null) {
    const done = new Promise((r) => child.once("exit", r));
    child.kill();
    await Promise.race([done, delay(2500)]);
  }
  child = undefined;
}
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const file = (name) => page.getByRole("button", { name, exact: true });
function fillNativeDialog(target) {
  const helper = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "tests/native-dialog.ps1",
      "-AppProcess",
      String(child.pid),
      "-FilePath",
      target,
    ],
    { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
  );
  return new Promise((resolve, reject) => {
    let err = "";
    helper.stderr.on("data", (chunk) => (err += chunk));
    helper.on("error", reject);
    helper.on("exit", (code) => (code === 0 ? resolve() : reject(Error(err))));
  });
}

const btn = (name, scope = page) =>
  scope.getByRole("button", { name, exact: true });
async function choose(kind, unit, variant) {
  const group = page
    .locator(".preview .candidate-list button")
    .filter({ hasText: kind });
  await group.click();
  if (variant)
    await page
      .locator("dialog .candidate-list button")
      .filter({ hasText: variant })
      .click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  if (unit) await dialog.getByRole("combobox").selectOption(unit);
  await btn("Confirm and validate", dialog).click();
}
async function craft() {
  await click("Craft and archive");
  await page
    .getByText("Report saved. Drag it into the inventory for a desktop copy.")
    .waitFor();
}
async function put() {
  await page.locator(".result").dragTo(page.locator(".bag-grid"));
  await page.getByText("Desktop copy ready in your inventory.").waitFor();
}
async function removeMaterial(name) {
  await page
    .locator(".pool-item")
    .filter({ has: page.locator("b") })
    .and(btn(name))
    .click();
  await click("Remove from grid");
}
async function archived(recipe, n) {
  for (const id of (await readdir(reports)).filter((x) =>
    /^[0-9a-f]{32}$/.test(x),
  )) {
    const m = JSON.parse(
      await readFile(path.join(reports, id, "metadata.json"), "utf8"),
    );
    if (m.recipe === recipe && (!n || m.sources.length === n))
      return { id, m, dir: path.join(reports, id) };
  }
  throw new Error("No archive for " + recipe);
}
const cells = () => page.locator(".pool-item");
const item = (n) => page.locator(".filetile").and(btn(n));
try {
  await launch();
  assert.equal(await page.locator(".materials .tile").count(), 9);
  assert.equal(await page.locator(".bag-grid .tile").count(), 18);
  assert.equal(await page.locator(".bookitem[aria-pressed=true]").count(), 0);
  assert.equal(await page.locator(".filetile").count(), 3);
  await click("中文");
  await click("English");
  await click("Sales overview");
  await page.getByLabel("Inventory location").selectOption("examples");
  const sourceNames = [
    "Order-headers-demo.csv",
    "Order-items-demo.tsv",
    "Bank-demo.csv",
    "Payouts-demo.csv",
  ];
  // Select four real inventory entries, then drop them in one gesture.
  for (const name of sourceNames)
    await item(name).click({ modifiers: ["Control"] });
  await item(sourceNames[0]).dragTo(page.locator(".materials"));
  await page.waitForFunction(
    () => document.querySelectorAll(".pool-item").length === 4,
  );
  assert.ok(
    (await page.locator(".preview").innerText()).includes("Payout check"),
  );
  await page.screenshot({
    path: path.join(out, "matches.png"),
    fullPage: true,
  });
  await choose("Order analysis", "MYR");
  assert.equal(await cells().count(), 4);
  assert.equal(await page.locator(".pool-item.in-use").count(), 2);
  assert.equal(await page.locator(".pool-item.unused").count(), 2);
  assert.match(await page.locator(".peek").innerText(), /62.50/);
  await craft();
  await page.screenshot({ path: path.join(out, "chosen.png"), fullPage: true });
  assert.equal(await page.locator(".filetile.in-batch").count(), 0);
  assert.equal(await page.locator(".filetile.used-source").count(), 2);
  await click("中文");
  await page.getByRole("heading", { name: "成品预览" }).waitFor();
  await page.screenshot({
    path: path.join(out, "chosen-zh.png"),
    fullPage: true,
  });
  await click("English");
  const joined = await archived("orders");
  assert.deepEqual(
    joined.m.sources.map((s) => s.role),
    ["lines", "headers"],
  );
  const norm = JSON.parse(
    await readFile(path.join(joined.dir, "data/processed.json"), "utf8"),
  );
  assert.equal(
    norm.rows.reduce((n, x) => n + x.cents, 0),
    12500,
  );
  assert.deepEqual(
    norm.rows.map((x) => x.headerRow),
    [2, 2, 3],
  );
  assert.deepEqual(
    await readFile(path.join(joined.dir, "inputs/lines/Order-items-demo.tsv")),
    await readFile(path.join(release, "examples/en/Order-items-demo.tsv")),
  );
  const orderPNG = await readFile(path.join(joined.dir, "exports/report.png"));
  assert.equal(orderPNG.readUInt32BE(16), 1800);
  await put();
  await put();
  let copies = (await readdir(desktop)).filter((n) =>
    n.endsWith(".onepagebi.html"),
  );
  assert.equal(copies.length, 1);
  const orderFile = copies[0];
  const originalHTML = await readFile(path.join(desktop, orderFile));
  await writeFile(path.join(desktop, orderFile), "user-edited copy");
  await click("To inventory");
  await page.getByText("Desktop copy ready in your inventory.").waitFor();
  copies = (await readdir(desktop)).filter((n) =>
    n.endsWith(".onepagebi.html"),
  );
  assert.equal(copies.length, 2);
  const usable = copies.find((n) => n !== orderFile);
  assert.ok((await readFile(path.join(desktop, usable))).equals(originalHTML));
  // Reusing an actual archived report loads only its inert dataset.
  await item(usable).dragTo(page.locator(".materials"));
  await page.waitForFunction(
    () => document.querySelectorAll(".pool-item").length === 5,
  );
  await removeMaterial(usable);
  await choose("Payout check", "MYR");
  await craft();
  await put();
  const payout = await archived("payout");
  assert.deepEqual(
    payout.m.sources.map((x) => x.role),
    ["settlement", "bank"],
  );
  const payoutFile = (await readdir(desktop)).find((n) =>
    n.includes("BI-payout-"),
  );
  assert.ok(payoutFile);
  await click("Change selection");
  const editFile = page.locator('input[type="file"]');
  const odd = path.join(profile, "weird.csv"),
    bad = path.join(profile, "scan.pdf");
  await writeFile(
    odd,
    "Counter export\nWhen,Collected,Currency\n2026-10-06,2.50,MYR",
  );
  await writeFile(bad, "mock PDF");
  await editFile.setInputFiles([odd, bad]);
  await page.getByRole("alert").filter({ hasText: "scan.pdf" }).waitFor();
  await btn("weird.csv", page.locator(".materials")).click();
  const d = page.getByRole("dialog");
  await d.getByRole("spinbutton").fill("2");
  await d.getByLabel("Material meaning").selectOption("cashflow");
  await d.getByLabel("Date", { exact: true }).selectOption("0");
  await d.getByLabel("Signed amount", { exact: true }).selectOption("1");
  await click("Apply to material");
  await choose("Cash flow statement", "MYR", "weird.csv");
  await writeFile(odd, "modified after loading");
  await craft();
  const cash = await archived("cashflow");
  assert.match(
    await readFile(path.join(cash.dir, "inputs/weird.csv"), "utf8"),
    /2.50/,
  );
  // Second source is XLSX with a non-data cover sheet. Use the actual external file input.
  await editFile.setInputFiles([
    path.join(desktop, "actual.xlsx"),
    path.join(desktop, "actual.csv"),
  ]);
  await page.waitForFunction(
    () => document.querySelectorAll(".pool-item").length === 7,
  );
  await editFile.setInputFiles(path.join(desktop, "actual.csv"));
  await page.getByText("An identical file is already on the grid.").waitFor();
  await choose("Sales overview", "MYR", /actual\.csv/);
  const parked = reports + "-hold";
  await rename(reports, parked);
  await writeFile(reports, "occupied");
  await click("Craft and archive");
  await page.getByRole("alert").waitFor();
  await unlink(reports);
  await rename(parked, reports);
  await craft();
  const sales = await archived("sales");
  assert.equal(
    JSON.parse(
      await readFile(path.join(sales.dir, "data/processed.json"), "utf8"),
    ).rows.length,
    3,
  );
  await click("中文");
  await page.screenshot({
    path: path.join(out, "workbench-zh.png"),
    fullPage: true,
  });
  await click("历史记录");
  await page.locator(".histitem").first().waitFor();
  assert.equal(await page.locator(".histitem").count(), 4);
  await closeApp();
  await launch("zh-CN");
  await click("历史记录");
  await page.locator(".histitem").first().waitFor();
  assert.equal(await page.locator(".histitem").count(), 4);
  const target = path.join(profile, "history-export.png");
  await Promise.all([
    fillNativeDialog(target),
    page
      .locator(".histitem")
      .filter({ hasText: "Order-items-demo.tsv" })
      .getByRole("button", { name: "导出汇总 PNG" })
      .click(),
  ]);
  await page.getByText("已导出 PNG。").waitFor();
  assert.ok((await readFile(target)).equals(orderPNG));
  await click("工作台");
  await click("English");
  const periods = [1, 2, 3].map((i) => ({
    name: "period" + i + ".csv",
    text: "Sales date,Sales amount,Currency\n2026-0" + i + "-03,2.00,MYR",
  }));
  const transfer = await page.evaluateHandle((files) => {
    const dt = new DataTransfer();
    for (const f of files)
      dt.items.add(new File([f.text], f.name, { type: "text/csv" }));
    return dt;
  }, periods);
  await page
    .locator(".materials")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await choose(
    "Sales overview",
    "MYR",
    /period1\.csv.*period2\.csv.*period3\.csv/,
  );
  await craft();
  const multi = await archived("sales", 3);
  const data = JSON.parse(
    await readFile(path.join(multi.dir, "data/processed.json"), "utf8"),
  );
  assert.deepEqual(
    data.rows.map((r) => r.sourceIndex),
    [1, 2, 3],
  );
  assert.equal(
    data.rows.reduce((n, r) => n + r.cents, 0),
    600,
  );
  for (const [i, p] of periods.entries()) {
    assert.equal(
      multi.m.sources[i].sha256,
      createHash("sha256").update(p.text).digest("hex"),
    );
    assert.equal(
      await readFile(
        path.join(multi.dir, "inputs", "period-0" + (i + 1), p.name),
        "utf8",
      ),
      p.text,
    );
  }
  await closeApp();
  // Start a separate workbench session with the Chinese sample files.
  await launch();
  await click("中文");
  await page.getByLabel("背包位置").selectOption("examples");
  for (const name of [
    "订单主表_演示.csv",
    "订单行_演示.tsv",
    "结算单_演示.csv",
    "银行流水_演示.csv",
  ])
    await item(name).click({ modifiers: ["Control"] });
  await item("订单主表_演示.csv").dragTo(page.locator(".materials"));
  await page
    .locator(".candidate-list button")
    .filter({ hasText: "订单分析" })
    .waitFor();
  await page.screenshot({
    path: path.join(out, "matches-zh.png"),
    fullPage: true,
  });
  await page
    .locator(".candidate-list button")
    .filter({ hasText: "订单分析" })
    .click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("MYR");
  await click("确认映射并验证");
  await click("合成并归档");
  await page.locator(".result.crafted").waitFor();
  assert.equal(await page.locator(".filetile.used-source").count(), 2);
  await page.screenshot({
    path: path.join(out, "chosen-zh.png"),
    fullPage: true,
  });
  await closeApp();
  const edgePath =
    process.env.EDGE_PATH ||
    path.join(
      process.env["ProgramFiles(x86)"],
      "Microsoft",
      "Edge",
      "Application",
      "msedge.exe",
    );
  edge = await chromium.launch({ executablePath: edgePath, headless: true });
  const ctx = await edge.newContext({
      offline: true,
      acceptDownloads: true,
      viewport: { width: 1200, height: 840 },
    }),
    portable = await ctx.newPage();
  const stray = [];
  portable.on("request", (req) => {
    if (/^https?:/.test(req.url())) stray.push(req.url());
  });

  await portable.goto(pathToFileURL(path.join(desktop, usable)).href);
  assert.match(await portable.locator("#summary").innerText(), /62.50/);
  await portable.locator("#category").selectOption({ label: "Cups" });
  assert.match(await portable.locator("#summary").innerText(), /40.00/);
  await portable.locator("#language").click();
  const dl = portable.waitForEvent("download");
  await portable.locator("#png").click();
  await (await dl).saveAs(path.join(out, "filtered.png"));
  await payoutOffline(portable, path.join(desktop, payoutFile), out);
  assert.deepEqual(stray, []);
  console.log(
    "PASS: template-free group drag, cross-template suggestions, source highlighting, exact two-file joins, archive snapshot, desktop inventory, XLSX, nonstandard headers, HTML reuse, two-source reconciliation, languages and native PNG export.",
  );
} finally {
  await edge?.close();
  await closeApp();
}
