// VimMonsters Academy content and modding surface.
//
// The engine in src/game.js reads data from this file. If you want to teach from this
// codebase or mod the game, this is the safest place to start.
//
// Common edits:
// 1. Change PLAYER_STYLE to recolor the hero.
// 2. Change NPC_STYLES to recolor the mentors.
// 3. Add a new entry to CREATURES with createCreature(...) to add a new VimMonster.
// 4. Edit LESSONS and MAPS to change progression and layout.
// 5. Edit WORLD_COLORS to retheme the world and UI.

// Shared helpers for content authors.

const DEFAULT_CHARACTER_STYLE = {
  outline: "#141926",
  clothes: "#2d5bb3",
  hair: "#e85d56",
  accent: "#69a1ff",
  skin: "#ffd7b2",
  boots: "#21283a",
};

function assertRows(label, rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.some((row) => typeof row !== "string")) {
    throw new Error(`${label} must use an array of string rows.`);
  }
}

export function createCharacterStyle(overrides = {}) {
  return {
    ...DEFAULT_CHARACTER_STYLE,
    ...overrides,
  };
}

export function createLesson(definition) {
  return {
    id: definition.id,
    title: definition.title,
    body: definition.body,
  };
}

export function createMap(definition) {
  assertRows(`Map "${definition.name || definition.id || "unknown"}"`, definition.rows);
  return {
    name: definition.name,
    theme: definition.theme,
    rows: definition.rows.slice(),
  };
}

// Global UI and overworld palette hooks.
export const WORLD_COLORS = {
  ink: "#101620",
  panelDark: "#32425f",
  panelMid: "#5d7093",
  panelLight: "#f8e7ae",
  panelAccent: "#ffd166",
  shadow: "rgba(16, 22, 32, 0.18)",
  skyA: "#7ec8ff",
  skyB: "#d6f3ff",
  grassA: "#5abf5a",
  grassB: "#8fe36d",
  grassC: "#2d8744",
  dirtA: "#cb9f62",
  dirtB: "#8f653f",
  dirtC: "#efd9ab",
  waterA: "#3d89ff",
  waterB: "#9de4ff",
  houseFloor: "#c78f58",
  houseFloorB: "#975f2e",
  wallA: "#5d6077",
  wallB: "#34384d",
  signA: "#d79f62",
  signB: "#835a34",
  doorA: "#a64b4b",
  doorB: "#6d2432",
  cliffA: "#a47354",
  cliffB: "#6d4638",
  stoneA: "#989db0",
  stoneB: "#686d7b",
  runeA: "#fff3d1",
  runeB: "#e97070",
  healA: "#ff808d",
  healB: "#85c3ff",
  treeA: "#2f6e35",
  treeB: "#4ea84f",
  treeC: "#9ce061",
  towerA: "#695f8f",
  towerB: "#3e365e",
  fireA: "#ff8d58",
  fireB: "#ffd36c",
};

// Control reference shown in the in-game VimTree.
export const CONTROL_INFO = [
  {
    id: "move",
    keys: "h j k l",
    vim: "Left, down, up, right motions",
    game: "Walk one tile in the world",
  },
  {
    id: "inspect",
    keys: "i",
    vim: "Enter insert mode",
    game: "Inspect signs, talk to NPCs, heal, or trigger the boss altar",
  },
  {
    id: "tree",
    keys: "o / Enter",
    vim: "Open things / confirm",
    game: "Toggle the in-game VimTree and focus the selected section",
  },
  {
    id: "word",
    keys: "w / b",
    vim: "Next word / back word",
    game: "Move 1 tile forward or backward; counts extend it, like 3w",
  },
  {
    id: "word-ends",
    keys: "e / ge",
    vim: "End of word / previous end of word",
    game: "Used in later text drills to land exactly on word endings",
  },
  {
    id: "find",
    keys: "f / t / F / T",
    vim: "Find to character / till character forward or backward",
    game: "Used in Finder Fen drills to jump across a line by target character",
  },
  {
    id: "find-repeat",
    keys: "; / ,",
    vim: "Repeat last find / repeat in reverse",
    game: "Repeat the last f, t, F, or T target in drills and battle mini-drills",
  },
  {
    id: "count",
    keys: "1-9 + motion",
    vim: "Counts repeat the next motion",
    game: "Repeat movement or jumps, like 3w or 2j",
  },
  {
    id: "line",
    keys: "0 / $ / ^",
    vim: "Start / end / first non-blank of line",
    game: "Snap to the far left, far right, or first non-blank spot on a row",
  },
  {
    id: "file",
    keys: "gg / G",
    vim: "Top / bottom of file",
    game: "Snap to the top or bottom of the current column",
  },
  {
    id: "cycle",
    keys: "[ / ]",
    vim: "Move through neighboring sections",
    game: "Cycle through your party and change the active VimMonster",
  },
  {
    id: "repeat",
    keys: ".",
    vim: "Repeat the last change",
    game: "Repeat the last movement or party action",
  },
  {
    id: "attack",
    keys: "a",
    vim: "Append after cursor",
    game: "Attack in battle",
  },
  {
    id: "quick",
    keys: "x",
    vim: "Delete character under cursor",
    game: "Quick Jab in battle and char-delete drills later on",
  },
  {
    id: "line-edit",
    keys: "dd / dw / cw / ciw",
    vim: "Delete line / delete word / change word / change inner word",
    game: "Battle operators: Heavy Slam, Break Word, Focus Ball, and Inner Word",
  },
  {
    id: "vimOrb",
    keys: "f",
    vim: "Find a character",
    game: "Fling a VimOrb at the wild target",
  },
  {
    id: "command",
    keys: ":",
    vim: "Command-line mode",
    game: "Open help, save, load, quit the run, or check the party",
  },
  {
    id: "rename",
    keys: "R",
    vim: "Replace-mode mnemonic",
    game: "Rename the current run for the leaderboard",
  },
].map((entry) => Object.freeze(entry));

// Lesson copy shown in the HUD and VimTree.
export const LESSONS = [
  createLesson({
    id: "house",
    title: "Lesson 1: Home Row Movement",
    body: "Visit the H, J, K, and L rune tiles, then step through the exit.",
  }),
  createLesson({
    id: "meadow",
    title: "Lesson 2: Word Motions",
    body: "Meet Mentor W, clear w, b, e, and ge drills, then catch your first wild VimMonster.",
  }),
  createLesson({
    id: "ridge",
    title: "Lesson 3: Line Motions, x, And Party Switching",
    body: "Meet Coach Buffer, use 0, $, ^, and x, then switch active VimMonster with [ or ].",
  }),
  createLesson({
    id: "grove",
    title: "Lesson 4: Counts, dd, And cw",
    body: "Meet Sage Count, use counted motions, then learn dd and cw before climbing onward.",
  }),
  createLesson({
    id: "fen",
    title: "Lesson 5: Find Motions",
    body: "Meet Scout Find, then use f, t, F, and T to snap to target characters.",
  }),
  createLesson({
    id: "studio",
    title: "Lesson 6: Word Operators",
    body: "Meet Scribe Edit, then use dw and ciw to reshape text cleanly.",
  }),
  createLesson({
    id: "tower",
    title: "Lesson 7: Search, Replace, And The Final Capture",
    body: "Clear the altar drill with gg, G, / search, :replace, and a q-register macro, then defeat or catch the final VimMonster.",
  }),
];

// Starter chooser pool shown right after Home Row House.
export const STARTER_VIMMONSTER_IDS = ["pebbLit", "sproutle", "fizzbat"];

function mirrorPattern(pattern) {
  return pattern.map((row) => row.split("").reverse().join(""));
}

export function createCreature(definition) {
  if (!definition || !definition.id || !definition.name) {
    throw new Error("createCreature(...) needs at least an id and name.");
  }
  assertRows(`Creature "${definition.name}" sprite`, definition.sprite);
  const frames = definition.frames || [definition.sprite];
  frames.forEach((frame, index) => {
    assertRows(`Creature "${definition.name}" frame ${index + 1}`, frame);
  });
  return {
    id: definition.id,
    name: definition.name,
    baseHp: definition.baseHp,
    baseAttack: definition.baseAttack,
    battle: definition.battle ? { ...definition.battle } : {},
    sprite: definition.sprite.slice(),
    palette: { ...definition.palette },
    frames: frames.map((frame) => frame.slice()),
  };
}

// Add new catchable VimMonsters here. This is the main extension point for
// species design because stats, battle specialties, sprite art, and animation
// frames live together in one data object.
export const CREATURES = [
  createCreature({
    id: "pebbLit",
    name: "Pebblit",
    baseHp: 20,
    baseAttack: 5,
    sprite: [
      "...2222...",
      "..233332..",
      ".23311332.",
      "2331441332",
      "2333333332",
      ".23322332.",
      ".22322322.",
      ".22.22.22.",
      ".21....12.",
      "..1....1..",
    ],
    palette: {
      "1": "#151926",
      "2": "#6e7583",
      "3": "#98a0af",
      "4": "#d9cda9",
    },
    battle: {
      specialty: "stonewall",
      techniqueBonus: { slam: 2, attack: 1 },
      resist: { quick: 2 },
      enemyMoves: ["guard", "shard"],
    },
    frames: [
      [
        "...2222...",
        "..233332..",
        ".23311332.",
        "2331441332",
        "2333333332",
        ".23322332.",
        ".22322322.",
        ".22.22.22.",
        ".21....12.",
        "..1....1..",
      ],
      [
        "...2222...",
        "..233332..",
        ".23311332.",
        "2331441332",
        "2333333332",
        ".23322332.",
        ".22222222.",
        "..21..12..",
        ".2......2.",
        "..1....1..",
      ],
      [
        "...2222...",
        "..233332..",
        ".23311332.",
        "2331441332",
        "2333333332",
        ".23322332.",
        ".22322322.",
        ".22222222.",
        "..1.22.1..",
        ".1......1.",
      ],
    ],
  }),
  createCreature({
    id: "sproutle",
    name: "Sproutle",
    baseHp: 16,
    baseAttack: 4,
    sprite: [
      "...333....",
      "..33433...",
      ".3344432..",
      "2334444332",
      "2334554332",
      ".23444432.",
      ".22322322.",
      ".22.22.22.",
      "..2....2..",
      "...2..2...",
    ],
    palette: {
      "1": "#152117",
      "2": "#3d7e3a",
      "3": "#6fd85d",
      "4": "#fff0b1",
    },
    battle: {
      specialty: "snare",
      techniqueBonus: { focus: 0.12 },
      weak: { slam: 2 },
      enemyMoves: ["root", "lash"],
    },
    frames: [
      [
        "...333....",
        "..33433...",
        ".3344432..",
        "2334444332",
        "2334554332",
        ".23444432.",
        ".22322322.",
        ".22.22.22.",
        "..2....2..",
        "...2..2...",
      ],
      [
        "....33....",
        "...3433...",
        "..334432..",
        "2334444332",
        "2334554332",
        ".23444432.",
        ".22222222.",
        ".22.22.22.",
        ".2......2.",
        "..2....2..",
      ],
      [
        "..33......",
        ".3343.....",
        "2334432...",
        "2334444332",
        "2334554332",
        ".23444432.",
        ".22322322.",
        ".22222222.",
        "..2.22.2..",
        ".2......2.",
      ],
    ],
  }),
  createCreature({
    id: "fizzbat",
    name: "Fizzbat",
    baseHp: 17,
    baseAttack: 5,
    sprite: [
      ".33....33.",
      "3343333433",
      "3443555343",
      "2344444442",
      ".23333332.",
      "22.2332.22",
      "2.2....2.2",
      "..22..22..",
      "...2..2...",
      "....11....",
    ],
    palette: {
      "1": "#182033",
      "2": "#2e6dd0",
      "3": "#79d8ff",
      "4": "#ffca68",
      "5": "#fff4d1",
    },
    battle: {
      specialty: "swift",
      techniqueBonus: { quick: 2 },
      resist: { slam: 2 },
      enemyMoves: ["evade", "echobite"],
    },
    frames: [
      [
        ".33....33.",
        "3343333433",
        "3443555343",
        "2344444442",
        ".23333332.",
        "22.2332.22",
        "2.2....2.2",
        "..22..22..",
        "...2..2...",
        "....11....",
      ],
      [
        "33......33",
        "3433333343",
        "4443555444",
        ".44444444.",
        "2333333332",
        ".22333322.",
        "..22..22..",
        "...2..2...",
        "..2....2..",
        "...11..11.",
      ],
      [
        "..33..33..",
        ".33444433.",
        "3443555543",
        "2444444442",
        "2233333332",
        ".22333322.",
        ".22....22.",
        "..22..22..",
        "...2..2...",
        "....11....",
      ],
    ],
  }),
  createCreature({
    id: "tabbit",
    name: "Tabbit",
    baseHp: 18,
    baseAttack: 4,
    sprite: [
      "...33..33.",
      "..3344433.",
      ".334554433",
      "2344444442",
      ".23444442.",
      ".23333332.",
      "..223322..",
      ".22.22.22.",
      ".2......2.",
      "..2....2..",
    ],
    palette: {
      "1": "#1a1721",
      "2": "#745674",
      "3": "#c395d5",
      "4": "#fff0d7",
      "5": "#ff92b2",
    },
    battle: {
      specialty: "trickster",
      techniqueBonus: { attack: 1 },
      swapShield: true,
      enemyMoves: ["feint", "hop"],
    },
    frames: [
      [
        "..33..33..",
        ".33444433.",
        "3344554433",
        "2344444442",
        ".23411442.",
        ".23333332.",
        "..223322..",
        ".22.22.22.",
        "..2....2..",
        ".2......2.",
      ],
      [
        "..33..33..",
        ".33444433.",
        "3344554433",
        "2344444442",
        ".23411442.",
        ".23333332.",
        "..222222..",
        ".22.22.22.",
        "..2....2..",
        ".2......2.",
      ],
      [
        "..33..33..",
        ".33444433.",
        "3344554433",
        "2344444442",
        ".23411442.",
        ".23333332.",
        "..223322..",
        ".2......2.",
        ".22.22.22.",
        "...2..2...",
      ],
    ],
  }),
  createCreature({
    id: "glyphowl",
    name: "Glyphowl",
    baseHp: 19,
    baseAttack: 5,
    sprite: [
      "...3333...",
      "..334433..",
      ".33411433.",
      "2334444432",
      "2334554432",
      ".233333332.",
      ".223223322.",
      ".22.22.22..",
      "..2.22.2...",
      "...2..2....",
    ],
    palette: {
      "1": "#141926",
      "2": "#5a6d87",
      "3": "#c3d0e8",
      "4": "#ffe08c",
      "5": "#7c5ac7",
    },
    battle: {
      specialty: "finder",
      techniqueBonus: { attack: 1, focus: 0.08 },
      enemyMoves: ["mark", "peck"],
    },
    frames: [
      [
        "...3333...",
        "..334433..",
        ".33411433.",
        "2334444432",
        "2334554432",
        ".233333332.",
        ".223223322.",
        ".22.22.22..",
        "..2.22.2...",
        "...2..2....",
      ],
      [
        "...3333...",
        "..334433..",
        ".33411433.",
        "2334444432",
        "2334554432",
        ".233333332.",
        ".222222222.",
        "..22..22...",
        ".2.22..2...",
        "..2....2...",
      ],
      [
        "...3333...",
        "..334433..",
        ".33411433.",
        "2334444432",
        "2334554432",
        ".233333332.",
        ".223223322.",
        "..2222222..",
        "...2..2....",
        "..2.22.2...",
      ],
    ],
  }),
  createCreature({
    id: "slashram",
    name: "Slashram",
    baseHp: 22,
    baseAttack: 6,
    sprite: [
      "..33..33..",
      ".33444433.",
      "3344114433",
      "2344444442",
      ".233555332.",
      ".223333322.",
      ".22.22.22..",
      ".2..22..2..",
      "..2....2...",
      ".11....11..",
    ],
    palette: {
      "1": "#16141f",
      "2": "#8a4a3a",
      "3": "#f0c27d",
      "4": "#fff2dc",
      "5": "#d86d5a",
    },
    battle: {
      specialty: "operator",
      techniqueBonus: { slam: 3, quick: 1 },
      resist: { attack: 1 },
      enemyMoves: ["bleed", "guard"],
    },
    frames: [
      [
        "..33..33..",
        ".33444433.",
        "3344114433",
        "2344444442",
        ".233555332.",
        ".223333322.",
        ".22.22.22..",
        ".2..22..2..",
        "..2....2...",
        ".11....11..",
      ],
      [
        "..33..33..",
        ".33444433.",
        "3344114433",
        "2344444442",
        ".233555332.",
        ".223333322.",
        "..222222...",
        ".2..22..2..",
        ".11....11..",
        "..1....1...",
      ],
      [
        "..33..33..",
        ".33444433.",
        "3344114433",
        "2344444442",
        ".233555332.",
        ".223333322.",
        ".22.22.22..",
        "..2222222..",
        "...2..2....",
        ".11....11..",
      ],
    ],
  }),
  createCreature({
    id: "macrobat",
    name: "Macrobat",
    baseHp: 28,
    baseAttack: 7,
    sprite: [
      ".33......33.",
      "334333333433",
      "344455555443",
      "244444444442",
      ".2333333332.",
      "223311113322",
      ".22333333322",
      "22..3333..22",
      ".2...22...2.",
      "..2......2..",
      "...2.22.2...",
      "....2..2....",
    ],
    palette: {
      "1": "#1a1627",
      "2": "#55427d",
      "3": "#8f6dd6",
      "4": "#ff8e65",
      "5": "#ffe6a7",
    },
    battle: {
      specialty: "boss",
      resist: { attack: 1, quick: 1 },
      enemyMoves: ["macroguard", "macroecho", "bleed"],
      catchPenalty: 0.08,
    },
    frames: [
      [
        ".33......33.",
        "334333333433",
        "344455555443",
        "244444444442",
        ".2333333332.",
        "223311113322",
        ".22333333322",
        "22..3333..22",
        ".2...22...2.",
        "..2......2..",
        "...2.22.2...",
        "....2..2....",
      ],
      [
        "33........33",
        "344333333443",
        ".4445555544.",
        "..44444444..",
        ".2333333332.",
        "223311113322",
        ".23.3333.32.",
        "..2..22..2..",
        "...2....2...",
        "....2..2....",
        ".....2..2...",
        "......22....",
      ],
      [
        ".3........3.",
        "334333333433",
        "344455555443",
        ".4444444444.",
        ".2333333332.",
        "223311113322",
        ".2233333322.",
        "22..2..2..22",
        ".2...22...2.",
        "..2......2..",
        "...2.22.2...",
        "....2..2....",
      ],
    ],
  }),
];

export const SPECIES = Object.fromEntries(
  CREATURES.map(({ id, frames: _frames, ...species }) => [id, species])
);

export const MONSTER_FRAMES = Object.fromEntries(
  CREATURES.map(({ id, frames }) => [id, frames])
);

const CHARACTER_DOWN_A = [
  "....3333....",
  "...355553...",
  "...351513...",
  "...355553...",
  "....5445....",
  "...244442...",
  "..22444422..",
  ".2222222222.",
  ".2222222222.",
  "..222..222..",
  "..22....22..",
  "..22....22..",
  "..66....66..",
  ".66......66.",
];

const CHARACTER_DOWN_B = [
  "....3333....",
  "...355553...",
  "...351513...",
  "...355553...",
  "....5445....",
  "...244442...",
  "..22444422..",
  ".2222222222.",
  ".2222222222.",
  "..22222222..",
  "..22.22.22..",
  "..22....22..",
  ".66....66...",
  "..6......6..",
];

const CHARACTER_DOWN_C = [
  "....3333....",
  "...355553...",
  "...351513...",
  "...355553...",
  "....5445....",
  "...244442...",
  "..22444422..",
  ".2222222222.",
  ".2222222222.",
  "..22222222..",
  "..22.22.22..",
  "..22....22..",
  "...66....66.",
  "..6......6..",
];

const CHARACTER_UP_A = [
  "....3333....",
  "...322223...",
  "...322223...",
  "...322223...",
  "....2222....",
  "...244442...",
  "..22444422..",
  ".2222222222.",
  ".2222222222.",
  "..222..222..",
  "..22....22..",
  "..22....22..",
  "..66....66..",
  ".66......66.",
];

const CHARACTER_UP_B = [
  "....3333....",
  "...322223...",
  "...322223...",
  "...322223...",
  "....2222....",
  "...244442...",
  "..22444422..",
  ".2222222222.",
  ".2222222222.",
  "..22222222..",
  "..22.22.22..",
  "..22....22..",
  ".66....66...",
  "..6......6..",
];

const CHARACTER_UP_C = [
  "....3333....",
  "...322223...",
  "...322223...",
  "...322223...",
  "....2222....",
  "...244442...",
  "..22444422..",
  ".2222222222.",
  ".2222222222.",
  "..22222222..",
  "..22.22.22..",
  "..22....22..",
  "...66....66.",
  "..6......6..",
];

const CHARACTER_LEFT_A = [
  "....3333....",
  "...355553...",
  "...351553...",
  "...355553...",
  "....5445....",
  "...244442...",
  "..2244442...",
  ".22222222...",
  ".22222222...",
  "..2222222...",
  "..22..222...",
  "..22...22...",
  "..66...66...",
  ".66....66...",
];

const CHARACTER_LEFT_B = [
  "....3333....",
  "...355553...",
  "...351553...",
  "...355553...",
  "....5445....",
  "...244442...",
  "..2244442...",
  ".22222222...",
  ".22222222...",
  "..2222222...",
  "..22.222....",
  "..22..22....",
  ".66....66...",
  "..6.....6...",
];

const CHARACTER_LEFT_C = [
  "....3333....",
  "...355553...",
  "...351553...",
  "...355553...",
  "....5445....",
  "...244442...",
  "..2244442...",
  ".22222222...",
  ".22222222...",
  "..2222222...",
  "..222.22....",
  "..22..22....",
  "...66...66..",
  "..6.....6...",
];

function createCharacterPalette(style) {
  return {
    "1": style.outline,
    "2": style.clothes,
    "3": style.hair,
    "4": style.accent,
    "5": style.skin,
    "6": style.boots,
  };
}

function paintPattern(pattern, paints) {
  const rows = pattern.map((row) => row.split(""));
  paints.forEach(([x, y, value]) => {
    if (!rows[y] || typeof rows[y][x] === "undefined") {
      return;
    }
    rows[y][x] = value;
  });
  return rows.map((row) => row.join(""));
}

function createCharacterFrames() {
  return {
    down: [CHARACTER_DOWN_A, CHARACTER_DOWN_B, CHARACTER_DOWN_C],
    up: [CHARACTER_UP_A, CHARACTER_UP_B, CHARACTER_UP_C],
    left: [CHARACTER_LEFT_A, CHARACTER_LEFT_B, CHARACTER_LEFT_C],
    right: [mirrorPattern(CHARACTER_LEFT_A), mirrorPattern(CHARACTER_LEFT_B), mirrorPattern(CHARACTER_LEFT_C)],
  };
}

function createCharacterVariantFrames(baseFrames, overlays) {
  return {
    down: baseFrames.down.map((frame) => paintPattern(frame, overlays.down || [])),
    up: baseFrames.up.map((frame) => paintPattern(frame, overlays.up || [])),
    left: baseFrames.left.map((frame) => paintPattern(frame, overlays.left || [])),
    right: baseFrames.right.map((frame) => paintPattern(frame, overlays.right || [])),
  };
}

function buildCharacterArt(style, frames) {
  return {
    palette: createCharacterPalette(style),
    frames: frames || createCharacterFrames(),
  };
}

// Visual palette hooks for the playable hero and mentors. For most character
// mods, edit these colors first before changing any frame geometry.
export const PLAYER_STYLE = createCharacterStyle();

export const NPC_STYLES = {
  mentor: createCharacterStyle({
    clothes: "#5f728f",
    hair: "#ffd36c",
    accent: "#ffffff",
    skin: "#ffd9bb",
    boots: "#71513a",
  }),
  coach: createCharacterStyle({
    clothes: "#6b587d",
    hair: "#ff96c1",
    accent: "#f7f7ff",
    skin: "#ffd9bb",
    boots: "#71513a",
  }),
  sage: createCharacterStyle({
    clothes: "#3d6b57",
    hair: "#f6f2cf",
    accent: "#8fd7a1",
    skin: "#ffd9bb",
    boots: "#71513a",
  }),
  scout: createCharacterStyle({
    clothes: "#49658e",
    hair: "#f4f1df",
    accent: "#9fd6ff",
    skin: "#ffd9bb",
    boots: "#3f4d60",
  }),
  scribe: createCharacterStyle({
    clothes: "#7b503f",
    hair: "#f5c07c",
    accent: "#ffe4aa",
    skin: "#ffd9bb",
    boots: "#40261c",
  }),
};

const BASE_CHARACTER_FRAMES = createCharacterFrames();

// Trainer frame definitions. These stay as plain row data so contributors can
// experiment with art without needing external sprite tools.
export const PLAYER_FRAMES = BASE_CHARACTER_FRAMES;

export const MENTOR_FRAMES = createCharacterVariantFrames(BASE_CHARACTER_FRAMES, {
  down: [
    [1, 0, "3"], [10, 0, "3"],
    [2, 0, "4"], [3, 0, "4"], [8, 0, "4"], [9, 0, "4"],
    [1, 1, "3"], [10, 1, "3"],
    [2, 1, "4"], [9, 1, "4"],
    [1, 2, "3"], [10, 2, "3"],
    [1, 5, "4"], [10, 5, "4"],
    [0, 6, "4"], [11, 6, "4"],
    [1, 6, "2"], [10, 6, "2"],
    [0, 7, "2"], [11, 7, "2"],
    [0, 8, "2"], [11, 8, "2"],
  ],
  up: [
    [1, 0, "3"], [10, 0, "3"],
    [2, 0, "4"], [3, 0, "4"], [8, 0, "4"], [9, 0, "4"],
    [1, 1, "3"], [10, 1, "3"],
    [2, 1, "4"], [9, 1, "4"],
    [1, 2, "3"], [10, 2, "3"],
    [1, 5, "4"], [10, 5, "4"],
    [0, 6, "4"], [11, 6, "4"],
    [1, 6, "2"], [10, 6, "2"],
    [0, 7, "2"], [11, 7, "2"],
    [0, 8, "2"], [11, 8, "2"],
  ],
  left: [
    [1, 0, "3"], [9, 0, "3"], [10, 0, "3"],
    [2, 0, "4"], [3, 0, "4"], [8, 0, "4"],
    [1, 1, "3"], [9, 1, "3"],
    [1, 5, "4"], [9, 5, "4"], [10, 5, "4"],
    [0, 6, "4"], [1, 6, "2"], [8, 6, "2"], [9, 6, "2"],
    [0, 7, "2"], [9, 7, "2"],
  ],
  right: [
    [1, 0, "3"], [2, 0, "3"], [10, 0, "3"],
    [3, 0, "4"], [8, 0, "4"], [9, 0, "4"],
    [2, 1, "3"], [10, 1, "3"],
    [2, 5, "4"], [10, 5, "4"], [11, 5, "4"],
    [2, 6, "2"], [3, 6, "2"], [10, 6, "2"], [11, 6, "4"],
    [2, 7, "2"], [11, 7, "2"],
  ],
});

export const COACH_FRAMES = createCharacterVariantFrames(BASE_CHARACTER_FRAMES, {
  down: [
    [1, 0, "3"], [2, 0, "3"], [3, 0, "3"], [8, 0, "3"], [9, 0, "3"], [10, 0, "3"],
    [0, 1, "3"], [1, 1, "3"], [10, 1, "3"], [11, 1, "3"],
    [0, 6, "4"], [11, 6, "4"],
    [1, 6, "2"], [10, 6, "2"],
    [0, 7, "2"], [11, 7, "2"],
    [0, 8, "2"], [11, 8, "2"],
    [1, 10, "6"], [10, 10, "6"],
  ],
  up: [
    [1, 0, "3"], [2, 0, "3"], [3, 0, "3"], [8, 0, "3"], [9, 0, "3"], [10, 0, "3"],
    [0, 1, "3"], [1, 1, "3"], [10, 1, "3"], [11, 1, "3"],
    [0, 6, "4"], [11, 6, "4"],
    [1, 6, "2"], [10, 6, "2"],
    [0, 7, "2"], [11, 7, "2"],
    [0, 8, "2"], [11, 8, "2"],
    [1, 10, "6"], [10, 10, "6"],
  ],
  left: [
    [1, 0, "3"], [2, 0, "3"], [3, 0, "3"], [8, 0, "3"],
    [0, 1, "3"], [1, 1, "3"], [2, 1, "3"],
    [0, 6, "4"], [1, 6, "2"], [8, 6, "2"], [9, 6, "4"],
    [0, 7, "2"], [9, 7, "2"], [0, 8, "2"],
    [1, 10, "6"],
  ],
  right: [
    [3, 0, "3"], [8, 0, "3"], [9, 0, "3"], [10, 0, "3"],
    [9, 1, "3"], [10, 1, "3"], [11, 1, "3"],
    [2, 6, "4"], [3, 6, "2"], [10, 6, "2"], [11, 6, "4"],
    [2, 7, "2"], [11, 7, "2"], [11, 8, "2"],
    [10, 10, "6"],
  ],
});

export const SAGE_FRAMES = createCharacterVariantFrames(BASE_CHARACTER_FRAMES, {
  down: [
    [1, 0, "2"], [10, 0, "2"],
    [2, 0, "2"], [3, 0, "2"], [4, 0, "2"], [7, 0, "2"], [8, 0, "2"], [9, 0, "2"],
    [1, 1, "2"], [10, 1, "2"],
    [2, 1, "2"], [9, 1, "2"],
    [1, 2, "2"], [10, 2, "2"],
    [1, 5, "2"], [10, 5, "2"],
    [0, 6, "2"], [11, 6, "2"],
    [0, 7, "2"], [11, 7, "2"],
    [0, 8, "2"], [11, 8, "2"],
    [1, 10, "2"], [10, 10, "2"],
    [1, 11, "2"], [10, 11, "2"],
    [2, 12, "2"], [9, 12, "2"],
  ],
  up: [
    [1, 0, "2"], [10, 0, "2"],
    [2, 0, "2"], [3, 0, "2"], [4, 0, "2"], [7, 0, "2"], [8, 0, "2"], [9, 0, "2"],
    [1, 1, "2"], [10, 1, "2"],
    [2, 1, "2"], [9, 1, "2"],
    [1, 2, "2"], [10, 2, "2"],
    [1, 5, "2"], [10, 5, "2"],
    [0, 6, "2"], [11, 6, "2"],
    [0, 7, "2"], [11, 7, "2"],
    [0, 8, "2"], [11, 8, "2"],
    [1, 10, "2"], [10, 10, "2"],
    [1, 11, "2"], [10, 11, "2"],
    [2, 12, "2"], [9, 12, "2"],
  ],
  left: [
    [1, 0, "2"], [2, 0, "2"], [8, 0, "2"], [9, 0, "2"],
    [2, 0, "2"], [3, 0, "2"], [4, 0, "2"], [7, 0, "2"], [8, 0, "2"],
    [1, 1, "2"], [8, 1, "2"],
    [0, 5, "2"], [1, 5, "2"], [8, 5, "2"], [9, 5, "2"],
    [0, 6, "2"], [9, 6, "2"], [0, 7, "2"], [9, 7, "2"],
    [1, 10, "2"], [8, 10, "2"],
    [1, 11, "2"], [8, 11, "2"],
  ],
  right: [
    [2, 0, "2"], [3, 0, "2"], [9, 0, "2"], [10, 0, "2"],
    [3, 0, "2"], [4, 0, "2"], [7, 0, "2"], [8, 0, "2"], [9, 0, "2"],
    [3, 1, "2"], [10, 1, "2"],
    [2, 5, "2"], [3, 5, "2"], [10, 5, "2"], [11, 5, "2"],
    [2, 6, "2"], [11, 6, "2"], [2, 7, "2"], [11, 7, "2"],
    [3, 10, "2"], [10, 10, "2"],
    [3, 11, "2"], [10, 11, "2"],
  ],
});

export const SCOUT_FRAMES = createCharacterVariantFrames(BASE_CHARACTER_FRAMES, {
  down: [
    [1, 0, "4"], [10, 0, "4"],
    [1, 1, "4"], [10, 1, "4"],
    [0, 2, "4"], [11, 2, "4"],
    [0, 6, "4"], [11, 6, "4"],
    [0, 7, "2"], [11, 7, "2"],
    [1, 8, "2"], [10, 8, "2"],
    [1, 10, "6"], [10, 10, "6"],
  ],
  up: [
    [1, 0, "4"], [10, 0, "4"],
    [1, 1, "4"], [10, 1, "4"],
    [0, 2, "4"], [11, 2, "4"],
    [0, 6, "4"], [11, 6, "4"],
    [0, 7, "2"], [11, 7, "2"],
    [1, 8, "2"], [10, 8, "2"],
    [1, 10, "6"], [10, 10, "6"],
  ],
  left: [
    [1, 0, "4"], [9, 0, "4"], [10, 0, "4"],
    [0, 1, "4"], [1, 1, "4"], [9, 1, "4"],
    [0, 6, "4"], [9, 6, "4"],
    [0, 7, "2"], [9, 7, "2"],
    [1, 8, "2"], [8, 8, "2"],
    [1, 10, "6"],
  ],
  right: [
    [1, 0, "4"], [2, 0, "4"], [10, 0, "4"],
    [2, 1, "4"], [10, 1, "4"], [11, 1, "4"],
    [2, 6, "4"], [11, 6, "4"],
    [2, 7, "2"], [11, 7, "2"],
    [3, 8, "2"], [10, 8, "2"],
    [10, 10, "6"],
  ],
});

export const SCRIBE_FRAMES = createCharacterVariantFrames(BASE_CHARACTER_FRAMES, {
  down: [
    [2, 0, "3"], [3, 0, "3"], [8, 0, "3"], [9, 0, "3"],
    [1, 1, "3"], [10, 1, "3"],
    [0, 2, "3"], [11, 2, "3"],
    [0, 6, "2"], [11, 6, "2"],
    [0, 7, "2"], [11, 7, "2"],
    [1, 8, "4"], [10, 8, "4"],
    [1, 10, "6"], [10, 10, "6"],
  ],
  up: [
    [2, 0, "3"], [3, 0, "3"], [8, 0, "3"], [9, 0, "3"],
    [1, 1, "3"], [10, 1, "3"],
    [0, 2, "3"], [11, 2, "3"],
    [0, 6, "2"], [11, 6, "2"],
    [0, 7, "2"], [11, 7, "2"],
    [1, 8, "4"], [10, 8, "4"],
    [1, 10, "6"], [10, 10, "6"],
  ],
  left: [
    [1, 0, "3"], [2, 0, "3"], [8, 0, "3"], [9, 0, "3"],
    [0, 1, "3"], [1, 1, "3"], [8, 1, "3"],
    [0, 6, "2"], [9, 6, "2"],
    [0, 7, "2"], [9, 7, "2"],
    [1, 8, "4"], [8, 8, "4"],
    [1, 10, "6"],
  ],
  right: [
    [2, 0, "3"], [3, 0, "3"], [9, 0, "3"], [10, 0, "3"],
    [3, 1, "3"], [10, 1, "3"], [11, 1, "3"],
    [2, 6, "2"], [11, 6, "2"],
    [2, 7, "2"], [11, 7, "2"],
    [3, 8, "4"], [10, 8, "4"],
    [10, 10, "6"],
  ],
});

const playerArt = buildCharacterArt(PLAYER_STYLE, PLAYER_FRAMES);
const mentorArt = buildCharacterArt(NPC_STYLES.mentor, MENTOR_FRAMES);
const coachArt = buildCharacterArt(NPC_STYLES.coach, COACH_FRAMES);
const sageArt = buildCharacterArt(NPC_STYLES.sage, SAGE_FRAMES);
const scoutArt = buildCharacterArt(NPC_STYLES.scout, SCOUT_FRAMES);
const scribeArt = buildCharacterArt(NPC_STYLES.scribe, SCRIBE_FRAMES);

export const PLAYER_PALETTE = playerArt.palette;
export const PLAYER_FRAMESET = playerArt.frames;
export const MENTOR_PALETTE = mentorArt.palette;
export const MENTOR_FRAMESET = mentorArt.frames;
export const COACH_PALETTE = coachArt.palette;
export const COACH_FRAMESET = coachArt.frames;
export const SAGE_PALETTE = sageArt.palette;
export const SAGE_FRAMESET = sageArt.frames;
export const SCOUT_PALETTE = scoutArt.palette;
export const SCOUT_FRAMESET = scoutArt.frames;
export const SCRIBE_PALETTE = scribeArt.palette;
export const SCRIBE_FRAMESET = scribeArt.frames;

// Overworld map layouts. Each row string is a tile row.
export const MAPS = {
  house: createMap({
    name: "Home Row House",
    theme: "house",
    rows: [
      "####################",
      "#..................#",
      "#....K..........S..#",
      "#..................#",
      "#..H...........L...#",
      "#..................#",
      "#.......B..........#",
      "#..................#",
      "#....J.............#",
      "#..................#",
      "#.........E........#",
      "#..................#",
      "#..................#",
      "####################",
    ],
  }),
  meadow: createMap({
    name: "Word Meadow",
    theme: "meadow",
    rows: [
      "####################",
      "#D==S======,,,,....#",
      "#....==.....,,,,...#",
      "#....####....==....#",
      "#....#..#...M==....#",
      "#....#..#.....=....#",
      "#....####....,,,,..#",
      "#.........=====....#",
      "#..,,,,........=...#",
      "#..,,,,.....S..=...#",
      "#...............==R#",
      "#..................#",
      "#..................#",
      "####################",
    ],
  }),
  ridge: createMap({
    name: "Line Ridge",
    theme: "ridge",
    rows: [
      "####################",
      "#R===..............#",
      "#...==S............#",
      "#....=======.......#",
      "#..,,,,......,,,,..#",
      "#......===.........#",
      "#....######...===..#",
      "#............==....#",
      "#.........C===.....#",
      "#..................#",
      "#.....S............#",
      "#...............==T#",
      "#..................#",
      "####################",
    ],
  }),
  grove: createMap({
    name: "Count Grove",
    theme: "grove",
    rows: [
      "####################",
      "#R==...............#",
      "#..===......,,,,...#",
      "#....===....,,,,...#",
      "#......S...........#",
      "#..........V==.....#",
      "#.............==...#",
      "#..,,,,........==..#",
      "#..,,,,..........=.#",
      "#........S........=#",
      "#................=T#",
      "#..................#",
      "#..................#",
      "####################",
    ],
  }),
  fen: createMap({
    name: "Finder Fen",
    theme: "fen",
    rows: [
      "####################",
      "#R==.......,,,,....#",
      "#..==......,,,,....#",
      "#...===.....==.....#",
      "#.....S.....==.....#",
      "#....,,,,...N==....#",
      "#....,,,,.....=....#",
      "#......===....=....#",
      "#..Y......===.=....#",
      "#.........S...==...#",
      "#.................T#",
      "#..................#",
      "#..................#",
      "####################",
    ],
  }),
  studio: createMap({
    name: "Operator Studio",
    theme: "studio",
    rows: [
      "####################",
      "#R===..............#",
      "#..S==.............#",
      "#....===....####...#",
      "#.....,,,,...==....#",
      "#....Q==......=....#",
      "#......=.......=...#",
      "#..Y...=....###==..#",
      "#......=.........=.#",
      "#....S.===.......=.#",
      "#.................T#",
      "#..................#",
      "#..................#",
      "####################",
    ],
  }),
  tower: createMap({
    name: "Macro Tower",
    theme: "tower",
    rows: [
      "####################",
      "#T==...............#",
      "#..==..............#",
      "#....####...===....#",
      "#...........=......#",
      "#.........S.=......#",
      "#...........=......#",
      "#..######...=......#",
      "#...........===....#",
      "#..............X...#",
      "#..................#",
      "#..................#",
      "#..................#",
      "####################",
    ],
  }),
};

// Maps that randomize obstacles between runs.
export const RANDOMIZATION_RULES = {
  meadow: {
    start: { x: 1, y: 1 },
    markers: ["M", "R"],
    maxBlocks: 9,
  },
  ridge: {
    start: { x: 1, y: 1 },
    markers: ["C", "R", "T"],
    maxBlocks: 10,
  },
  grove: {
    start: { x: 1, y: 1 },
    markers: ["V", "R", "T"],
    maxBlocks: 11,
  },
  fen: {
    start: { x: 1, y: 1 },
    markers: ["N", "R", "T", "Y"],
    maxBlocks: 10,
  },
  studio: {
    start: { x: 1, y: 1 },
    markers: ["Q", "R", "T", "Y"],
    maxBlocks: 10,
  },
  tower: {
    start: { x: 1, y: 1 },
    markers: ["X", "T"],
    maxBlocks: 9,
  },
};
