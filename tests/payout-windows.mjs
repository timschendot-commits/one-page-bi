import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
export async function payoutDesktop(page, { desktop, reports, out }) {
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  await click("English");
  await click("Workbench");
  const rects = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [".materials", ".tile.material", ".bag-grid", ".preview"].map((sel) => {
          const box = document.querySelector(sel).getBoundingClientRect();
          return [sel, [box.x, box.width, box.height]];
        }),
      ),
    );
  const before = await rects();
  await click("Payout check");
  const after = await rects();
  assert.equal(await page.locator(".materials .tile").count(), 9);
  assert.equal(await page.locator(".bag-grid .tile").count(), 18);
  for (const key of Object.keys(before)) {
    assert.ok(
      Math.abs(before[key][0] - after[key][0]) < 1 &&
        Math.abs(before[key][1] - after[key][1]) < 1,
      key,
    );
  }
  assert.equal(await page.locator(".top nav button").count(), 2);
  assert.equal(await page.getByLabel("Common currency").count(), 0);
  await page.getByLabel("Inventory location").selectOption("examples");
  await page
    .getByRole("button", { name: "Payouts-demo.csv", exact: true })
    .dragTo(
      page.getByRole("button", { name: "Platform payouts", exact: true }),
    );
  await click("Use these columns");
  await page
    .getByRole("button", { name: "Bank-demo.csv", exact: true })
    .dragTo(page.getByRole("button", { name: "Bank statement", exact: true }));
  assert.ok(
    await page
      .getByLabel("Find whole reference codes in the bank description")
      .isChecked(),
  );
  await click("Use these columns");
  await click("Check payouts");
  await page.getByRole("alert").filter({ hasText: "currency" }).waitFor();
  await page.getByLabel("Common currency").selectOption("MYR");
  await click("Use these columns");
  await click("Check payouts");
  await page
    .getByText("Check archived. Inspect the exceptions before sharing.")
    .waitFor();
  assert.match(
    await page.locator(".peek").innerText(),
    /Confirmed receipts · MYR\s+120.00/,
  );

  assert.match(
    await page.locator(".peek").innerText(),
    /Payout exceptions\s+4/,
  );
  await page.locator(".result").dragTo(page.locator(".bag-grid"));
  await page.getByText("Desktop copy ready in your inventory.").waitFor();
  const filename = (await readdir(desktop)).find(
    (n) => n.includes("BI-payout-") && n.endsWith(".onepagebi.html"),
  );
  assert.ok(filename);
  await page.screenshot({
    path: path.join(out, "payout-workbench.png"),
    fullPage: true,
  });
  await click("中文");
  await page.getByRole("button", { name: "查看待查明细 ↗" }).waitFor();
  await page.screenshot({
    path: path.join(out, "payout-workbench-zh.png"),
    fullPage: true,
  });
  await click("English");
  // Same filename, different workbook contents: each role must retain its own snapshot.
  const xlsx = (rows) => {
    const w = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(rows), "Statement");
    return XLSX.write(w, { type: "buffer", bookType: "xlsx" });
  };
  const shared = path.join(desktop, "weekly.xlsx");
  const original = xlsx([
    ["Date", "Reference", "Net payout", "Currency"],
    ["2026-11-01", "X0001", 10.01, "MYR"],
  ]);
  const received = xlsx([
    ["Booked on", "Our code", "Debit", "Credit", "Currency"],
    ["02/11/2026", "X0001", 0, 10.01, "MYR"],
  ]);
  await writeFile(shared, original);
  const item = page.getByRole("button", { name: "weekly.xlsx", exact: true });
  await item.waitFor();
  await item.dragTo(
    page.getByRole("button", { name: "Platform payouts", exact: true }),
  );
  await click("Use these columns");
  await item.dragTo(
    page.getByRole("button", { name: "Bank statement", exact: true }),
  );
  await click("Use these columns");
  await click("Check payouts");
  await page.getByRole("alert").filter({ hasText: "same file" }).waitFor();
  await writeFile(shared, received);
  await item.dragTo(
    page.getByRole("button", { name: "Bank statement", exact: true }),
  );
  await page.getByLabel("Date", { exact: true }).selectOption("0");
  await page
    .getByLabel("Settlement reference", { exact: true })
    .selectOption("1");
  await page.getByLabel("Also read DD/MM/YYYY dates").check();
  await click("Use these columns");
  await writeFile(shared, "changed after selection");
  await click("Check payouts");
  await page
    .getByText("Check archived. Inspect the exceptions before sharing.")
    .waitFor();
  let last;
  for (const id of await readdir(reports)) {
    const meta = JSON.parse(
      await readFile(path.join(reports, id, "metadata.json"), "utf8"),
    );
    if (meta.recipe === "payout" && meta.source === "weekly.xlsx") {
      last = id;
      assert.deepEqual(
        meta.sources.map((s) => s.sha256),
        [original, received].map((v) =>
          createHash("sha256").update(v).digest("hex"),
        ),
      );
    }
  }
  assert.ok(last);
  for (const [role, buf] of [
    ["settlement", original],
    ["bank", received],
  ])
    assert.ok(
      (
        await readFile(path.join(reports, last, "inputs", role, "weekly.xlsx"))
      ).equals(buf),
    );
  // Restore the same columns in a different order; reuse by name, never by index.
  await writeFile(
    shared,
    xlsx([
      ["Our code", "Currency", "Credit", "Booked on", "Debit"],
      ["X0001", "MYR", 10.01, "02/11/2026", 0],
    ]),
  );
  await item.dragTo(
    page.getByRole("button", { name: "Bank statement", exact: true }),
  );
  assert.equal(
    await page.getByLabel("Settlement reference", { exact: true }).inputValue(),
    "0",
  );
  assert.equal(
    await page.getByLabel("Date", { exact: true }).inputValue(),
    "3",
  );
  assert.ok(await page.getByLabel("Also read DD/MM/YYYY dates").isChecked());
  await click("Use these columns");
  await click("History");
  await page.locator(".histitem").filter({ hasText: "weekly.xlsx" }).waitFor();
  return path.join(desktop, filename);
}
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
