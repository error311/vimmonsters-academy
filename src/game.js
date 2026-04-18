import {
  CONTROL_INFO,
  LESSONS,
  SPECIES,
  STARTER_VIMMONSTER_IDS,
  WORLD_COLORS,
  PLAYER_PALETTE,
  PLAYER_FRAMES,
  MENTOR_FRAMES,
  COACH_FRAMES,
  SAGE_FRAMES,
  SCOUT_FRAMES,
  SCRIBE_FRAMES,
  MONSTER_FRAMES,
  MENTOR_PALETTE,
  COACH_PALETTE,
  SAGE_PALETTE,
  SCOUT_PALETTE,
  SCRIBE_PALETTE,
  MAPS,
} from "./content.js";
import {
  cellKey,
  randomSeed,
  buildHouseLesson,
  buildRandomizedMaps,
  loadMeta,
  formatDuration,
  createMonster,
  createDefaultState,
  createFollowerTrail,
  cloneMonster,
} from "./state.js";
import { hydrateDrill, createLessonDrill } from "./drills.js";
import { createDrillRuntime } from "./drill-runtime.js";
import { createBattleRuntime } from "./battle.js";
import { createProgressionRuntime } from "./progression.js";
import { createOverworldRuntime } from "./overworld.js";
import { createAudioRuntime } from "./audio.js";
import { createCanvasRenderer } from "./render.js";
import { createInputRuntime } from "./input.js";
import { createScenes } from "./scenes.js";
import { loadBitmapAssets } from "./bitmap-assets.js";
import {
  applyLeaderboardEntries,
  fetchLeaderboardEntries,
  requestRunSession,
  submitLeaderboardRun,
  renameLeaderboardRun,
  saveMeta as saveMetaToStorage,
  buildSavePayload,
  writeSavePayload,
  readSavePayload,
  applySavePayload,
} from "./persistence.js";

(async function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#10233c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff7da";
  ctx.font = "20px Lucida Console, Monaco, monospace";
  ctx.fillText("Loading VimMonsters Academy...", 280, 350);

  const ui = {
    area: document.getElementById("area"),
    lessonTitle: document.getElementById("lesson-title"),
  };

  const SAVE_KEY = "vimmonsters-academy-save-v1";
  const META_KEY = "vimmonsters-academy-meta-v1";
  const SCREEN_WIDTH = canvas.width;
  const SCREEN_HEIGHT = canvas.height;
  const TILE_SIZE = 36;
  const VIEW_TOP = 28;
  const VIEW_HEIGHT = 510;
  const DIALOGUE_Y = 520;

  const COLORS = WORLD_COLORS;
  const {
    drawRect,
    drawGradientRect,
    drawEllipse,
    drawText,
    fittedText,
    wrappedLines,
    drawWrapped,
    drawSprite,
    drawOutlinedSprite,
    drawBitmap,
    drawBitmapFrame,
  } = createCanvasRenderer(ctx, COLORS);
  const bitmapAssets = await loadBitmapAssets();

  // State, saves, leaderboard, and run progress.
  function applyLeaderboard(entries) {
    applyLeaderboardEntries(state, entries);
    saveMeta();
  }

  async function loadLeaderboardFromApi() {
    try {
      const entries = await fetchLeaderboardEntries(window.fetch.bind(window));
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
      return await requestRunSession(window.fetch.bind(window));
    } catch {
      return null;
    }
  }

  async function submitRunToApi(entry) {
    try {
      const result = await submitLeaderboardRun(window.fetch.bind(window), {
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
      const result = await renameLeaderboardRun(window.fetch.bind(window), {
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

  function defaultState(seed) {
    return createDefaultState(seed, loadMeta(window.localStorage, META_KEY));
  }

  const state = defaultState();
  ctx.imageSmoothingEnabled = false;

  function applyRunSessionToState(target, run) {
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
    target.houseLesson = buildHouseLesson(target.runSeed);
    target.houseTrailVisited = [cellKey(target.houseLesson.start.x, target.houseLesson.start.y)];
    target.randomizedMaps = buildRandomizedMaps(target.runSeed, target.houseLesson.rows);
    return true;
  }

  function saveMeta() {
    try {
      saveMetaToStorage(window.localStorage, META_KEY, state);
    } catch {
      // Ignore local storage write failures.
    }
  }

  function activeMonster() {
    return state.party[state.activeIndex];
  }

  // Shared runtime surface passed into the split modules. This keeps dependency
  // wiring in one place so learners can see what the engine exposes.
  const app = {
    canvas,
    ctx,
    ui,
    state,
    storage: window.localStorage,
    saveKey: SAVE_KEY,
    metaKey: META_KEY,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    tileSize: TILE_SIZE,
    viewTop: VIEW_TOP,
    viewHeight: VIEW_HEIGHT,
    dialogueY: DIALOGUE_Y,
    maps: MAPS,
    species: SPECIES,
    colors: COLORS,
    controlInfo: CONTROL_INFO,
    lessons: LESSONS,
    playerFrames: PLAYER_FRAMES,
    mentorFrames: MENTOR_FRAMES,
    coachFrames: COACH_FRAMES,
    sageFrames: SAGE_FRAMES,
    scoutFrames: SCOUT_FRAMES,
    scribeFrames: SCRIBE_FRAMES,
    playerPalette: PLAYER_PALETTE,
    monsterFrames: MONSTER_FRAMES,
    mentorPalette: MENTOR_PALETTE,
    coachPalette: COACH_PALETTE,
    sagePalette: SAGE_PALETTE,
    scoutPalette: SCOUT_PALETTE,
    scribePalette: SCRIBE_PALETTE,
    cellKey,
    randomSeed,
    buildHouseLesson,
    buildRandomizedMaps,
    loadMeta,
    formatDuration,
    createMonster,
    createDefaultState,
    createFollowerTrail,
    cloneMonster,
    hydrateDrill,
    createLessonDrill,
    applyLeaderboardEntries,
    fetchLeaderboardEntries,
    requestRunSession,
    submitLeaderboardRun,
    renameLeaderboardRun,
    saveMetaToStorage,
    buildSavePayload,
    writeSavePayload,
    readSavePayload,
    applySavePayload,
    drawRect,
    drawGradientRect,
    drawEllipse,
    drawText,
    fittedText,
    wrappedLines,
    drawWrapped,
    drawSprite,
    drawOutlinedSprite,
    drawBitmap,
    drawBitmapFrame,
    bitmapAssets,
    defaultState,
    saveMeta,
    activeMonster,
    setMessage,
    setFx,
    checkMilestones,
    parseActionKey,
    openRenameMode,
    resetRun,
    commitRunName,
    mapRows,
    mapOffset,
    monsterPalette,
    elapsedMs,
    shortSeed,
    houseStageIndex,
    housePathTone,
  };

  // Drill startup stays in the main engine because it also drives HUD messaging.
  function startLessonDrill(id) {
    const drill = createLessonDrill(id);
    if (!drill) {
      return;
    }
    state.command.active = false;
    state.command.text = "";
    state.rename.active = false;
    state.rename.text = "";
    state.mode = "drill";
    state.drill = hydrateDrill(drill);
    if (id === "meadow") {
      setMessage("Mentor W opened a word-motion drill. Use the exact motion shown.", "mentor");
      return;
    }
    if (id === "ridge") {
      setMessage("Coach Buffer opened a code drill. Use line motions exactly.", "coach");
      return;
    }
    if (id === "grove") {
      setMessage("Sage Count opened a count drill. Counts must match exactly.", "sage");
      return;
    }
    if (id === "fen") {
      setMessage("Scout Find opened a character-find drill. Use the exact f, t, F, and T sequence shown.", "scout");
      return;
    }
    if (id === "studio") {
      setMessage("Scribe Edit opened an operator drill. Use dw and ciw exactly.", "scribe");
      return;
    }
    if (id === "tower") {
      setMessage("The altar projects a final code fix. Clear it before the battle.", "macrobat");
    }
  }

  function shortSeed() {
    return String(state.runSeed).slice(-6);
  }

  function houseStageIndex() {
    if (!state.flags.runeH) {
      return 0;
    }
    if (!state.flags.runeJ) {
      return 1;
    }
    if (!state.flags.runeK) {
      return 2;
    }
    if (!state.flags.runeL) {
      return 3;
    }
    return 4;
  }

  function currentHouseTargetLabel() {
    return ["H rune", "J rune", "K rune", "L rune", "exit door"][houseStageIndex()];
  }

  function houseRouteKeys(stage) {
    const keys = new Set();
    for (let index = 0; index <= stage; index += 1) {
      ((state.houseLesson && state.houseLesson.segments[index]) || []).forEach((key) => {
        keys.add(key);
      });
    }
    return keys;
  }

  function houseCurrentSegmentKeys(stage) {
    return new Set(
      ((state.houseLesson && state.houseLesson.segments[Math.min(stage, state.houseLesson.segments.length - 1)]) || [])
    );
  }

  function housePathTone(x, y) {
    if (state.map !== "house") {
      return "normal";
    }
    const key = cellKey(x, y);
    const stage = houseStageIndex();
    const active = houseCurrentSegmentKeys(stage);
    const cleared = houseRouteKeys(stage - 1);
    if (active.has(key) && !state.houseTrailVisited.includes(key)) {
      return "active";
    }
    if (active.has(key) || cleared.has(key) || state.houseTrailVisited.includes(key)) {
      return "cleared";
    }
    return "future";
  }

  function markHouseTrailPosition(x, y) {
    if (state.map !== "house") {
      return;
    }
    const key = cellKey(x, y);
    const allowed = houseRouteKeys(houseStageIndex());
    if (!allowed.has(key) && !state.houseTrailVisited.includes(key)) {
      return;
    }
    if (!state.houseTrailVisited.includes(key)) {
      state.houseTrailVisited.push(key);
    }
  }

  function elapsedMs() {
    return (state.finishedAt || Date.now()) - state.runStartedAt;
  }

  function speedBonusForRun(ms) {
    return Math.max(0, 2200 - Math.floor(ms / 1000) * 10);
  }

  async function beginNewRun(reason) {
    const fresh = defaultState();
    Object.assign(state, fresh);
    const run = await requestServerRunFromApi();
    if (run) {
      applyRunSessionToState(state, run);
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

  function syncFollowerTrail() {
    state.followerTrail = createFollowerTrail(state.map, state.x, state.y, state.facing);
  }

  function pushFollowerStep(previous) {
    if (!Array.isArray(state.followerTrail) || !state.followerTrail.length) {
      syncFollowerTrail();
    }
    state.followerTrail.push(previous);
    while (state.followerTrail.length > 4) {
      state.followerTrail.shift();
    }
  }

  function openStarterSelect() {
    state.starterSelect.open = true;
    state.starterSelect.options = STARTER_VIMMONSTER_IDS.slice();
    state.starterSelect.selected = Math.max(0, Math.min(state.starterSelect.selected || 0, state.starterSelect.options.length - 1));
    setMessage("Starter VimMonster unlocked. Pick your partner, then head into Word Meadow.", "player");
  }

  // Starter selection also decides the first active follower.
  function chooseStarter(index) {
    const options = state.starterSelect.options || STARTER_VIMMONSTER_IDS;
    const chosenId = options[Math.max(0, Math.min(index, options.length - 1))];
    if (!chosenId || !SPECIES[chosenId]) {
      return;
    }
    state.party = [createMonster(chosenId, 5)];
    state.activeIndex = 0;
    state.flags.starterChosen = true;
    state.starterSelect.open = false;
    state.starterSelect.selected = Math.max(0, Math.min(index, options.length - 1));
    syncFollowerTrail();
    setFx("reward", "hud", 1400);
    setMessage(`${SPECIES[chosenId].name} joined you. It will follow in the field, and [ ] or VimTree party focus will swap the follower later.`, chosenId);
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

  const progression = createProgressionRuntime({
    state,
    lessons: LESSONS,
    controlInfo: CONTROL_INFO,
    maps: MAPS,
    formatDuration,
    elapsedMs,
    currentHouseTargetLabel,
    activeMonster,
  });
  const {
    houseComplete,
    meadowComplete,
    ridgeComplete,
    groveComplete,
    fenComplete,
    studioComplete,
    towerComplete,
    currentLesson,
    controlUnlocked,
    objectiveText,
    controlHintText,
    gateBlockedMessage,
    gateInspectMessage,
    treeSections,
  } = progression;
  Object.assign(app, progression);

  Object.assign(app, createAudioRuntime(app));
  const {
    unlockAudio,
    tickAudio,
    playSound,
    toggleMute,
  } = app;

  Object.assign(app, createBattleRuntime(app));
  const {
    startEncounterTransition,
    maybeEncounter,
    healParty,
    cycleParty,
    finishBattle,
    enemyTurn,
    resolveThrowResult,
    handleBattleKey,
  } = app;

  Object.assign(app, createDrillRuntime(app));
  const {
    handleDrillKey,
    handleDrillPromptKey,
    handleDrillInsertKey,
  } = app;

  Object.assign(app, createInputRuntime(app));
  const {
    handleCommandKey,
    handleRenameKey,
    normalizeKey,
    handleTreeKey,
  } = app;

  Object.assign(app, createScenes(app));
  const {
    drawOverworld,
    drawRunStrip,
    drawBattle,
    drawDialogue,
    drawEncounterTransition,
    drawTreeOverlay,
    drawDrillOverlay,
    drawRewardOverlay,
    drawStarterOverlay,
  } = app;

  function openRenameMode() {
    state.rename.active = true;
    state.rename.text = state.runName === "anon" ? "" : state.runName;
    setMessage(
      state.runComplete
        ? "Name your finished run and press Enter to update the leaderboard."
        : "Name this run now. The name will be attached when you finish.",
      "player"
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

  function setMessage(message, portrait) {
    state.message = message;
    if (portrait) {
      state.portrait = portrait;
    } else {
      state.portrait = "player";
    }
    renderUi();
  }

  function renderUi() {
    ui.area.textContent = MAPS[state.map].name;
    ui.lessonTitle.textContent = currentLesson().title;
  }

  function selectedTreeSection() {
    const sections = treeSections();
    return sections[Math.max(0, Math.min(state.tree.selected, sections.length - 1))];
  }
  app.selectedTreeSection = selectedTreeSection;

  function mapRows(mapName) {
    if (state.randomizedMaps && state.randomizedMaps[mapName]) {
      return state.randomizedMaps[mapName];
    }
    return MAPS[mapName].rows;
  }

  // Overworld map queries and movement helpers.
  function tileAt(mapName, x, y) {
    const rows = mapRows(mapName);
    if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) {
      return "#";
    }
    return rows[y][x];
  }

  function isWalkable(tile) {
    return ".,=HJKLEDRT".includes(tile);
  }

  function isGateTile(tile) {
    return "EDRT".includes(tile);
  }

  function mapOffset() {
    const rows = mapRows(state.map);
    return {
      x: Math.floor((SCREEN_WIDTH - rows[0].length * TILE_SIZE) / 2),
      y: VIEW_TOP + Math.floor((VIEW_HEIGHT - rows.length * TILE_SIZE) / 2),
    };
  }

  function directionVector(direction) {
    if (direction === "left") {
      return { dx: -1, dy: 0 };
    }
    if (direction === "right") {
      return { dx: 1, dy: 0 };
    }
    if (direction === "up") {
      return { dx: 0, dy: -1 };
    }
    return { dx: 0, dy: 1 };
  }

  function reverseDirection(direction) {
    if (direction === "left") {
      return "right";
    }
    if (direction === "right") {
      return "left";
    }
    if (direction === "up") {
      return "down";
    }
    return "up";
  }

  function monsterPalette(id) {
    return SPECIES[id].palette;
  }

  function setFx(kind, target, duration, options) {
    const now = performance.now();
    state.fx = Object.assign({
      kind,
      target,
      startedAt: now,
      endAt: now + duration,
      persistent: Boolean(options && options.persistent),
    }, options || {});
    if (kind === "reward") {
      playSound("reward");
    } else if (kind === "capture") {
      playSound("capture");
    } else if (kind === "vimOrb") {
      playSound(options && options.focused ? "focus-throw" : "vimOrb");
    } else if (kind === "hit") {
      playSound(target === "enemy" ? "player-hit" : "enemy-hit");
    } else if (kind === "miss") {
      playSound("blocked");
    }
  }

  function awardLesson(id, points, vimOrbs, text) {
    if (state.rewards[id]) {
      return false;
    }
    state.rewards[id] = true;
    state.score += points;
    state.vimOrbs += vimOrbs;
    setFx("reward", "hud", 1800);
    setMessage(`${text} +${points} score and +${vimOrbs} VimOrbs.`);
    return true;
  }

  function checkMilestones() {
    if (houseComplete() && !state.announcements.house) {
      state.announcements.house = true;
      awardLesson("house", 120, 4, "Home Row complete. The door unlocks.");
      if (!state.flags.starterChosen) {
        openStarterSelect();
      }
      return;
    }
    if (meadowComplete() && !state.announcements.meadow) {
      state.announcements.meadow = true;
      awardLesson("meadow", 220, 5, "Word motions learned. e and ge are in your toolkit, and Line Ridge is now worth exploring.");
      return;
    }
    if (ridgeComplete() && !state.announcements.ridge) {
      state.announcements.ridge = true;
      awardLesson("ridge", 300, 5, "Line motions mastered. x is now Quick Jab in battle, and Count Grove is open.");
      return;
    }
    if (groveComplete() && !state.announcements.grove) {
      state.announcements.grove = true;
      awardLesson("grove", 390, 6, "Count motions mastered. dd and cw are battle tools now, and Finder Fen is open.");
      return;
    }
    if (fenComplete() && !state.announcements.fen) {
      state.announcements.fen = true;
      awardLesson("fen", 420, 5, "Find motions mastered. Character targeting is sharp, and Operator Studio is open.");
      return;
    }
    if (studioComplete() && !state.announcements.studio) {
      state.announcements.studio = true;
      awardLesson("studio", 470, 6, "Operator motions mastered. dw and ciw are battle tools now, and Macro Tower is open.");
      return;
    }
    if (towerComplete() && !state.announcements.tower) {
      state.announcements.tower = true;
      awardLesson("tower", 560, 8, "You cleared VimMonsters Academy.");
      finishRun();
    }
  }

  Object.assign(app, createOverworldRuntime({
    state,
    maps: MAPS,
    cellKey,
    houseStageIndex,
    houseCurrentSegmentKeys,
    houseRouteKeys,
    currentHouseTargetLabel,
    createMonster,
    setMessage,
    playSound,
    setFx,
    checkMilestones,
    gateInspectMessage,
    gateBlockedMessage,
    maybeEncounter,
    startEncounterTransition,
    healParty,
    tileAt,
    isWalkable,
    isGateTile,
    directionVector,
    reverseDirection,
    openStarterSelect,
    syncFollowerTrail,
    pushFollowerStep,
    startLessonDrill,
    houseComplete,
    meadowComplete,
    ridgeComplete,
    groveComplete,
    fenComplete,
    studioComplete,
  }));
  const {
    tryMove,
    lineJump,
    fileJump,
    dash,
    interactAhead,
  } = app;

  function recordMotion(key) {
    state.lastMotion = key;
  }

  function compositeAction(key, count) {
    return count > 1 ? `${count}${key}` : key;
  }

  function parseActionKey(key) {
    const match = String(key).match(/^([1-9][0-9]*)([hjklwbe])$/);
    if (!match) {
      return { key, count: 1 };
    }
    return {
      key: match[2],
      count: Number(match[1]),
    };
  }

  function lockedControlMessage(id) {
    if (id === "word") {
      return "Word motions unlock after Lesson 1, once you reach Word Meadow.";
    }
    if (id === "command") {
      return "Command mode unlocks when you meet Mentor W.";
    }
    if (id === "line") {
      return "0 and $ unlock in Lesson 3 at Line Ridge.";
    }
    if (id === "find") {
      return "f, t, F, and T unlock in Lesson 5 at Finder Fen.";
    }
    if (id === "quick") {
      return "x becomes Quick Jab after Coach Buffer teaches it.";
    }
    if (id === "count") {
      return "Numeric prefixes unlock in Lesson 4 at Count Grove.";
    }
    if (id === "cycle") {
      return "[ and ] unlock when Coach Buffer joins the lesson.";
    }
    if (id === "file") {
      return "gg and G unlock in the final Macro Tower lesson.";
    }
    if (id === "repeat") {
      return ". unlocks after Lesson 2 is complete.";
    }
    return "That control is not unlocked yet.";
  }

  // High-level overworld motion routing. Lower-level drill and battle input
  // live in their own runtimes.
  function useMotion(key, fromRepeat) {
    if (state.mode === "battle") {
      handleBattleKey(key);
      return;
    }

    const parsedAction = parseActionKey(key);
    const actionKey = parsedAction.key;
    const actionCount = parsedAction.count;

    if (actionKey === "o") {
      state.tree.open = !state.tree.open;
      state.tree.focus = "sections";
      state.tree.itemIndex = 0;
      setMessage(state.tree.open ? "VimTree opened. Use j/k and Enter." : "VimTree closed.");
      return;
    }

    if (actionKey === "h") {
      let moved = false;
      for (let step = 0; step < actionCount; step += 1) {
        if (!tryMove(-1, 0, "left", step > 0)) {
          break;
        }
        moved = true;
      }
      if (moved && actionCount >= 2) {
        state.flags.usedCountMove = true;
        checkMilestones();
      }
      if (moved && !fromRepeat) {
        recordMotion(compositeAction("h", actionCount));
      }
      return;
    }
    if (actionKey === "j") {
      let moved = false;
      for (let step = 0; step < actionCount; step += 1) {
        if (!tryMove(0, 1, "down", step > 0)) {
          break;
        }
        moved = true;
      }
      if (moved && actionCount >= 2) {
        state.flags.usedCountMove = true;
        checkMilestones();
      }
      if (moved && !fromRepeat) {
        recordMotion(compositeAction("j", actionCount));
      }
      return;
    }
    if (actionKey === "k") {
      let moved = false;
      for (let step = 0; step < actionCount; step += 1) {
        if (!tryMove(0, -1, "up", step > 0)) {
          break;
        }
        moved = true;
      }
      if (moved && actionCount >= 2) {
        state.flags.usedCountMove = true;
        checkMilestones();
      }
      if (moved && !fromRepeat) {
        recordMotion(compositeAction("k", actionCount));
      }
      return;
    }
    if (actionKey === "l") {
      let moved = false;
      for (let step = 0; step < actionCount; step += 1) {
        if (!tryMove(1, 0, "right", step > 0)) {
          break;
        }
        moved = true;
      }
      if (moved && actionCount >= 2) {
        state.flags.usedCountMove = true;
        checkMilestones();
      }
      if (moved && !fromRepeat) {
        recordMotion(compositeAction("l", actionCount));
      }
      return;
    }
    if (actionKey === "i") {
      interactAhead();
      return;
    }
    if (actionKey === ":") {
      if (!controlUnlocked("command")) {
        setMessage(lockedControlMessage("command"));
        return;
      }
      state.command.active = true;
      state.command.text = "";
      return;
    }
    if (actionKey === "w") {
      if (!controlUnlocked("word")) {
        setMessage(lockedControlMessage("word"));
        return;
      }
      dash(state.facing, false, actionCount);
      if (!fromRepeat) {
        recordMotion(compositeAction("w", actionCount));
      }
      return;
    }
    if (actionKey === "b") {
      if (!controlUnlocked("word")) {
        setMessage(lockedControlMessage("word"));
        return;
      }
      dash(state.facing, true, actionCount);
      if (!fromRepeat) {
        recordMotion(compositeAction("b", actionCount));
      }
      return;
    }
    if (actionKey === "0") {
      if (!controlUnlocked("line")) {
        setMessage(lockedControlMessage("line"));
        return;
      }
      lineJump("left");
      if (!fromRepeat) {
        recordMotion("0");
      }
      return;
    }
    if (actionKey === "$") {
      if (!controlUnlocked("line")) {
        setMessage(lockedControlMessage("line"));
        return;
      }
      lineJump("right");
      if (!fromRepeat) {
        recordMotion("$");
      }
      return;
    }
    if (actionKey === "gg") {
      if (!controlUnlocked("file")) {
        setMessage(lockedControlMessage("file"));
        return;
      }
      fileJump("up");
      if (!fromRepeat) {
        recordMotion("gg");
      }
      return;
    }
    if (actionKey === "G") {
      if (!controlUnlocked("file")) {
        setMessage(lockedControlMessage("file"));
        return;
      }
      fileJump("down");
      if (!fromRepeat) {
        recordMotion("G");
      }
      return;
    }
    if (actionKey === "[" || actionKey === "]") {
      if (!controlUnlocked("cycle")) {
        setMessage(lockedControlMessage("cycle"));
        return;
      }
      if (cycleParty(actionKey === "[" ? -1 : 1, false) && !fromRepeat) {
        recordMotion(actionKey);
      }
      return;
    }
    if (actionKey === ".") {
      if (!controlUnlocked("repeat")) {
        setMessage(lockedControlMessage("repeat"));
        return;
      }
      if (!state.lastMotion) {
        setMessage("There is no previous motion to repeat.");
        return;
      }
      useMotion(state.lastMotion, true);
      return;
    }
    setMessage("Unknown key. Try h j k l, i, or :help.");
  }

  // Main render loop delegates drawing to scenes.js.
  function render(time) {
    tickAudio();
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    if (state.fx && time > state.fx.endAt) {
      if (!state.fx.persistent) {
        state.fx = null;
      }
    }
    if (state.battle && state.battle.throwResult && time >= state.battle.throwResult.resolveAt) {
      resolveThrowResult();
    }
    if (state.battle && state.battle.pendingEnemyTurn && time >= state.battle.pendingEnemyTurn.resolveAt) {
      const pending = state.battle.pendingEnemyTurn;
      state.battle.pendingEnemyTurn = null;
      enemyTurn(pending.prefix);
    }
    if (state.battle && state.battle.result && time >= state.battle.result.resolveAt) {
      const result = state.battle.result;
      finishBattle(result.message, result.xpReward, result.scoreReward);
    }

    if (state.transition) {
      drawEncounterTransition(time);
      drawRunStrip();
      drawDialogue(time);
      if (state.tree.open) {
        drawTreeOverlay();
      }
      if (state.starterSelect && state.starterSelect.open) {
        drawStarterOverlay(time);
      }
      return;
    }

    const shouldShake = state.mode === "battle" && state.fx && ["hit", "capture", "miss"].includes(state.fx.kind);
    if (shouldShake) {
      const life = Math.max(0, (state.fx.endAt - time) / (state.fx.endAt - state.fx.startedAt || 1));
      ctx.save();
      ctx.translate((Math.random() - 0.5) * 8 * life, (Math.random() - 0.5) * 6 * life);
    }

    if (state.mode === "battle") {
      drawBattle(time);
    } else if (state.mode === "drill") {
      drawOverworld(time);
      drawDrillOverlay(time);
    } else {
      drawOverworld(time);
    }

    if (shouldShake) {
      ctx.restore();
    }
    drawRunStrip();
    drawRewardOverlay();
    if (state.mode !== "drill" && !(state.starterSelect && state.starterSelect.open)) {
      drawDialogue(time);
    }
    if (state.tree.open) {
      drawTreeOverlay();
    }
    if (state.starterSelect && state.starterSelect.open) {
      drawStarterOverlay(time);
    }
  }

  function loop(time) {
    render(time);
    window.requestAnimationFrame(loop);
  }

  // Keyboard input and mode routing.
  document.addEventListener("keydown", (event) => {
    unlockAudio();

    if (state.starterSelect && state.starterSelect.open) {
      const key = normalizeKey(event.key);
      if (["h", "[", "k"].includes(key)) {
        event.preventDefault();
        state.starterSelect.selected =
          (state.starterSelect.selected + state.starterSelect.options.length - 1) % state.starterSelect.options.length;
        setMessage(
          `Starter focus: ${SPECIES[state.starterSelect.options[state.starterSelect.selected]].name}.`,
          state.starterSelect.options[state.starterSelect.selected]
        );
        renderUi();
        return;
      }
      if (["l", "]", "j"].includes(key)) {
        event.preventDefault();
        state.starterSelect.selected = (state.starterSelect.selected + 1) % state.starterSelect.options.length;
        setMessage(
          `Starter focus: ${SPECIES[state.starterSelect.options[state.starterSelect.selected]].name}.`,
          state.starterSelect.options[state.starterSelect.selected]
        );
        renderUi();
        return;
      }
      if (key === "Enter" || key === "i") {
        event.preventDefault();
        chooseStarter(state.starterSelect.selected);
        renderUi();
        return;
      }
      event.preventDefault();
      return;
    }

    if (state.mode === "drill" && state.drill && state.drill.mode === "prompt") {
      handleDrillPromptKey(event);
      return;
    }

    if (state.mode === "drill" && state.drill && state.drill.mode === "insert") {
      handleDrillInsertKey(event);
      return;
    }

    if (state.command.active) {
      handleCommandKey(event, elapsedMs);
      return;
    }

    if (state.rename.active) {
      handleRenameKey(event);
      return;
    }

    if (state.fx && state.fx.kind === "reward" && state.fx.persistent && event.key === "Escape") {
      event.preventDefault();
      state.fx = null;
      setMessage("Victory banner closed. Use R to rename the run or :q to reroll.", "player");
      return;
    }

    if (state.transition) {
      event.preventDefault();
      return;
    }

    const key = normalizeKey(event.key);

    if (state.mode === "drill" && state.drill) {
      const drillStep = state.drill.steps[state.drill.stepIndex] || null;
      const drillAllowed = new Set(["h", "j", "k", "l", "i", "w", "b", "e", "f", "t", "F", "T", ";", ",", "c", "d", "x", "0", "^", "$", "g", "G", "Escape", "/", ":"]);
      const waitingForFindTarget = state.drill.pendingPrefix && ["f", "t", "F", "T"].includes(state.drill.pendingPrefix);
      const commandStepActive = drillStep && drillStep.type === "command";
      if (
        /^[0-9]$/.test(key)
        || drillAllowed.has(key)
        || (waitingForFindTarget && key.length === 1)
        || (commandStepActive && (key === "q" || key === "Enter"))
      ) {
        event.preventDefault();
        handleDrillKey(key);
      }
      return;
    }

    if (state.mode === "battle" && state.battle && state.battle.challenge) {
      const battleChallengeKey = normalizeKey(event.key);
      const allowAnyChar = typeof battleChallengeKey === "string" && battleChallengeKey.length === 1;
      const specialKeys = new Set(["Escape", "Enter", "Backspace", "G", "F", "T", "$", "0", ";", ",", ":"]);
      if (allowAnyChar || specialKeys.has(battleChallengeKey)) {
        event.preventDefault();
        handleBattleKey(battleChallengeKey);
        renderUi();
      }
      return;
    }

    if (state.fx && state.fx.kind === "reward" && state.fx.persistent) {
      if (key !== "Escape" && key !== "R" && key !== ":") {
        event.preventDefault();
        return;
      }
    }

    if (state.pendingPrefix === "g") {
      state.pendingPrefix = "";
      if (key === "g") {
        event.preventDefault();
        useMotion("gg", false);
        renderUi();
        return;
      }
    }

    if (state.mode !== "battle" && !state.tree.open && /^[1-9]$/.test(key)) {
      event.preventDefault();
      state.countBuffer += key;
      setMessage(`Count prefix: ${state.countBuffer}`);
      return;
    }

    if (state.mode !== "battle" && !state.tree.open && state.countBuffer && key === "0") {
      event.preventDefault();
      state.countBuffer += "0";
      setMessage(`Count prefix: ${state.countBuffer}`);
      return;
    }

    const allowedKeys = new Set(["h", "j", "k", "l", "i", "o", ":", "w", "b", "0", "$", "[", "]", ".", "a", "f", "r", "R", "g", "G", "x", "c", "d", "m", "Escape", "Enter"]);
    if (!allowedKeys.has(key)) {
      return;
    }

    event.preventDefault();

    if (state.tree.open) {
      if (handleTreeKey(key)) {
        renderUi();
        return;
      }
    }

    if (key === "g") {
      state.pendingPrefix = "g";
      return;
    }

    if (key === "Escape") {
      state.pendingPrefix = "";
      state.countBuffer = "";
      return;
    }

    if (key === "m") {
      const muted = toggleMute();
      setMessage(muted ? "Audio muted." : "Audio enabled.");
      renderUi();
      return;
    }

    if (key === "R" && state.mode !== "battle") {
      openRenameMode();
      renderUi();
      return;
    }

    if (state.mode === "battle" && (key === "a" || key === "f" || key === "r" || key === "[" || key === "]" || key === "x" || key === "c" || key === "d" || key === "i" || key === "w")) {
      handleBattleKey(key);
      renderUi();
      return;
    }

    const withCount = state.countBuffer && /^(h|j|k|l|w|b)$/.test(key)
      ? `${state.countBuffer}${key}`
      : key;
    state.countBuffer = "";
    useMotion(withCount, false);
    renderUi();
  });

  await beginNewRun();
  loadLeaderboardFromApi();
  window.requestAnimationFrame(loop);
})();
