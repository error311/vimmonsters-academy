import assert from "node:assert/strict";
import test from "node:test";

import { MAPS } from "../src/content.js";
import { createGameWorldHelpers } from "../src/game-world-helpers.js";
import { cellKey } from "../src/state.js";
import { createState } from "./helpers/runtime-fixtures.mjs";

function makeHelpers(state) {
  return createGameWorldHelpers({
    state,
    maps: MAPS,
    species: {
      pebbLit: { palette: { "1": "#111111" } },
    },
    cellKey,
    screenWidth: 960,
    tileSize: 36,
    viewTop: 28,
    viewHeight: 510,
  });
}

test("house helpers track route stage and target label", () => {
  const state = createState(12345);
  const helpers = makeHelpers(state);

  assert.equal(helpers.houseStageIndex(), 0);
  assert.equal(helpers.currentHouseTargetLabel(), "H rune");

  state.flags.runeH = true;
  state.flags.runeJ = true;
  assert.equal(helpers.houseStageIndex(), 2);
  assert.equal(helpers.currentHouseTargetLabel(), "K rune");
});

test("housePathTone and markHouseTrailPosition respect the current lesson route", () => {
  const state = createState(12345);
  const helpers = makeHelpers(state);
  const firstStepKey = state.houseLesson.segments[0][0];
  const [x, y] = firstStepKey.split(",").map(Number);

  assert.equal(helpers.housePathTone(x, y), "active");
  helpers.markHouseTrailPosition(x, y);
  assert.equal(state.houseTrailVisited.includes(firstStepKey), true);
  assert.equal(helpers.housePathTone(x, y), "cleared");
});

test("map and tile helpers use randomized rows when present", () => {
  const state = createState(12345);
  const helpers = makeHelpers(state);

  assert.deepEqual(helpers.mapRows("house"), state.houseLesson.rows);
  assert.equal(helpers.tileAt("house", -1, -1), "#");
  assert.equal(typeof helpers.mapOffset().x, "number");
  assert.equal(typeof helpers.mapOffset().y, "number");
});

test("direction and tile helpers keep world movement rules stable", () => {
  const state = createState(12345);
  const helpers = makeHelpers(state);

  assert.deepEqual(helpers.directionVector("left"), { dx: -1, dy: 0 });
  assert.deepEqual(helpers.directionVector("up"), { dx: 0, dy: -1 });
  assert.equal(helpers.reverseDirection("left"), "right");
  assert.equal(helpers.isWalkable("."), true);
  assert.equal(helpers.isGateTile("E"), true);
  assert.equal(helpers.isWalkable("#"), false);
});

test("monsterPalette reads species palette data", () => {
  const state = createState(12345);
  const helpers = makeHelpers(state);

  assert.deepEqual(helpers.monsterPalette("pebbLit"), { "1": "#111111" });
  assert.equal(helpers.shortSeed(), String(state.runSeed).slice(-6));
});
