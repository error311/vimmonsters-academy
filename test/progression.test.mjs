import assert from "node:assert/strict";
import test from "node:test";

import { LESSONS } from "../src/content.js";
import { createProgressionFixture } from "./helpers/runtime-fixtures.mjs";

test("progression starts on lesson 1 with only core controls unlocked", () => {
  const { runtime } = createProgressionFixture();

  assert.equal(runtime.currentLesson().title, LESSONS[0].title);
  assert.equal(runtime.controlUnlocked("move"), true);
  assert.equal(runtime.controlUnlocked("word"), false);
  assert.equal(runtime.controlUnlocked("attack"), false);
  assert.match(runtime.objectiveText(), /H rune/);
});

test("house completion unlocks lesson 2 controls and switches the current lesson", () => {
  const { state, runtime } = createProgressionFixture();
  Object.assign(state.flags, {
    runeH: true,
    runeJ: true,
    runeK: true,
    runeL: true,
  });

  assert.equal(runtime.houseComplete(), true);
  assert.equal(runtime.currentLesson().title, LESSONS[1].title);
  assert.equal(runtime.controlUnlocked("word"), true);
  assert.equal(runtime.controlUnlocked("attack"), true);
  assert.equal(runtime.controlUnlocked("repeat"), false);
});

test("ridge gate messaging points the player to party switching when that is the last blocker", () => {
  const { state, runtime } = createProgressionFixture();
  state.map = "ridge";
  Object.assign(state.flags, {
    runeH: true,
    runeJ: true,
    runeK: true,
    runeL: true,
    metMentor: true,
    usedW: true,
    usedB: true,
    usedE: true,
    usedGe: true,
    caughtFirst: true,
    metCoach: true,
    usedZero: true,
    usedDollar: true,
    usedX: true,
    switchedParty: false,
  });

  assert.match(runtime.gateBlockedMessage("T"), /Press \[ or \] once/);
  assert.match(runtime.gateInspectMessage("T"), /Press \[ or \] once/);
});

test("final battle hint text changes when the player is in the boss fight", () => {
  const { state, runtime } = createProgressionFixture();
  Object.assign(state.flags, {
    runeH: true,
    runeJ: true,
    runeK: true,
    runeL: true,
    metMentor: true,
    usedW: true,
    usedB: true,
    usedE: true,
    usedGe: true,
    caughtFirst: true,
    metCoach: true,
    usedZero: true,
    usedDollar: true,
    usedX: true,
    switchedParty: true,
    metSage: true,
    usedCountWord: true,
    usedCountMove: true,
    usedDd: true,
    usedCw: true,
    metScout: true,
    usedFindForward: true,
    usedTillForward: true,
    usedFindBackward: true,
    usedTillBackward: true,
    metScribe: true,
    usedDw: true,
    usedCiw: true,
    usedGG: true,
    usedBigG: true,
    towerDrillCleared: true,
    finalWon: false,
  });
  state.mode = "battle";

  assert.match(runtime.controlHintText(), /Final battle: a attacks, x quick jabs, dd heavy slams, cw powers the next VimOrb/);
});

test("tree sections include command save/load helpers once command mode is unlocked", () => {
  const { state, runtime } = createProgressionFixture();
  state.flags.commandUnlocked = true;

  const commands = runtime.treeSections().find((section) => section.title === "Commands");
  assert(commands);
  assert(commands.items.includes(":w"));
  assert(commands.items.includes(":load"));
  assert(commands.items.includes(":heal"));
});
