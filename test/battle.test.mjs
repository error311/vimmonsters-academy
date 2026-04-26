import assert from "node:assert/strict";
import test from "node:test";

import { createMonster } from "../src/state.js";
import { createBattleFixture } from "./helpers/runtime-fixtures.mjs";

test("cycleParty switches to the next healthy monster and marks the lesson flag", (t) => {
  const fixture = createBattleFixture();
  t.after(() => fixture.globals.restore());

  fixture.state.flags.usedX = true;
  fixture.state.party = [
    createMonster("pebbLit", 5),
    createMonster("sproutle", 5),
  ];
  fixture.state.activeIndex = 0;

  const changed = fixture.runtime.cycleParty(1, false);

  assert.equal(changed, true);
  assert.equal(fixture.state.activeIndex, 1);
  assert.equal(fixture.state.flags.switchedParty, true);
  assert.match(fixture.messages.at(-1).message, /Lesson 3 switch complete/);
});

test("cw primes a focused VimOrb in battle", (t) => {
  const fixture = createBattleFixture();
  t.after(() => fixture.globals.restore());

  fixture.state.flags.usedCw = true;
  fixture.state.vimOrbs = 3;
  fixture.runtime.startBattle(createMonster("sproutle", 6), false);

  fixture.runtime.handleBattleKey("c");
  fixture.runtime.handleBattleKey("w");

  assert.equal(fixture.state.battle.focusedVimOrb, true);
  assert.equal(fixture.state.score, 4);
  assert.equal(fixture.state.battle.pendingTechnique, "");
  assert.match(fixture.messages.at(-1).message, /cw sharpens the next VimOrb/);
});

test("ciw heals and clears player status pressure", (t) => {
  const fixture = createBattleFixture();
  t.after(() => fixture.globals.restore());

  fixture.state.flags.usedCiw = true;
  fixture.state.party = [createMonster("pebbLit", 6)];
  fixture.state.party[0].hp = 14;
  fixture.runtime.startBattle(createMonster("glyphowl", 7), false);
  fixture.state.battle.playerStatus.rooted = 1;
  fixture.state.battle.playerStatus.bleed = 1;
  fixture.state.battle.playerStatus.marked = 1;

  fixture.runtime.handleBattleKey("a");
  fixture.runtime.handleBattleKey("c");
  fixture.runtime.handleBattleKey("i");
  fixture.runtime.handleBattleKey("w");

  assert.equal(fixture.state.battle.focusedVimOrb, true);
  assert.equal(fixture.state.battle.playerStatus.rooted, 0);
  assert.equal(fixture.state.battle.playerStatus.bleed, 0);
  assert.equal(fixture.state.battle.playerStatus.marked, 0);
  assert.match(fixture.messages.at(-1).message, /ciw restores/);
});

test("dw applies break-word side effects in battle", (t) => {
  const fixture = createBattleFixture({ globals: { randomValues: [0.9, 0.9], randomFallback: 0.9 } });
  t.after(() => fixture.globals.restore());

  fixture.state.flags.usedDw = true;
  fixture.runtime.startBattle(createMonster("slashram", 8), false);
  fixture.state.battle.enemy.hp = 80;
  fixture.state.battle.enemyStatus.guard = 1;
  fixture.state.battle.enemyStatus.marked = 1;

  fixture.runtime.handleBattleKey("d");
  fixture.runtime.handleBattleKey("w");

  assert.equal(fixture.state.battle.enemyStatus.guard, 0);
  assert.equal(fixture.state.battle.enemyStatus.evade, 0);
  assert.equal(fixture.state.battle.enemyStatus.marked, 0);
  assert.equal(fixture.state.battle.enemyStatus.bleed, 1);
  assert.equal(fixture.state.score, 12);
  assert.equal(fixture.state.battle.lastPlayerTechnique, "break");
});

test("dd battle challenge resolves into heavy slam", (t) => {
  const fixture = createBattleFixture({ globals: { randomValues: [0, 0.9, 0.9], randomFallback: 0.9 } });
  t.after(() => fixture.globals.restore());

  fixture.state.flags.usedDd = true;
  fixture.runtime.startBattle(createMonster("tabbit", 8), false);
  fixture.state.battle.enemy.hp = 90;

  fixture.runtime.handleBattleKey("d");
  fixture.runtime.handleBattleKey("d");
  fixture.runtime.handleBattleKey("j");
  fixture.runtime.handleBattleKey("d");
  fixture.runtime.handleBattleKey("d");

  assert.equal(fixture.state.battle.challenge, null);
  assert.equal(fixture.state.battle.lastPlayerTechnique, "slam");
  assert.equal(fixture.state.score, 10);
  assert.match(fixture.messages.at(-1).message, /drops a heavy slam on/);
});

test("throwing a VimOrb can deterministically capture a monster", (t) => {
  const fixture = createBattleFixture({ globals: { randomValues: [0, 0], randomFallback: 0 } });
  t.after(() => fixture.globals.restore());

  fixture.state.vimOrbs = 2;
  fixture.runtime.startBattle(createMonster("sproutle", 5), false);

  fixture.runtime.handleBattleKey("f");
  fixture.runtime.handleBattleKey("f");
  fixture.runtime.handleBattleKey("w");
  fixture.runtime.handleBattleKey("f");
  fixture.runtime.handleBattleKey("w");

  assert.equal(fixture.state.battle.throwResult.caught, true);
  fixture.runtime.resolveThrowResult();

  assert.equal(fixture.state.party.length, 2);
  assert.equal(fixture.state.flags.caughtFirst, true);
  assert.match(fixture.state.battle.result.message, /is now part of your party/);
});

test("a focused miss applies the extra score penalty after the throw resolves", (t) => {
  const fixture = createBattleFixture({ globals: { randomValues: [0, 0.99], randomFallback: 0.99 } });
  t.after(() => fixture.globals.restore());

  fixture.state.flags.usedCw = true;
  fixture.state.vimOrbs = 2;
  fixture.runtime.startBattle(createMonster("fizzbat", 6), false);

  fixture.runtime.handleBattleKey("c");
  fixture.runtime.handleBattleKey("w");
  fixture.state.battle.pendingEnemyTurn = null;
  fixture.runtime.handleBattleKey("f");
  fixture.runtime.handleBattleKey("f");
  fixture.runtime.handleBattleKey("w");
  fixture.runtime.handleBattleKey("f");
  fixture.runtime.handleBattleKey("w");
  fixture.runtime.resolveThrowResult();

  assert.equal(fixture.state.score, 0);
  assert.match(fixture.state.battle.pendingEnemyTurn.prefix, /-6 score/);
  assert.match(fixture.messages.at(-1).message, /snaps shut on empty air/);
});

test("ongoing bleed damage can trigger the defeat reset before a battle action resolves", (t) => {
  const fixture = createBattleFixture();
  t.after(() => fixture.globals.restore());

  fixture.state.score = 140;
  fixture.state.party = [createMonster("pebbLit", 5)];
  fixture.state.party[0].hp = 1;
  fixture.runtime.startBattle(createMonster("glyphowl", 7), false);
  fixture.state.battle.playerStatus.bleed = 1;

  fixture.runtime.handleBattleKey("a");

  assert.equal(fixture.state.mode, "overworld");
  assert.equal(fixture.state.map, "house");
  assert.equal(fixture.state.x, 9);
  assert.equal(fixture.state.y, 11);
  assert.equal(fixture.state.score, 20);
  assert.match(fixture.messages.at(-1).message, /wakes up back in Home Row House/);
});
