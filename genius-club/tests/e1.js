/* 测试:时空蝴蝶(莱茵猫)+ E1 躺平结局 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const log = (...a) => console.log("[t]", ...a);

  async function pump(opts = {}) {
    let lastCard = "";
    for (let i = 0; i < (opts.max || 150); i++) {
      await page.waitForTimeout(130);
      const r = await page.evaluate((pick) => {
        const card = document.getElementById("card");
        if (card.classList.contains("on")) {
          const big = card.querySelector(".big") ? card.querySelector(".big").textContent : "";
          card.click(); return { card: big };
        }
        const choices = [...document.querySelectorAll("#choices.on .choice:not(.locked)")];
        if (choices.length) { const t = pick ? choices.find((c) => c.textContent.includes(pick)) : null; (t || choices[0]).click(); return {}; }
        if (document.getElementById("sceneView").classList.contains("on")) { document.getElementById("dbox").click(); return {}; }
        if (document.getElementById("map").classList.contains("on")) return { hub: "map" };
        if (document.getElementById("locPanel").classList.contains("on")) return { hub: "loc" };
        return {};
      }, opts.pick);
      if (r.card) { lastCard = r.card; if (opts.stopCard && r.card.includes(opts.stopCard)) return "stop:" + r.card; }
      if (r.hub && !opts.through) return r.hub;
    }
    return "timeout:" + lastCard;
  }
  const goLoc = async (n) => { await page.evaluate((x) => { [...document.querySelectorAll(".loc")].find((l) => l.textContent.includes(x)).click(); }, n); await page.waitForTimeout(200); };
  const doAction = async (n) => page.evaluate((x) => { const a = [...document.querySelectorAll(".action:not(.locked)")].find((y) => y.textContent.includes(x)); if (a) a.click(); else throw new Error("no action " + x); }, n);

  await page.goto("http://localhost:8461/genius-club/");
  await page.evaluate(() => {
    localStorage.setItem("genius-club:v1", JSON.stringify({
      v: 1, loop: 4, clues: ["c01", "c02", "c09", "c15"], newClues: [],
      ms: {}, perks: [], reality: 2, endings: [], butterfly: { cat: true },
    }));
  });
  await page.reload(); await page.waitForTimeout(300);
  await page.click("#title .btn.primary");
  log("reach:", await pump());

  // 蝴蝶:便利店的猫应改名莱茵 → c17
  await goLoc("便利店");
  await doAction("逗一逗老板的猫");
  log("cat scene:", await pump());
  let s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  log("butterfly c17:", s.clues.includes("c17"), "| sawBfly:", s.ms.sawBfly);

  // E1:金库搬钱躺平 → 等到00:42 → 醒来 → E1结局
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("中央银行");
  while ((await page.textContent("#clock")).trim() < "23:00") { await doAction("原地等待"); await page.waitForTimeout(130); }
  await doAction("混进劫案");
  const r = await pump({ pick: "搬钱躺平", through: true, max: 60, stopCard: "循环囚徒" });
  // 搬钱后 back 到地点 → 一直等待到 00:42
  if (!String(r).includes("循环囚徒")) {
    for (let i = 0; i < 12; i++) {
      const done = await page.evaluate(() => document.getElementById("card").classList.contains("on"));
      if (done) break;
      try { await doAction("原地等待"); } catch (e) {}
      await page.waitForTimeout(150);
    }
  }
  const fin = await pump({ through: true, max: 80, stopCard: "循环囚徒" });
  log("E1 flow:", fin);
  s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  log("endings:", s.endings, "| slacker:", s.ms.slacker);

  log("console errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(errors.length || !s.endings.includes("E1") || !s.clues.includes("c17") ? 1 : 0);
})();
