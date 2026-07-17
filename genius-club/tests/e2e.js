/* 深度测试:速通开箱 → E2 结局 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const log = (...a) => console.log("[e2e]", ...a);

  // 预置存档:老玩家,已有推理开箱所需情报,现实幕已播到 r5 之前
  await page.goto("http://localhost:8461/genius-club/");
  await page.evaluate(() => {
    localStorage.setItem("genius-club:v1", JSON.stringify({
      v: 1, loop: 5,
      clues: ["c01", "c02", "c05", "c09", "c11", "c14"],
      newClues: [], ms: { seen_scout: true, seen_vault: true }, perks: [],
      reality: 5, endings: [], butterfly: {},
    }));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.click("#title .btn.primary"); // 继续·第6夜

  // night_open 对话
  async function tapDialog(times) {
    for (let i = 0; i < times; i++) {
      if (await page.isVisible("#sceneView.on")) { await page.click("#dbox"); await page.waitForTimeout(100); }
    }
  }
  async function untilHub(max = 30) {
    for (let i = 0; i < max; i++) {
      await page.waitForTimeout(120);
      if (await page.isVisible("#map.on") || await page.isVisible("#locPanel.on")) return true;
      if (await page.isVisible("#card.on")) { await page.click("#card"); continue; }
      if (await page.isVisible("#sceneView.on")) { await page.click("#dbox"); continue; }
    }
    return false;
  }
  log("reach map:", await untilHub());

  // 去银行(下水道近路5分)
  await page.click('.loc:has-text("中央银行")');
  await page.waitForTimeout(200);
  log("at bank, clock:", (await page.textContent("#clock")).trim());

  // 等到 23:00 窗口(t>=55):等待 4 次 = 60分 → t=65
  for (let i = 0; i < 4; i++) { await page.click('.action:has-text("原地等待")'); await page.waitForTimeout(120); }
  log("after waits, clock:", (await page.textContent("#clock")).trim());

  // 混进劫案直奔金库
  const vaultBtn = page.locator('.action:has-text("混进劫案")');
  log("vault action enabled:", !(await vaultBtn.first().getAttribute("class")).includes("locked"));
  await vaultBtn.first().click();

  // 场景内推进到保险箱菜单
  async function untilChoices(max = 30) {
    for (let i = 0; i < max; i++) {
      await page.waitForTimeout(120);
      if (await page.locator("#choices.on .choice").count()) return true;
      if (await page.isVisible("#sceneView.on")) await page.click("#dbox");
    }
    return false;
  }
  log("reach safe menu:", await untilChoices());
  const choiceTexts = await page.locator("#choices.on .choice").allTextContents();
  log("choices:", JSON.stringify(choiceTexts));

  // 推理密码 → 回菜单 → 输入 2624 0042
  await page.click('.choice:has-text("推理密码")');
  log("deduce shown, advancing…");
  await untilChoices(40);
  const t2 = await page.locator("#choices.on .choice").allTextContents();
  log("choices after deduce:", JSON.stringify(t2));
  await page.click('.choice:has-text("输入 2624 0042")');

  // 开箱 → 等待 00:42 → doom 卡 → wake 卡 → r5 → E2
  let sawDoom = false, sawEnding = false;
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => {
      const card = document.getElementById("card");
      if (card.classList.contains("on")) {
        const big = card.querySelector(".big").textContent;
        return { card: big };
      }
      const choices = document.querySelectorAll("#choices.on .choice:not(.locked)");
      if (choices.length) { choices[0].click(); return { clicked: "choice" }; }
      if (document.getElementById("sceneView").classList.contains("on")) {
        document.getElementById("dbox").click(); return { clicked: "dbox" };
      }
      return {};
    });
    if (state.card) {
      if (state.card.includes("00:42")) sawDoom = true;
      if (state.card.includes("二六二四")) { sawEnding = true; log("ENDING CARD:", state.card.trim()); }
      await page.evaluate(() => document.getElementById("card").click());
      if (sawEnding) break;
    }
  }
  log("saw doom card:", sawDoom, "| saw E2 ending:", sawEnding);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  log("endings:", saved.endings, "invite:", saved.ms.invite, "r5:", saved.ms.r5, "clues:", saved.clues.length);
  const titleTxt = await page.textContent("#title");
  log("title shows ending:", titleTxt.includes("二六二四"));

  log("console errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(errors.length || !sawEnding ? 1 : 0);
})();
