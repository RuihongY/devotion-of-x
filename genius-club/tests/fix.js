/* 复现用户卡死存档:开箱后(ms.invite)但现实幕卡在 reality=1(没有c15)
 * 期望:完成任意一夜后,连播 R3→R4→R5 → E2 结局 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const log = (...a) => console.log("[fix]", ...a);

  await page.goto("http://localhost:8461/genius-club/");
  // 用户实际会遇到的旧档:v1、reality 整数、无 realityDone 字段
  await page.evaluate(() => {
    localStorage.setItem("genius-club:v1", JSON.stringify({
      v: 1, loop: 8,
      clues: ["c01", "c02", "c05", "c06", "c07", "c08", "c09", "c11", "c12"],
      newClues: [], ms: { invite: true }, perks: [],
      reality: 1, endings: [], butterfly: {},
    }));
  });
  await page.reload(); await page.waitForTimeout(300);

  // 迁移检查
  const migrated = await page.evaluate(() => G.meta.realityDone);
  log("migrated realityDone:", JSON.stringify(migrated));

  await page.click("#title .btn.primary"); // 继续·第9夜

  // 直接摆烂等到 00:42:night_open → 地图 → 公寓等待
  const seen = [];
  let sawE2 = false;
  for (let i = 0; i < 200; i++) {
    await page.waitForTimeout(130);
    const r = await page.evaluate(() => {
      const card = document.getElementById("card");
      if (card.classList.contains("on")) {
        const big = card.querySelector(".big") ? card.querySelector(".big").textContent : "";
        card.click(); return { card: big };
      }
      const choices = [...document.querySelectorAll("#choices.on .choice:not(.locked)")];
      if (choices.length) { choices[0].click(); return {}; }
      if (document.getElementById("sceneView").classList.contains("on")) { document.getElementById("dbox").click(); return {}; }
      if (document.getElementById("locPanel").classList.contains("on")) {
        const w = [...document.querySelectorAll(".action")].find((a) => a.textContent.includes("原地等待"));
        if (w) w.click(); return {};
      }
      if (document.getElementById("map").classList.contains("on")) {
        [...document.querySelectorAll(".loc")].find((l) => l.textContent.includes("梦中公寓")).click(); return {};
      }
      return {};
    });
    if (r.card) {
      seen.push(r.card.trim());
      if (r.card.includes("二六二四")) { sawE2 = true; break; }
    }
  }
  log("cards seen:", JSON.stringify(seen));
  log("saw E2:", sawE2);
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  log("endings:", s.endings, "| realityDone:", JSON.stringify(s.realityDone), "| r5:", s.ms.r5);

  log("console errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(errors.length || !sawE2 ? 1 : 0);
})();
