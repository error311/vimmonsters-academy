import assert from "node:assert/strict";
import test from "node:test";

import { createBattleChallengeRuntime } from "../src/battle-challenge-runtime.js";
import { createState, installMockGlobals } from "./helpers/runtime-fixtures.mjs";
import { createMonster } from "../src/state.js";

function createFixture(options = {}) {
  const globals = installMockGlobals(options.globals);
  const state = createState(12345);
  const messages = [];
  let attackCount = 0;
  let slamCount = 0;
  let throwCount = 0;

  state.mode = "battle";
  state.battle = {
    enemy: createMonster("sproutle", 6),
    challenge: null,
    pendingEnemyTurn: null,
  };

  const runtime = createBattleChallengeRuntime({
    state,
    activeMonster() {
      return state.party[state.activeIndex];
    },
    setMessage(message, portrait) {
      state.message = message;
      state.portrait = portrait || "player";
      messages.push(message);
    },
    onAttack() {
      attackCount += 1;
    },
    onSlam() {
      slamCount += 1;
    },
    onThrow() {
      throwCount += 1;
    },
  });

  return {
    globals,
    state,
    runtime,
    messages,
    get attackCount() {
      return attackCount;
    },
    get slamCount() {
      return slamCount;
    },
    get throwCount() {
      return throwCount;
    },
  };
}

test("battle challenge count motions advance and resolve into the attack callback", () => {
  const fixture = createFixture({ globals: { randomValues: [0], randomFallback: 0 } });
  try {
    fixture.runtime.startBattleChallenge("attack");

    fixture.runtime.handleBattleChallengeKey("2");
    fixture.runtime.handleBattleChallengeKey("j");
    fixture.runtime.handleBattleChallengeKey("a");

    assert.equal(fixture.attackCount, 1);
    assert.equal(fixture.state.battle.challenge, null);
  } finally {
    fixture.globals.restore();
  }
});

test("failed battle challenge movement applies the score penalty and queues the enemy turn", () => {
  const fixture = createFixture({ globals: { randomValues: [0], randomFallback: 0 } });
  try {
    fixture.state.score = 20;
    fixture.runtime.startBattleChallenge("attack");

    fixture.runtime.handleBattleChallengeKey("l");

    assert.equal(fixture.state.score, 12);
    assert.equal(fixture.state.battle.challenge, null);
    assert.match(fixture.messages.at(-1), /Turn lost\. -8 score/);
    assert(fixture.state.battle.pendingEnemyTurn);
  } finally {
    fixture.globals.restore();
  }
});
