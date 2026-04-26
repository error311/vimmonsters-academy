// Owns: run/session setup, leaderboard sync, and completed-run submission flow.
// Does not own: rendering, input routing, or combat/drill logic.

export function buildDefaultGameState(deps, seed) {
  return deps.createDefaultState(seed, deps.loadMeta(deps.storage, deps.metaKey));
}

export function applyRunSessionToState(target, run, deps) {
  if (!run || typeof run.seed !== "number" || !run.runId) {
    return false;
  }
  target.runId = String(run.runId);
  target.runToken = typeof run.token === "string" ? run.token : "";
  target.runSeed = run.seed;
  target.runStartedAt = typeof run.startedAt === "number" ? run.startedAt : Date.now();
  target.finishedAt = null;
  target.runComplete = false;
  target.runLogged = false;
  target.houseLesson = deps.buildHouseLesson(target.runSeed);
  target.houseTrailVisited = [deps.cellKey(target.houseLesson.start.x, target.houseLesson.start.y)];
  target.randomizedMaps = deps.buildRandomizedMaps(target.runSeed, target.houseLesson.rows);
  return true;
}

export function createGameRunRuntime(deps) {
  const {
    state,
    storage,
    metaKey,
    fetchImpl,
    createDefaultState,
    loadMeta,
    applyLeaderboardEntries,
    fetchLeaderboardEntries,
    requestRunSession,
    submitLeaderboardRun,
    renameLeaderboardRun,
    saveMetaToStorage,
    buildHouseLesson,
    buildRandomizedMaps,
    cellKey,
    elapsedMs,
    formatDuration,
    renderUi,
    setMessage,
    setFx,
  } = deps;

  function defaultState(seed) {
    return buildDefaultGameState({
      createDefaultState,
      loadMeta,
      storage,
      metaKey,
    }, seed);
  }

  function saveMeta() {
    try {
      saveMetaToStorage(storage, metaKey, state);
    } catch {
      // Ignore local storage write failures.
    }
  }

  function applyLeaderboard(entries) {
    applyLeaderboardEntries(state, entries);
    saveMeta();
  }

  async function loadLeaderboardFromApi() {
    try {
      const entries = await fetchLeaderboardEntries(fetchImpl);
      if (!entries) {
        return;
      }
      applyLeaderboard(entries);
      renderUi();
    } catch {
      // Ignore and keep local fallback state.
    }
  }

  async function requestServerRunFromApi() {
    try {
      return await requestRunSession(fetchImpl);
    } catch {
      return null;
    }
  }

  async function submitRunToApi(entry) {
    try {
      const result = await submitLeaderboardRun(fetchImpl, {
        runId: entry.id,
        runName: entry.name,
        score: entry.score,
        timeMs: entry.timeMs,
        seed: entry.seed,
        startedAt: state.runStartedAt,
        token: state.runToken,
      });
      if (result.ok && Array.isArray(result.entries)) {
        applyLeaderboard(result.entries);
        renderUi();
        return true;
      }
      return result.error || "Leaderboard submission failed.";
    } catch {
      return "Leaderboard submission failed.";
    }
  }

  async function renameRunOnApi(nextName) {
    try {
      const result = await renameLeaderboardRun(fetchImpl, {
        runId: state.runId,
        runName: nextName,
        startedAt: state.runStartedAt,
        token: state.runToken,
      });
      if (result.ok && Array.isArray(result.entries)) {
        applyLeaderboard(result.entries);
        renderUi();
        return true;
      }
      return result.error || "Leaderboard rename failed.";
    } catch {
      return "Leaderboard rename failed.";
    }
  }

  function speedBonusForRun(ms) {
    return Math.max(0, 2200 - Math.floor(ms / 1000) * 10);
  }

  async function beginNewRun(reason) {
    const fresh = defaultState();
    Object.assign(state, fresh);
    const run = await requestServerRunFromApi();
    if (run) {
      applyRunSessionToState(state, run, {
        buildHouseLesson,
        buildRandomizedMaps,
        cellKey,
      });
    }
    setMessage(
      reason || `New academy seed ${state.runSeed}. Learn fast, catch smart, and beat your best time.`,
      "player"
    );
    renderUi();
  }

  function resetRun(reason) {
    void beginNewRun(reason);
  }

  function finishRun() {
    if (state.runLogged) {
      return;
    }
    const duration = elapsedMs();
    const speedBonus = speedBonusForRun(duration);
    state.finishedAt = Date.now();
    state.runComplete = true;
    state.runLogged = true;
    state.score += speedBonus;
    const entry = {
      id: state.runId,
      name: state.runName || "anon",
      score: state.score,
      timeMs: duration,
      seed: state.runSeed,
    };
    applyLeaderboard(
      [...state.leaderboard.filter((item) => item.id !== state.runId), entry]
    );
    void submitRunToApi(entry).then((result) => {
      if (result !== true) {
        setMessage(
          `Run clear in ${formatDuration(duration)}. Speed bonus +${speedBonus}. Public leaderboard submit failed: ${result} Press R to name this run, then use :q for a new seed.`,
          "macrobat"
        );
      }
    });
    setFx("reward", "hud", 2600, { persistent: true });
    setMessage(
      `Run clear in ${formatDuration(duration)}. Speed bonus +${speedBonus}. Press R to name this run, then use :q for a new seed.`,
      "macrobat"
    );
  }

  function commitRunName() {
    const nextName = state.rename.text.trim() || "anon";
    state.runName = nextName.slice(0, 20);
    state.rename.active = false;
    state.rename.text = "";
    if (state.runComplete) {
      applyLeaderboard(
        state.leaderboard.map((entry) => {
          if (entry.id !== state.runId) {
            return entry;
          }
          return Object.assign({}, entry, { name: state.runName });
        })
      );
      void renameRunOnApi(state.runName).then((result) => {
        if (result !== true) {
          setMessage(`Run name saved locally as ${state.runName}, but public leaderboard rename failed: ${result}`, "player");
        }
      });
      setMessage(`Run name saved as ${state.runName}. Use :q for a new randomized run.`, "player");
      return;
    }
    setMessage(`This run is now named ${state.runName}.`, "player");
  }

  return {
    defaultState,
    saveMeta,
    applyLeaderboard,
    loadLeaderboardFromApi,
    requestServerRunFromApi,
    submitRunToApi,
    renameRunOnApi,
    beginNewRun,
    resetRun,
    finishRun,
    commitRunName,
  };
}
