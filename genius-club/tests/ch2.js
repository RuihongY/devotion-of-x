/* 第二章测试:
 * A. 老玩家迁移(endings 含 E2 → chapter=2,标题显示第二章,进入 ch2_intro)
 * B. E2 结局卡出现「继续 · 进入第二章」按钮
 * C. 第二章主线链点通至 X1
 * D. 隐藏结局 X2(gangAlly + 带大脸猫同行) */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const log = (...a) => console.log("[ch2]", ...a);
  let fails = 0;
  const check = (name, ok) => { log((ok ? "PASS" : "FAIL"), name); if (!ok) fails++; };

  async function pump(opts = {}) {
    const cards = [];
    for (let i = 0; i < (opts.max || 200); i++) {
      await page.waitForTimeout(120);
      const r = await page.evaluate((pick) => {
        const card = document.getElementById("card");
        if (card.classList.contains("on")) {
          const big = card.querySelector(".big") ? card.querySelector(".big").textContent : "";
          const btn = card.querySelector(".btn.primary");
          return { card: big, btn: btn ? btn.textContent : null };
        }
        const choices = [...document.querySelectorAll("#choices.on .choice:not(.locked)")];
        if (choices.length) { const t = pick ? choices.find((c) => c.textContent.includes(pick)) : null; (t || choices[0]).click(); return {}; }
        if (document.getElementById("sceneView").classList.contains("on")) { document.getElementById("dbox").click(); return {}; }
        if (document.getElementById("map").classList.contains("on")) return { hub: "map" };
        if (document.getElementById("locPanel").classList.contains("on")) return { hub: "loc" };
        return {};
      }, opts.pick);
      if (r.card) {
        cards.push(r.card.trim());
        if (opts.stopCard && r.card.includes(opts.stopCard)) return { stop: r.card, btn: r.btn, cards };
        await page.evaluate(() => document.getElementById("card").click());
        continue;
      }
      if (r.hub && !opts.through) return { hub: r.hub, cards };
    }
    return { timeout: true, cards };
  }
  const goLoc = async (n) => { await page.evaluate((x) => { const l = [...document.querySelectorAll(".loc")].find((y) => y.textContent.includes(x)); if (l) l.click(); else throw new Error("no loc " + x); }, n); await page.waitForTimeout(200); };
  const doAction = async (n) => page.evaluate((x) => { const a = [...document.querySelectorAll(".action:not(.locked)")].find((y) => y.textContent.includes(x)); if (a) a.click(); else throw new Error("no action " + x); }, n);
  const clock = async () => (await page.textContent("#clock")).trim();
  const waitUntil = async (hhmm) => { while ((await clock()) < hhmm) { await doAction("原地等待"); await page.waitForTimeout(120); } };

  /* ── A. 老玩家迁移 ── */
  await page.goto("http://localhost:8461/genius-club/");
  await page.evaluate(() => {
    localStorage.setItem("genius-club:v1", JSON.stringify({
      v: 1, loop: 10,
      clues: ["c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c11", "c12", "c14", "c16"],
      newClues: [], ms: { invite: true, r5: true, ccTalks: 3 }, perks: ["p_talk"],
      realityDone: ["r0", "r2", "r3", "r4", "r5"], endings: ["E2"], butterfly: {},
    }));
  });
  await page.reload(); await page.waitForTimeout(300);
  const titleTxt = await page.textContent("#title");
  check("A: 标题显示第二章", titleTxt.includes("第二章"));
  await page.click("#title .btn.primary");
  const a = await pump();
  check("A: ch2_intro 后到地图", a.hub === "map" || a.hub === "loc");
  let s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  check("A: 迁移 chapter=2 且获得 d01/d07", s.chapter === 2 && s.clues.includes("d01") && s.clues.includes("d07"));

  /* ── C. 第二章主线到 X1(接着 A 的存档继续) ── */
  // 开场夜:蒙太奇后已是23:00,酒吧关门;先验证报纸因缺 d03 而锁定,再天台VV(23:20后) → d08
  await goLoc("便利店");
  const paperLocked = await page.evaluate(() =>
    [...document.querySelectorAll(".action.locked")].some((a) => a.textContent.includes("再买一份今天的报纸")));
  check("C: 无 d03 时报纸锁定", paperLocked);
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("后巷");
  await waitUntil("23:21");
  await doAction("对她说出照片上的名字");
  await pump();
  s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  check("C: 天台VV → d08", s.clues.includes("d08"));
  // 摆烂到 00:42 醒来(可能连播现实幕 a1/a3)
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("梦中公寓");
  for (let i = 0; i < 30; i++) {
    const carded = await page.evaluate(() => document.getElementById("card").classList.contains("on"));
    if (carded) break;
    try { await doAction("原地等待"); } catch (e) { break; }
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(2400);
  const n2 = await pump();
  check("C: 醒来回到下一夜", n2.hub === "map" || n2.hub === "loc");
  // 夜2:酒吧问父亲(23:00前) → d03 → 报纸解锁 → d09 → 老宅 → 图书馆 → 潜入
  await goLoc("蓝鸟酒吧");
  await doAction("问起他的父亲"); await pump();
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("便利店");
  const paperOpen = await page.evaluate(() =>
    [...document.querySelectorAll(".action:not(.locked)")].some((a) => a.textContent.includes("再买一份今天的报纸")));
  check("C: 问过父亲后报纸解锁", paperOpen);
  await doAction("再买一份今天的报纸"); await pump();
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("大脸猫老宅");
  await doAction("推门进屋"); await pump();
  await doAction("翻找书桌"); await pump();
  await doAction("去别处"); await page.waitForTimeout(150);
  // 图书馆 → d06
  await goLoc("市立图书馆");
  await doAction("查《宇宙常数导论》"); await pump();
  s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  check("C: d03-d06 集齐", ["d03", "d04", "d05", "d06"].every((x) => s.clues.includes(x)));
  // 潜入(solo)→ X1
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("新东海市");
  await doAction("走密道潜入");
  const x1 = await pump({ pick: "就我们两个", through: true, stopCard: "城中之城" });
  check("C: X1 城中之城 达成", !!x1.stop);
  await page.evaluate(() => { const b = [...document.querySelectorAll("#card .btn")].find((x) => x.textContent.includes("回到标题")); if (b) b.click(); else document.getElementById("card").click(); });
  await page.waitForTimeout(300);
  s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  check("C: endings 含 X1", s.endings.includes("X1"));

  /* ── B+D. 新玩家 E2 结局卡按钮 + X2 ── */
  await page.evaluate(() => {
    localStorage.setItem("genius-club:v1", JSON.stringify({
      v: 1, loop: 6,
      clues: ["c01", "c02", "c03", "c04", "c05", "c06", "c09", "c11", "c12", "c14", "c16"],
      newClues: [], ms: { ccTalks: 3 }, perks: [],
      realityDone: ["r0", "r2", "r3", "r4"], endings: [], butterfly: {}, chapter: 1,
    }));
  });
  await page.reload(); await page.waitForTimeout(300);
  await page.click("#title .btn.primary");
  await pump();
  await goLoc("中央银行");
  await waitUntil("23:00");
  await doAction("混进劫案");
  await pump({ pick: "输入 2624 0042", through: true, stopCard: "夜 · 完" });
  // wake 卡已被点掉 → r5 现实幕 → E2
  const e2 = await pump({ through: true, stopCard: "二六二四" });
  check("B: E2 结局卡出现", !!e2.stop);
  check("B: 卡上有「继续 · 进入第二章」按钮", (e2.btn || "").includes("进入第二章"));
  // 点继续 → ch2_intro
  await page.evaluate(() => { [...document.querySelectorAll("#card .btn")].find((x) => x.textContent.includes("继续")).click(); });
  const c2 = await pump();
  check("B: 继续后进入第二章开场并落地图", c2.hub === "map" || c2.hub === "loc");
  s = await page.evaluate(() => JSON.parse(localStorage.getItem("genius-club:v1")));
  check("B: chapter 已提升为 2", s.chapter === 2);

  /* D. X2:开场夜 天台VV,夜2 问父亲+说服+报纸后带大脸猫潜入 */
  await goLoc("后巷");
  await waitUntil("23:21");
  await doAction("对她说出照片上的名字"); await pump();
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("梦中公寓");
  for (let i = 0; i < 30; i++) {
    const carded = await page.evaluate(() => document.getElementById("card").classList.contains("on"));
    if (carded) break;
    try { await doAction("原地等待"); } catch (e) { break; }
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(2400); await pump(); // 等毁灭演出→醒来+现实幕→下一夜地图
  await goLoc("蓝鸟酒吧");
  const noPersuade = await page.evaluate(() =>
    ![...document.querySelectorAll(".action")].some((a) => a.textContent.includes("团结就是力量")));
  check("D: 二章已隐藏说服选项", noPersuade);
  await doAction("问起他的父亲"); await pump();
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("便利店");
  await doAction("再买一份今天的报纸"); await pump();
  await doAction("去别处"); await page.waitForTimeout(150);
  await goLoc("新东海市");
  await doAction("走密道潜入");
  const x2 = await pump({ pick: "叫上大脸猫", through: true, stopCard: "父与子" });
  check("D: X2 父与子 达成", !!x2.stop);

  log("console errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
