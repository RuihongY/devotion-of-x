/* 舞台/FX 冒烟:照片背景与剧情对应、角色立绘登台说话、特效出现且自动清理、素材无404 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("requestfailed", (r) => { if (r.url().includes("/img/") || r.url().includes("/scenes/")) errors.push("ASSET404: " + r.url()); });
  const log = (...a) => console.log("[fx]", ...a);
  let fails = 0;
  const check = (name, ok) => { log((ok ? "PASS" : "FAIL"), name); if (!ok) fails++; };
  const bgUrl = () => page.evaluate(() => (document.querySelector(".bgl.on") || { style: {} }).style.backgroundImage || "");

  await page.goto("http://localhost:8461/genius-club/");
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload(); await page.waitForTimeout(300);

  // 首夜:街角(street)→ 进银行后切 bank;特效、大脸猫立绘、说话动画
  await page.click("#title .btn.primary");
  let sawFx = 0, sawStreetBg = false, sawBankIntro = false, sawActor = false, sawTalking = false;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150);
    const st = await page.evaluate(() => ({
      fx: document.getElementById("fx").childElementCount,
      bgUrl: (document.querySelector(".bgl.on") || { style: {} }).style.backgroundImage || "",
      actor: document.querySelectorAll("#stageActors .actor").length,
      talking: !!document.querySelector("#stageActors .actor.talking"),
      choices: document.querySelectorAll("#choices.on .choice").length,
      card: document.getElementById("card").classList.contains("on"),
    }));
    if (st.fx > 0) sawFx++;
    if (st.bgUrl.includes("street")) sawStreetBg = true;
    if (st.bgUrl.includes("bank")) sawBankIntro = true;
    if (st.actor > 0) sawActor = true;
    if (st.talking) sawTalking = true;
    if (st.choices) break;
    if (st.card) await page.evaluate(() => document.getElementById("card").click());
    else await page.evaluate(() => document.getElementById("dbox").click());
  }
  check("intro 出现特效(bang)", sawFx > 0);
  check("intro 街角背景(street)", sawStreetBg);
  check("intro 进银行后背景切换(bank)", sawBankIntro);
  check("角色立绘登台", sawActor);
  check("说话动画出现", sawTalking);

  // 选爆炸 → boom 粒子 + 死亡卡
  await page.evaluate(() => { [...document.querySelectorAll("#choices.on .choice")][0].click(); });
  let sawBoomParticles = false, sawCard = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(140);
    const st = await page.evaluate(() => ({
      p: document.querySelectorAll("#fx .fx-p").length,
      card: document.getElementById("card").classList.contains("on"),
    }));
    if (st.p > 0) sawBoomParticles = true;
    if (st.card) { sawCard = true; break; }
    await page.evaluate(() => document.getElementById("dbox").click());
  }
  check("爆炸粒子出现", sawBoomParticles);
  check("死亡卡出现", sawCard);
  await page.waitForTimeout(3500);
  check("特效自动清理", (await page.evaluate(() => document.getElementById("fx").childElementCount)) === 0);

  // 醒来 → night_open 应为卧室背景(home)→ 地图
  let sawHomeBg = false;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(140);
    const st = await page.evaluate(() => ({
      card: document.getElementById("card").classList.contains("on"),
      map: document.getElementById("map").classList.contains("on"),
      scene: document.getElementById("sceneView").classList.contains("on"),
    }));
    if (st.map) break;
    if (st.card) await page.evaluate(() => document.getElementById("card").click());
    else if (st.scene) {
      if ((await bgUrl()).includes("home")) sawHomeBg = true;
      await page.evaluate(() => document.getElementById("dbox").click());
    }
  }
  check("每夜开场卧室背景(home)", sawHomeBg);

  // 金库:保险箱SVG + 银行背景
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("genius-club:v1"));
    d.clues.push("c02", "c14"); localStorage.setItem("genius-club:v1", JSON.stringify(d));
  });
  await page.reload(); await page.waitForTimeout(300);
  await page.click("#title .btn.primary");
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(140);
    if (await page.evaluate(() => document.getElementById("map").classList.contains("on"))) break;
    await page.evaluate(() => { if (document.getElementById("sceneView").classList.contains("on")) document.getElementById("dbox").click(); });
  }
  await page.evaluate(() => { [...document.querySelectorAll(".loc")].find((l) => l.textContent.includes("中央银行")).click(); });
  await page.waitForTimeout(250);
  while ((await page.textContent("#clock")).trim() < "23:00") {
    await page.evaluate(() => { [...document.querySelectorAll(".action")].find((a) => a.textContent.includes("原地等待")).click(); });
    await page.waitForTimeout(130);
  }
  await page.evaluate(() => { [...document.querySelectorAll(".action:not(.locked)")].find((a) => a.textContent.includes("混进劫案")).click(); });
  let sawSafeImg = false, sawBankBg = false;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(140);
    const st = await page.evaluate(() => ({
      img: !!document.querySelector('#stageFocus img.focal[src*="safe"]'),
      choices: document.querySelectorAll("#choices.on .choice").length,
    }));
    if (st.img) sawSafeImg = true;
    if ((await bgUrl()).includes("bank")) sawBankBg = true;
    if (st.choices) break;
    await page.evaluate(() => document.getElementById("dbox").click());
  }
  check("金库场景显示保险箱SVG", sawSafeImg);
  check("银行照片背景生效", sawBankBg);

  log("console errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
