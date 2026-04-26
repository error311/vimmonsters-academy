// Owns: top-level battle composition and battle input routing. Does not own:
// canvas rendering, keyboard parsing outside battle mode, or broader
// lesson/map progression decisions.

import { createBattleChallengeRuntime } from "./battle-challenge-runtime.js";
import { createBattleEnemyRuntime } from "./battle-enemy.js";
import { createBattleFlowRuntime } from "./battle-flow.js";
import { createBattleTechniquesRuntime } from "./battle-techniques.js";

export function createBattleRuntime(deps) {
  const {
    state,
    species,
    createMonster,
    controlUnlocked,
    activeMonster,
    setMessage,
    setFx,
    checkMilestones,
    playSound,
  } = deps;

  function speciesBattleProfile(id) {
    return (species[id] && species[id].battle) || {};
  }

  let enemyTurn = () => {};
  let techniquesRuntime;

  const {
    startEncounterTransition,
    startBattle,
    maybeEncounter,
    healParty,
    cycleParty,
    findNextAliveIndex,
    resetAfterDefeat,
    queueBattleFinish,
    finishBattle,
  } = createBattleFlowRuntime({
    state,
    createMonster,
    controlUnlocked,
    activeMonster,
    setMessage,
    checkMilestones,
    playSound,
    speciesBattleProfile,
    battleTechniqueList() {
      return techniquesRuntime.battleTechniqueList();
    },
    onSwitchEnemyTurn(prefix) {
      enemyTurn(prefix);
    },
  });

  techniquesRuntime = createBattleTechniquesRuntime({
    state,
    createMonster,
    activeMonster,
    setMessage,
    setFx,
    playSound,
    speciesBattleProfile,
    queueBattleFinish,
  });

  const {
    techniqueUnlocked,
    battleTechniqueList,
    attackEnemy,
    quickAttack,
    heavySlam,
    breakWord,
    innerWord,
    focusVimOrb,
    throwVimOrb,
    resolveThrowResult,
  } = techniquesRuntime;

  const {
    startBattleChallenge,
    handleBattleChallengeKey,
  } = createBattleChallengeRuntime({
    state,
    activeMonster,
    setMessage,
    onAttack() {
      attackEnemy();
    },
    onSlam() {
      heavySlam();
    },
    onThrow() {
      throwVimOrb();
    },
  });

  const enemyRuntime = createBattleEnemyRuntime({
    state,
    activeMonster,
    setMessage,
    setFx,
    speciesBattleProfile,
    findNextAliveIndex,
    resetAfterDefeat,
    queueBattleFinish,
  });
  const { applyPlayerOngoingEffects } = enemyRuntime;
  enemyTurn = enemyRuntime.enemyTurn;

  function runBattle() {
    if (state.battle && state.battle.isBoss) {
      setMessage("Macrobat blocks your escape.", "macrobat");
      return;
    }
    if (state.battle && state.battle.playerStatus.rooted > 0) {
      state.battle.playerStatus.rooted = Math.max(0, state.battle.playerStatus.rooted - 1);
      setMessage("Rooted. You cannot run this turn.");
      return;
    }
    if (Math.random() < 0.85) {
      state.mode = "overworld";
      state.battle = null;
      state.fx = null;
      state.score = Math.max(0, state.score - 10);
      setMessage("You escape the battle. -10 score.", "player");
      return;
    }
    enemyTurn("The escape fails.");
  }

  function handleBattleKey(key) {
    if (
      state.battle.throwResult ||
      state.battle.pendingEnemyTurn ||
      (state.battle.result && performance.now() < state.battle.result.resolveAt)
    ) {
      setMessage("Wait for the battle animation to finish.");
      return;
    }

    if (state.battle.challenge) {
      handleBattleChallengeKey(key);
      return;
    }

    if (applyPlayerOngoingEffects()) {
      if (state.mode === "battle") {
        return;
      }
      return;
    }

    if (state.battle.pendingTechnique === "d") {
      state.battle.pendingTechnique = "";
      if (key === "d" && techniqueUnlocked("slam")) {
        startBattleChallenge("slam");
        return;
      }
      if (key === "w" && techniqueUnlocked("break")) {
        breakWord();
        return;
      }
      setMessage("Operator timing broke. Use dd for Heavy Slam or dw for Break Word.");
      return;
    }

    if (state.battle.pendingTechnique === "c") {
      state.battle.pendingTechnique = "";
      if (key === "w" && techniqueUnlocked("focus")) {
        focusVimOrb();
        return;
      }
      if (key === "i" && techniqueUnlocked("inner")) {
        state.battle.pendingTechnique = "ci";
        setMessage("Inner Word primed. Press w to complete ciw.", activeMonster().id);
        return;
      }
      setMessage("Operator timing broke. Use cw for Focus Ball or ciw for Inner Word.");
      return;
    }

    if (state.battle.pendingTechnique === "ci") {
      state.battle.pendingTechnique = "";
      if (key === "w" && techniqueUnlocked("inner")) {
        innerWord();
        return;
      }
      setMessage("Inner Word needs ciw. The battle tempo reset.");
      return;
    }

    if (key === "a") {
      startBattleChallenge("attack");
      return;
    }
    if (key === "f") {
      startBattleChallenge("throw");
      return;
    }
    if (key === "r") {
      runBattle();
      return;
    }
    if (key === "x") {
      if (!techniqueUnlocked("quick")) {
        setMessage("x becomes Quick Jab after Coach Buffer's drill.");
        return;
      }
      quickAttack();
      return;
    }
    if (key === "d") {
      if (!techniqueUnlocked("slam") && !techniqueUnlocked("break")) {
        setMessage("d operators unlock after the later academy drills.");
        return;
      }
      state.battle.pendingTechnique = "d";
      setMessage("d operator primed. Press d for Heavy Slam or w for Break Word.", activeMonster().id);
      return;
    }
    if (key === "c") {
      if (!techniqueUnlocked("focus") && !techniqueUnlocked("inner")) {
        setMessage("c operators unlock after Sage Count and Scribe Edit.");
        return;
      }
      state.battle.pendingTechnique = "c";
      setMessage("c operator primed. Press w for Focus Ball or i then w for Inner Word.", activeMonster().id);
      return;
    }
    if (key === "[" || key === "]") {
      cycleParty(key === "[" ? -1 : 1, true);
      return;
    }

    setMessage(`Battle controls: ${battleTechniqueList().join(", ")}, r run.`);
  }

  return {
    startEncounterTransition,
    startBattle,
    maybeEncounter,
    healParty,
    cycleParty,
    finishBattle,
    enemyTurn,
    resolveThrowResult,
    handleBattleKey,
  };
}
