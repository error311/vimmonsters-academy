// Persistence helpers keep local-storage and leaderboard logic out of the main
// game loop so state management is easier to follow and extend.

export function normalizeLeaderboardEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry.score === "number" && typeof entry.timeMs === "number")
    .map((entry) => {
      return {
        id: entry.id || `${entry.seed || "seed"}-${entry.timeMs}-${entry.score}`,
        name: String(entry.name || "anon").slice(0, 20),
        score: entry.score,
        timeMs: entry.timeMs,
        seed: entry.seed || 0,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.timeMs - right.timeMs;
    })
    .slice(0, 10);
}

export function applyLeaderboardEntries(state, entries) {
  const clean = normalizeLeaderboardEntries(entries);
  state.leaderboard = clean;
  state.bestScore = clean.length ? Math.max(...clean.map((entry) => entry.score)) : 0;
  state.bestTimeMs = clean.length ? Math.min(...clean.map((entry) => entry.timeMs)) : null;
  return clean;
}

export async function fetchLeaderboardEntries(fetchImpl) {
  const response = await fetchImpl("./api/leaderboard", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  return payload.entries || [];
}

export async function requestRunSession(fetchImpl) {
  const response = await fetchImpl("./api/run/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  return payload.run || null;
}

export async function submitLeaderboardRun(fetchImpl, run) {
  const response = await fetchImpl("./api/run/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(run),
  });
  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    entries: payload.entries || [],
    error: payload.error || "",
  };
}

export async function renameLeaderboardRun(fetchImpl, run) {
  const response = await fetchImpl("./api/run/rename", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(run),
  });
  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    entries: payload.entries || [],
    error: payload.error || "",
  };
}

export function saveMeta(storage, metaKey, state) {
  storage.setItem(
    metaKey,
    JSON.stringify({
      bestScore: state.bestScore,
      bestTimeMs: state.bestTimeMs,
      leaderboard: state.leaderboard,
    })
  );
}

export function buildSavePayload(state, cloneMonster) {
  return {
    map: state.map,
    x: state.x,
    y: state.y,
    facing: state.facing,
    vimOrbs: state.vimOrbs,
    score: state.score,
    activeIndex: state.activeIndex,
    party: state.party.map(cloneMonster),
    starterSelect: Object.assign({}, state.starterSelect, {
      options: Array.isArray(state.starterSelect && state.starterSelect.options)
        ? state.starterSelect.options.slice()
        : [],
    }),
    followerTrail: Array.isArray(state.followerTrail)
      ? state.followerTrail.map((step) => Object.assign({}, step))
      : [],
    flags: Object.assign({}, state.flags),
    announcements: Object.assign({}, state.announcements),
    rewards: Object.assign({}, state.rewards),
    lastMotion: state.lastMotion,
    message: state.message,
    portrait: state.portrait,
    runId: state.runId,
    runToken: state.runToken || "",
    runName: state.runName,
    runSeed: state.runSeed,
    runStartedAt: state.runStartedAt,
    finishedAt: state.finishedAt,
    runComplete: state.runComplete,
    runLogged: state.runLogged,
    houseLesson: state.houseLesson,
    randomizedMaps: state.randomizedMaps,
    mode: state.mode,
    drill: state.drill,
    bestScore: state.bestScore,
    bestTimeMs: state.bestTimeMs,
    leaderboard: state.leaderboard,
  };
}

export function writeSavePayload(storage, saveKey, payload) {
  storage.setItem(saveKey, JSON.stringify(payload));
}

export function readSavePayload(storage, saveKey) {
  const raw = storage.getItem(saveKey);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
}

export function applySavePayload(state, data, helpers) {
  const defaults = helpers.defaultState();
  state.map = data.map || "house";
  state.x = typeof data.x === "number" ? data.x : 9;
  state.y = typeof data.y === "number" ? data.y : 11;
  state.facing = data.facing || "up";
  state.vimOrbs = typeof data.vimOrbs === "number" ? data.vimOrbs : 0;
  state.score = typeof data.score === "number" ? data.score : 0;
  state.activeIndex = typeof data.activeIndex === "number" ? data.activeIndex : 0;
  state.party = Array.isArray(data.party) && data.party.length
    ? data.party.map(helpers.cloneMonster)
    : [helpers.createMonster("pebbLit", 5)];
  state.starterSelect = Object.assign({}, defaults.starterSelect, data.starterSelect || {});
  state.starterSelect.options = Array.isArray(state.starterSelect.options) && state.starterSelect.options.length
    ? state.starterSelect.options.slice()
    : defaults.starterSelect.options.slice();
  state.followerTrail = Array.isArray(data.followerTrail) && data.followerTrail.length
    ? data.followerTrail.map((step) => Object.assign({}, step))
    : helpers.createFollowerTrail(state.map, state.x, state.y, state.facing);
  state.flags = Object.assign(defaults.flags, data.flags || {});
  state.announcements = Object.assign(defaults.announcements, data.announcements || {});
  state.rewards = Object.assign(defaults.rewards, data.rewards || {});
  state.lastMotion = data.lastMotion || "";
  state.portrait = data.portrait || "player";
  state.runSeed = typeof data.runSeed === "number" ? data.runSeed : helpers.randomSeed();
  state.runId = data.runId || `run-${Date.now()}-${state.runSeed}`;
  state.runToken = typeof data.runToken === "string" ? data.runToken : "";
  state.runName = data.runName || "anon";
  state.runStartedAt = typeof data.runStartedAt === "number" ? data.runStartedAt : Date.now();
  state.finishedAt = typeof data.finishedAt === "number" ? data.finishedAt : null;
  state.runComplete = Boolean(data.runComplete);
  state.runLogged = Boolean(data.runLogged);
  state.houseLesson = data.houseLesson || helpers.buildHouseLesson(state.runSeed);
  state.randomizedMaps = data.randomizedMaps || helpers.buildRandomizedMaps(state.runSeed, state.houseLesson.rows);
  state.drill = helpers.hydrateDrill(data.drill || null);
  state.mode = data.mode === "drill" && state.drill ? "drill" : "overworld";
  state.bestScore = Math.max(
    state.bestScore,
    typeof data.bestScore === "number" ? data.bestScore : 0
  );
  if (typeof data.bestTimeMs === "number" && (!state.bestTimeMs || data.bestTimeMs < state.bestTimeMs)) {
    state.bestTimeMs = data.bestTimeMs;
  }
  state.leaderboard = normalizeLeaderboardEntries([
    ...state.leaderboard,
    ...(Array.isArray(data.leaderboard) ? data.leaderboard : []),
  ]);
  state.activeIndex = Math.max(0, Math.min(state.activeIndex, state.party.length - 1));
  state.battle = null;
}
