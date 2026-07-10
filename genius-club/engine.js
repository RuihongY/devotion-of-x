/* 引擎 —— 相位状态机 / 时钟 / 场景VM / 情报系统 / UI 渲染
 * 相位: title → scene(intro) → map ⇄ locPanel ⇄ scene → wake卡 → reality(scene) → map … → ending卡 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const app = $("app"), topbar = $("topbar"), main = $("main");
  const V = {
    title: $("title"), map: $("map"), locGrid: $("locGrid"), mapHint: $("mapHint"),
    locPanel: $("locPanel"), scene: $("sceneView"), art: $("sceneArt"),
    dbox: $("dbox"), dname: $("dname"), dtext: $("dtext"), dnext: $("dnext"), choices: $("choices"),
    card: $("card"), flash: $("flash"), journal: $("journal"),
    jtabs: $("jtabs"), jlist: $("jlist"), toasts: $("toasts"),
    clock: $("clock"), timefill: $("timefill"), nightLabel: $("nightLabel"), journalBtn: $("journalBtn"),
  };

  /* ── 全局状态 ─────────────────────────────── */
  const G = {
    meta: null,       // 永久(见 save.js freshMeta)
    run: null,        // 单夜,startLoop 时重置
    phase: "title",
    inReality: false, // 当前场景是否现实幕(影响时钟/配色)
  };
  window.G = G; // 调试用

  function freshRun() {
    return {
      t: 0,             // 梦内分钟,0 = 22:00
      loc: "home",
      flags: {},        // 本夜 flags(scouted / gangAlly / ccMet …)
      fired: {},        // 已触发的定时事件下标
      ended: false,     // 本夜已结束(防止重复 wake)
    };
  }

  /* ── 工具 ─────────────────────────────────── */
  const hasClue = (id) => G.meta.clues.includes(id);
  const hasPerk = (id) => G.meta.perks.includes(id);
  window.hasClue = hasClue; window.hasPerk = hasPerk;

  function nightBudget() { return CLOCK.total + (hasPerk("p_resolve") ? 10 : 0); }
  function fmtTime(t) {
    // t 分钟自 22:00 起;perk 加的 10 分钟算提前入梦(21:50)
    let abs = 22 * 60 + t - (hasPerk("p_resolve") ? 10 : 0);
    abs = ((abs % 1440) + 1440) % 1440;
    const h = Math.floor(abs / 60), m = abs % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }
  function travelCost() { return hasClue("c14") ? CLOCK.travelFast : CLOCK.travel; }

  function toast(msg, warn) {
    const el = document.createElement("div");
    el.className = "toast" + (warn ? " warn" : "");
    el.textContent = msg;
    V.toasts.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 600); }, 3200);
  }

  /* ── 时钟 ─────────────────────────────────── */
  let midnightPending = false;

  function updateClockUI() {
    const total = nightBudget();
    const left = total - G.run.t;
    V.clock.textContent = fmtTime(G.run.t);
    V.timefill.style.width = Math.min(100, (G.run.t / total) * 100) + "%";
    const late = left <= 12; // 00:30 之后
    V.clock.classList.toggle("late", late);
    V.timefill.classList.toggle("late", late);
    V.nightLabel.textContent = "第 " + (G.meta.loop + 1) + " 夜";
  }

  // 所有耗时的唯一入口。返回 false 表示已越过 00:42(本夜将被终结)
  function spend(min) {
    if (G.inReality || G.run.ended) return true;
    const before = G.run.t;
    G.run.t = Math.min(G.run.t + min, nightBudget());
    // 扫定时事件
    TIMED_EVENTS.forEach((ev, i) => {
      if (G.run.fired[i]) return;
      const at = ev.at + (hasPerk("p_resolve") ? 10 : 0);
      if (before < at && G.run.t >= at) {
        G.run.fired[i] = true;
        if (ev.flag) G.run.flags[ev.flag] = true;
        if (ev.warn) toast(ev.warn, true);
      }
    });
    updateClockUI();
    if (G.run.t >= nightBudget()) { midnightPending = true; return false; }
    return true;
  }

  // 00:42 —— 世界毁灭演出,打断一切
  function forceMidnight() {
    midnightPending = false;
    if (G.run.ended) return;
    G.run.ended = true;
    V.flash.classList.remove("go"); void V.flash.offsetWidth; V.flash.classList.add("go");
    app.classList.add("shake");
    setTimeout(() => {
      app.classList.remove("shake");
      showCard({
        cls: "doom", big: "00:42",
        body: "天空像被烧穿的胶片一样卷起。\n楼宇折断,大地翻涌,声音消失了。\n\n——然后你睁开眼,回到自己的床上。\n枕边的闹钟显示:00:42。",
        onTap: wake,
      });
    }, 650);
  }

  window.__midnight = forceMidnight;

  function die(reason) {
    if (G.run.ended) return;
    G.run.ended = true;
    showCard({
      cls: "doom", big: "梦醒",
      body: (reason || "剧烈的疼痛袭来。") + "\n\n在梦里死亡,就会立刻醒来——这不是惩罚,只是另一种回家的方式。\n你躺在床上,心跳如鼓。记忆,还在。",
      onTap: wake,
    });
  }
  window.die = die;

  /* ── 相位切换 ─────────────────────────────── */
  function setPhase(p) {
    G.phase = p;
    V.title.style.display = p === "title" ? "flex" : "none";
    V.map.classList.toggle("on", p === "map");
    V.locPanel.classList.toggle("on", p === "loc");
    V.scene.classList.toggle("on", p === "scene");
    topbar.classList.toggle("on", (p === "map" || p === "loc" || p === "scene") && !G.inReality);
    document.body.classList.toggle("reality", G.inReality);
  }

  /* ── 全屏卡片 ─────────────────────────────── */
  function showCard(o) {
    V.card.className = "on" + (o.cls ? " " + o.cls : "");
    V.card.innerHTML =
      '<div class="big">' + (o.big || "") + "</div>" +
      '<div class="body">' + (o.body || "") + "</div>" +
      '<div class="tap">点击继续</div>';
    V.card.onclick = () => { V.card.className = ""; V.card.onclick = null; if (o.onTap) o.onTap(); };
  }

  /* ── 情报 ─────────────────────────────────── */
  function grantClue(id) {
    if (!CLUES[id] || hasClue(id)) return;
    G.meta.clues.push(id);
    G.meta.newClues.push(id);
    toast("📖 新情报:" + CLUES[id].name);
    V.journalBtn.classList.add("new");
    SAVE.save(G.meta);
  }
  window.grantClue = grantClue;

  /* ── 情报手册 ─────────────────────────────── */
  const JCATS = ["密码", "人物", "真相", "杂项"];
  let jcat = "人物";
  function openJournal() {
    V.journal.classList.add("on");
    renderJournal();
  }
  function renderJournal() {
    V.jtabs.innerHTML = "";
    JCATS.forEach((c) => {
      const b = document.createElement("button");
      b.className = "jtab" + (c === jcat ? " cur" : "");
      b.innerHTML = c + '<span class="dot"></span>';
      if (G.meta.newClues.some((id) => CLUES[id] && CLUES[id].cat === c)) b.classList.add("new");
      b.onclick = () => { jcat = c; renderJournal(); };
      V.jtabs.appendChild(b);
    });
    const items = G.meta.clues.filter((id) => CLUES[id] && CLUES[id].cat === jcat);
    V.jlist.innerHTML = "";
    if (!items.length) {
      V.jlist.innerHTML = '<div class="jempty">这一页还是空白。<br>去梦里多看、多听、多问。</div>';
    } else {
      items.forEach((id) => {
        const c = CLUES[id];
        const isNew = G.meta.newClues.includes(id);
        const div = document.createElement("div");
        div.className = "jitem";
        div.innerHTML = '<div class="jname">' + c.name +
          (isNew ? '<span class="nnew">●新</span>' : "") + "</div>" +
          '<div class="jdesc">' + c.desc + "</div>";
        V.jlist.appendChild(div);
      });
      // 本分类标记已读
      G.meta.newClues = G.meta.newClues.filter((id) => !(CLUES[id] && CLUES[id].cat === jcat));
      SAVE.save(G.meta);
    }
    if (!G.meta.newClues.length) V.journalBtn.classList.remove("new");
  }
  $("journalBtn").onclick = openJournal;
  $("jclose").onclick = () => V.journal.classList.remove("on");
  V.journal.onclick = (e) => { if (e.target === V.journal) V.journal.classList.remove("on"); };

  /* ── 场景 VM ──────────────────────────────── */
  // 节点: {who,t} 对话 | {menu:[…]} 选项 | {grant} | {set} | {die} | {back} | {goto,label}
  //       {art:"🏦"} 换场景表情 | {end:fn} 场景收尾回调
  // 选项: {text, cost, req:[], hide:fn, grant, set, goto, die, back, lockText}
  let SC = { nodes: null, i: 0, onBack: null };
  let typing = null;

  function runScene(id, onBack) {
    const nodes = SCENES[id];
    if (!nodes) { console.error("no scene", id); return backToLoc(); }
    SC = { nodes, i: 0, onBack: onBack || null };
    setPhase("scene");
    step();
  }
  window.runScene = runScene;

  function labelIndex(lab) {
    return SC.nodes.findIndex((n) => n.label === lab);
  }

  function step() {
    // 时钟打断优先于一切
    if (midnightPending) return forceMidnight();
    if (G.run && G.run.ended && !G.inReality) return;
    if (SC.i >= SC.nodes.length) return backToLoc();
    const n = SC.nodes[SC.i];

    if (n.cond && !n.cond(G)) { SC.i++; return step(); }
    if (n.art) { V.art.textContent = n.art; SC.i++; return step(); }
    if (n.set) { applySet(n.set); SC.i++; return step(); }
    if (n.grant) { grantClue(n.grant); SC.i++; return step(); }
    if (n.die) return die(n.die);
    if (n.back) return backToLoc();
    if (n.goto) { const j = labelIndex(n.goto); SC.i = j >= 0 ? j : SC.i + 1; return step(); }
    if (n.label !== undefined && n.t === undefined && !n.menu) { SC.i++; return step(); }
    if (n.end) { const fn = n.end; SC.i++; return fn(G); }

    if (n.menu) return showMenu(n);
    return showLine(n);
  }

  function applySet(s) {
    if (typeof s === "function") s(G);
    else Object.assign(G.run.flags, s);
  }

  function showLine(n) {
    V.choices.classList.remove("on");
    V.dname.textContent = n.who || "";
    V.dname.style.display = n.who ? "block" : "none";
    V.dnext.style.visibility = "hidden";
    const text = typeof n.t === "function" ? n.t(G) : n.t;
    // 打字机
    let i = 0;
    V.dtext.textContent = "";
    clearInterval(typing);
    typing = setInterval(() => {
      i += 2;
      V.dtext.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(typing); typing = null; V.dnext.style.visibility = "visible"; }
    }, 18);
    V.dbox.onclick = () => {
      if (typing) { clearInterval(typing); typing = null; V.dtext.textContent = text; V.dnext.style.visibility = "visible"; return; }
      V.dbox.onclick = null;
      SC.i++;
      step();
    };
  }

  function showMenu(n) {
    V.dbox.onclick = null;
    if (n.prompt) {
      V.dname.style.display = "none";
      V.dtext.textContent = typeof n.prompt === "function" ? n.prompt(G) : n.prompt;
      V.dnext.style.visibility = "hidden";
    }
    V.choices.innerHTML = "";
    V.choices.classList.add("on");
    n.menu.forEach((c) => {
      if (c.hide && c.hide(G)) return;
      const missing = (c.req || []).filter((id) => !hasClue(id));
      const cost = typeof c.cost === "function" ? c.cost(G) : c.cost;
      const b = document.createElement("button");
      b.className = "choice";
      let costTag = cost ? "-" + cost + "分" : "";
      if (missing.length) {
        b.classList.add("locked");
        b.innerHTML = "<span>🔒 " + c.text + "</span>" +
          '<span class="cost">缺情报:' + missing.map((id) => CLUES[id] ? CLUES[id].name : "???").join("、") + "</span>";
      } else {
        b.innerHTML = "<span>" + c.text + "</span>" + (costTag ? '<span class="cost">' + costTag + "</span>" : "");
        b.onclick = () => {
          V.choices.classList.remove("on");
          if (cost) spend(cost);
          if (midnightPending) return forceMidnight();
          if (c.grant) grantClue(c.grant);
          if (c.set) applySet(c.set);
          if (c.die) return die(c.die);
          if (c.back) return backToLoc();
          if (c.goto) { const j = labelIndex(c.goto); SC.i = j >= 0 ? j : SC.i + 1; }
          else SC.i++;
          step();
        };
      }
      V.choices.appendChild(b);
    });
  }

  function backToLoc() {
    V.choices.classList.remove("on");
    if (G.inReality) return; // reality 场景用自己的 end 回调收尾
    if (G.run.ended) return;
    if (SC.onBack) { const f = SC.onBack; SC.onBack = null; return f(); }
    enterLocation(G.run.loc, true);
  }

  /* ── 地图 & 地点 ──────────────────────────── */
  function renderMap() {
    setPhase("map");
    updateClockUI();
    const left = nightBudget() - G.run.t;
    V.mapHint.textContent = "你在梦里。选择去处——距离 00:42 还有 " + left + " 分钟。";
    V.locGrid.innerHTML = "";
    Object.keys(LOCATIONS).forEach((id) => {
      const L = LOCATIONS[id];
      if (L.hide && L.hide(G)) return;
      const here = id === G.run.loc;
      const cost = here ? 0 : travelCost();
      const div = document.createElement("div");
      div.className = "loc" + (here ? " here" : "");
      const reachable = left > cost;
      if (!reachable) div.classList.add("off");
      div.innerHTML = '<div class="icon">' + L.icon + '</div><div class="lname">' + L.name +
        '</div><div class="ldist">' + (here ? "就在这里" : "路程 " + cost + " 分") + "</div>";
      if (hasNewAction(id)) div.innerHTML += '<div class="badge">新</div>';
      div.onclick = () => {
        if (!here) { if (!spend(cost)) return forceMidnight(); }
        G.run.loc = id;
        enterLocation(id);
      };
      V.locGrid.appendChild(div);
    });
  }
  window.renderMap = renderMap;

  function availActions(id) {
    const L = LOCATIONS[id];
    return L.actions.filter((a) => {
      if (a.hide && a.hide(G)) return false;
      if (a.once && G.run.flags[a.once]) return false;
      if (a.when) {
        const off = hasPerk("p_resolve") ? 10 : 0;
        const t = G.run.t - off;
        if (t < a.when[0] || t > a.when[1]) return false;
      }
      return true;
    });
  }
  function hasNewAction(id) {
    // “新”角标:有可用且未上锁、且标记了 fresh 的行动(首次满足 req)
    return availActions(id).some((a) => a.fresh && (a.req || []).every(hasClue) && !(a.seenKey && G.meta.ms[a.seenKey]));
  }

  function enterLocation(id, noTravel) {
    const L = LOCATIONS[id];
    setPhase("loc");
    updateClockUI();
    const acts = availActions(id);
    let html = '<div id="locHead"><span class="icon">' + L.icon + "</span><h2>" + L.name + "</h2></div>" +
      '<div id="locDesc">' + (typeof L.desc === "function" ? L.desc(G) : L.desc) + "</div>";
    V.locPanel.innerHTML = html;
    acts.forEach((a) => {
      const missing = (a.req || []).filter((x) => !hasClue(x));
      const b = document.createElement("button");
      b.className = "action";
      const cost = typeof a.cost === "function" ? a.cost(G) : a.cost;
      if (missing.length) {
        b.classList.add("locked");
        b.innerHTML = "<span>🔒 " + a.text + "</span>" +
          '<span class="cost">缺情报:' + missing.map((x) => CLUES[x] ? CLUES[x].name : "???").join("、") + "</span>";
      } else {
        b.innerHTML = "<span>" + a.text + "</span>" + (cost ? '<span class="cost">-' + cost + "分</span>" : "");
        b.onclick = () => {
          if (a.seenKey) { G.meta.ms[a.seenKey] = true; SAVE.save(G.meta); }
          if (a.once) G.run.flags[a.once] = true;
          if (cost && !spend(cost)) return forceMidnight();
          if (a.grant) grantClue(a.grant);
          if (a.scene) runScene(a.scene);
          else enterLocation(id, true);
        };
      }
      V.locPanel.appendChild(b);
    });
    const wait = document.createElement("button");
    wait.className = "action leave";
    wait.innerHTML = '<span>⏳ 原地等待</span><span class="cost">-15分</span>';
    wait.onclick = () => { if (!spend(15)) return forceMidnight(); enterLocation(id, true); };
    V.locPanel.appendChild(wait);
    const back = document.createElement("button");
    back.className = "action leave";
    back.innerHTML = "<span>← 去别处</span>";
    back.onclick = renderMap;
    V.locPanel.appendChild(back);
  }
  window.enterLocation = enterLocation;

  /* ── 夜晚循环 ─────────────────────────────── */
  function startLoop() {
    G.run = freshRun();
    G.inReality = false;
    midnightPending = false;
    updateClockUI();
    if (G.meta.loop === 0) {
      // 首夜教学关:纯脚本
      setPhase("scene");
      V.art.textContent = "🌙";
      runScene("intro");
    } else if (G.meta.chapter >= 2 && !G.meta.ms.ch2Intro) {
      // 第二章开场夜
      G.meta.ms.ch2Intro = true;
      SAVE.save(G.meta);
      setPhase("scene");
      V.art.textContent = "🌙";
      runScene("ch2_intro", renderMap);
    } else {
      V.art.textContent = "🌙";
      runScene("night_open", renderMap);
    }
  }
  window.startLoop = startLoop;

  function wake() {
    // 结算
    G.meta.loop++;
    const gained = G.meta.newClues.slice();
    SAVE.save(G.meta);
    const lines = gained.length
      ? "今夜带回的情报:\n" + gained.map((id) => "· " + CLUES[id].name).join("\n")
      : "今夜没有带回新的情报。\n但你还记得每一条路——梦不会没收记忆。";
    const hint = nextHint(G);
    showCard({
      big: "第 " + G.meta.loop + " 夜 · 完",
      body: lines + "\n\n世界会重置,而你不会。" + (hint ? "\n\n💡 " + hint : ""),
      onTap: () => {
        const ending = checkEnding();
        if (ending) return playEnding(ending);
        runReality();
      },
    });
  }

  /* ── 现实幕 ───────────────────────────────── */
  function runReality() {
    // 播放第一个“未播且已解锁”的现实幕——顺序不再阻塞:
    // 某一幕(如需要支线情报的 R1)没解锁时,后面的幕照常可播
    const act = REALITY.find((a) => !G.meta.realityDone.includes(a.scene) && a.unlock(G));
    if (act) {
      G.meta.realityDone.push(act.scene);
      SAVE.save(G.meta);
      G.inReality = true;
      setPhase("scene");
      V.art.textContent = act.art || "🏢";
      runScene(act.scene, null);
      // reality 场景以 {end:…} 节点结束并调用 finishReality → 链式回到 runReality
    } else {
      nextNight();
    }
  }
  function finishReality(perk) {
    if (perk && !hasPerk(perk)) {
      G.meta.perks.push(perk);
      toast("✨ 获得能力:" + PERKS[perk]);
    }
    SAVE.save(G.meta);
    G.inReality = false;
    const ending = checkEnding();
    if (ending) return playEnding(ending);
    runReality(); // 链式播放:还有待解锁的现实幕就继续,否则入夜
  }
  window.finishReality = finishReality;

  function nextNight() {
    showCard({
      big: "夜幕降临",
      body: "洗漱,关灯,躺平。\n你几乎是迫不及待地闭上了眼睛。\n\n" + (hasPerk("p_resolve") ? "(你学会了提前入梦:今夜多 10 分钟)" : "那个世界在等你。"),
      onTap: startLoop,
    });
  }

  /* ── 结局 ─────────────────────────────────── */
  function checkEnding() {
    for (const e of ENDINGS) {
      if (!G.meta.endings.includes(e.id) && e.cond(G)) return e;
    }
    return null;
  }
  function playEnding(e) {
    G.meta.endings.push(e.id);
    SAVE.save(G.meta);
    G.inReality = true; // 结局场景不受梦钟约束
    setPhase("scene");
    V.art.textContent = e.art || "🃏";
    runScene(e.scene, null);
    // 结局场景最后一个节点调用 endingCard(e)
  }
  window.endingCard = function (id) {
    const e = ENDINGS.find((x) => x.id === id);
    // 章节结局:解锁下一章
    const unlocked = e.next && G.meta.chapter < e.next;
    if (unlocked) { G.meta.chapter = e.next; SAVE.save(G.meta); }
    const toTitle = () => { G.inReality = false; renderTitle(); setPhase("title"); };

    V.card.className = "on gold";
    V.card.innerHTML =
      '<div class="big">' + e.title + "</div>" +
      '<div class="body">' + e.epitaph +
      "\n\n—— " + (e.chapterEnd || "结局") + " ——</div>";
    V.card.onclick = null;
    if (e.next) {
      const b = document.createElement("button");
      b.className = "btn primary";
      b.style.marginTop = "36px";
      b.textContent = unlocked ? "继续 · 进入第" + numCN(e.next) + "章" : "继续 · 第" + numCN(e.next) + "章";
      b.onclick = (ev) => { ev.stopPropagation(); V.card.className = ""; G.inReality = false; startLoop(); };
      V.card.appendChild(b);
      const t = document.createElement("button");
      t.className = "btn subtle";
      t.textContent = "回到标题";
      t.onclick = (ev) => { ev.stopPropagation(); V.card.className = ""; toTitle(); };
      V.card.appendChild(t);
    } else {
      const tap = document.createElement("div");
      tap.className = "tap";
      tap.textContent = "点击继续";
      V.card.appendChild(tap);
      V.card.onclick = () => { V.card.className = ""; V.card.onclick = null; toTitle(); };
    }
  };

  function numCN(n) { return ["零", "一", "二", "三", "四", "五"][n] || n; }

  /* ── 标题屏 ───────────────────────────────── */
  function renderTitle() {
    const has = G.meta.loop > 0 || G.meta.clues.length > 0;
    V.title.innerHTML =
      '<div class="t-clock">0 0 : 4 2</div>' +
      "<h1>梦醒00:42</h1>" +
      '<div class="sub">天 才 俱 乐 部</div>' +
      '<div class="desc">从出生起,你每晚都会做同一个梦:同一座城市、同一天、同样在 00:42 毁灭。<br>' +
      "梦里的一切都会重置——除了你的记忆。<br>用一夜一夜攒下的情报,撬开这个梦最深处的秘密。</div>";
    if (has) {
      const chapLabel = G.meta.chapter >= 2 ? "第二章 · 新东海市" : "第一章";
      const p = document.createElement("div");
      p.style.cssText = "font-size:13px;color:var(--gold);letter-spacing:.15em;margin-bottom:10px";
      p.textContent = "当前进度:" + chapLabel;
      V.title.appendChild(p);
      addBtn("继续 · 第 " + (G.meta.loop + 1) + " 夜", "primary", () => startLoop());
      addBtn("从头开始", "", () => {
        if (confirm("清除全部记忆(情报/进度/结局)?此操作不可撤销。")) {
          SAVE.reset(); G.meta = SAVE.freshMeta(); renderTitle();
        }
      });
    } else {
      addBtn("入梦", "primary", () => startLoop());
    }
    if (G.meta.endings.length) {
      const d = document.createElement("div");
      d.style.cssText = "margin-top:14px;font-size:12px;color:var(--gold)";
      d.textContent = "已解锁结局:" + G.meta.endings.map((id) => (ENDINGS.find((e) => e.id === id) || {}).title).join(" / ");
      V.title.appendChild(d);
    }
    const cr = document.createElement("div");
    cr.className = "credit";
    cr.textContent = "改编自小说《天才俱乐部》(城城与蝉) · 时间循环冒险";
    V.title.appendChild(cr);

    function addBtn(text, cls, fn) {
      const b = document.createElement("button");
      b.className = "btn " + cls;
      b.textContent = text;
      b.onclick = fn;
      V.title.appendChild(b);
    }
  }

  /* ── 启动 ─────────────────────────────────── */
  function boot() {
    G.meta = SAVE.load() || SAVE.freshMeta();
    renderTitle();
    setPhase("title");
    document.addEventListener("keydown", (e) => {
      if (e.key === "j" || e.key === "J") openJournal();
      if (e.key === "Escape") V.journal.classList.remove("on");
    });
  }
  boot();
})();
