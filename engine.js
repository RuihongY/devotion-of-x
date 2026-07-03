/* ============================================================
 *  Devotion — Suspect X   ·   Visual-novel engine
 *
 *  Interprets STORY (story.js). three.js handles the
 *  environment (atmos.js); this handles text, choices,
 *  character sprites, and control flow.
 * ============================================================ */

(() => {
  "use strict";

  /* ---- DOM ---- */
  const $ = (id) => document.getElementById(id);
  const elText   = $("text");
  const elName   = $("name");
  const elBox    = $("textbox");
  const elChoices= $("choices");
  const elPrompt = $("prompt");
  const elCard   = $("card");
  const elCardIn = $("cardInner");
  const elPersp  = $("persp");
  const elActors = $("actors");
  const elNotify = $("notify");
  const elHint   = $("hint");

  /* ---- character sprite positions ---- */
  const POS = {
    c:   { left: "50%", scale: 1.0,  dim: false },
    l:   { left: "22%", scale: 1.0,  dim: false },
    r:   { left: "78%", scale: 1.0,  dim: false },
    far: { left: "86%", scale: 0.78, dim: true  },
  };

  /* ---- runtime state ---- */
  let state, i, labels;
  let typing = false, typeTimer = 0, finishType = null;

  function buildLabels() {
    labels = {};
    STORY.forEach((n, idx) => { if (n.label) labels[n.label] = idx; });
  }

  function resolveGoto(g) {
    const key = (typeof g === "function") ? g(state) : g;
    if (!(key in labels)) { console.error("unknown label:", key); return STORY.length; }
    return labels[key];
  }

  /* ---- markup → array of styled chars ----
   * supports {b}{/b} {i}{/i} {s+N}{s-N}{/s} and \n            */
  function parse(str, baseSize) {
    const out = [];
    let b = false, it = false, size = baseSize;
    for (let p = 0; p < str.length; p++) {
      if (str[p] === "{") {
        const close = str.indexOf("}", p);
        if (close > -1) {
          const tag = str.slice(p + 1, close);
          if (tag === "b") b = true;
          else if (tag === "/b") b = false;
          else if (tag === "i") it = true;
          else if (tag === "/i") it = false;
          else if (tag === "/s") size = baseSize;
          else if (tag[0] === "s") {
            const d = parseInt(tag.slice(1), 10);
            if (!isNaN(d)) size = baseSize + d;
          }
          p = close; continue;
        }
      }
      out.push({ ch: str[p], b, it, size });
    }
    return out;
  }

  function renderChars(container, chars) {
    container.innerHTML = "";
    const spans = [];
    chars.forEach((c) => {
      if (c.ch === "\n") { container.appendChild(document.createElement("br")); spans.push(null); return; }
      const s = document.createElement("span");
      s.textContent = c.ch;
      s.style.fontSize = c.size + "px";
      if (c.b) s.style.fontWeight = "600";
      if (c.it) s.style.fontStyle = "italic";
      s.style.opacity = "0";
      container.appendChild(s);
      spans.push(s);
    });
    return spans;
  }

  function typewriter(container, chars, speed, done) {
    const spans = renderChars(container, chars);
    let n = 0;
    typing = true;
    elHint.classList.remove("show");
    finishType = () => {
      spans.forEach((s) => { if (s) s.style.opacity = "1"; });
      typing = false; clearTimeout(typeTimer); finishType = null;
      elHint.classList.add("show");
      if (done) done();
    };
    const step = () => {
      if (!typing) return;
      while (n < spans.length && spans[n] === null) n++;
      if (n >= spans.length) { finishType(); return; }
      spans[n].style.opacity = "1"; n++;
      // small extra pause on sentence punctuation
      const last = spans[n - 1] ? spans[n - 1].textContent : "";
      const extra = ".,!?—…".includes(last) ? speed * 6 : 0;
      typeTimer = setTimeout(step, speed + extra);
    };
    step();
  }

  /* ---- character sprites ---- */
  function actorFor(key) {
    const us = key.lastIndexOf("_");
    return { char: key.slice(0, us), pos: key.slice(us + 1) };
  }
  function spawn(key) {
    const { char, pos } = actorFor(key);
    const p = POS[pos] || POS.c;
    let img = elActors.querySelector('[data-char="' + char + '"]');
    if (!img) {
      img = document.createElement("img");
      img.dataset.char = char;
      img.src = "img/ch_" + char + ".png";
      img.className = "actor";
      elActors.appendChild(img);
    } else if (img._rm) {           // cancel a pending removal if re-spawned
      clearTimeout(img._rm); img._rm = null;
    }
    img.style.left = p.left;
    img.style.transform = "translateX(-50%) scale(" + p.scale + ")";
    img.style.filter = p.dim ? "brightness(0.7) saturate(0.85)" : "none";
    requestAnimationFrame(() => img.classList.add("in"));
  }
  function despawn(key) {
    const { char } = actorFor(key);
    const img = elActors.querySelector('[data-char="' + char + '"]');
    if (img) { img.classList.remove("in"); img._rm = setTimeout(() => img.remove(), 700); }
  }
  function clearActors() {
    elActors.querySelectorAll(".actor").forEach((a) => {
      a.classList.remove("in"); setTimeout(() => a.remove(), 700);
    });
  }

  /* ---- perspective banner ---- */
  function setPersp(p) {
    if (!p) { elPersp.classList.remove("show"); return; }
    elPersp.textContent = p;
    elPersp.style.color = PERSP[p] || "#ccc";
    elPersp.style.borderColor = (PERSP[p] || "#ccc") + "66";
    elPersp.classList.add("show");
  }

  /* ---- toast notify (clue found) ---- */
  function toast(msg) {
    elNotify.textContent = msg;
    elNotify.classList.add("show");
    setTimeout(() => elNotify.classList.remove("show"), 2600);
  }

  /* ---- side effects of a node ---- */
  function applyEffects(n) {
    if (n.mood) Atmos.setMood(n.mood);
    if ("persp" in n) setPersp(n.persp);
    if (n.despawn)  despawn(n.despawn);
    if (n.despawn2) despawn(n.despawn2);
    if (n.spawn)    spawn(n.spawn);
    if (n.spawn2)   spawn(n.spawn2);
    if (n.set) {
      if (typeof n.set === "function") n.set(state);
      else Object.assign(state, n.set);
    }
    if (n.notify) toast(n.notify);
  }

  /* ---- display a dialogue line ---- */
  function showSay(who, txt) {
    const c = CHARS[who] || CHARS.N;
    elCard.classList.remove("show");
    elBox.classList.add("show");
    if (c.name) {
      elName.textContent = c.name + (c.tag ? "  · " + c.tag : "");
      elName.style.color = c.color;
      elName.classList.add("show");
    } else {
      elName.classList.remove("show");
    }
    elText.className = c.italic ? "italic" : "";
    elText.style.color = c.name ? "#eef0f4" : "#d7dae2";
    typewriter(elText, parse(txt, 21), 16);
  }

  /* ---- display a centered title card ---- */
  function showCard(txt) {
    elBox.classList.remove("show");
    elName.classList.remove("show");
    elCard.classList.add("show");
    typewriter(elCardIn, parse(txt, 27), 22);
  }

  /* ---- choices ---- */
  function showMenu(options, prompt) {
    elBox.classList.remove("show");
    elCard.classList.remove("show");
    elHint.classList.remove("show");
    elChoices.innerHTML = "";
    if (prompt) { elPrompt.textContent = prompt; elPrompt.classList.add("show"); }
    else elPrompt.classList.remove("show");
    options.forEach((o) => {
      const b = document.createElement("button");
      b.className = "choice";
      b.textContent = o.text;
      b.onclick = () => {
        elChoices.classList.remove("show");
        elPrompt.classList.remove("show");
        if (o.set) { (typeof o.set === "function") ? o.set(state) : Object.assign(state, o.set); }
        jumpTo(resolveGoto(o.goto));
      };
      elChoices.appendChild(b);
    });
    elChoices.classList.add("show");
  }

  /* ---- core interpreter ---- */
  function run(from) {
    i = from;
    for (;;) {
      const n = STORY[i];
      if (!n) return;                                   // fell off the end
      if (n.cond && !n.cond(state)) { i++; continue; }  // skipped by condition
      applyEffects(n);

      if (n.menu)    { showMenu(n.menu, n.prompt); return; }
      if (n.dynmenu) { showMenu(n.dynmenu(state), n.prompt); return; }
      if (n.end)     { showCard(n.t); i = -1; return; } // -1 => restart on advance
      if (n.t) {      // a line that waits for the reader
        n.center ? showCard(n.t) : showSay(n.who, n.t);
        return;
      }
      if (n.goto !== undefined) { i = resolveGoto(n.goto); continue; } // pure jump
      i++;                                              // pass-through effect node
    }
  }

  function jumpTo(idx) { run(idx); }

  /* advance after a waiting text/card node */
  function advance() {
    if (i === -1) { restart(); return; }
    const n = STORY[i];
    const nextI = (n && n.goto !== undefined) ? resolveGoto(n.goto) : i + 1;
    run(nextI);
  }

  function onAdvance() {
    // if a menu is open, ignore clicks (must pick a button)
    if (elChoices.classList.contains("show")) return;
    if (typing) { if (finishType) finishType(); return; }
    advance();
  }

  function restart() {
    state = JSON.parse(JSON.stringify(INITIAL_STATE));
    clearActors();
    setPersp("");
    run(0);
  }

  /* ---- boot ---- */
  function boot() {
    buildLabels();
    Atmos.init($("gl"));
    state = JSON.parse(JSON.stringify(INITIAL_STATE));

    const start = $("start");
    $("beginBtn").onclick = () => {
      start.classList.add("gone");
      setTimeout(() => { start.style.display = "none"; }, 900);
      run(0);
    };

    window.addEventListener("click", (e) => {
      if (start.style.display !== "none" && !start.classList.contains("gone")) return;
      if (e.target.closest(".choice") || e.target.closest("#beginBtn") || e.target.closest("#restartBtn")) return;
      onAdvance();
    });
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); onAdvance(); }
    });
    $("restartBtn").onclick = (e) => { e.stopPropagation(); restart(); };
  }

  window.addEventListener("DOMContentLoaded", boot);
})();
