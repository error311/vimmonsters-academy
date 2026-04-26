import assert from "node:assert/strict";
import test from "node:test";

import { SPECIES } from "../src/content.js";
import { createBattleEnemyRuntime } from "../src/battle-enemy.js";
import { createBattleFlowRuntime } from "../src/battle-flow.js";
import { createMonster } from "../src/state.js";
import { createState, installMockGlobals } from "./helpers/runtime-fixtures.mjs";

function createFixture(options = {}) {
  const globals = installMockGlobals(options.globals);
  const state = options.state || createState(options.seed);
  const messages = [];
  const effects = [];
  const sounds = [];
  let milestoneChecks = 0;

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
      return ["a attack", "f VimOrb", "[ ] switch"];
    },
    onSwitchEnemyTurn() {},
  });

  const enemyRuntime = createBattleEnemyRuntime({
    state,
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
    speciesBattleProfile(id) {
      return (SPECIES[id] && SPECIES[id].battle) || {};
    },
    findNextAliveIndex: flowRuntime.findNextAliveIndex,
    resetAfterDefeat: flowRuntime.resetAfterDefeat,
    queueBattleFinish: flowRuntime.queueBattleFinish,
  });

  return {
    globals,
    state,
    flowRuntime,
    enemyRuntime,
    messages,
    effects,
    sounds,
    get milestoneChecks() {
      return milestoneChecks;
    },
  };
}

test("enemyTurn can clear a primed focus setup with feint", (t) => {
  const fixture = createFixture({ globals: { randomValues: [0, 0.9], randomFallback: 0.9 } });
  t.after(() => fixture.globals.restore());

  fixture.flowRuntime.startBattle(createMonster("tabbit", 7), false);
  fixture.state.battle.enemyCooldowns = {};
  fixture.state.battle.focusedVimOrb = true;
  fixture.state.battle.pendingTechnique = "c";

  fixture.enemyRuntime.enemyTurn("Counter.");

  assert.equal(fixture.state.battle.lastEnemyMove, "feint");
  assert.equal(fixture.state.battle.focusedVimOrb, false);
  assert.equal(fixture.state.battle.pendingTechnique, "");
  assert.match(fixture.messages.at(-1).message, /feints and breaks your setup/);
});

test("applyPlayerOngoingEffects swaps in the next healthy monster on bleed faint", (t) => {
  const fixture = createFixture();
  t.after(() => fixture.globals.restore());

  fixture.state.party = [
    createMonster("pebbLit", 5),
    createMonster("sproutle", 5),
  ];
  fixture.state.activeIndex = 0;
  fixture.state.party[0].hp = 1;
  fixture.flowRuntime.startBattle(createMonster("fizzbat", 6), false);
  fixture.state.battle.playerStatus.bleed = 1;

  const applied = fixture.enemyRuntime.applyPlayerOngoingEffects();

  assert.equal(applied, true);
  assert.equal(fixture.state.mode, "battle");
  assert.equal(fixture.state.activeIndex, 1);
  assert.match(fixture.messages.at(-1).message, /drops from bleed damage/);
});
