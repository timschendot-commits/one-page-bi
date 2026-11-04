import path from "node:path";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
export async function exerciseChoices(page, release, profile, out) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const click = (name, scope = page) =>
      scope.getByRole("button", { name, exact: true }).click(),
    dialog = page.getByRole("dialog");
  const bill = path.join(profile, "r04.ndjson");
  await writeFile(
    bill,
    '{"客户编号":"A01","商户订单号":"007","日期":"2026-01-01","行实收销售额":"1.234,50","ccy":"MYR"}\n{"ccy":"MYR","日期":"2026-01-02","客户编号":"A01","商户订单号":"008","行实收销售额":"20,00"}',
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      [
        "17-B.csv",
        "Q9.csv",
        "Open-deals.jsonl",
        "Reorder-check.psv",
        "Sales-demo.csv",
      ]
        .map((n) => path.join(release, "examples/en", n))
        .concat(bill),
    );
  await page.waitForFunction(
    () => document.querySelectorAll(".pool-item").length === 6,
  );
  const groups = page.locator(".preview .candidate-list button");
  for (const language of ["中文", "English"]) {
    await click(language);
    const n = await groups.count();
    assert.ok(n >= 7);
    for (let i = 0; i < n; i++) {
      await groups.nth(i).click();
      await dialog.waitFor();
      if (await dialog.locator(".candidate-list").count())
        await dialog.locator(".candidate-list button").first().click();
      await dialog.locator(".review-question").waitFor();
      await dialog.locator(".source-fields summary").first().click();
      await dialog.press("Escape");
      assert.equal(await page.locator(".pool-item").count(), 6);
    }
  }
  await click("Recipe catalog");
  await dialog.getByRole("searchbox").fill("欠我");
  assert.equal(await dialog.locator(".recipe-pick").count(), 1);
  await dialog.press("Escape");
  await page
    .locator(".pool-item")
    .and(page.getByRole("button", { name: "r04.ndjson", exact: true }))
    .click();
  const use = dialog.getByLabel("What does this file contain?");
  for (const opt of await use
    .locator("option")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.value).filter((k) => k !== "auto"),
    )) {
    await use.selectOption(opt);
    assert.ok(await dialog.locator(".mapping select").count());
  }
  await use.selectOption("repeat");
  await dialog.getByLabel(/Amounts use a decimal comma/).check();
  await click("Apply to material", dialog);
  for (const name of [
    "Repeat customers",
    "Stock replenishment",
    "Open sales pipeline",
  ]) {
    await groups.filter({ hasText: name }).click();
    await dialog.waitFor();
    await click("Generate report", dialog);
    await page.locator(".result.crafted").waitFor();
    await click("Change selection");
  }
  await click("中文");
  await page.screenshot({ path: path.join(out, "questions-zh.png") });
  await groups.filter({ hasText: "试算平衡" }).click();
  await dialog.locator(".source-fields summary").click();
  await page.screenshot({ path: path.join(out, "review-zh.png") });
  assert.equal(await page.locator(".pool-item.unused").count(), 5);
  await dialog.press("Escape");
  await click("历史记录");
  for (const source of [
    "r04.ndjson",
    "Open-deals.jsonl",
    "Reorder-check.psv",
  ]) {
    await page
      .locator(".histitem")
      .filter({ hasText: source })
      .getByRole("button", { name: "核查材料与重新验证" })
      .click();
    await click("从原件重算验证", dialog);
    await dialog.getByText("复算一致", { exact: true }).waitFor();
    await dialog.press("Escape");
  }
  assert.deepEqual(errors, []);
}
