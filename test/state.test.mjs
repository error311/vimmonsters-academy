import assert from "node:assert/strict";
import test from "node:test";

import { MAPS, RANDOMIZATION_RULES } from "../src/content.js";
import {
  buildHouseLesson,
  buildRandomizedMaps,
  cloneMonster,
  createDefaultState,
  createMonster,
} from "../src/state.js";
import { canReachRequiredTargets, installMockGlobals } from "./helpers/runtime-fixtures.mjs";

test("buildHouseLesson is stable for the same seed", () => {
  const first = buildHouseLesson(12345);
  const second = buildHouseLesson(12345);

  assert.deepEqual(second, first);
  assert.equal(first.order.join(""), "HJKL");
  assert.equal(first.rows[first.exit.y][first.exit.x], "E");
  assert.equal(first.segments.length, 5);
});

test("buildRandomizedMaps preserves the provided house rows and reachable targets", () => {
  const house = buildHouseLesson(67890);
  const randomized = buildRandomizedMaps(67890, house.rows);

  assert.deepEqual(randomized.house, house.rows);

  Object.keys(RANDOMIZATION_RULES).forEach((mapName) => {
    assert.equal(randomized[mapName].length, MAPS[mapName].rows.length);
    assert.equal(canReachRequiredTargets(mapName, randomized[mapName]), true, `${mapName} should keep required targets reachable`);
  });
});

test("createDefaultState uses provided meta and deterministic run timestamps", (t) => {
  const globals = installMockGlobals({ dateNow: 1_750_000_000_000 });
  t.after(() => globals.restore());

  const state = createDefaultState(4242, {
    bestScore: 900,
    bestTimeMs: 54_000,
    leaderboard: [{ id: "run-1", name: "ace", score: 900, timeMs: 54_000, seed: 4242 }],
  });

  assert.equal(state.runId, "run-1750000000000-4242");
  assert.equal(state.runStartedAt, 1_750_000_000_000);
  assert.equal(state.bestScore, 900);
  assert.equal(state.bestTimeMs, 54_000);
  assert.deepEqual(state.leaderboard, [{ id: "run-1", name: "ace", score: 900, timeMs: 54_000, seed: 4242 }]);
  assert.deepEqual(state.houseTrailVisited, [`${state.houseLesson.start.x},${state.houseLesson.start.y}`]);
  assert.equal(state.followerTrail.length, 4);
});

test("cloneMonster returns a detached copy", () => {
  const original = createMonster("sproutle", 7);
  const cloned = cloneMonster(original);

  cloned.hp = 1;
  cloned.attack += 10;

  assert.notStrictEqual(cloned, original);
  assert.equal(original.hp, original.maxHp);
  assert.notEqual(cloned.attack, original.attack);
});
