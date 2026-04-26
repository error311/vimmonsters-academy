import assert from "node:assert/strict";
import test from "node:test";

import { SPECIES } from "../src/content.js";
import { createBattleFlowRuntime } from "../src/battle-flow.js";
import { createBattleTechniquesRuntime } from "../src/battle-techniques.js";
import { createMonster } from "../src/state.js";
import { createState, installMockGlobals } from "./helpers/runtime-fixtures.mjs";

function createFixture(options = {}) {
  const globals = installMockGlobals(options.globals);
  const state = options.state || createState(options.seed);
  const messages = [];
  const effects = [];
  const sounds = [];
  let milestoneChecks = 0;
  let techniquesRuntime;

  const flowRuntime = createBattleFlowRuntime({
    state,
    createMonster,
    controlUnlocked() {
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
      return techniquesRuntime.battleTechniqueList();
    },
    onSwitchEnemyTurn() {},
  });

  techniquesRuntime = createBattleTechniquesRuntime({
    state,
    createMonster,
    activeMonster() {
      return state.party[state.activeIndex];
    },
    setMessage(message, portrait) {
      state.message = message;
      state.portrait = portrait || "player";
      messages.push({ message, portrait: state.portrait });
    },
    setFx(kind, target, duration, fxOptions) {
      effects.push({ kind, target, duration, options: fxOptions || null });
    },
    playSound(name) {
      sounds.push(name);
    },
    speciesBattleProfile(id) {
      return (SPECIES[id] && SPECIES[id].battle) || {};
    },
    queueBattleFinish: flowRuntime.queueBattleFinish,
  });

  return {
    globals,
    state,
    flowRuntime,
    techniquesRuntime,
    messages,
    effects,
    sounds,
    get milestoneChecks() {
      return milestoneChecks;
    },
  };
}

test("battleTechniqueList reflects the currently unlocked player techniques", (t) => {
  const fixture = createFixture();
  t.after(() => fixture.globals.restore());

  assert.deepEqual(fixture.techniquesRuntime.battleTechniqueList(), ["a attack", "f VimOrb", "[ ] switch"]);

  fixture.state.flags.usedX = true;
  fixture.state.flags.usedDd = true;
  fixture.state.flags.usedCw = true;
  fixture.state.flags.usedDw = true;
  fixture.state.flags.usedCiw = true;

  assert.deepEqual(fixture.techniquesRuntime.battleTechniqueList(), [
    "a attack",
    "x quick jab",
    "dd heavy slam",
    "cw focus ball",
    "dw break word",
    "ciw inner word",
    "f VimOrb",
    "[ ] switch",
  ]);
});

test("quickAttack ignores evade and marks the enemy for follow-up pressure", (t) => {
  const fixture = createFixture({ globals: { randomValues: [0.9, 0.9], randomFallback: 0.9 } });
  t.after(() => fixture.globals.restore());

  fixture.flowRuntime.startBattle(createMonster("fizzbat", 6), false);
  fixture.state.battle.enemy.hp = 70;
  fixture.state.battle.enemyStatus.evade = 1;

  fixture.techniquesRuntime.quickAttack();

  assert.equal(fixture.state.battle.enemyStatus.evade, 1);
  assert.equal(fixture.state.battle.enemyStatus.marked, 1);
  assert.equal(fixture.state.score, 6);
  assert.equal(fixture.state.battle.lastPlayerTechnique, "quick");
  assert.match(fixture.messages.at(-1).message, /slashes/);
});
