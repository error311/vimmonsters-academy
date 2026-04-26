import { CONTROL_INFO, LESSONS, MAPS, RANDOMIZATION_RULES, SPECIES } from "../../src/content.js";
import { createBattleRuntime } from "../../src/battle.js";
import { createLessonDrill } from "../../src/drills.js";
import { createDrillRuntime } from "../../src/drill-runtime.js";
import { createProgressionRuntime } from "../../src/progression.js";
import {
  buildRandomizedMaps,
  cellKey,
  createDefaultState,
  createMonster,
  formatDuration,
} from "../../src/state.js";

export function installMockGlobals(options = {}) {
  const {
    randomValues = [],
    randomFallback = 0,
    dateNow = 1_710_000_000_000,
    performanceNow = 1_000,
  } = options;
  const originalRandom = Math.random;
  const originalDateNow = Date.now;
  const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, "performance");
  let nowValue = dateNow;
  let perfValue = performanceNow;
  let randomIndex = 0;

  Math.random = () => {
    if (randomIndex < randomValues.length) {
      const next = randomValues[randomIndex];
      randomIndex += 1;
      return next;
    }
    return randomFallback;
  };

  Date.now = () => nowValue;

  Object.defineProperty(globalThis, "performance", {
    configurable: true,
    value: {
      now() {
        return perfValue;
      },
    },
  });

  return {
    setDateNow(value) {
      nowValue = value;
    },
    setPerformanceNow(value) {
      perfValue = value;
    },
    restore() {
      Math.random = originalRandom;
      Date.now = originalDateNow;
      if (originalPerformance) {
        Object.defineProperty(globalThis, "performance", originalPerformance);
      } else {
        delete globalThis.performance;
      }
    },
  };
}

export function keyEvent(key) {
  return {
    key,
    preventDefault() {},
  };
}

export function createState(seed = 12345, meta = {}) {
  return createDefaultState(seed, {
    bestScore: 500,
    bestTimeMs: 67_000,
    leaderboard: [],
    ...meta,
  });
}

function currentHouseTargetLabel(state) {
  if (!state.flags.runeH) {
    return "H rune";
  }
  if (!state.flags.runeJ) {
    return "J rune";
  }
  if (!state.flags.runeK) {
    return "K rune";
  }
  if (!state.flags.runeL) {
    return "L rune";
  }
  return "exit door";
}

export function createProgressionFixture(options = {}) {
  const state = options.state || createState(options.seed);
  const runtime = createProgressionRuntime({
    state,
    lessons: LESSONS,
    controlInfo: CONTROL_INFO,
    maps: MAPS,
    formatDuration,
    elapsedMs: options.elapsedMs || (() => 42_000),
    currentHouseTargetLabel: () => currentHouseTargetLabel(state),
    activeMonster: () => state.party[state.activeIndex],
  });

  return { state, runtime };
}

export function createDrillFixture(drillId, options = {}) {
  const globals = installMockGlobals(options.globals);
  const state = options.state || createState(options.seed);
  const messages = [];
  const effects = [];
  const encounters = [];
  let milestoneChecks = 0;

  state.mode = "drill";
  state.drill = createLessonDrill(drillId);

  const runtime = createDrillRuntime({
    state,
    parseActionKey(key) {
      const match = String(key).match(/^([1-9][0-9]*)([hjklwbe])$/);
      if (!match) {
        return { key, count: 1 };
      }
      return {
        key: match[2],
        count: Number(match[1]),
      };
    },
    setMessage(message, portrait) {
      state.message = message;
      state.portrait = portrait || "player";
      messages.push({ message, portrait: state.portrait });
    },
    setFx(kind, target, duration, fxOptions) {
      effects.push({ kind, target, duration, options: fxOptions || null });
    },
    checkMilestones() {
      milestoneChecks += 1;
    },
    startEncounterTransition(enemy, isBoss) {
      encounters.push({ enemy, isBoss: Boolean(isBoss) });
    },
    createMonster,
  });

  return {
    globals,
    state,
    runtime,
    messages,
    effects,
    encounters,
    get milestoneChecks() {
      return milestoneChecks;
    },
    handleKey(key) {
      runtime.handleDrillKey(key);
    },
    handlePrompt(textOrKey) {
      const keys = Array.isArray(textOrKey) ? textOrKey : [textOrKey];
      keys.forEach((key) => {
        runtime.handleDrillPromptKey(keyEvent(key));
      });
    },
    typePrompt(text) {
      [...text].forEach((key) => {
        runtime.handleDrillPromptKey(keyEvent(key));
      });
    },
    typeInsert(text) {
      [...text].forEach((key) => {
        runtime.handleDrillInsertKey(keyEvent(key));
      });
    },
    handleInsert(key) {
      runtime.handleDrillInsertKey(keyEvent(key));
    },
  };
}

export function createBattleFixture(options = {}) {
  const globals = installMockGlobals(options.globals);
  const state = options.state || createState(options.seed);
  const messages = [];
  const effects = [];
  const sounds = [];
  let milestoneChecks = 0;

  const runtime = createBattleRuntime({
    state,
    species: SPECIES,
    createMonster,
    controlUnlocked(id) {
      if (typeof options.controlUnlocked === "function") {
        return options.controlUnlocked(id, state);
      }
      return true;
    },
    activeMonster() {
      return state.party[state.activeIndex];
    },
    setMessage(message, portrait) {
      state.message = message;
      state.portrait = portrait || "player";
      messages.push({ message, portrait: state.portrait });
    },
    setFx(kind, target, duration, fxOptions) {
      const now = performance.now();
      state.fx = {
        kind,
        target,
        startedAt: now,
        endAt: now + duration,
        persistent: Boolean(fxOptions && fxOptions.persistent),
        ...(fxOptions || {}),
      };
      effects.push({ kind, target, duration, options: fxOptions || null });
    },
    checkMilestones() {
      milestoneChecks += 1;
    },
    playSound(name) {
      sounds.push(name);
    },
  });

  return {
    globals,
    state,
    runtime,
    messages,
    effects,
    sounds,
    get milestoneChecks() {
      return milestoneChecks;
    },
  };
}

function localWalkable(tile) {
  return ".,=HJKLEDRTB".includes(tile);
}

function findTiles(rows, marker) {
  const cells = [];
  rows.forEach((row, y) => {
    row.split("").forEach((tile, x) => {
      if (tile === marker) {
        cells.push({ x, y });
      }
    });
  });
  return cells;
}

function dedupeCells(cells) {
  const seen = new Set();
  return cells.filter((cell) => {
    const key = cellKey(cell.x, cell.y);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function interactionTargets(rows, marker) {
  const cells = [];
  findTiles(rows, marker).forEach((point) => {
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dy]) => {
      const x = point.x + dx;
      const y = point.y + dy;
      if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) {
        return;
      }
      if (localWalkable(rows[y][x])) {
        cells.push({ x, y });
      }
    });
  });
  return dedupeCells(cells);
}

export function requiredTargetsForMap(mapName, rows) {
  const rule = RANDOMIZATION_RULES[mapName];
  if (!rule) {
    return [];
  }

  const cells = [{ x: rule.start.x, y: rule.start.y }];
  rule.markers.forEach((marker) => {
    if ("MCVSXNQY".includes(marker)) {
      cells.push(...interactionTargets(rows, marker));
      return;
    }
    cells.push(...findTiles(rows, marker));
  });
  return dedupeCells(cells);
}

export function canReachRequiredTargets(mapName, rows) {
  const rule = RANDOMIZATION_RULES[mapName];
  if (!rule) {
    return true;
  }

  const queue = [{ x: rule.start.x, y: rule.start.y }];
  const seen = new Set([cellKey(rule.start.x, rule.start.y)]);

  while (queue.length) {
    const current = queue.shift();
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].forEach(([dx, dy]) => {
      const x = current.x + dx;
      const y = current.y + dy;
      if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) {
        return;
      }
      if (!localWalkable(rows[y][x])) {
        return;
      }
      const key = cellKey(x, y);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      queue.push({ x, y });
    });
  }

  return requiredTargetsForMap(mapName, rows).every((target) => {
    return seen.has(cellKey(target.x, target.y));
  });
}

export function buildReachableMaps(seed = 12345) {
  const state = createState(seed);
  return buildRandomizedMaps(seed, state.houseLesson.rows);
}
