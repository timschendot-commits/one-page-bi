import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
export async function payoutOffline(page, file, out) {
  await page.goto(pathToFileURL(file).href);
  await page.getByRole("heading", { name: "Payout check" }).waitFor();
  await page.getByLabel("Case status").selectOption("difference");
  await page.locator("#cases summary").click();
  assert.match(
    await page.locator("#cases").innerText(),
    /DEMO-102.*Bank minus expected -2.00/,
  );
  assert.match(
    await page.locator("#cases").innerText(),
    /Bank-demo.csv \/ CSV · Row 3/,
  );
  const csv = page.waitForEvent("download");
  await page.locator("#csv").click();
  const csvPath = path.join(out, "exceptions.csv");
  await (await csv).saveAs(csvPath);
  const text = await readFile(csvPath, "utf8");
  assert.match(text, /Payouts-demo.csv/);
  assert.match(text, /Bank-demo.csv/);
  assert.match(text, /88\.00/);
  assert.equal(text.split("\r\n").length, 3);
  await page.getByRole("button", { name: "中文", exact: true }).click();
  assert.equal(await page.locator("#filter").inputValue(), "difference");
  await page
    .getByRole("combobox", { name: "核对状态" })
    .selectOption("pending");
  assert.match(await page.locator("#cases").innerText(), /DEMO-103/);
  const png = page.waitForEvent("download");
  await page.locator("#png").click();
  const pngPath = path.join(out, "payout-summary.png");
  await (await png).saveAs(pngPath);
  assert.equal((await readFile(pngPath)).readUInt32BE(16), 1800);
  await page.locator("#filter").selectOption("difference");
  await page.locator("#cases summary").click();
  await page.screenshot({
    path: path.join(out, "payout-report.png"),
    fullPage: true,
  });
}
