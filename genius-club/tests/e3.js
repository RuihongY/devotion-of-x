/* 测试A:真相链 便利店→旧书店→图书馆(c07→c08→c09)
 * 测试B:E3 合作结局 酒吧说服→金库气割枪 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const log = (...a) => console.log("[t]", ...a);

  // 自动推进器(JS 直接点击,绕过动画稳定性检查)
  async function pump(opts = {}) {
    for (let i = 0; i < (opts.max || 150); i++) {
      await page.waitForTimeout(130);
      const r = await page.evaluate((pick) => {
        const card = document.getElementById("card");
        if (card.classList.contains("on")) {
          const big = card.querySelector(".big") ? card.querySelector(".big").textContent : "";
          card.click();
          return { card: big };
        }
        const choices = [...document.querySelectorAll("#choices.on .choice:not(.locked)")];
        if (choices.length) {
          const target = pick ? choices.find((c) => c.textContent.includes(pick)) : null;
          (target || choices[0]).click();
          return { clicked: (target || choices[0]).textContent.slice(0, 18) };
        }
        if (document.getElementById("sceneView").classList.contains("on")) {
          document.getElementById("dbox").click();
          return { clicked: "…" };
        }
        if (document.getElementById("map").classList.contains("on")) return { hub: "map" };
        if (document.getElementById("locPanel").classList.contains("on")) return { hub: "loc" };
        return {};
      }, opts.pick);
      if (r.card && opts.onCard) opts.onCard(r.card);
      if (r.hub && !opts.through) return r.hub;
      if (r.card && opts.stopCard && r.card.includes(opts.stopCard)) return "stopcard";
    }
    return "timeout";
  }
  const goLoc = async (name) => { await page.evaluate((n) => { [...document.querySelectorAll(".loc")].find((l) => l.textContent.includes(n)).click(); }, name); await page.waitForTimeout(200); };
  const doAction = async (name) => { await page.evaluate((n) => { const a = [...document.querySelectorAll(".action:not(.locked)")].find((x) => x.textContent.includes(n)); if (a) a.click(); else throw new Error("action not found: " + n); }, name); };
  const backToMap = async () => doAction("去别处");
  const clock = async () => (await page.textContent("#clock")).trim();

  /* ── 测试A:真相链 ── */
  await page.goto("http://localhost:8461/genius-club/");
  await page.evaluate(() => {
    localStorage.setItem("genius-club:v1", JSON.stringify({
      v: 1, loop: 1, clues: ["c01"], newClues: [], ms: {}, perks: [], reality: 1, endings: [], butterfly: {},
    }));
  });
  await page.reload(); await page.waitForTimeout(300);
  await page.click("#title .btn.primary");
  log("A reach:", await pump());
  await goLoc("便利店");
  await doAction("买一份报纸"); log("A paper:", await pump());
  await backToMap(); await page.waitForTimeout(150);
  await goLoc("旧书店");
  await doAction("查证报纸的疑点"); log("A history:", await pump());
  await backToMap(); await page.waitForTimeout(150);
  await goLoc("市立图书馆");
  await doAction("从坏掉的后窗潜入"); log("A library:", await pump());
  let s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  log("A clues:", s.clues.join(","), "| got c09:", s.clues.includes("c09"), "| clock:", await clock());

  /* ── 测试B:E3 合作结局 ── */
  await page.evaluate(() => {
    localStorage.setItem("genius-club:v1", JSON.stringify({
      v: 1, loop: 9,
      clues: ["c01", "c02", "c03", "c04", "c05", "c09", "c11", "c14", "c16"],
      newClues: [], ms: { ccTalks: 3 }, perks: ["p_talk"], reality: 4, endings: [], butterfly: { cat: true },
    }));
  });
  await page.reload(); await page.waitForTimeout(300);
  await page.click("#title .btn.primary");
  log("B reach:", await pump());
  await goLoc("蓝鸟酒吧");
  await doAction("团结就是力量"); log("B persuade:", await pump());
  const ally = await page.evaluate(() => G.run.flags.gangAlly);
  log("B gangAlly:", ally, "| clock:", await clock());
  await backToMap(); await page.waitForTimeout(150);
  await goLoc("中央银行");
  // 等到 23:00 窗口
  while ((await clock()) < "23:00") { await doAction("原地等待"); await page.waitForTimeout(130); }
  await doAction("混进劫案");
  let sawE3 = false;
  await pump({ pick: "上气割枪", through: true, max: 200, onCard: (c) => { if (c.includes("同行者")) sawE3 = true; }, stopCard: "同行者" });
  // 结局卡后回标题
  await page.waitForTimeout(300);
  await page.evaluate(() => { const c = document.getElementById("card"); if (c.classList.contains("on")) c.click(); });
  s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  log("B saw E3:", sawE3, "| endings:", s.endings, "| coopOpen:", s.ms.coopOpen);

  log("console errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(errors.length || !sawE3 || !s.endings.includes("E3") ? 1 : 0);
})();
