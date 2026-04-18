import { MAPS, RANDOMIZATION_RULES, SPECIES, STARTER_VIMMONSTER_IDS } from "./content.js";

// Shared run/state helpers used by the engine.

export function cellKey(x, y) {
  return `${x},${y}`;
}

export function randomSeed() {
  return Math.floor(Math.random() * 2147483647);
}

function makeRng(seed) {
  let value = seed >>> 0;
  return function () {
    value += 0x6d2b79f5;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const items = list.slice();
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const temp = items[index];
    items[index] = items[swapIndex];
    items[swapIndex] = temp;
  }
  return items;
}

function rowsToGrid(rows) {
  return rows.map((row) => row.split(""));
}

function gridToRows(grid) {
  return grid.map((row) => row.join(""));
}

function localWalkable(tile) {
  return ".,=HJKLEDRTB".includes(tile);
}

function findTiles(rows, marker) {
  const points = [];
  rows.forEach((row, y) => {
    row.split("").forEach((tile, x) => {
      if (tile === marker) {
        points.push({ x, y });
      }
    });
  });
  return points;
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

function requiredTargetsForMap(mapName, rows) {
  const rule = RANDOMIZATION_RULES[mapName];
  if (!rule) {
    return [];
  }
  const cells = [{ x: rule.start.x, y: rule.start.y }];
  rule.markers.forEach((marker) => {
    if ("MCVSXNQY".includes(marker)) {
      cells.push(...interactionTargets(rows, marker));
    } else {
      cells.push(...findTiles(rows, marker));
    }
  });
  return dedupeCells(cells);
}

function canReachTargets(rows, mapName) {
  const rule = RANDOMIZATION_RULES[mapName];
  if (!rule) {
    return true;
  }
  const start = rule.start;
  const targets = requiredTargetsForMap(mapName, rows);
  const queue = [start];
  const seen = new Set([cellKey(start.x, start.y)]);

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

  return targets.every((target) => seen.has(cellKey(target.x, target.y)));
}

export function buildHouseLesson(seed) {
  const rng = makeRng(seed ^ 0x51f15e);
  const width = 20;
  const height = 14;
  const start = { x: 9, y: 11 };
  const exit = { x: 9, y: 10 };
  const sign = { x: 16, y: 2 };
  const bed = { x: 6, y: 6 };
  const grid = Array.from({ length: height }, (_, y) => {
    return Array.from({ length: width }, (_, x) => {
      return x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "#" : ".";
    });
  });

  const letterPositions = shuffle([
    { x: 3, y: 2 },
    { x: 6, y: 3 },
    { x: 12, y: 2 },
    { x: 15, y: 4 },
    { x: 4, y: 8 },
    { x: 8, y: 9 },
    { x: 13, y: 8 },
    { x: 15, y: 10 },
  ], rng).slice(0, 4);

  const blockedPathCells = new Set([
    cellKey(sign.x, sign.y),
    cellKey(bed.x, bed.y),
  ]);

  function carvePath(from, to) {
    const cells = [];
    const queue = [{ x: from.x, y: from.y }];
    const parents = new Map([[cellKey(from.x, from.y), null]]);
    const directions = shuffle([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ], rng);

    while (queue.length) {
      const current = queue.shift();
      if (current.x === to.x && current.y === to.y) {
        break;
      }
      directions.forEach(([dx, dy]) => {
        const nextX = current.x + dx;
        const nextY = current.y + dy;
        if (nextX <= 0 || nextY <= 0 || nextX >= width - 1 || nextY >= height - 1) {
          return;
        }
        const key = cellKey(nextX, nextY);
        if (parents.has(key)) {
          return;
        }
        if (blockedPathCells.has(key) && !(nextX === to.x && nextY === to.y)) {
          return;
        }
        parents.set(key, current);
        queue.push({ x: nextX, y: nextY });
      });
    }

    let cursor = { x: to.x, y: to.y };
    const targetKey = cellKey(to.x, to.y);
    if (!parents.has(targetKey)) {
      return cells;
    }
    while (cursor && !(cursor.x === from.x && cursor.y === from.y)) {
      cells.unshift({ x: cursor.x, y: cursor.y });
      cursor = parents.get(cellKey(cursor.x, cursor.y));
    }
    return cells;
  }

  const letters = ["H", "J", "K", "L"];
  const targets = {};
  letters.forEach((letter, index) => {
    targets[letter] = letterPositions[index];
  });

  const stops = [start, targets.H, targets.J, targets.K, targets.L, exit];
  const segments = [];
  for (let index = 0; index < stops.length - 1; index += 1) {
    const path = carvePath(stops[index], stops[index + 1]);
    segments.push(path.map((cell) => cellKey(cell.x, cell.y)));
    path.forEach((cell) => {
      if (grid[cell.y][cell.x] === ".") {
        grid[cell.y][cell.x] = "=";
      }
    });
  }

  grid[sign.y][sign.x] = "S";
  grid[bed.y][bed.x] = "B";
  grid[exit.y][exit.x] = "E";
  letters.forEach((letter) => {
    const point = targets[letter];
    grid[point.y][point.x] = letter;
  });

  return {
    rows: gridToRows(grid),
    start,
    exit,
    sign,
    bed,
    targets,
    segments,
    order: letters,
  };
}

export function buildRandomizedMaps(seed, houseRows) {
  const randomized = {};
  const rng = makeRng(seed);

  Object.keys(MAPS).forEach((mapName) => {
    randomized[mapName] = mapName === "house" && houseRows ? houseRows.slice() : MAPS[mapName].rows.slice();
    if (mapName === "house") {
      return;
    }
    const rule = RANDOMIZATION_RULES[mapName];
    if (!rule) {
      return;
    }

    const grid = rowsToGrid(MAPS[mapName].rows);
    const targets = requiredTargetsForMap(mapName, MAPS[mapName].rows);
    const reserved = new Set();

    targets.forEach((cell) => {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          reserved.add(cellKey(cell.x + dx, cell.y + dy));
        }
      }
    });

    const candidates = [];
    grid.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (!".,".includes(tile)) {
          return;
        }
        if (x < 2 || y < 2 || x > row.length - 3 || y > grid.length - 3) {
          return;
        }
        if (reserved.has(cellKey(x, y))) {
          return;
        }
        candidates.push({ x, y });
      });
    });

    let placed = 0;
    shuffle(candidates, rng).forEach((cell) => {
      if (placed >= rule.maxBlocks) {
        return;
      }
      const previous = grid[cell.y][cell.x];
      grid[cell.y][cell.x] = "#";
      if (canReachTargets(gridToRows(grid), mapName)) {
        placed += 1;
        return;
      }
      grid[cell.y][cell.x] = previous;
    });

    randomized[mapName] = gridToRows(grid);
  });

  return randomized;
}

export function loadMeta(storage, metaKey) {
  try {
    const raw = storage.getItem(metaKey);
    if (!raw) {
      return {
        bestScore: 0,
        bestTimeMs: null,
        leaderboard: [],
      };
    }
    const data = JSON.parse(raw);
    return {
      bestScore: typeof data.bestScore === "number" ? data.bestScore : 0,
      bestTimeMs: typeof data.bestTimeMs === "number" ? data.bestTimeMs : null,
      leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : [],
    };
  } catch {
    return {
      bestScore: 0,
      bestTimeMs: null,
      leaderboard: [],
    };
  }
}

export function formatDuration(ms, detailed) {
  if (!ms || ms < 0) {
    return detailed ? "00:00.0" : "00:00";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!detailed) {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export function createMonster(id, level) {
  const species = SPECIES[id];
  const maxHp = species.baseHp + level * 4;
  return {
    id,
    name: species.name,
    level,
    hp: maxHp,
    maxHp,
    attack: species.baseAttack + Math.floor(level / 2),
    xp: 0,
    nextXp: 8 + level * 2,
  };
}

export function createFollowerTrail(map, x, y, facing, depth = 4) {
  return Array.from({ length: depth }, () => ({
    map,
    x,
    y,
    facing,
  }));
}

export function createDefaultState(seed, meta) {
  const runSeed = typeof seed === "number" ? seed : randomSeed();
  const resolvedMeta = meta || {
    bestScore: 0,
    bestTimeMs: null,
    leaderboard: [],
  };
  const houseLesson = buildHouseLesson(runSeed);
  return {
    map: "house",
    x: 9,
    y: 11,
    facing: "up",
    lastMoveAt: 0,
    stepFrame: 0,
    mode: "overworld",
    message:
      "Follow the marked lesson path to H, then J, then K, then L. Leaving the route costs score.",
    portrait: "player",
    vimOrbs: 0,
    score: 0,
    bestScore: resolvedMeta.bestScore,
    bestTimeMs: resolvedMeta.bestTimeMs,
    leaderboard: resolvedMeta.leaderboard,
    runId: `run-${Date.now()}-${runSeed}`,
    runToken: "",
    runName: "anon",
    runSeed,
    runStartedAt: Date.now(),
    finishedAt: null,
    runComplete: false,
    runLogged: false,
    activeIndex: 0,
    party: [createMonster("pebbLit", 5)],
    starterSelect: {
      open: false,
      selected: 0,
      options: STARTER_VIMMONSTER_IDS.slice(),
    },
    battle: null,
    houseLesson,
    houseTrailVisited: [cellKey(houseLesson.start.x, houseLesson.start.y)],
    followerTrail: createFollowerTrail("house", 9, 11, "up"),
    randomizedMaps: buildRandomizedMaps(runSeed, houseLesson.rows),
    pendingPrefix: "",
    countBuffer: "",
    command: {
      active: false,
      text: "",
    },
    rename: {
      active: false,
      text: "",
    },
    drill: null,
    tree: {
      open: false,
      selected: 0,
      itemIndex: 0,
      focus: "sections",
    },
    transition: null,
    fx: null,
    lastMotion: "",
    flags: {
      runeH: false,
      runeJ: false,
      runeK: false,
      runeL: false,
      metMentor: false,
      usedW: false,
      usedB: false,
      usedE: false,
      usedGe: false,
      caughtFirst: false,
      metCoach: false,
      usedZero: false,
      usedDollar: false,
      usedX: false,
      switchedParty: false,
      metSage: false,
      usedCountWord: false,
      usedCountMove: false,
      usedDd: false,
      usedCw: false,
      metScout: false,
      usedFindForward: false,
      usedFindBackward: false,
      usedTillForward: false,
      usedTillBackward: false,
      fenCacheClaimed: false,
      metScribe: false,
      usedDw: false,
      usedCiw: false,
      studioCacheClaimed: false,
      usedGG: false,
      usedBigG: false,
      towerDrillCleared: false,
      finalWon: false,
      finalStarted: false,
      commandUnlocked: false,
      starterChosen: false,
    },
    announcements: {
      house: false,
      meadow: false,
      ridge: false,
      grove: false,
      fen: false,
      studio: false,
      tower: false,
    },
    rewards: {
      house: false,
      meadow: false,
      ridge: false,
      grove: false,
      fen: false,
      studio: false,
      tower: false,
    },
  };
}

export function cloneMonster(monster) {
  return {
    id: monster.id,
    name: monster.name,
    level: monster.level,
    hp: monster.hp,
    maxHp: monster.maxHp,
    attack: monster.attack,
    xp: monster.xp,
    nextXp: monster.nextXp,
  };
}
