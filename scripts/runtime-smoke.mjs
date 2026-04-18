import {
  MAPS,
  SPECIES,
  MONSTER_FRAMES,
  WORLD_COLORS,
  SCOUT_FRAMES,
  SCRIBE_FRAMES,
  SCOUT_PALETTE,
  SCRIBE_PALETTE,
} from "../src/content.js";
import { createDefaultState, createMonster, formatDuration } from "../src/state.js";
import { hydrateDrill, createLessonDrill } from "../src/drills.js";
import { createDrillRuntime } from "../src/drill-runtime.js";
import { createBattleRuntime } from "../src/battle.js";
import { createInputRuntime } from "../src/input.js";
import { createScenes } from "../src/scenes.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeCtx() {
  return {
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillText() {},
    clearRect() {},
    translate() {},
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillStyle: "#000000",
  };
}

function noOp() {}

const state = createDefaultState(12345, {
  bestScore: 900,
  bestTimeMs: 58000,
  leaderboard: [],
});
const ctx = makeCtx();

function parseActionKey(key) {
  const match = String(key).match(/^([1-9][0-9]*)([hjklwbe])$/);
  if (!match) {
    return { key, count: 1 };
  }
  return {
    key: match[2],
    count: Number(match[1]),
  };
}

function setMessage(message, portrait) {
  state.message = message;
  state.portrait = portrait || "player";
}

function setFx(kind, target, duration, options) {
  state.fx = Object.assign({
    kind,
    target,
    startedAt: 0,
    endAt: duration,
    persistent: false,
  }, options || {});
}

function activeMonster() {
  return state.party[state.activeIndex];
}

function mapRows(mapName) {
  return MAPS[mapName].rows;
}

function mapOffset() {
  return { x: 120, y: 60 };
}

function monsterPalette(id) {
  return SPECIES[id].palette;
}

function elapsedMs() {
  return 42000;
}

function shortSeed() {
  return String(state.runSeed).slice(-6);
}

function houseStageIndex() {
  return 0;
}

function housePathTone() {
  return "active";
}

function objectiveText() {
  return "Smoke objective";
}

function controlHintText() {
  return "Smoke hint";
}

function treeSections() {
  return [
    { title: "Lesson", items: ["Smoke"] },
    { title: "Party", items: state.party.map((monster) => monster.name) },
  ];
}

function currentDrillStep() {
  return state.drill ? state.drill.steps[state.drill.stepIndex] || null : null;
}

function checkMilestones() {}

function startEncounterTransition(enemy) {
  state.transition = {
    type: "encounter",
    enemy,
    startedAt: 0,
    duration: 500,
  };
}

const shared = {
  ctx,
  state,
  maps: MAPS,
  species: SPECIES,
  colors: WORLD_COLORS,
  screenWidth: 960,
  screenHeight: 720,
  tileSize: 36,
  viewHeight: 510,
  dialogueY: 520,
  playerFrames: { down: [[]], up: [[]], left: [[]], right: [[]] },
  mentorFrames: { down: [[]], up: [[]], left: [[]], right: [[]] },
  coachFrames: { down: [[]], up: [[]], left: [[]], right: [[]] },
  sageFrames: { down: [[]], up: [[]], left: [[]], right: [[]] },
  scoutFrames: SCOUT_FRAMES,
  scribeFrames: SCRIBE_FRAMES,
  playerPalette: {},
  monsterFrames: MONSTER_FRAMES,
  mentorPalette: {},
  coachPalette: {},
  sagePalette: {},
  scoutPalette: SCOUT_PALETTE,
  scribePalette: SCRIBE_PALETTE,
  drawRect: noOp,
  drawGradientRect: noOp,
  drawEllipse: noOp,
  drawText: noOp,
  fittedText(text) {
    return text;
  },
  wrappedLines(text) {
    return [String(text)];
  },
  drawWrapped: noOp,
  drawOutlinedSprite: noOp,
  drawBitmap() {
    return false;
  },
  drawBitmapFrame() {
    return false;
  },
  frameAt(frames) {
    return frames[0];
  },
  bitmapAssets: {
    trainerOrder: ["down", "left", "right", "up"],
    trainers: {},
    monsters: {},
    ui: {},
  },
  activeMonster,
  elapsedMs,
  formatDuration,
  shortSeed,
  houseStageIndex,
  housePathTone,
  mapRows,
  mapOffset,
  monsterPalette,
  objectiveText,
  controlHintText,
  treeSections,
  currentDrillStep,
  hydrateDrill,
  startBattle() {},
  parseActionKey,
  setMessage,
  setFx,
  checkMilestones,
  startEncounterTransition,
  createMonster,
  playSound() {},
  controlUnlocked() {
    return true;
  },
};

const drillRuntime = createDrillRuntime(shared);
const battleRuntime = createBattleRuntime(shared);
const inputRuntime = createInputRuntime(shared);
const scenes = createScenes(shared);

assert(inputRuntime.normalizeKey(";") === ";", "Plain ; should stay ; for find-repeat.");
assert(inputRuntime.normalizeKey(",") === ",", "Plain , should stay , for reverse find-repeat.");
assert(inputRuntime.normalizeKey(":") === ":", "Shift+; should stay : for command mode.");

state.mode = "drill";
state.drill = hydrateDrill(createLessonDrill("meadow"));
["w", "e", "b", "g", "e", "2", "w", "j"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
drillRuntime.handleDrillKey("i");
for (const key of "fast") {
  drillRuntime.handleDrillInsertKey({ key, preventDefault() {} });
}
drillRuntime.handleDrillInsertKey({ key: "Escape", preventDefault() {} });
drillRuntime.handleDrillKey(":");
drillRuntime.handleDrillPromptKey({ key: "q", preventDefault() {} });
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
assert(state.flags.usedE && state.flags.usedGe, "Meadow drill did not unlock e/ge.");

state.mode = "drill";
state.drill = hydrateDrill(createLessonDrill("ridge"));
["$", "0", "2", "j", "2", "k", "j", "^", "w", "x", "j"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
drillRuntime.handleDrillKey(":");
drillRuntime.handleDrillPromptKey({ key: "q", preventDefault() {} });
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
assert(state.flags.usedX, "Ridge drill did not unlock x.");

state.mode = "drill";
state.drill = hydrateDrill(createLessonDrill("grove"));
["3", "w", "3", "b", "j", "d", "d", "j", "3", "w", "c", "w"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
for (const key of "clean") {
  drillRuntime.handleDrillInsertKey({ key, preventDefault() {} });
}
drillRuntime.handleDrillInsertKey({ key: "Escape", preventDefault() {} });
["2", "j"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
drillRuntime.handleDrillKey(":");
drillRuntime.handleDrillPromptKey({ key: "q", preventDefault() {} });
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
assert(state.flags.usedDd && state.flags.usedCw, "Grove drill did not unlock dd/cw.");

state.mode = "drill";
state.drill = hydrateDrill(createLessonDrill("fen"));
["f", "m", "t", "e", "F", "f", "j", "t", "f", "T", "t"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
drillRuntime.handleDrillKey(":");
drillRuntime.handleDrillPromptKey({ key: "q", preventDefault() {} });
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
state.mode = "drill";
state.drill = hydrateDrill({
  id: "repeat-find",
  title: "Repeat Find",
  kind: "prose",
  lines: ["rare rune river reeds"],
  cursor: { row: 0, col: 0 },
  steps: [
    { type: "motion", expect: "fr", target: { row: 0, col: 2 }, instruction: "Initial find." },
    { type: "motion", expect: ";", target: { row: 0, col: 5 }, instruction: "Repeat forward find." },
    { type: "motion", expect: ",", target: { row: 0, col: 2 }, instruction: "Repeat backward find." },
  ],
  stepIndex: 0,
  input: "",
  mode: "normal",
  countBuffer: "",
  pendingPrefix: "",
  feedback: "Use repeat-find keys.",
  feedbackTone: "hint",
  bannerUntil: 0,
  promptPrefix: "",
  promptText: "",
});
["f", "r", ";", ","].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
assert(state.mode === "overworld" && state.drill === null, "Find repeat with ; and , did not complete the custom repeat drill.");
assert(
  state.flags.usedFindForward && state.flags.usedTillForward && state.flags.usedFindBackward && state.flags.usedTillBackward,
  "Fen drill did not unlock find motions."
);

state.mode = "drill";
state.drill = hydrateDrill(createLessonDrill("studio"));
["2", "w", "c", "i", "w"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
for (const key of "word") {
  drillRuntime.handleDrillInsertKey({ key, preventDefault() {} });
}
drillRuntime.handleDrillInsertKey({ key: "Escape", preventDefault() {} });
["j", "2", "b", "d", "w", "j"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
drillRuntime.handleDrillKey(":");
drillRuntime.handleDrillPromptKey({ key: "q", preventDefault() {} });
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
assert(state.flags.usedDw && state.flags.usedCiw, "Studio drill did not unlock dw/ciw.");

state.mode = "battle";
state.vimOrbs = 5;
state.battle = {
  enemy: createMonster("fizzbat", 6),
  isBoss: false,
  result: null,
  throwResult: null,
  pendingEnemyTurn: null,
  pendingTechnique: "",
  focusedVimOrb: false,
  enemyStatus: { guard: 0, evade: 0, marked: 0, rooted: 0, bleed: 0 },
  playerStatus: { guard: 0, evade: 0, marked: 0, rooted: 0, bleed: 0 },
  enemyCooldowns: {},
  turn: 1,
  lastEnemyMove: "",
  lastPlayerTechnique: "",
  challenge: null,
};

function playChallengeStep(expect) {
  for (const key of expect) {
    battleRuntime.handleBattleKey(key);
  }
}

battleRuntime.handleBattleKey("a");
assert(state.battle.challenge, "Attack did not start a battle drill.");
while (state.battle.challenge) {
  playChallengeStep(state.battle.challenge.steps[state.battle.challenge.stepIndex].expect);
}
assert(state.battle.pendingEnemyTurn || state.battle.result || state.battle.enemy.hp < state.battle.enemy.maxHp, "Attack drill did not resolve.");
state.battle.pendingEnemyTurn = null;

battleRuntime.handleBattleKey("x");
state.battle.pendingEnemyTurn = null;
battleRuntime.handleBattleKey("c");
battleRuntime.handleBattleKey("w");
assert(state.battle.focusedVimOrb, "cw did not prime Focus Ball.");
state.battle.pendingEnemyTurn = null;
battleRuntime.handleBattleKey("d");
battleRuntime.handleBattleKey("d");
assert(state.battle.challenge, "dd did not start a slam drill.");
while (state.battle.challenge) {
  playChallengeStep(state.battle.challenge.steps[state.battle.challenge.stepIndex].expect);
}
assert(state.battle.lastPlayerTechnique === "slam", "dd drill did not resolve into Heavy Slam.");
state.battle.pendingEnemyTurn = null;
battleRuntime.handleBattleKey("d");
battleRuntime.handleBattleKey("w");
assert(state.battle.lastPlayerTechnique === "break", "dw did not trigger Break Word.");
state.battle.pendingEnemyTurn = null;
state.battle.result = null;
state.battle.enemy = createMonster("fizzbat", 7);
battleRuntime.handleBattleKey("c");
battleRuntime.handleBattleKey("i");
battleRuntime.handleBattleKey("w");
assert(state.battle.lastPlayerTechnique === "inner" || state.battle.focusedVimOrb, "ciw did not resolve.");
state.battle.pendingEnemyTurn = null;
state.battle.result = null;
battleRuntime.handleBattleKey("f");
assert(state.battle.challenge, "Throw did not start a find drill.");
while (state.battle.challenge) {
  playChallengeStep(state.battle.challenge.steps[state.battle.challenge.stepIndex].expect);
}
assert(state.battle.throwResult, "Battle find drill did not queue a VimOrb throw.");

scenes.drawRunStrip();
scenes.drawOverworld(0);
scenes.drawBattle(0);
scenes.drawDialogue(0);

state.mode = "drill";
state.drill = hydrateDrill(createLessonDrill("tower"));
["g", "g", "j", "4", "w"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
drillRuntime.handleDrillKey("i");
for (const key of "bonus") {
  drillRuntime.handleDrillInsertKey({ key, preventDefault() {} });
}
drillRuntime.handleDrillInsertKey({ key: "Escape", preventDefault() {} });
drillRuntime.handleDrillKey("/");
for (const key of "worstScore") {
  drillRuntime.handleDrillPromptKey({ key, preventDefault() {} });
}
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
drillRuntime.handleDrillKey(":");
for (const key of "s/worstScore/bestScore/") {
  drillRuntime.handleDrillPromptKey({ key, preventDefault() {} });
}
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
["G", "4", "k", "2", "w"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
drillRuntime.handleDrillKey("i");
for (const key of "score") {
  drillRuntime.handleDrillInsertKey({ key, preventDefault() {} });
}
drillRuntime.handleDrillInsertKey({ key: "Escape", preventDefault() {} });
drillRuntime.handleDrillKey(":");
for (const key of "%s/total/runTotal/g") {
  drillRuntime.handleDrillPromptKey({ key, preventDefault() {} });
}
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
["G", "2", "k"].forEach((key) => {
  drillRuntime.handleDrillKey(key);
});
scenes.drawDrillOverlay(0);
assert(state.drill.mode === "prompt", "Tower macro setup did not enter prompt mode.");
for (const key of "qqxjq") {
  drillRuntime.handleDrillPromptKey({ key, preventDefault() {} });
}
scenes.drawDrillOverlay(0);
for (const key of "2@q") {
  drillRuntime.handleDrillPromptKey({ key, preventDefault() {} });
}
scenes.drawDrillOverlay(0);
drillRuntime.handleDrillPromptKey({ key: "q", preventDefault() {} });
drillRuntime.handleDrillPromptKey({ key: "Enter", preventDefault() {} });
assert(state.flags.towerDrillCleared, "Tower drill did not clear through the macro sequence.");
state.map = "fen";
scenes.drawOverworld(0);
state.map = "studio";
scenes.drawOverworld(0);

process.stdout.write("runtime smoke passed\n");
