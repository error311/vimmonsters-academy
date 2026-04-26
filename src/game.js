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
import { buildDefaultGameState, createGameRunRuntime } from "./game-run-runtime.js";
import { createGameWorldHelpers } from "./game-world-helpers.js";
import { createGameMotionRuntime } from "./game-motion-runtime.js";
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

  const state = buildDefaultGameState({
    createDefaultState,
    loadMeta,
    storage: window.localStorage,
    metaKey: META_KEY,
  });
  ctx.imageSmoothingEnabled = false;

  function activeMonster() {
    return state.party[state.activeIndex];
  }

  const {
    shortSeed,
    houseStageIndex,
    currentHouseTargetLabel,
    houseRouteKeys,
    houseCurrentSegmentKeys,
    housePathTone,
    markHouseTrailPosition,
    mapRows,
    tileAt,
    isWalkable,
    isGateTile,
    mapOffset,
    directionVector,
    reverseDirection,
    monsterPalette,
  } = createGameWorldHelpers({
    state,
    maps: MAPS,
    species: SPECIES,
    cellKey,
    screenWidth: SCREEN_WIDTH,
    tileSize: TILE_SIZE,
    viewTop: VIEW_TOP,
    viewHeight: VIEW_HEIGHT,
  });

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
    activeMonster,
    setMessage,
    setFx,
    checkMilestones,
    openRenameMode,
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

  function elapsedMs() {
    return (state.finishedAt || Date.now()) - state.runStartedAt;
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

  const {
    defaultState,
    saveMeta,
    resetRun,
    commitRunName,
    finishRun,
    loadLeaderboardFromApi,
    beginNewRun,
  } = createGameRunRuntime({
    state,
    storage: window.localStorage,
    metaKey: META_KEY,
    fetchImpl: window.fetch.bind(window),
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
  });

  Object.assign(app, {
    defaultState,
    saveMeta,
    resetRun,
    commitRunName,
  });

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

  Object.assign(app, createInputRuntime(app));
  const {
    handleCommandKey,
    handleRenameKey,
    normalizeKey,
    handleTreeKey,
  } = app;

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
    markHouseTrailPosition,
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

  Object.assign(app, createGameMotionRuntime({
    state,
    controlUnlocked,
    setMessage,
    checkMilestones,
    handleBattleKey,
    tryMove,
    interactAhead,
    dash,
    lineJump,
    fileJump,
    cycleParty,
  }));
  const {
    parseActionKey,
    useMotion,
  } = app;

  Object.assign(app, createDrillRuntime(app));
  const {
    handleDrillKey,
    handleDrillPromptKey,
    handleDrillInsertKey,
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
