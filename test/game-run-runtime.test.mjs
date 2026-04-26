import assert from "node:assert/strict";
import test from "node:test";

import { createGameRunRuntime, applyRunSessionToState, buildDefaultGameState } from "../src/game-run-runtime.js";
import { installMockGlobals, createState } from "./helpers/runtime-fixtures.mjs";
import { buildHouseLesson, buildRandomizedMaps, cellKey, createDefaultState, formatDuration, loadMeta } from "../src/state.js";

test("buildDefaultGameState uses storage-backed meta", () => {
  const storage = {
    getItem(key) {
      if (key === "meta-key") {
        return JSON.stringify({
          bestScore: 321,
          bestTimeMs: 54_000,
          leaderboard: [{ id: "run-1", name: "ace", score: 321, timeMs: 54_000, seed: 123 }],
        });
      }
      return null;
    },
  };

  const state = buildDefaultGameState({
    createDefaultState,
    loadMeta,
    storage,
    metaKey: "meta-key",
  }, 4321);

  assert.equal(state.bestScore, 321);
  assert.equal(state.bestTimeMs, 54_000);
  assert.equal(state.leaderboard.length, 1);
});

test("applyRunSessionToState rewires seed-derived fields from the issued run", () => {
  const state = createState(1111);
  const result = applyRunSessionToState(state, {
    runId: "server-run",
    token: "abc123",
    seed: 9876,
    startedAt: 777,
  }, {
    buildHouseLesson,
    buildRandomizedMaps,
    cellKey,
  });

  assert.equal(result, true);
  assert.equal(state.runId, "server-run");
  assert.equal(state.runToken, "abc123");
  assert.equal(state.runSeed, 9876);
  assert.equal(state.runStartedAt, 777);
  assert.deepEqual(state.houseTrailVisited, [`${state.houseLesson.start.x},${state.houseLesson.start.y}`]);
});

test("finishRun updates local leaderboard state and emits the completion message", async () => {
  const globals = installMockGlobals({ dateNow: 1_800_000_000_000 });
  const state = createState(2468);
  const messages = [];
  const fx = [];
  const savedMeta = [];
  const runtime = createGameRunRuntime({
    state,
    storage: {},
    metaKey: "meta-key",
    fetchImpl: async () => {
      throw new Error("network down");
    },
    createDefaultState,
    loadMeta,
    applyLeaderboardEntries(target, entries) {
      target.leaderboard = entries;
    },
    fetchLeaderboardEntries: async () => [],
    requestRunSession: async () => null,
    submitLeaderboardRun: async () => ({ ok: false, error: "offline", entries: [] }),
    renameLeaderboardRun: async () => ({ ok: false, error: "offline", entries: [] }),
    saveMetaToStorage(storage, metaKey, target) {
      savedMeta.push({ storage, metaKey, score: target.score });
    },
    buildHouseLesson,
    buildRandomizedMaps,
    cellKey,
    elapsedMs() {
      return 10_000;
    },
    formatDuration,
    renderUi() {},
    setMessage(message, portrait) {
      state.message = message;
      state.portrait = portrait || "player";
      messages.push({ message, portrait: state.portrait });
    },
    setFx(kind, target, duration, options) {
      fx.push({ kind, target, duration, options });
    },
  });

  try {
    state.runId = "run-42";
    state.runName = "hero";
    state.runSeed = 2468;
    state.runStartedAt = 1_799_999_990_000;
    state.score = 100;

    runtime.finishRun();
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(state.runComplete, true);
    assert.equal(state.runLogged, true);
    assert.equal(state.finishedAt, 1_800_000_000_000);
    assert.equal(state.score, 2200);
    assert.equal(state.leaderboard[0].id, "run-42");
    assert.equal(fx.length, 1);
    assert.match(messages[0].message, /Run clear in 00:10\. Speed bonus \+2100/);
    assert.match(messages.at(-1).message, /Public leaderboard submit failed: offline/);
    assert.equal(savedMeta.length, 1);
  } finally {
    globals.restore();
  }
});
