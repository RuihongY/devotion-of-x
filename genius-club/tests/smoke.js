/* 冒烟测试:首夜教学 → 醒来 → 现实R0 → 第二夜地图 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("http://localhost:8461/genius-club/");
  await page.waitForTimeout(400);

  const log = (...a) => console.log("[smoke]", ...a);

  // 标题屏
  const title = await page.textContent("#title h1");
  log("title:", title.trim());
  await page.click("#title .btn.primary"); // 入梦

  // 自动推进:反复点击对话框/第一个可用选项/卡片
  async function advance(maxSteps, stopWhen) {
    for (let i = 0; i < maxSteps; i++) {
      await page.waitForTimeout(120);
      if (stopWhen && (await page.evaluate(stopWhen))) return true;
      // 全屏卡片?
      if (await page.isVisible("#card.on")) { await page.click("#card"); continue; }
      // 选项?
      const choice = page.locator("#choices.on .choice:not(.locked)").first();
      if (await choice.count() && await choice.isVisible()) { await choice.click(); continue; }
      // 对话框(点两次跳过打字机)
      if (await page.isVisible("#sceneView.on")) { await page.click("#dbox"); continue; }
      // 地点面板/地图
      if (await page.isVisible("#locPanel.on") || await page.isVisible("#map.on")) return "hub";
    }
    return false;
  }

  // 走完首夜(intro→die→wake卡→R0→夜幕卡→night_open→地图)
  const r = await advance(120, "() => document.getElementById('map').classList.contains('on')");
  log("reached night-2 map:", r === true);
  const night = await page.textContent("#nightLabel");
  const clock = await page.textContent("#clock");
  log("topbar:", night.trim(), clock.trim());

  // 情报手册应有 c01
  await page.click("#journalBtn");
  await page.waitForTimeout(200);
  const jtext = await page.textContent("#jlist");
  log("journal has 劫案的时刻:", jtext.includes("劫案的时刻"));
  await page.click("#jclose");

  // 存档校验
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  log("save: loop =", saved.loop, "clues =", saved.clues.join(","));

  // 刷新后应可继续
  await page.reload();
  await page.waitForTimeout(400);
  const btn = await page.textContent("#title .btn.primary");
  log("continue button:", btn.trim());

  log("console errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
