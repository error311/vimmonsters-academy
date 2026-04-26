import assert from "node:assert/strict";
import test from "node:test";

import { SPECIES } from "../src/content.js";
import { createBattleFlowRuntime } from "../src/battle-flow.js";
import { createMonster } from "../src/state.js";
import { createState, installMockGlobals } from "./helpers/runtime-fixtures.mjs";

function createFixture(options = {}) {
  const globals = installMockGlobals(options.globals);
  const state = options.state || createState(options.seed);
  const messages = [];
  const sounds = [];
  const enemyTurns = [];
  let milestoneChecks = 0;

  const runtime = createBattleFlowRuntime({
    state,
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
    checkMilestones() {
      milestoneChecks += 1;
    },
    playSound(name) {
      sounds.push(name);
    },
    speciesBattleProfile(id) {
      return (SPECIES[id] && SPECIES[id].battle) || {};
    },
    battleTechniqueList() {
      return ["a attack", "f VimOrb", "[ ] switch"];
    },
    onSwitchEnemyTurn(prefix) {
      enemyTurns.push(prefix);
    },
  });

  return {
    globals,
    state,
    runtime,
    messages,
    sounds,
    enemyTurns,
    get milestoneChecks() {
      return milestoneChecks;
    },
  };
}

test("maybeEncounter starts a transition from grass with deterministic map odds", (t) => {
  const fixture = createFixture({
    globals: { randomValues: [0, 0, 0], randomFallback: 0 },
  });
  t.after(() => fixture.globals.restore());

  fixture.state.map = "meadow";
  fixture.state.mode = "overworld";

  fixture.runtime.maybeEncounter(",");

  assert.equal(fixture.state.transition.type, "encounter");
  assert.equal(fixture.state.transition.enemy.id, "sproutle");
  assert.equal(fixture.state.transition.enemy.level, 3);
  assert.deepEqual(fixture.sounds, ["encounter"]);
});

test("startBattle blocks the boss until the tower drill is cleared", (t) => {
  const fixture = createFixture();
  t.after(() => fixture.globals.restore());

  fixture.state.transition = { type: "encounter" };

  fixture.runtime.startBattle(createMonster("macrobat", 12), true);

  assert.equal(fixture.state.mode, "overworld");
  assert.equal(fixture.state.battle, null);
  assert.equal(fixture.state.transition, null);
  assert.match(fixture.messages.at(-1).message, /altar rejects the battle/);
});

test("cycleParty in battle triggers the follow-up enemy turn hook", (t) => {
  const fixture = createFixture();
  t.after(() => fixture.globals.restore());

  fixture.state.party = [
    createMonster("pebbLit", 5),
    createMonster("sproutle", 5),
  ];
  fixture.state.activeIndex = 0;
  fixture.runtime.startBattle(createMonster("fizzbat", 6), false);

  const changed = fixture.runtime.cycleParty(1, true);

  assert.equal(changed, true);
  assert.equal(fixture.state.activeIndex, 1);
  assert.equal(fixture.enemyTurns.length, 1);
  assert.match(fixture.enemyTurns[0], /attacks while you switch/);
});

test("finishBattle returns to overworld and applies score plus XP rewards", (t) => {
  const fixture = createFixture();
  t.after(() => fixture.globals.restore());

  fixture.state.party = [createMonster("pebbLit", 5)];
  fixture.state.party[0].xp = 3;
  fixture.state.party[0].nextXp = 5;
  fixture.runtime.startBattle(createMonster("sproutle", 5), false);
  fixture.state.score = 12;

  fixture.runtime.finishBattle("Victory.", 4, 10);

  assert.equal(fixture.state.mode, "overworld");
  assert.equal(fixture.state.battle, null);
  assert.equal(fixture.state.score, 22);
  assert.equal(fixture.state.party[0].level, 6);
  assert.match(fixture.messages.at(-1).message, /Victory\.\ \+10 score\./);
  assert.match(fixture.messages.at(-1).message, /grew to Lv 6/);
  assert.equal(fixture.milestoneChecks, 1);
});
