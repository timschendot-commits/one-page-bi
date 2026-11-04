import path from "node:path";import {readdir,readFile,writeFile,stat} from "node:fs/promises";import assert from "node:assert/strict";
export async function desktop070(page,release,profile,out,fillNativeDialog,restoreFromTray){
 const errors=[];page.on("pageerror",e=>errors.push(e.message));const click=(name,scope=page)=>scope.getByRole("button",{name,exact:true}).click(),dialog=page.getByRole("dialog");
 await page.locator('input[type="file"]').setInputFiles(path.join(release,"examples/en/Sales-demo.csv"));await page.locator(".pool-item").waitFor();
 await click("报表目录");await dialog.getByRole("searchbox").fill("哪些客户还没付款需要催收");await dialog.locator(".recipe-row").first().getByRole("button",{name:/收藏/}).click();await dialog.getByRole("searchbox").fill("");assert.equal(await dialog.locator("section h3").first().innerText(),"我的收藏");await dialog.press("Escape");
 await page.locator(".preview .candidate-list button").filter({hasText:"销售分析总览"}).click();await click("生成并归档",dialog);await page.locator(".result.crafted").waitFor();
 assert.match(await page.locator(".exec-kpis").innerText(),/3,393.00/);await click("窗口与配色");await click("海蓝");assert.equal(await page.locator("html").getAttribute("data-theme"),"ocean");await click("窗口与配色");
 await page.screenshot({path:path.join(out,"executive-zh.png")});
 await click("专业编辑");await click("归档已保存的修改",dialog);await dialog.getByText(/修订版已归档/).waitFor();await Promise.all([fillNativeDialog(path.join(out,"Sales-editable.zip")),dialog.getByRole("button",{name:/导出可编辑文件包/}).click()]);await dialog.getByText("编辑副本已就绪",{exact:true}).waitFor();await dialog.press("Escape");
 const editionRoot=path.join(profile,"Editions");const ids=await readdir(editionRoot);const working=path.join(editionRoot,ids[0],"Working");assert.ok((await stat(path.join(working,"Executive.docx"))).size>1200);assert.ok((await stat(path.join(working,"Workbench.pbip"))).size>100);
 // Simulate an edit already saved in another editor, then verify durable revisions without touching the sealed run.
 await writeFile(path.join(working,"notes.txt"),"version two");await click("专业编辑");await click("归档已保存的修改",dialog);await dialog.getByText(/修订版已归档/).waitFor();assert.equal((await readdir(path.join(editionRoot,ids[0],"Revisions"))).length,2);await dialog.press("Escape");
 await click("窗口与配色");await click("悬浮小窗");await page.waitForFunction(()=>innerWidth<=660);assert.equal(await page.locator(".mini-nav").isVisible(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,"floating-zh.png")});
 await click("取消选择");await page.getByRole("navigation",{name:"小窗导航"}).getByRole("button",{name:"材料",exact:true}).click();assert.equal(await page.locator(".pool-item").count(),1);
 // Observe native hide/restore with the same restore handler the notification icon calls.
 async function state(action){return page.evaluate(a=>new Promise((resolve,reject)=>{const id=crypto.randomUUID();const w=window.chrome.webview;function done(e){if(e.data.id!==id)return;w.removeEventListener("message",done);e.data.ok?resolve(e.data.result):reject(Error(e.data.error));}w.addEventListener("message",done);w.postMessage({id,method:"windowAction",language:"zh-CN",action:a});}),action);}
 await click("窗口与配色");await click("收起到托盘");assert.equal((await state("state")).visible,false);await restoreFromTray();assert.equal((await state("state")).visible,true);
 await click("窗口与配色");await click("展开工作台");await page.waitForFunction(()=>innerWidth>660);await click("报表目录");assert.equal(await dialog.locator("section h3").first().innerText(),"我的收藏");await dialog.press("Escape");assert.deepEqual(errors,[]);
 return working;
}
