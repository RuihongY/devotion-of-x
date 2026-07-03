/* ============================================================
 *  Devotion — Suspect X   ·   Story data
 *  A dual-perspective narrative adapted from Keigo Higashino's
 *  "The Devotion of Suspect X".  Original rewritten text.
 *
 *  This file is only DATA + a tiny bit of branching logic.
 *  The VN engine (engine.js) interprets it; the atmosphere
 *  (atmos.js) reacts to each node's `mood`.
 * ============================================================ */

const CHARS = {
  I:  { name: "Ishigami",              color: "#7fa8c9" },
  IT: { name: "Ishigami",              color: "#7fa8c9", italic: true, tag: "inner" },
  Y:  { name: "Yasuko",                color: "#d9a0a0" },
  M:  { name: "Misato",                color: "#e0c5a0" },
  T:  { name: "Togashi",               color: "#8a8a8a" },
  YU: { name: "Yukawa",                color: "#a4c9a0" },
  YT: { name: "Yukawa",                color: "#a4c9a0", italic: true, tag: "inner" },
  K:  { name: "Kusanagi",              color: "#c9bd7f" },
  KM: { name: "Kudo",                  color: "#b0a4c9" },
  HM: { name: "Old Man by the River",  color: "#9a9a8a" },
  N:  { name: null,                    color: "#e8e8ea" },
};

/* Perspective banners tint the screen edge. */
const PERSP = {
  ISHIGAMI: "#7fa8c9",
  POLICE:   "#c9bd7f",
  YUKAWA:   "#a4c9a0",
};

/* Helper shorthands for building nodes. */
const say    = (who, t, extra = {}) => ({ who, t, ...extra });
const card   = (t, extra = {}) => ({ center: true, t, ...extra });
const mood   = (m) => ({ mood: m });
const label  = (id) => ({ label: id });
const set    = (obj) => ({ set: obj });
const goto   = (to) => ({ goto: to });
const persp  = (p) => ({ persp: p });

/* ============================================================
 *  THE STORY
 * ============================================================ */
const STORY = [

  /* ---------- Cold open · The Rope (THE SOUL) ---------- */
  { mood: "void", center: true,
    t: "{s+14}Devotion{/s}\n\n{s-4}— Suspect X —{/s}",
    hold: true },

  { mood: "gears", persp: "", who: "N",
    t: "There was a night, two winters ago, when Ishigami Tetsuya decided to stop living." },

  { mood: "rope", who: "N",
    t: "The mind they once called a once-in-fifty-years talent had become a man grading quadratic functions in red ink." },
  { who: "N",
    t: "His proofs went into a drawer no one would ever open. He spoke to no one. He was needed by no one." },
  { who: "IT",
    t: "A life is a theorem. If it leads nowhere, one is permitted to close the book." },
  { who: "N",
    t: "He had prepared the rope. He had tested the beam. He had chosen the hour. He was calm — the calm of a problem already solved." },

  { fx: "chime", who: "N",
    t: "Then — the doorbell rang." },
  { who: "N",
    t: "He almost let it pass. But a mathematician does not leave a variable unexamined. He opened the door." },

  { mood: "greeting", persp: "", who: "N",
    t: "Two figures stood in the corridor. A woman, and a girl behind her. They had just moved in next door." },
  { who: "Y",
    t: "Good evening — I'm sorry to bother you so late. We've just moved in next door. We'll surely be noisy sometimes... please forgive us." },
  { who: "N",
    t: "She held out a small hand towel. The old moving-in greeting. Nothing more ordinary exists in this whole country." },
  { who: "M",
    t: "...Please treat us kindly." },
  { who: "N",
    t: "They bowed, they smiled, and in half a minute they were gone behind their own door." },

  { mood: "afterglow", who: "N",
    t: "Ishigami stood in the hall a long time, holding the towel." },
  { who: "IT",
    t: "Two people exist. They live on the far side of that wall. Tomorrow they will wake, and speak, and simply... be." },
  { who: "IT",
    t: "And for a reason I cannot reduce to any axiom, I find that I want to see it. Only that. To know that they are there." },
  { who: "N",
    t: "That night, Ishigami put the rope away." },
  { who: "N",
    t: "He had found a reason to remain alive. It lived on the other side of a wall — and it did not even know his name." },

  { mood: "void", center: true,
    t: "To be able to buy a boxed lunch from her.\nTo be able to say one sentence.\nSome mornings, not even that.\n\nIt was enough.\nIt was everything." },

  { goto: "prologue" },

  /* ---------- Prologue · Gears ---------- */
  { label: "prologue" },
  { mood: "void", center: true, t: "{s+8}Prologue · Gears{/s}\n\nMarch 9 — Morning" },

  { mood: "dawn", persp: "ISHIGAMI", who: "N",
    t: "Half past six. Ishigami was awake before the alarm. His days ran like a well-kept clock: rise, wash, forty minutes of mathematics, then out the door." },
  { who: "IT",
    t: "The four-color theorem leans on brute computation... not beautiful. A true proof should be a snow crystal — total symmetry on the fewest branches." },
  { who: "N",
    t: "On the way to work he always took the long road, along the embankment of the Old Edogawa." },

  { mood: "river_day", who: "N",
    t: "Below the embankment stood a row of blue tarpaulin shelters — home to people the city had left behind. Rusted drums. A towel on a line. Flattened cans." },
  { who: "N", spawn: "homeless_far",
    t: "Every day, at the same hour, the same people did the same things in the same places. Like the gears of a clock." },
  { who: "IT",
    t: "The old man who crushes the cans. The one who reads old magazines. And that neat-haired newcomer from a few weeks back — a technician once, perhaps. Call him the Engineer." },
  { who: "IT",
    t: "The gears mesh, and the world turns. No one ever looks at a gear." },

  { mood: "bento", despawn: "homeless_far", spawn: "yasuko_c", who: "N",
    t: "Where the embankment ended stood a small bento shop: Benten-tei." },
  { who: "Y",
    t: "Welcome! — Oh, Mr. Ishigami. Good morning. The usual today?" },
  { who: "I", t: "...Mm." },
  { who: "N",
    t: "Hanaoka Yasuko. His neighbor. The woman whose ordinary greeting, one winter night, had quietly kept him in the world." },
  { who: "IT",
    t: "She does not know. She never needs to know." },
  { who: "IT",
    t: "Some lines never meet, however long the universe runs. Asymptotes. And that is enough — to travel beside her, forever apart." },

  { mood: "void", despawn: "yasuko_c", center: true,
    t: "But that night,\nthe asymptotes collided." },
  { goto: "chapter1" },

  /* ---------- Chapter 1 · The Problem ---------- */
  { label: "chapter1" },
  { mood: "void", center: true, t: "{s+8}Chapter 1 · The Problem{/s}\n\nMarch 9 — Night" },

  { mood: "apartment", persp: "ISHIGAMI", who: "N",
    t: "Past eight, a man's voice began to roar through the wall." },
  { who: "T",
    t: "(through the wall) ...Where's the money? You think you can hide from me? ...Misato, get over here—" },
  { who: "N",
    t: "Furniture toppling. A girl's scream. One dull, heavy thud. And then a silence that went on far too long." },
  { who: "IT",
    t: "Yasuko's ex-husband. The man who keeps coming back to bleed them. He has been circling for days." },
  { who: "N",
    t: "Ishigami stood at his door a long time. Through the wall came weeping, pressed almost to nothing — two voices, one high, one low." },
  { who: "N", t: "He knocked." },

  { mood: "nextdoor", spawn: "yasuko_l", who: "N",
    t: "The door opened a crack. Yasuko's face was paper-white, her hair loose, her hands shaking." },
  { who: "Y",
    t: "Mr. Ishigami... I'm so sorry about the noise. We're fine. Really, we're—" },
  { who: "N",
    t: "Past her shoulder, Ishigami saw the man by the heated table. The power cord was buried in his neck. His eyes were half open." },
  { spawn: "misato_r", who: "N",
    t: "Misato was pressed into the corner, hugging her knees, knuckles white." },
  { who: "N",
    t: "No one spoke. The clock's second hand ticked forward, notch by notch." },

  { menu: [
      { text: "“I love these two. So I will save them.”",
        set: { motive: "love" }, goto: "c1_love" },
      { text: "“This is a problem. And I happen to know how to solve it.”",
        set: { motive: "logic" }, goto: "c1_logic" },
      { text: "“I can't explain it. My body simply moved.”",
        set: { motive: "unknown" }, goto: "c1_unknown" },
    ],
    prompt: "Ishigami heard a voice inside himself. What it said was—" },

  { label: "c1_love" },
  { who: "IT",
    t: "The chain has one link: if they are destroyed, my world is destroyed. Therefore they must not be destroyed." },
  { goto: "c1_after" },

  { label: "c1_logic" },
  { who: "IT",
    t: "How the police will move, how the evidence will fall — every path unfolds like a diagram already solved. If I can solve it, there is no reason to stand aside." },
  { goto: "c1_after" },

  { label: "c1_unknown" },
  { who: "IT",
    t: "He would return to this moment countless times, and never name it. Perhaps some propositions lie outside the provable." },
  { goto: "c1_after" },

  { label: "c1_after" },
  { who: "I", t: "...Mrs. Hanaoka." },
  { who: "I",
    t: "If you call the police, self-defense will be hard to prove. Your daughter took part; an interrogation will not miss it. They will take Misato away." },
  { who: "Y", t: "Then— then what should we..." },
  { who: "I", t: "Leave everything that follows to me." },
  { who: "N",
    t: "Yasuko looked up. In the eyes of this neighbor who always mumbled and looked away, there was now something she had never seen." },
  { who: "Y",
    t: "Why...? Why would you help us? You'll be dragged into it—" },
  { who: "I",
    t: "You need do only one thing. From this moment: do nothing, and ask nothing." },
  { who: "I",
    t: "Whatever I tell you, do it. Not one step more. Not one step less." },

  { despawn: "misato_r" },
  { despawn: "yasuko_l", who: "N",
    t: "He crouched by the body and looked at it the way one looks at a problem freshly chalked on a board." },
  { who: "IT",
    t: "Given: one corpse. A mother and daughter with no alibi. A missing man the neighbors will recall by morning." },
  { who: "IT",
    t: "To prove: that they had nothing to do with this. — Begin." },

  { mood: "void", center: true,
    t: "What Ishigami did in the two days that followed,\nYasuko never knew. Misato never knew.\n\nThe only ones who know are the man himself —\nand you, on the last page of this story." },
  { goto: "chapter2" },

  /* ---------- Chapter 2 · Discovery ---------- */
  { label: "chapter2" },
  { mood: "void", center: true, t: "{s+8}Chapter 2 · Discovery{/s}\n\nMarch 11 — Morning" },

  { mood: "river_day", persp: "POLICE", who: "N",
    t: "Below the embankment, an early jogger found the body of a man." },
  { who: "N",
    t: "The face crushed beyond recognition. The fingerprints of all ten fingers burned away. Nearby: a nearly new bicycle, and a half-burned pile of clothing." },
  { spawn: "kusanagi_c", who: "K",
    t: "Thorough work. They really didn't want us knowing who he was." },
  { despawn: "kusanagi_c", who: "N",
    t: "The threads surfaced anyway — the bicycle's registration, the underwear, the flophouses. Three days later the identity was locked down." },
  { who: "N",
    t: "Togashi Shinji. Unemployed, dodging debts. Estimated death: {b}March 10, between 6 and 11 p.m.{/b}" },
  { spawn: "kusanagi_c", who: "K",
    t: "The ex-wife lives in Morishita. A daughter, a job at a bento shop. Togashi kept coming around for money after the divorce. — There's your motive." },

  { mood: "bento", despawn: "kusanagi_c", spawn: "kusanagi_l", spawn2: "yasuko_r", who: "N",
    t: "Detective Kusanagi reached the shop as Yasuko was clearing the counter after closing." },
  { who: "K",
    t: "Sorry to trouble you. Just confirming — the night of March 10, where were you?" },
  { who: "Y",
    t: "The tenth... my daughter and I went to a movie. The late show, out past nine. Then ramen, then karaoke. We got home near midnight." },
  { who: "K", t: "Would you still have the ticket stubs?" },
  { who: "Y", t: "Ah — they should be in my coat pocket. Let me look." },
  { who: "N",
    t: "The stubs were there. The ramen clerk half-remembered them. The karaoke had a record." },
  { who: "K",
    t: "(In the notebook: alibi — exists, nothing decisive. Keep digging.)" },

  { mood: "lab", despawn: "kusanagi_l", despawn2: "yasuko_r", persp: "YUKAWA",
    spawn: "yukawa_r", spawn2: "kusanagi_l", who: "N",
    t: "Building 13, Teito University. Kusanagi had come, as usual, to sponge coffee and talk shop." },
  { who: "YU",
    t: "The face destroyed, the prints burned — yet a bicycle with a traceable registration left right beside the body. Doesn't that strike you as odd?" },
  { who: "K",
    t: "Killer panicked. Oh — trivia: next door to the ex-wife lives a math teacher. Ishigami. Routine interview. Man's a block of wood." },
  { who: "YU", t: "...Ishigami? Mathematics? How old?" },
  { who: "K", t: "Fifty or so. Round face, small eyes. Why — you know him?" },
  { who: "YU",
    t: "If it's the same man — Ishigami Tetsuya. The only mind I ever admired at university." },
  { who: "YU",
    t: "We called him 'Daruma Ishigami.' Where others walk toward an answer, he falls onto it. Straight down." },
  { who: "YT",
    t: "A man like that — living quietly next door to a murder?" },
  { who: "YU", t: "Kusanagi. This case interests me now." },

  { mood: "void", despawn: "yukawa_r", despawn2: "kusanagi_l", center: true,
    t: "Two threads unspooled,\neach in its own direction." },
  { menu: [
      { text: "Ishigami's routine  (the one who constructs)", goto: "chapter3" },
      { text: "Yukawa's reunion  (the one who solves)", goto: "chapter4" },
    ],
    prompt: "Which do you follow first?" },

  /* ---------- Chapter 3 · Routine ---------- */
  { label: "chapter3" },
  { set: { seen_ch3: true } },
  { mood: "void", center: true, t: "{s+8}Chapter 3 · Routine{/s}" },

  { mood: "apartment", persp: "ISHIGAMI", who: "N",
    t: "Late night, a public phone booth. Every evening he called from a different one." },
  { who: "I", t: "What did the detective ask today?" },
  { who: "Y",
    t: "Still the night of the tenth... what the film was about, where we sat, when it ended. I told them everything, exactly as it was." },
  { who: "I",
    t: "Good. Remember — you need not lie. When they ask about the tenth, answer about the tenth. The more detail, the better." },
  { who: "Y",
    t: "Mr. Ishigami... something troubles me. Why only ever the tenth? That night we truly only went to the movies, as you said." },
  { who: "I",
    t: "Do not ask what you should not ask. It is for your sake." },
  { who: "N",
    t: "Before the line died, Yasuko said, very softly, “Thank you.”" },
  { who: "N",
    t: "Ishigami stood in the booth a few seconds more. A thank-you like that could last him a very long time." },

  { mood: "school", who: "N", t: "By day, he taught as always." },
  { who: "I",
    t: "“This looks like geometry. Set up coordinates, and it becomes algebra. To be deceived by a problem's appearance is the solver's greatest enemy.”" },
  { who: "N",
    t: "No one was listening. He did not mind. His real examination paper was not in this room." },

  { mood: "river_day", who: "N", t: "At dusk he walked home along the embankment." },
  { who: "N",
    t: "The blue shelters stood as always. The old man with his cans. The man with his magazines." },
  { who: "IT", t: "...One is missing." },
  { who: "N",
    t: "His gaze rested on the empty patch of ground one second, then moved on." },
  { who: "IT",
    t: "Remove one gear, and the clock still tells the same time. Nobody calls roll for gears." },
  { who: "IT",
    t: "— No. One person did. Once." },
  { who: "N",
    t: "He thought no further, and bought the daily special on the way home." },

  { mood: "bento", spawn: "yasuko_c", who: "N",
    t: "Through the glass, Yasuko smiled at him. He nodded, as he did every day." },

  { mood: "void", despawn: "yasuko_c",
    goto: (s) => s.seen_ch4 ? "chapter5" : "chapter3_bridge" },
  { label: "chapter3_bridge" },
  { center: true, t: "At that same hour, another man\nwas walking toward the problem." },
  { goto: "chapter4" },

  /* ---------- Chapter 4 · Reunion ---------- */
  { label: "chapter4" },
  { set: { seen_ch4: true } },
  { mood: "void", center: true, t: "{s+8}Chapter 4 · Reunion{/s}" },

  { mood: "apartment", persp: "YUKAWA", spawn: "ishigami_r", who: "N",
    t: "Yukawa rang Ishigami's bell. A classmate unseen for twenty years stood in the doorway, a bottle of sake in hand." },
  { who: "YU", t: "Daruma. It's been a long time." },
  { who: "I", t: "...Yukawa?" },
  { who: "N",
    t: "The cramped room was buried in mathematics. They drank, and talked — Erdős, the Riemann hypothesis, P versus NP." },
  { who: "YU",
    t: "The old question. Which is harder — to construct a problem no one can solve, or to solve it?" },
  { who: "I",
    t: "The one who poses it has the advantage. He knows where the answer lies; he need only hide the road. The solver must feel every wall in the dark." },
  { who: "YU",
    t: "And if the solver realizes the wall he's feeling isn't the boundary of the problem at all?" },
  { who: "N",
    t: "The hand pouring the sake was steady. Not a single ripple." },
  { who: "I", t: "Then the one who posed it has lost." },
  { who: "N",
    t: "As Yukawa left, Yasuko came home from work and greeted them both in the corridor." },
  { spawn: "yasuko_l", who: "Y",
    t: "Good evening, Mr. Ishigami. And this gentleman is...?" },
  { who: "YT", t: "— There. I saw it." },
  { who: "YT",
    t: "The half-second Ishigami looked at her. The thing behind those lenses was exactly what was there when he spoke of the Riemann hypothesis." },
  { despawn: "yasuko_l", who: "YT",
    t: "Daruma Ishigami. You are solving a problem for someone. No — for someone you would give your whole self to, and never once tell." },

  { mood: "police", despawn: "ishigami_r", spawn: "yukawa_r", spawn2: "kusanagi_l", who: "N",
    t: "The next day, Yukawa asked for the case file." },
  { who: "YU",
    t: "Yasuko Hanaoka's alibi. Two weeks of hammering — has it broken?" },
  { who: "K",
    t: "That's the strange part. Solid? It's soft everywhere — no one at the cinema recalls them. Soft? It won't tear — stubs, ramen, karaoke, all check out." },
  { who: "YU",
    t: "It looks fragile, yet never breaks — because you assume it's a shield." },
  { who: "YU",
    t: "What if it's {b}bait{/b}? Bait to keep you all clamped onto March 10." },
  { who: "K",
    t: "What's wrong with the tenth? That's the estimated death." },
  { who: "YU", t: "...I want to see the scene." },

  { mood: "river_day", despawn: "yukawa_r", despawn2: "kusanagi_l", who: "N",
    t: "The embankment. Yukawa turned up his collar and walked the dump site, slowly." },
  { who: "N",
    t: "(Investigate the clues. You may leave after examining at least two. The more you examine, the more you will see.)" },

  { label: "ch4_investigate" },
  { dynmenu: (s) => {
      const opts = [];
      if (!s.clue_bike)    opts.push({ text: "The nearly new bicycle",           goto: "clue_bike" });
      if (!s.clue_clothes) opts.push({ text: "The half-burned clothing",          goto: "clue_clothes" });
      if (!s.clue_ticket)  opts.push({ text: "The two movie ticket stubs",        goto: "clue_ticket" });
      if (!s.clue_tent)    opts.push({ text: "The blue tarpaulin shelters below", goto: "clue_tent" });
      if (s.clues >= 2)    opts.push({ text: "Enough. Collect your thoughts and leave.", goto: "ch4_after" });
      return opts;
    },
    prompt: "Where to begin?" },

  { label: "clue_bike" },
  { set: (s) => { s.clue_bike = true; s.clues++; } },
  { who: "YU",
    t: "Bought days ago, stolen to carry a body, abandoned on the spot. Only the dead man's prints on it — whoever brought him here left none." },
  { who: "YT",
    t: "This bicycle is no oversight. It was {b}left{/b} here. An auxiliary line drawn into the diagram, waiting for us to follow it." },
  { notify: "Clue — the bicycle left behind", goto: "ch4_investigate" },

  { label: "clue_clothes" },
  { set: (s) => { s.clue_clothes = true; s.clues++; } },
  { who: "YU",
    t: "You burn clothes to destroy what they say. Yet the underwear survives — the very piece that pins the identity." },
  { who: "YT",
    t: "The one hiding who he is, and the one ensuring we learn who he is, are the same person. Unless 'who he is' is itself part of the answer." },
  { notify: "Clue — the contradictory burning", goto: "ch4_investigate" },

  { label: "clue_ticket" },
  { set: (s) => { s.clue_ticket = true; s.clues++; } },
  { who: "YU",
    t: "Ordinary people drop the stubs on the way out. Theirs were kept, folded neat. As if someone had said: keep these safe." },
  { who: "YT",
    t: "If the alibi is false, why does it survive every test? If true, why does every part look arranged? Unless the alibi is {b}true{/b} — and what was arranged is {b}something else{/b}." },
  { notify: "Clue — the stubs kept too neatly", goto: "ch4_investigate" },

  { label: "clue_tent" },
  { set: (s) => { s.clue_tent = true; s.clues++; } },
  { spawn: "homeless_r", who: "N",
    t: "Yukawa walked down the slope and offered a can of hot coffee to the old man crushing cans." },
  { who: "HM",
    t: "Police? No, you don't look it. ...Folk come and go here. Nobody keeps track." },
  { who: "YU", t: "Recently — has anyone disappeared?" },
  { who: "HM",
    t: "...Now you say it. There was the 'Engineer.' Hair always combed. Ten days back he was here. Then he wasn't. People vanish from this place. Nobody reports it. Nobody looks." },
  { despawn: "homeless_r", who: "YT",
    t: "A man no one would ever search for, gone from an embankment that hundreds pass without ever {b}seeing{/b}. And the time of his vanishing sits exactly before the corpse appeared." },
  { notify: "KEY clue — the vanished 'Engineer'", goto: "ch4_investigate" },

  { label: "ch4_after" },
  { set: (s) => { s.insight = s.clue_bike && s.clue_ticket && s.clue_clothes && s.clue_tent; } },

  { mood: "river_day", cond: (s) => s.insight, who: "N",
    t: "Dusk settled. Yukawa stood on the embankment a long time, perfectly still." },
  { cond: (s) => s.insight, who: "YT",
    t: "The bicycle: a signpost. The burning: to assign the body its name. The stubs: to guard a stretch of true memory. And the embankment is missing a man no one will look for." },
  { cond: (s) => s.insight, who: "YT",
    t: "Put all four into one equation— ...No. No one should be able to solve for that step. No one should be {b}able to bring himself{/b} to perform it." },
  { cond: (s) => s.insight, who: "N",
    t: "He took off his glasses and pressed his brow. In eyes that usually held only irony, there was now only cold." },
  { cond: (s) => s.insight, who: "YU",
    t: "Daruma... what you built was never an alibi. You built {b}an entire case{/b}." },

  { mood: "river_day", cond: (s) => !s.insight, who: "N",
    t: "Dusk settled. Yukawa stood on the embankment a long time." },
  { cond: (s) => !s.insight, who: "YT",
    t: "Not enough pieces yet. But the direction is certain — the problem we've been solving was tampered with at the level of its premise." },

  { mood: "void", center: true,
    goto: (s) => s.seen_ch3 ? "ch4_to5" : "ch4_to3" },
  { label: "ch4_to5" },
  { center: true, t: "And the one who built the problem\nwas already making his final move." },
  { goto: "chapter5" },
  { label: "ch4_to3" },
  { center: true, t: "The solver has caught the scent.\nBut the builder's quiet routine goes on." },
  { goto: "chapter3" },

  /* ---------- Chapter 5 · Devotion ---------- */
  { label: "chapter5" },
  { mood: "void", center: true, t: "{s+8}Chapter 5 · Devotion{/s}" },

  { mood: "apartment", persp: "ISHIGAMI", who: "N",
    t: "The investigation did not stop. After Yukawa's visit, Ishigami knew the time left for this problem was short." },
  { who: "IT",
    t: "Yukawa Manabu. Twenty years, and your eyes are unchanged — eyes that see through surfaces." },
  { who: "IT",
    t: "If the solver has come this far, the one who posed it must place his final move." },
  { who: "N",
    t: "He drew on gloves and wrote on letter paper, with his left hand." },
  { who: "N",
    t: "“I am always watching you. You have grown too close to that man. I will not allow it.”" },
  { who: "N",
    t: "One letter. Two. Three. Harassment mail to Hanaoka Yasuko, signed by a nameless shadow." },
  { who: "IT",
    t: "Draw him stroke by stroke: the stalker obsessed with her. The more repulsive the portrait, the better." },
  { who: "IT",
    t: "Let the world believe my love is the ugliest thing there is. That is the safest place to hide the truest." },

  { mood: "bento", spawn: "kudo_l", spawn2: "yasuko_r", who: "N",
    t: "Those days a man in a camel coat came often — an old acquaintance of Yasuko's, a customer named Kudo." },
  { who: "KM",
    t: "Yasuko-san, if you're free this weekend, have dinner with me. Bring Misato-chan too." },
  { who: "N",
    t: "Yasuko smiled and said yes. It was not the smile she gave Ishigami across the counter." },
  { who: "N",
    t: "From the far side of the street, Ishigami watched the whole scene." },

  { cond: (s) => s.motive === "love", who: "IT",
    t: "This thing in my chest has no counterpart in mathematics. It obeys no axiom. ...No matter. A theorem is not altered by the pain of the one proving it. Her walking into the light is precisely what this problem set out to prove." },
  { cond: (s) => s.motive === "logic", who: "IT",
    t: "A variable from outside the calculation. This contraction of the heart was not modeled. ...Discard it. At this stage, the sign of one term no longer changes the result." },
  { cond: (s) => s.motive === "unknown", who: "IT",
    t: "So that is what it was. Only now do I find the name for what moved me that night. — Too late. And no longer needed." },

  { mood: "police", despawn: "kudo_l", despawn2: "yasuko_r", spawn: "kusanagi_c", who: "N",
    t: "A week later, Ishigami walked into police headquarters and turned himself in." },
  { who: "I", t: "I killed Togashi Shinji." },
  { who: "I",
    t: "I am obsessed with Hanaoka Yasuko. I have been watching her. The letters were mine — check the hand, check the postmarks." },
  { who: "I",
    t: "On the night of March 10, I saw Togashi prowling near her building. I lured him to the embankment and killed him." },
  { who: "N",
    t: "He described the strangulation. The bicycle. The burning, the destruction of the face — every detail." },
  { who: "N",
    t: "Everything matched. Every piece of evidence closed its teeth precisely onto his confession." },
  { who: "K",
    t: "(stepping out, under his breath) ...Something's wrong. Every piece fits, and the whole thing is wrong." },

  { mood: "interrogation", despawn: "kusanagi_c", who: "N",
    t: "In the holding cell, Ishigami sat upright, eyes closed." },
  { who: "N",
    t: "To anyone watching, a husk of a man. Only he knew that spread across his mind was the map of the four-color problem, square by square, quietly filling in." },
  { who: "IT",
    t: "Ask me a hundred times; the answer is one. Because every detail I gave is {b}true{/b}. A lie built entirely from truths cannot be solved." },
  { who: "IT",
    t: "Yasuko. All you must do is keep walking where it is bright. You gave me back my life once, without knowing. Let this be the interest on that debt." },

  { mood: "void", center: true,
    t: "The case was closing.\nA confession, a perfect match, a motive.\n\nOnly one man had not stopped." },
  { goto: "chapter6" },

  /* ---------- Final Chapter · Blind Spot ---------- */
  { label: "chapter6" },
  { mood: "void", center: true, t: "{s+8}Final Chapter · Blind Spot{/s}" },

  { mood: "lab", persp: "YUKAWA", spawn: "yukawa_r", spawn2: "kusanagi_l", who: "K",
    t: "It's over. He confessed, the evidence matches. Yukawa — you overthought it." },
  { who: "YU",
    t: "Kusanagi. In his whole confession, which sentence concerns {b}March 9{/b}?" },
  { who: "K",
    t: "The ninth? The murder was the tenth. Why would anyone ask about the ninth?" },
  { who: "YU", t: "That is the blind spot." },
  { who: "YU",
    t: "From the moment the body was found, every one of us — myself included — solved the same problem: 'On the night of March 10, who killed Togashi Shinji?'" },
  { who: "YU", t: "Not one of us questioned {b}the premise{/b}." },

  { mood: "river_day", despawn: "yukawa_r", despawn2: "kusanagi_l",
    spawn: "yukawa_c", spawn2: "kusanagi_l", who: "YU",
    t: "Listen. The real case was March 9, in the Hanaokas' apartment. Togashi died that night." },
  { who: "YU",
    t: "Ishigami set out to protect them. But the ninth was too sudden — they could have no alibi for it, and a fabricated one would tear." },
  { who: "YU", t: "So he did what no ordinary mind would conceive. He replaced {b}the case itself{/b}." },

  { cond: (s) => s.insight, who: "YU",
    t: "On the tenth, he led away the man from the embankment — the one no one would seek. With his own hands he made a second corpse: face destroyed, prints burned, Togashi's clothes on the body, the bicycle for a signpost." },
  { cond: (s) => s.insight, who: "YU",
    t: "And so a 'Togashi, dead on the night of March 10' was born. The murder we threw everything at was, start to finish, {b}that{/b} one — and while it happened, mother and daughter sat in a cinema. Their alibi is perfect, because it is the {b}truth{/b}." },
  { cond: (s) => s.insight, who: "YU",
    t: "As for the real case of the ninth — no one ever knew it existed. Where there is no case, there is no suspect." },

  { cond: (s) => !s.insight, who: "YU",
    t: "I went back again and again before the last piece fell: the shelters are missing a man whose disappearance no one would report. On the tenth, Ishigami made a second corpse and let it die under Togashi's name." },
  { cond: (s) => !s.insight, who: "YU",
    t: "The murder we investigated was that substitution. At that hour, mother and daughter sat in a cinema — their alibi the plain truth. The real case of the ninth, no one ever knew existed." },

  { who: "K",
    t: "Wait... to bury one killing, he killed {b}a man with nothing to do with any of it{/b}?!" },
  { who: "YU", t: "To him, it was the optimal solution." },
  { who: "YU",
    t: "And the most terrible part — his confession is true, sentence by sentence. He did kill on the tenth. He did burn, destroy, leave the bicycle. He simply never says who the dead man was." },
  { who: "YU", t: "A wall built from true statements. No interrogation breaks it." },
  { who: "YT",
    t: "Daruma. You wagered your whole life, and an innocent man's, to prove one proposition. And the proposition was only ever this: that she deserved to keep living. That she once made you deserve it too." },
  { who: "YT",
    t: "And I, who solved it, must now answer a different problem." },

  { mood: "void", despawn: "yukawa_c", despawn2: "kusanagi_l", center: true,
    t: "Two roads lay before Yukawa Manabu.\n\nThe proof was his.\nWhat to do with the answer was also his." },
  { menu: [
      { text: "Tell Yasuko the truth.  (the novel's ending)", goto: "ending_truth" },
      { text: "Stay silent, and let the devotion stand.  (IF ending)", goto: "ending_silence" },
    ],
    prompt: "......" },

  /* ---------- Ending A · the novel ---------- */
  { label: "ending_truth" },
  { set: { ending: "truth" } },
  { mood: "snowroad", persp: "YUKAWA", spawn: "yasuko_r", who: "N",
    t: "Yukawa found Yasuko after the shop had closed, and told her everything." },
  { who: "N",
    t: "The ninth. The tenth. The embankment. The man whose name no one ever knew." },
  { who: "Y",
    t: "...No. He only said — leave it to him, ask nothing... I didn't know. I swear I didn't know there was another person—" },
  { who: "YU",
    t: "He would never let you know. Your not knowing is part of the design. The road he built you was this: carry that ignorance into a new life." },
  { who: "YU",
    t: "What you do now is not mine to decide. I only believe you have the right to know." },

  { mood: "interrogation", despawn: "yasuko_r", persp: "", who: "N",
    t: "Days later, Hanaoka Yasuko walked into police headquarters, dropped to her knees, and confessed to everything that happened on the night of March 9." },
  { who: "N",
    t: "The news reached the holding block as Ishigami was escorted down the corridor." },
  { spawn: "ishigami_l", who: "N", t: "He saw Yasuko at the end of the corridor." },
  { spawn: "yasuko_r", who: "N",
    t: "Saw her reddened eyes. Saw how deeply her back was bent." },
  { who: "Y",
    t: "I'm sorry... I'm sorry... I couldn't... I couldn't live standing on what you gave..." },
  { who: "N",
    t: "In that instant, Ishigami made a sound no one present had ever heard from a human being." },
  { who: "N",
    t: "Not a scream. More as if something were being dragged out of the body — whole." },

  { cond: (s) => s.motive === "love", who: "IT",
    t: "(The proof fails. No — the proposition was wrong from the first line. If her happiness requires her ignorance, then no solution ever existed.)" },
  { cond: (s) => s.motive === "logic", who: "IT",
    t: "(The solution was complete. The variable was the human heart. I computed every person — except that she would refuse.)" },
  { cond: (s) => s.motive === "unknown", who: "IT",
    t: "(Only at the end does he know the name of what moved him that night. And know that it could save no one.)" },

  { who: "N", t: "Yukawa stood at the far end of the corridor. He did not come closer." },
  { who: "YT", t: "What he is wringing out is not sound." },
  { who: "YT", t: "It is his soul." },

  { mood: "void", despawn: "ishigami_l", despawn2: "yasuko_r", center: true,
    t: "He appeared to be sacrificing himself.\nWhat he gave was more than anyone will ever know.\n\n{s-6}— End —{/s}" },
  { cond: (s) => !s.insight, center: true,
    t: "{s-4}If Yukawa gathers all four clues, the final chapter\nshows the complete deduction. Beneath the blue\ntarpaulins lies the heaviest weight in this problem.{/s}" },
  { goto: "credits" },

  /* ---------- Ending B · IF ---------- */
  { label: "ending_silence" },
  { set: { ending: "silence" } },
  { mood: "snowroad", persp: "YUKAWA", center: true,
    t: "{s-4}— What follows departs from the novel —{/s}" },
  { who: "N", t: "In the end, Yukawa told no one." },
  { who: "N",
    t: "The confession held. The court ruled as expected. Murderer, stalker, killer — every label he asked for was nailed onto him." },
  { who: "N",
    t: "Yasuko moved to another city with her daughter. They say one of the shop's regulars has stayed at her side." },

  { mood: "river_night", spawn: "yukawa_c", who: "N",
    t: "Another March. Yukawa stood alone on the embankment of the Old Edogawa." },
  { who: "N",
    t: "The blue tarpaulins were still there. The old man still crushed his cans. No one remembered anyone was missing." },
  { who: "YT",
    t: "Daruma. Your proof stands. It had one referee — and he chose not to publish." },
  { who: "YT",
    t: "But we both know a human life is buried in this problem. He has no name. No one searches for him. Even the standing of 'victim' — you took that too." },
  { who: "YT",
    t: "Your devotion rests on his silence beneath the water. And now, so does mine." },
  { despawn: "yukawa_c", who: "N",
    t: "Yukawa set his can of coffee on the embankment, and turned away." },
  { who: "YT",
    t: "Some problems, once solved, leave the solver to carry the answer alone." },

  { mood: "void", center: true,
    t: "Logic can be perfect.\nPeople cannot.\n\n{s-6}— IF Ending —{/s}" },
  { goto: "credits" },

  /* ---------- Credits ---------- */
  { label: "credits" },
  { mood: "gears", persp: "", center: true,
    t: "{s+6}Devotion — Suspect X{/s}\n\n\nBased on the novel “The Devotion of Suspect X”\nby Keigo Higashino\n\nA non-commercial fan adaptation.\nAll text is an original rewrite." },
  { mood: "gears", persp: "", center: true,
    t: "{s-3}Scene photographs: Wikimedia Commons contributors,\ngraded for this project (see scenes/CREDITS.md).\nAtmosphere rendered with three.js.{/s}" },
  { cond: (s) => s.ending === "truth" && !s.insight, center: true,
    t: "Ending: the novel's ending\n\nOn your next walk, examine every clue on the embankment." },
  { cond: (s) => s.ending === "truth" && s.insight, center: true,
    t: "Ending: the novel's ending  (full deduction)\n\nOn the other road, Yukawa stayed silent.\nThat is the road the novel never took." },
  { cond: (s) => s.ending === "silence", center: true,
    t: "Ending: IF ending\n\nIn the novel, Yukawa made the other choice.\nBoth roads are worth walking." },
  { end: true, restart: true, center: true, t: "{s-2}— click to return to the title —{/s}" },
];

const INITIAL_STATE = {
  motive: "unknown",
  clue_bike: false, clue_clothes: false, clue_ticket: false, clue_tent: false,
  clues: 0, insight: false, seen_ch3: false, seen_ch4: false, ending: null,
};

if (typeof window !== "undefined") {
  window.CHARS = CHARS;
  window.PERSP = PERSP;
  window.STORY = STORY;
  window.INITIAL_STATE = INITIAL_STATE;
}
