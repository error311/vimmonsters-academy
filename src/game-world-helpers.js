// Owns: house-route helpers, map/tile queries, and small world-coordinate
// utilities shared by scenes, progression, and overworld logic.

export function createGameWorldHelpers(deps) {
  const {
    state,
    maps,
    species,
    cellKey,
    screenWidth,
    tileSize,
    viewTop,
    viewHeight,
  } = deps;

  function shortSeed() {
    return String(state.runSeed).slice(-6);
  }

  function houseStageIndex() {
    if (!state.flags.runeH) {
      return 0;
    }
    if (!state.flags.runeJ) {
      return 1;
    }
    if (!state.flags.runeK) {
      return 2;
    }
    if (!state.flags.runeL) {
      return 3;
    }
    return 4;
  }

  function currentHouseTargetLabel() {
    return ["H rune", "J rune", "K rune", "L rune", "exit door"][houseStageIndex()];
  }

  function houseRouteKeys(stage) {
    const keys = new Set();
    for (let index = 0; index <= stage; index += 1) {
      ((state.houseLesson && state.houseLesson.segments[index]) || []).forEach((key) => {
        keys.add(key);
      });
    }
    return keys;
  }

  function houseCurrentSegmentKeys(stage) {
    return new Set(
      ((state.houseLesson && state.houseLesson.segments[Math.min(stage, state.houseLesson.segments.length - 1)]) || [])
    );
  }

  function housePathTone(x, y) {
    if (state.map !== "house") {
      return "normal";
    }
    const key = cellKey(x, y);
    const stage = houseStageIndex();
    const active = houseCurrentSegmentKeys(stage);
    const cleared = houseRouteKeys(stage - 1);
    if (active.has(key) && !state.houseTrailVisited.includes(key)) {
      return "active";
    }
    if (active.has(key) || cleared.has(key) || state.houseTrailVisited.includes(key)) {
      return "cleared";
    }
    return "future";
  }

  function markHouseTrailPosition(x, y) {
    if (state.map !== "house") {
      return;
    }
    const key = cellKey(x, y);
    const allowed = houseRouteKeys(houseStageIndex());
    if (!allowed.has(key) && !state.houseTrailVisited.includes(key)) {
      return;
    }
    if (!state.houseTrailVisited.includes(key)) {
      state.houseTrailVisited.push(key);
    }
  }

  function mapRows(mapName) {
    if (state.randomizedMaps && state.randomizedMaps[mapName]) {
      return state.randomizedMaps[mapName];
    }
    return maps[mapName].rows;
  }

  function tileAt(mapName, x, y) {
    const rows = mapRows(mapName);
    if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) {
      return "#";
    }
    return rows[y][x];
  }

  function isWalkable(tile) {
    return ".,=HJKLEDRT".includes(tile);
  }

  function isGateTile(tile) {
    return "EDRT".includes(tile);
  }

  function mapOffset() {
    const rows = mapRows(state.map);
    return {
      x: Math.floor((screenWidth - rows[0].length * tileSize) / 2),
      y: viewTop + Math.floor((viewHeight - rows.length * tileSize) / 2),
    };
  }

  function directionVector(direction) {
    if (direction === "left") {
      return { dx: -1, dy: 0 };
    }
    if (direction === "right") {
      return { dx: 1, dy: 0 };
    }
    if (direction === "up") {
      return { dx: 0, dy: -1 };
    }
    return { dx: 0, dy: 1 };
  }

  function reverseDirection(direction) {
    if (direction === "left") {
      return "right";
    }
    if (direction === "right") {
      return "left";
    }
    if (direction === "up") {
      return "down";
    }
    return "up";
  }

  function monsterPalette(id) {
    return species[id].palette;
  }

  return {
    shortSeed,
    houseStageIndex,
    currentHouseTargetLabel,
    houseRouteKeys,
    houseCurrentSegmentKeys,
    housePathTone,
    markHouseTrailPosition,
    mapRows,
    tileAt,
    isWalkable,
    isGateTile,
    mapOffset,
    directionVector,
    reverseDirection,
    monsterPalette,
  };
}
