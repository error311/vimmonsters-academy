import assert from "node:assert/strict";
import test from "node:test";

import { createGameMotionRuntime } from "../src/game-motion-runtime.js";
import { createState } from "./helpers/runtime-fixtures.mjs";

function createMotionFixture(options = {}) {
  const state = options.state || createState(12345);
  const messages = [];
  const tryMoves = [];
  const dashes = [];
  const lineJumps = [];
  const fileJumps = [];
  const battleKeys = [];
  let milestoneChecks = 0;

  const runtime = createGameMotionRuntime({
    state,
    controlUnlocked(id) {
      if (typeof options.controlUnlocked === "function") {
        return options.controlUnlocked(id);
      }
      return id !== "word" ? true : Boolean(options.wordUnlocked);
    },
    setMessage(message) {
      state.message = message;
      messages.push(message);
    },
    checkMilestones() {
      milestoneChecks += 1;
    },
    handleBattleKey(key) {
      battleKeys.push(key);
    },
    tryMove(dx, dy, facing, chained) {
      tryMoves.push({ dx, dy, facing, chained });
      return options.tryMoveResult !== undefined ? options.tryMoveResult : true;
    },
    interactAhead() {
      state.message = "interacted";
    },
    dash(direction, backwards, count) {
      dashes.push({ direction, backwards, count });
    },
    lineJump(direction) {
      lineJumps.push(direction);
    },
    fileJump(direction) {
      fileJumps.push(direction);
    },
    cycleParty(delta) {
      if (typeof options.cycleParty === "function") {
        return options.cycleParty(delta);
      }
      return true;
    },
  });

  return {
    state,
    runtime,
    messages,
    tryMoves,
    dashes,
    lineJumps,
    fileJumps,
    battleKeys,
    get milestoneChecks() {
      return milestoneChecks;
    },
  };
}

test("parseActionKey preserves counts for motion keys", () => {
  const fixture = createMotionFixture();

  assert.deepEqual(fixture.runtime.parseActionKey("12h"), { key: "h", count: 12 });
  assert.deepEqual(fixture.runtime.parseActionKey("gg"), { key: "gg", count: 1 });
});

test("counted movement records the motion and marks usedCountMove", () => {
  const fixture = createMotionFixture();

  fixture.runtime.useMotion("2j", false);

  assert.equal(fixture.state.flags.usedCountMove, true);
  assert.equal(fixture.state.lastMotion, "2j");
  assert.equal(fixture.tryMoves.length, 2);
  assert.equal(fixture.milestoneChecks, 1);
});

test("locked word motions show the expected message and do not dash", () => {
  const fixture = createMotionFixture({ wordUnlocked: false });

  fixture.runtime.useMotion("w", false);

  assert.equal(fixture.dashes.length, 0);
  assert.equal(fixture.messages.at(-1), "Word motions unlock after Lesson 1, once you reach Word Meadow.");
});

test("repeat motion replays the last learned motion without overwriting it", () => {
  const fixture = createMotionFixture({ wordUnlocked: true });
  fixture.state.lastMotion = "2w";
  fixture.state.flags.usedW = true;

  fixture.runtime.useMotion(".", false);

  assert.deepEqual(fixture.dashes, [{ direction: fixture.state.facing, backwards: false, count: 2 }]);
  assert.equal(fixture.state.lastMotion, "2w");
});

test("line and file motions route through their dedicated helpers", () => {
  const fixture = createMotionFixture();

  fixture.runtime.useMotion("0", false);
  fixture.runtime.useMotion("$", false);
  fixture.runtime.useMotion("gg", false);
  fixture.runtime.useMotion("G", false);

  assert.deepEqual(fixture.lineJumps, ["left", "right"]);
  assert.deepEqual(fixture.fileJumps, ["up", "down"]);
});

test("battle mode forwards motions to the battle runtime", () => {
  const fixture = createMotionFixture();
  fixture.state.mode = "battle";

  fixture.runtime.useMotion("a", false);

  assert.deepEqual(fixture.battleKeys, ["a"]);
});
