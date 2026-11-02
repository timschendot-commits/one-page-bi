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
async function generate() {
  await page.getByRole("button", { name: "合成并归档", exact: true }).click();
  await page.getByText("已合成。把成品拖到背包，即可保存到桌面。").waitFor();
}
async function read(index, name) {
  return JSON.parse(await readFile(path.join(reports, index, name), "utf8"));
}
try {
  await launch();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.doesNotMatch(
    (await page.locator("body").innerText()).replace("中文", ""),
    /[\p{Script=Han}]/u,
  );
  await click("中文");
  await page.getByRole("heading", { name: "报表合成台" }).waitFor();
  assert.equal(await page.locator(".filetile").count(), 3);
  assert.equal(await page.locator(".materials .tile").count(), 9);
  const boxes = await page.locator(".bag-grid .tile").evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return [r.width, r.height];
    }),
  );
  assert.equal(boxes.length, 18);
  assert.ok(boxes.every(([w, h]) => Math.abs(w - h) < 1));
  const fillers = Array.from({ length: 19 }, (_, i) =>
    path.join(desktop, "extra-" + i + ".csv"),
  );
  await Promise.all(
    fillers.map((f) => writeFile(f, "date,amount\n2026-01-01,1")),
  );
  await click("刷新背包");
  await click("下一页");
  assert.equal(await page.locator(".filetile").count(), 4);
  await click("上一页");
  await page.getByLabel("搜索文件名").fill("wrong");
  await file("wrong.csv").waitFor();
  assert.equal(await page.locator(".filetile").count(), 1);
  await page.getByLabel("搜索文件名").fill("");
  await Promise.all(fillers.map((f) => unlink(f)));
  await click("刷新背包");
  await file("wrong.csv").click();
  await click("确认映射并验证");
  await page.getByRole("alert").filter({ hasText: "第 2 行" }).waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "English", exact: true })
    .click();
  assert.match(
    await page.getByRole("alert").innerText(),
    /Row 2 · Line amount/,
  );
  assert.equal(
    await page.getByLabel("Line amount", { exact: true }).inputValue(),
    "1",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "中文", exact: true })
    .click();
  assert.equal(
    await stat(reports).then(
      () => true,
      () => false,
    ),
    false,
  );
  await click("关闭");
  await file("actual.csv").dragTo(page.locator(".materials"));
  await click("确认映射并验证");
  await writeFile(path.join(desktop, "actual.csv"), "Changed after validation");
  await writeFile(reports, "simulated unavailable destination");
  await click("合成并归档");
  await page.getByRole("alert").waitFor();
  await unlink(reports);
  await generate();
  const [id] = await readdir(reports);
  assert.ok(id);
  const meta = await read(id, "metadata.json"),
    processed = await read(id, "data/processed.json"),
    config = await read(id, "template.json");
  assert.deepEqual(
    await readFile(path.join(reports, id, "inputs", "actual.csv")),
    original,
  );
  assert.equal(
    meta.sha256,
    createHash("sha256").update(original).digest("hex"),
  );
  assert.equal(meta.rows, 3);
  assert.equal(config.mapping.order.header, "订单号");
  assert.equal(
    processed.rows.reduce((sum, r) => sum + r.cents, 0),
    900,
  );
  const png = await readFile(path.join(reports, id, "exports", "report.png"));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1800, 1134]);
  await click("再次合成并归档");
  await page.getByText("已合成。把成品拖到背包，即可保存到桌面。").waitFor();
  assert.equal((await readdir(reports)).length, 2);
  assert.equal(
    (await readFile(path.join(reports, id, "exports", "report.png"))).equals(
      png,
    ),
    true,
  );
  await unlink(path.join(desktop, "actual.csv"));
  await file("actual.xlsx").click();
  await page.getByRole("alert").filter({ hasText: "表头或空行" }).waitFor();
  await page.getByLabel("工作表", { exact: true }).selectOption("销售");
  await click("确认映射并验证");
  await generate();
  const all = await readdir(reports);
  let excel;
  for (const record of all)
    if ((await read(record, "metadata.json")).source === "actual.xlsx")
      excel = record;
  assert.ok(excel);
  await page.getByLabel("背包位置").selectOption("examples");
  await file("销售明细_演示.csv").waitFor();
  await click("English");
  await file("Sales-demo.csv").click();
  await click("Confirm and validate");
  await click("Craft and archive");
  await page
    .getByText("Report saved. Drag it into the inventory for a desktop copy.")
    .waitFor();
  assert.doesNotMatch(
    (await page.locator("body").innerText()).replace("中文", ""),
    /[\p{Script=Han}]/u,
  );
  assert.match(await page.locator(".peek").innerText(), /3,393\.00/);
  await page.screenshot({
    path: path.join(out, "workbench.png"),
    fullPage: true,
  });
  const previewBefore = await page.locator(".thumb img").getAttribute("src");
  await click("中文");
  await page.getByRole("heading", { name: "成品预览" }).waitFor();
  const previewZh = await page.locator(".thumb img").getAttribute("src");
  assert.notEqual(previewZh, previewBefore);
  const previewExport = path.join(profile, "preview-zh.png");
  await Promise.all([fillNativeDialog(previewExport), click("导出 PNG")]);
  await page.getByText("已导出 PNG。").waitFor();
  assert.ok(
    (await readFile(previewExport)).equals(
      Buffer.from(previewZh.split(",")[1], "base64"),
    ),
  );
  // Real result-slot drag, including from Examples while the destination is Desktop.
  const dropResult = async () => {
    await page.locator(".result").dragTo(page.locator(".bag-grid"));
    await page.getByText("已放入背包，文件在桌面。").waitFor();
  };
  const desktopCopies = async () =>
    (await readdir(desktop)).filter((n) => /\.onepagebi\.html$/i.test(n));
  await dropResult();
  const [salesCopy] = await desktopCopies();
  assert.ok(salesCopy.includes("-sales-"));
  await file(salesCopy).waitFor();
  assert.match(await page.getByLabel("背包位置").innerText(), /桌面/);
  assert.equal(await file(salesCopy).getAttribute("draggable"), "false");
  const originalReport = await readFile(path.join(desktop, salesCopy));
  await dropResult();
  assert.deepEqual(await desktopCopies(), [salesCopy]);
  await writeFile(path.join(desktop, salesCopy), "user-edited desktop copy");
  await click("放入背包");
  await page.getByText("已放入背包，文件在桌面。").waitFor();
  const duplicate = (await desktopCopies()).find((n) => n !== salesCopy);
  assert.ok(duplicate);
  assert.ok(
    (await readFile(path.join(desktop, duplicate))).equals(originalReport),
  );
  assert.equal(
    await readFile(path.join(desktop, salesCopy), "utf8"),
    "user-edited desktop copy",
  );
  await rename(
    path.join(desktop, duplicate),
    path.join(desktop, "external.ONEPAGEBI.HTML"),
  );
  await file("external.ONEPAGEBI.HTML").waitFor();
  await rename(
    path.join(desktop, "external.ONEPAGEBI.HTML"),
    path.join(desktop, "ordinary.html"),
  );
  await file("external.ONEPAGEBI.HTML").waitFor({ state: "detached" });
  assert.equal(await file("ordinary.html").count(), 0);
  await click("订单分析");
  assert.ok(await page.locator(".result").isDisabled());
  await click("核对字段映射");
  await page.getByLabel("订单编号", { exact: true }).selectOption("");
  await click("确认映射并验证");
  await page.getByRole("alert").filter({ hasText: "订单编号" }).waitFor();
  await page.getByLabel("订单编号", { exact: true }).selectOption("1");
  await click("确认映射并验证");
  await generate();
  await dropResult();
  const orderFile = (await desktopCopies()).find((n) => n.includes("-orders-"));
  assert.ok(orderFile);
  await click("收支");
  await page.getByLabel("背包位置").selectOption("examples");
  await file("收支流水_演示.csv").click();
  await click("确认映射并验证");
  await generate();
  assert.match(await page.locator(".peek").innerText(), /1,400.25/);
  await dropResult();
  const cashFile = (await desktopCopies()).find((n) =>
    n.includes("-cashflow-"),
  );
  assert.ok(cashFile);
  await file(cashFile).waitFor();
  await page.screenshot({
    path: path.join(out, "desktop-inventory.png"),
    fullPage: true,
  });
  await click("历史记录");
  assert.equal(await page.locator(".histitem").count(), 6);
  await closeApp();
  await launch("zh-CN");
  await click("历史记录");
  await page.locator(".histitem").first().waitFor();
  assert.equal(await page.locator(".histitem").count(), 6);
  const target = path.join(profile, "history-export.png");
  await Promise.all([
    fillNativeDialog(target),
    page
      .locator(".histitem")
      .filter({ hasText: "actual.csv" })
      .first()
      .getByRole("button", { name: "导出 PNG" })
      .click(),
  ]);
  await page.getByText("已导出 PNG。").waitFor();
  assert.ok((await readFile(target)).equals(png));
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
  const html = path.join(out, "detached-report.html");
  await copyFile(path.join(reports, id, "dashboard", "report.html"), html);
  await portable.goto(pathToFileURL(html).href);
  assert.match(
    await portable.locator("#summary").innerText(),
    /3 行 · 销售额 9.00 MYR · 订单数 2 · 平均订单额 4.50/,
  );
  await portable.locator("#month").selectOption("2024-02");
  await portable.locator("#category").selectOption({ label: "Coffee" });
  assert.match(
    await portable.locator("#summary").innerText(),
    /1 行 · 销售额 10.10 MYR · 订单数 1/,
  );
  const imageZh = await portable
    .locator("canvas")
    .evaluate((c) => c.toDataURL());
  await portable.getByRole("button", { name: "English", exact: true }).click();
  assert.equal(await portable.locator("html").getAttribute("lang"), "en");
  assert.match(
    await portable.locator("#summary").innerText(),
    /1 row · Net sales 10.10 MYR · Orders 1/,
  );
  assert.notEqual(
    await portable.locator("canvas").evaluate((c) => c.toDataURL()),
    imageZh,
  );
  const download = portable.waitForEvent("download");
  await portable.locator("#png").click();
  const saved = path.join(out, "filtered.png");
  await (await download).saveAs(saved);
  const filtered = await readFile(saved);
  assert.equal(filtered.readUInt32BE(16), 1800);
  assert.ok(!filtered.equals(png));
  await portable.getByRole("button", { name: "中文", exact: true }).click();
  await portable.locator("#reset").click();
  assert.match(
    await portable.locator("#summary").innerText(),
    /3 行 · 销售额 9.00/,
  );
  await portable.goto(
    pathToFileURL(path.join(reports, excel, "dashboard", "report.html")).href,
  );
  assert.equal(await portable.evaluate(() => window.pwned), undefined);
  assert.match(
    await portable.locator("#summary").innerText(),
    /45.95 原表单位 · 订单数 未映射/,
  );
  let englishRecord;
  for (const record of await readdir(reports))
    if (
      (await read(record, "metadata.json")).source === "Sales-demo.csv" &&
      (await read(record, "metadata.json")).recipe === "sales"
    )
      englishRecord = record;
  assert.ok(englishRecord);
  assert.equal((await read(englishRecord, "template.json")).language, "en");
  await portable.goto(
    pathToFileURL(path.join(reports, englishRecord, "dashboard", "report.html"))
      .href,
  );
  await portable.getByRole("button", { name: "Export current PNG" }).waitFor();
  assert.equal(await portable.locator("html").getAttribute("lang"), "en");
  assert.match(
    await portable.locator("#summary").innerText(),
    /12 rows · Net sales 3,393.00 CNY · Orders 10/,
  );
  await portable.goto(pathToFileURL(path.join(desktop, orderFile)).href);
  await portable.getByRole("button", { name: "English", exact: true }).click();
  assert.match(
    await portable.locator("#summary").innerText(),
    /Orders 10 · Average order value 339.30 · Multi-line orders 2 · Net sales 3,393.00/,
  );
  await portable.goto(pathToFileURL(path.join(desktop, cashFile)).href);
  await portable.getByRole("button", { name: "English", exact: true }).click();
  assert.match(await portable.title(), /Cash flow statement/);
  assert.match(
    await portable.locator("#summary").innerText(),
    /Cash in 1,400.25 · Cash out 465.25 · Net movement 935.00 · Transactions 6/,
  );
  await portable.locator("#month").selectOption("2026-02");
  assert.match(
    await portable.locator("#summary").innerText(),
    /Net movement 85.00/,
  );
  const cashPNG = portable.waitForEvent("download");
  await portable.locator("#png").click();
  assert.match(
    (await cashPNG).suggestedFilename(),
    /Cash flow statement_2026-02/,
  );
  assert.deepEqual(stray, []);
  console.log(
    "PASS: desktop drag and inventory discovery, collision and repeat drops, three recipes, bilingual offline HTML and PNG, archives and restart.",
  );
} finally {
  await edge?.close();
  await closeApp();
}
