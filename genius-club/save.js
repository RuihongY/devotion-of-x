/* 存档层 —— localStorage 读写/校验/重置
 * 只存 G.meta(跨循环永久记忆);G.run(单夜状态)永不入档。 */
(function () {
  const KEY = "genius-club:v1";

  function freshMeta() {
    return {
      v: 1,
      loop: 0,            // 已完成的夜数
      clues: [],          // 已获得情报 id
      newClues: [],       // 尚未在手册里查看过的情报 id
      ms: {},             // 剧情里程碑 flags(metCC / truth / invite / ccTalks 等)
      perks: [],          // 永久 perk id
      reality: 0,         // 已播放到第几幕现实(REALITY 数组下标)
      endings: [],        // 已达成结局 id
      butterfly: {},      // 时空蝴蝶 flags(cat: 猫已命名莱茵)
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.v !== 1) return null;
      // 补齐字段,容忍旧档缺项
      return Object.assign(freshMeta(), d);
    } catch (e) {
      return null;
    }
  }

  function save(meta) {
    try {
      localStorage.setItem(KEY, JSON.stringify(meta));
    } catch (e) { /* 隐私模式等场景下静默失败,游戏仍可玩 */ }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  window.SAVE = { load, save, reset, freshMeta };
})();
