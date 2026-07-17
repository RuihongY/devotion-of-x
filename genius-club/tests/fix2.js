/* 修复验证:
 * A. 卡死存档安全网:ms.sneakSolo 已存但结局未播 → 点继续立即弹 X1
 * B. 重返第一章补支线:标题切换 → 说服+气割枪 → E3 → 继续回第二章
 * C. 保险箱菜单里气割枪选项以锁定态可见(带说明) */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const log = (...a) => console.log("[fix2]", ...a);
  let fails = 0;
  const check = (name, ok) => { log((ok ? "PASS" : "FAIL"), name); if (!ok) fails++; };

  async function pump(opts = {}) {
    for (let i = 0; i < (opts.max || 220); i++) {
      await page.waitForTimeout(120);
      const r = await page.evaluate((pick) => {
        const card = document.getElementById("card");
        if (card.classList.contains("on")) {
          const big = card.querySelector(".big") ? card.querySelector(".big").textContent : "";
          return { card: big };
        }
        const choices = [...document.querySelectorAll("#choices.on .choice:not(.locked)")];
        if (choices.length) { const t = pick ? choices.find((c) => c.textContent.includes(pick)) : null; (t || choices[0]).click(); return {}; }
        if (document.getElementById("sceneView").classList.contains("on")) { document.getElementById("dbox").click(); return {}; }
        if (document.getElementById("map").classList.contains("on")) return { hub: "map" };
        if (document.getElementById("locPanel").classList.contains("on")) return { hub: "loc" };
        return {};
      }, opts.pick);
      if (r.card) {
        if (opts.stopCard && r.card.includes(opts.stopCard)) return { stop: r.card };
        await page.evaluate(() => document.getElementById("card").click());
        continue;
      }
      if (r.hub && !opts.through) return { hub: r.hub };
    }
    return { timeout: true };
  }
  const goLoc = async (n) => { await page.evaluate((x) => { const l = [...document.querySelectorAll(".loc")].find((y) => y.textContent.includes(x)); if (l) l.click(); else throw new Error("no loc " + x); }, n); await page.waitForTimeout(200); };
  const doAction = async (n) => page.evaluate((x) => { const a = [...document.querySelectorAll(".action:not(.locked)")].find((y) => y.textContent.includes(x)); if (a) a.click(); else throw new Error("no action " + x); }, n);
  const clock = async () => (await page.textContent("#clock")).trim();
  const waitUntil = async (hhmm) => { while ((await clock()) < hhmm) { await doAction("原地等待"); await page.waitForTimeout(120); } };

  /* ── A. 卡死存档安全网 ── */
  await page.goto("http://localhost:8461/genius-club/");
  await page.evaluate(() => {
    localStorage.setItem("genius-club:v1", JSON.stringify({
      v: 1, loop: 14, chapter: 2, play: 2,
      clues: ["c01", "c02", "c05", "c06", "c07", "c08", "c09", "c11", "c12", "c14", "d01", "d02", "d03", "d04", "d05", "d06", "d07", "d08", "d09"],
      newClues: [], ms: { invite: true, r5: true, ch2Intro: true, sneakSolo: true }, perks: [],
      realityDone: ["r0", "r2", "r3", "r4", "r5", "a1", "a2", "a3"], endings: ["E2"], butterfly: {},
    }));
  });
  await page.reload(); await page.waitForTimeout(300);
  await page.click("#title .btn.primary");
  const a = await pump({ through: true, stopCard: "城中之城" });
  check("A: 卡死存档点继续立即补播 X1", !!a.stop);
  await page.evaluate(() => { const b = [...document.querySelectorAll("#card .btn")].find((x) => x.textContent.includes("回到标题")); if (b) b.click(); else document.getElementById("card").click(); });
  await page.waitForTimeout(300);
  let s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  check("A: endings 含 X1", s.endings.includes("X1"));

  /* ── B+C. 重返第一章补 E3 支线 ── */
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("genius-club:v1"));
    d.clues.push("c03", "c04", "c16");
    d.ms.ccTalks = 3;
    localStorage.setItem("genius-club:v1", JSON.stringify(d));
  });
  await page.reload(); await page.waitForTimeout(300);
  const hasBack = await page.evaluate(() => [...document.querySelectorAll("#title .btn")].some((b) => b.textContent.includes("重返第一章")));
  check("B: 标题有「重返第一章」", hasBack);
  await page.evaluate(() => { [...document.querySelectorAll("#title .btn")].find((b) => b.textContent.includes("重返第一章")).click(); });
  const hub = await pump();
  check("B: 回到第一章地图", hub.hub === "map" || hub.hub === "loc");
  await goLoc("蓝鸟酒吧");
  await doAction("说服他:团结就是力量"); await pump();
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("中央银行");
  await waitUntil("23:00");
  await doAction("混进劫案");
  const e3 = await pump({ pick: "上气割枪", through: true, stopCard: "同行者" });
  check("B: E3 同行者 达成", !!e3.stop);
  await page.evaluate(() => { [...document.querySelectorAll("#card .btn")].find((x) => x.textContent.includes("继续")).click(); });
  await page.waitForTimeout(500);
  s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  check("B: E3 已记录且回到第二章(play=2)", s.endings.includes("E3") && s.play === 2);

  /* C. 锁定态可见性:无说服时,气割枪选项应为 🔒+说明 */
  await pump({ through: true, max: 40 });
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem("genius-club:v1")); d.play = 1; localStorage.setItem("genius-club:v1", JSON.stringify(d)); });
  await page.reload(); await page.waitForTimeout(300);
  await page.click("#title .btn.primary");
  await pump();
  await goLoc("中央银行");
  await waitUntil("23:00");
  await doAction("混进劫案");
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(130);
    if (await page.locator("#choices.on .choice").count()) break;
    await page.evaluate(() => document.getElementById("dbox").click());
  }
  const lockedTorch = await page.evaluate(() =>
    [...document.querySelectorAll("#choices.on .choice.locked")].some((c) => c.textContent.includes("气割枪") && c.textContent.includes("说服")));
  check("C: 未说服时气割枪选项锁定可见并带说明", lockedTorch);

  log("console errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
