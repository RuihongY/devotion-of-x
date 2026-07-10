/* 引擎 —— 相位状态机 / 时钟 / 场景VM / 情报系统 / UI 渲染 / 双语
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

  /* ── 语言 ─────────────────────────────────── */
  const LANGKEY = "genius-club:lang";
  let lang = "zh";
  try { if (localStorage.getItem(LANGKEY) === "en") lang = "en"; } catch (e) {}
  // L(z, e) 对象 → 当前语言字符串;普通字符串原样返回
  const tr = (v) => (v && typeof v === "object" && v.z !== undefined) ? (lang === "en" ? v.e : v.z) : v;
  window.tr = tr;

  // UI 文案表
  const UI = {
    zh: {
      night: (n) => "第 " + n + " 夜",
      journal: "情报手册",
      mapHint: (m) => "你在梦里。选择去处——距离 00:42 还有 " + m + " 分钟。",
      here: "就在这里", dist: (m) => "路程 " + m + " 分", badgeNew: "新",
      min: (m) => "-" + m + "分", missing: "缺情报:",
      wait: "⏳ 原地等待", leave: "← 去别处",
      tap: "点击继续",
      doomBody: "天空像被烧穿的胶片一样卷起。\n楼宇折断,大地翻涌,声音消失了。\n\n——然后你睁开眼,回到自己的床上。\n枕边的闹钟显示:00:42。",
      wakeBig: "梦醒",
      dieBody: (r) => (r || "剧烈的疼痛袭来。") + "\n\n在梦里死亡,就会立刻醒来——这不是惩罚,只是另一种回家的方式。\n你躺在床上,心跳如鼓。记忆,还在。",
      nightEnd: (n) => "第 " + n + " 夜 · 完",
      gained: (list) => "今夜带回的情报:\n" + list.join("\n"),
      gainedNone: "今夜没有带回新的情报。\n但你还记得每一条路——梦不会没收记忆。",
      resetLine: "世界会重置,而你不会。",
      newClue: "📖 新情报:", newPerk: "✨ 获得能力:",
      nightfall: "夜幕降临",
      nightfallBody: (fast) => "洗漱,关灯,躺平。\n你几乎是迫不及待地闭上了眼睛。\n\n" + (fast ? "(你学会了提前入梦:今夜多 10 分钟)" : "那个世界在等你。"),
      cats: { "密码": "密码", "人物": "人物", "真相": "真相", "杂项": "杂项" },
      jempty: "这一页还是空白。<br>去梦里多看、多听、多问。",
      isNew: "●新",
      ending: "结局",
      contChap: (n) => "继续 · 进入第" + ["零", "一", "二", "三", "四", "五"][n] + "章",
      backTitle: "回到标题",
      titleH1: "梦醒00:42", titleSub: "天 才 俱 乐 部",
      titleDesc: "从出生起,你每晚都会做同一个梦:同一座城市、同一天、同样在 00:42 毁灭。<br>梦里的一切都会重置——除了你的记忆。<br>用一夜一夜攒下的情报,撬开这个梦最深处的秘密。",
      cont: (n) => "继续 · 第 " + n + " 夜",
      restart: "从头开始", start: "入梦",
      confirmReset: "清除全部记忆(情报/进度/结局)?此操作不可撤销。",
      progress: "当前进度:", chap1: "第一章", chap2: "第二章 · 新东海市",
      endingsGot: "已解锁结局:",
      credit: "改编自小说《天才俱乐部》(城城与蝉) · 时间循环冒险",
      langBtn: "Switch to English",
    },
    en: {
      night: (n) => "Night " + n,
      journal: "Journal",
      mapHint: (m) => "You are in the dream. Choose a destination — " + m + " minutes until 00:42.",
      here: "You are here", dist: (m) => m + " min away", badgeNew: "NEW",
      min: (m) => "-" + m + "min", missing: "Requires: ",
      wait: "⏳ Wait here", leave: "← Go elsewhere",
      tap: "Tap to continue",
      doomBody: "The sky curls up like burning film.\nTowers snap, the earth heaves, and all sound dies.\n\n— Then you open your eyes, back in your own bed.\nThe clock beside your pillow reads: 00:42.",
      wakeBig: "Awake",
      dieBody: (r) => (r || "Searing pain washes over you.") + "\n\nDying in the dream wakes you at once — not a punishment, just another way home.\nYou lie in bed, heart pounding. The memories remain.",
      nightEnd: (n) => "Night " + n + " · End",
      gained: (list) => "Intel brought back tonight:\n" + list.join("\n"),
      gainedNone: "No new intel tonight.\nBut you still remember every road — the dream cannot confiscate memory.",
      resetLine: "The world resets. You do not.",
      newClue: "📖 New intel: ", newPerk: "✨ New ability: ",
      nightfall: "Nightfall",
      nightfallBody: (fast) => "Wash up, lights out, lie down.\nYou can hardly wait to close your eyes.\n\n" + (fast ? "(Early sleeper: +10 minutes tonight)" : "That world is waiting for you."),
      cats: { "密码": "Codes", "人物": "People", "真相": "Truth", "杂项": "Misc" },
      jempty: "This page is still blank.<br>Look, listen and ask more — in the dream.",
      isNew: "●NEW",
      ending: "Ending",
      contChap: (n) => "Continue · Chapter " + n,
      backTitle: "Back to title",
      titleH1: "Awake at 00:42", titleSub: "T H E · G E N I U S · C L U B",
      titleDesc: "Every night since birth, you dream the same dream: the same city, the same day, destroyed at 00:42.<br>Everything in the dream resets — except your memory.<br>Use intel gathered night after night to pry open the dream's deepest secret.",
      cont: (n) => "Continue · Night " + n,
      restart: "Start over", start: "Enter the dream",
      confirmReset: "Erase all memory (intel / progress / endings)? This cannot be undone.",
      progress: "Progress: ", chap1: "Chapter 1", chap2: "Chapter 2 · New Donghai City",
      endingsGot: "Endings unlocked: ",
      credit: "Adapted from the novel “The Genius Club” (Chengcheng Yu Chan) · a time-loop adventure",
      langBtn: "切换为中文",
    },
  };
  const T = () => UI[lang];

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
    let abs = 22 * 60 + t - (hasPerk("p_resolve") ? 10 : 0);
    abs = ((abs % 1440) + 1440) % 1440;
    const h = Math.floor(abs / 60), m = abs % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }
  function travelCost() { return hasClue("c14") ? CLOCK.travelFast : CLOCK.travel; }

  function toast(msg, warn) {
    const el = document.createElement("div");
    el.className = "toast" + (warn ? " warn" : "");
    el.textContent = tr(msg);
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
    V.nightLabel.textContent = T().night(G.meta.loop + 1);
  }

  // 所有耗时的唯一入口。返回 false 表示已越过 00:42(本夜将被终结)
  function spend(min) {
    if (G.inReality || G.run.ended) return true;
    const before = G.run.t;
    G.run.t = Math.min(G.run.t + min, nightBudget());
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
      showCard({ cls: "doom", big: "00:42", body: T().doomBody, onTap: wake });
    }, 650);
  }
  window.__midnight = forceMidnight;

  function die(reason) {
    if (G.run.ended) return;
    G.run.ended = true;
    showCard({ cls: "doom", big: T().wakeBig, body: T().dieBody(tr(reason)), onTap: wake });
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
      '<div class="tap">' + T().tap + "</div>";
    V.card.onclick = () => { V.card.className = ""; V.card.onclick = null; if (o.onTap) o.onTap(); };
  }

  /* ── 情报 ─────────────────────────────────── */
  function grantClue(id) {
    if (!CLUES[id] || hasClue(id)) return;
    G.meta.clues.push(id);
    G.meta.newClues.push(id);
    toast(T().newClue + tr(CLUES[id].name));
    V.journalBtn.classList.add("new");
    SAVE.save(G.meta);
  }
  window.grantClue = grantClue;

  /* ── 情报手册 ─────────────────────────────── */
  const JCATS = ["密码", "人物", "真相", "杂项"]; // 内部分类键(展示时翻译)
  let jcat = "人物";
  function openJournal() {
    V.journal.classList.add("on");
    renderJournal();
  }
  function renderJournal() {
    document.querySelector("#jhead h3").textContent = T().journal;
    V.jtabs.innerHTML = "";
    JCATS.forEach((c) => {
      const b = document.createElement("button");
      b.className = "jtab" + (c === jcat ? " cur" : "");
      b.innerHTML = T().cats[c] + '<span class="dot"></span>';
      if (G.meta.newClues.some((id) => CLUES[id] && CLUES[id].cat === c)) b.classList.add("new");
      b.onclick = () => { jcat = c; renderJournal(); };
      V.jtabs.appendChild(b);
    });
    const items = G.meta.clues.filter((id) => CLUES[id] && CLUES[id].cat === jcat);
    V.jlist.innerHTML = "";
    if (!items.length) {
      V.jlist.innerHTML = '<div class="jempty">' + T().jempty + "</div>";
    } else {
      items.forEach((id) => {
        const c = CLUES[id];
        const isNew = G.meta.newClues.includes(id);
        const div = document.createElement("div");
        div.className = "jitem";
        div.innerHTML = '<div class="jname">' + tr(c.name) +
          (isNew ? '<span class="nnew">' + T().isNew + "</span>" : "") + "</div>" +
          '<div class="jdesc">' + tr(c.desc) + "</div>";
        V.jlist.appendChild(div);
      });
      G.meta.newClues = G.meta.newClues.filter((id) => !(CLUES[id] && CLUES[id].cat === jcat));
      SAVE.save(G.meta);
    }
    if (!G.meta.newClues.length) V.journalBtn.classList.remove("new");
  }
  $("journalBtn").onclick = openJournal;
  $("jclose").onclick = () => V.journal.classList.remove("on");
  V.journal.onclick = (e) => { if (e.target === V.journal) V.journal.classList.remove("on"); };

  /* ── 场景 VM ──────────────────────────────── */
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
    V.dname.textContent = tr(n.who) || "";
    V.dname.style.display = n.who ? "block" : "none";
    V.dnext.style.visibility = "hidden";
    const text = tr(typeof n.t === "function" ? n.t(G) : n.t);
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
      V.dtext.textContent = tr(typeof n.prompt === "function" ? n.prompt(G) : n.prompt);
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
      if (missing.length) {
        b.classList.add("locked");
        b.innerHTML = "<span>🔒 " + tr(c.text) + "</span>" +
          '<span class="cost">' + T().missing + missing.map((id) => CLUES[id] ? tr(CLUES[id].name) : "???").join("、") + "</span>";
      } else {
        b.innerHTML = "<span>" + tr(c.text) + "</span>" + (cost ? '<span class="cost">' + T().min(cost) + "</span>" : "");
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
    if (G.inReality) return;
    if (G.run.ended) return;
    if (SC.onBack) { const f = SC.onBack; SC.onBack = null; return f(); }
    enterLocation(G.run.loc, true);
  }

  /* ── 地图 & 地点 ──────────────────────────── */
  function renderMap() {
    setPhase("map");
    updateClockUI();
    const left = nightBudget() - G.run.t;
    V.mapHint.textContent = T().mapHint(left);
    V.locGrid.innerHTML = "";
    Object.keys(LOCATIONS).forEach((id) => {
      const Lc = LOCATIONS[id];
      if (Lc.hide && Lc.hide(G)) return;
      const here = id === G.run.loc;
      const cost = here ? 0 : travelCost();
      const div = document.createElement("div");
      div.className = "loc" + (here ? " here" : "");
      const reachable = left > cost;
      if (!reachable) div.classList.add("off");
      div.innerHTML = '<div class="icon">' + Lc.icon + '</div><div class="lname">' + tr(Lc.name) +
        '</div><div class="ldist">' + (here ? T().here : T().dist(cost)) + "</div>";
      if (hasNewAction(id)) div.innerHTML += '<div class="badge">' + T().badgeNew + "</div>";
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
    const Lc = LOCATIONS[id];
    return Lc.actions.filter((a) => {
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
    return availActions(id).some((a) => a.fresh && (a.req || []).every(hasClue) && !(a.seenKey && G.meta.ms[a.seenKey]));
  }

  function enterLocation(id, noTravel) {
    const Lc = LOCATIONS[id];
    setPhase("loc");
    updateClockUI();
    const acts = availActions(id);
    let html = '<div id="locHead"><span class="icon">' + Lc.icon + "</span><h2>" + tr(Lc.name) + "</h2></div>" +
      '<div id="locDesc">' + tr(typeof Lc.desc === "function" ? Lc.desc(G) : Lc.desc) + "</div>";
    V.locPanel.innerHTML = html;
    acts.forEach((a) => {
      const missing = (a.req || []).filter((x) => !hasClue(x));
      const b = document.createElement("button");
      b.className = "action";
      const cost = typeof a.cost === "function" ? a.cost(G) : a.cost;
      if (missing.length) {
        b.classList.add("locked");
        b.innerHTML = "<span>🔒 " + tr(a.text) + "</span>" +
          '<span class="cost">' + T().missing + missing.map((x) => CLUES[x] ? tr(CLUES[x].name) : "???").join("、") + "</span>";
      } else {
        b.innerHTML = "<span>" + tr(a.text) + "</span>" + (cost ? '<span class="cost">' + T().min(cost) + "</span>" : "");
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
    wait.innerHTML = "<span>" + T().wait + '</span><span class="cost">' + T().min(15) + "</span>";
    wait.onclick = () => { if (!spend(15)) return forceMidnight(); enterLocation(id, true); };
    V.locPanel.appendChild(wait);
    const back = document.createElement("button");
    back.className = "action leave";
    back.innerHTML = "<span>" + T().leave + "</span>";
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
      setPhase("scene");
      V.art.textContent = "🌙";
      runScene("intro");
    } else if (G.meta.chapter >= 2 && !G.meta.ms.ch2Intro) {
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
    G.meta.loop++;
    const gained = G.meta.newClues.slice();
    SAVE.save(G.meta);
    const lines = gained.length
      ? T().gained(gained.map((id) => "· " + tr(CLUES[id].name)))
      : T().gainedNone;
    const hint = nextHint(G);
    showCard({
      big: T().nightEnd(G.meta.loop),
      body: lines + "\n\n" + T().resetLine + (hint ? "\n\n💡 " + tr(hint) : ""),
      onTap: () => {
        const ending = checkEnding();
        if (ending) return playEnding(ending);
        runReality();
      },
    });
  }

  /* ── 现实幕 ───────────────────────────────── */
  function runReality() {
    // 播放第一个“未播且已解锁”的现实幕——顺序不阻塞
    const act = REALITY.find((a) => !G.meta.realityDone.includes(a.scene) && a.unlock(G));
    if (act) {
      G.meta.realityDone.push(act.scene);
      SAVE.save(G.meta);
      G.inReality = true;
      setPhase("scene");
      V.art.textContent = act.art || "🏢";
      runScene(act.scene, null);
    } else {
      nextNight();
    }
  }
  function finishReality(perk) {
    if (perk && !hasPerk(perk)) {
      G.meta.perks.push(perk);
      toast(T().newPerk + tr(PERKS[perk]));
    }
    SAVE.save(G.meta);
    G.inReality = false;
    const ending = checkEnding();
    if (ending) return playEnding(ending);
    runReality();
  }
  window.finishReality = finishReality;

  function nextNight() {
    showCard({
      big: T().nightfall,
      body: T().nightfallBody(hasPerk("p_resolve")),
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
    G.inReality = true;
    setPhase("scene");
    V.art.textContent = e.art || "🃏";
    runScene(e.scene, null);
  }
  window.endingCard = function (id) {
    const e = ENDINGS.find((x) => x.id === id);
    const unlocked = e.next && G.meta.chapter < e.next;
    if (unlocked) { G.meta.chapter = e.next; SAVE.save(G.meta); }
    const toTitle = () => { G.inReality = false; renderTitle(); setPhase("title"); };

    V.card.className = "on gold";
    V.card.innerHTML =
      '<div class="big">' + tr(e.title) + "</div>" +
      '<div class="body">' + tr(e.epitaph) +
      "\n\n—— " + (tr(e.chapterEnd) || T().ending) + " ——</div>";
    V.card.onclick = null;
    if (e.next) {
      const b = document.createElement("button");
      b.className = "btn primary";
      b.style.marginTop = "36px";
      b.textContent = T().contChap(e.next);
      b.onclick = (ev) => { ev.stopPropagation(); V.card.className = ""; G.inReality = false; startLoop(); };
      V.card.appendChild(b);
      const t = document.createElement("button");
      t.className = "btn subtle";
      t.textContent = T().backTitle;
      t.onclick = (ev) => { ev.stopPropagation(); V.card.className = ""; toTitle(); };
      V.card.appendChild(t);
    } else {
      const tap = document.createElement("div");
      tap.className = "tap";
      tap.textContent = T().tap;
      V.card.appendChild(tap);
      V.card.onclick = () => { V.card.className = ""; V.card.onclick = null; toTitle(); };
    }
  };

  /* ── 标题屏 ───────────────────────────────── */
  function renderTitle() {
    const has = G.meta.loop > 0 || G.meta.clues.length > 0;
    V.title.innerHTML =
      '<div class="t-clock">0 0 : 4 2</div>' +
      "<h1>" + T().titleH1 + "</h1>" +
      '<div class="sub">' + T().titleSub + "</div>" +
      '<div class="desc">' + T().titleDesc + "</div>";
    if (has) {
      const p = document.createElement("div");
      p.style.cssText = "font-size:13px;color:var(--gold);letter-spacing:.15em;margin-bottom:10px";
      p.textContent = T().progress + (G.meta.chapter >= 2 ? T().chap2 : T().chap1);
      V.title.appendChild(p);
      addBtn(T().cont(G.meta.loop + 1), "primary", () => startLoop());
      addBtn(T().restart, "", () => {
        if (confirm(T().confirmReset)) {
          SAVE.reset(); G.meta = SAVE.freshMeta(); renderTitle();
        }
      });
    } else {
      addBtn(T().start, "primary", () => startLoop());
    }
    if (G.meta.endings.length) {
      const d = document.createElement("div");
      d.style.cssText = "margin-top:14px;font-size:12px;color:var(--gold)";
      d.textContent = T().endingsGot + G.meta.endings.map((id) => tr((ENDINGS.find((e) => e.id === id) || {}).title)).join(" / ");
      V.title.appendChild(d);
    }
    addBtn(T().langBtn, "subtle", () => {
      lang = lang === "zh" ? "en" : "zh";
      try { localStorage.setItem(LANGKEY, lang); } catch (e) {}
      V.journalBtn.childNodes[0].textContent = T().journal;
      renderTitle();
    });
    const cr = document.createElement("div");
    cr.className = "credit";
    cr.textContent = T().credit;
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
    V.journalBtn.childNodes[0].textContent = T().journal;
    renderTitle();
    setPhase("title");
    document.addEventListener("keydown", (e) => {
      if (e.key === "j" || e.key === "J") openJournal();
      if (e.key === "Escape") V.journal.classList.remove("on");
    });
  }
  boot();
})();
