export function createBattleFlowRuntime(deps) {
  const {
    state,
    createMonster,
    controlUnlocked,
    activeMonster,
    setMessage,
    checkMilestones,
    playSound,
    speciesBattleProfile,
    battleTechniqueList,
    onSwitchEnemyTurn,
  } = deps;

  function currentEncounterTable() {
    if (state.map === "meadow") {
      return [
        { id: "sproutle", min: 3, max: 5 },
        { id: "fizzbat", min: 4, max: 5 },
      ];
    }
    if (state.map === "ridge") {
      return [
        { id: "tabbit", min: 5, max: 7 },
        { id: "fizzbat", min: 5, max: 7 },
      ];
    }
    if (state.map === "grove") {
      return [
        { id: "tabbit", min: 6, max: 8 },
        { id: "sproutle", min: 6, max: 7 },
      ];
    }
    if (state.map === "fen") {
      return [
        { id: "glyphowl", min: 7, max: 8 },
        { id: "fizzbat", min: 7, max: 8 },
        { id: "sproutle", min: 7, max: 8 },
      ];
    }
    if (state.map === "studio") {
      return [
        { id: "slashram", min: 8, max: 9 },
        { id: "glyphowl", min: 7, max: 9 },
        { id: "tabbit", min: 8, max: 9 },
      ];
    }
    return [];
  }

  function makeEncounter(choice) {
    const level = choice.min + Math.floor(Math.random() * (choice.max - choice.min + 1));
    return createMonster(choice.id, level);
  }

  function blankStatusState() {
    return {
      guard: 0,
      evade: 0,
      marked: 0,
      rooted: 0,
      bleed: 0,
    };
  }

  function startEncounterTransition(enemy, isBoss) {
    state.transition = {
      type: "encounter",
      enemy,
      isBoss: Boolean(isBoss),
      startedAt: performance.now(),
      duration: 520,
    };
    playSound("encounter");
  }

  function startBattle(enemy, isBoss) {
    if (isBoss && !state.flags.towerDrillCleared) {
      state.transition = null;
      setMessage("The altar rejects the battle. Clear the final altar code test first.", "macrobat");
      return;
    }
    state.transition = null;
    state.mode = "battle";
    state.battle = {
      enemy,
      isBoss: Boolean(isBoss),
      result: null,
      throwResult: null,
      pendingEnemyTurn: null,
      pendingTechnique: "",
      challenge: null,
      focusedVimOrb: false,
      enemyStatus: blankStatusState(),
      playerStatus: blankStatusState(),
      enemyCooldowns: {},
      turn: 1,
      lastEnemyMove: "",
      lastPlayerTechnique: "",
    };
    if (isBoss) {
      setMessage("Macrobat screeches from the altar. Final lesson live. Use your full Vim toolkit.", "macrobat");
      return;
    }
    const enemyProfile = speciesBattleProfile(enemy.id);
    const specialty = enemyProfile.specialty ? ` ${enemy.name} favors ${enemyProfile.specialty} play.` : "";
    setMessage(`A wild ${enemy.name} appears.${specialty} ${battleTechniqueList().join(", ")}.`, enemy.id);
  }

  function maybeEncounter(tile) {
    if (tile !== "," || state.mode !== "overworld") {
      return;
    }
    const table = currentEncounterTable();
    if (!table.length) {
      return;
    }
    const chanceByMap = {
      meadow: 0.15,
      ridge: 0.2,
      grove: 0.18,
      fen: 0.22,
      studio: 0.2,
    };
    if (Math.random() >= (chanceByMap[state.map] || 0.15)) {
      return;
    }
    const choice = table[Math.floor(Math.random() * table.length)];
    startEncounterTransition(makeEncounter(choice), false);
  }

  function healParty() {
    state.party.forEach((monster) => {
      monster.hp = monster.maxHp;
    });
  }

  function findNextAliveIndex(start, delta) {
    if (!state.party.length) {
      return -1;
    }
    for (let step = 1; step <= state.party.length; step += 1) {
      const index = (start + step * delta + state.party.length) % state.party.length;
      if (state.party[index].hp > 0) {
        return index;
      }
    }
    return -1;
  }

  function applySwitchShield(monster) {
    const profile = speciesBattleProfile(monster.id);
    if (!state.battle || !profile.swapShield) {
      return false;
    }
    state.battle.playerStatus.guard = Math.min(2, state.battle.playerStatus.guard + 1);
    return true;
  }

  function cycleParty(delta, inBattle) {
    if (!controlUnlocked("cycle")) {
      setMessage("Party cycling unlocks after Coach Buffer teaches Lesson 3.");
      return false;
    }
    if (inBattle && state.battle && state.battle.playerStatus.rooted > 0) {
      state.battle.playerStatus.rooted = Math.max(0, state.battle.playerStatus.rooted - 1);
      setMessage("Rooted. You cannot switch yet.");
      return false;
    }
    const next = findNextAliveIndex(state.activeIndex, delta);
    if (next === -1 || next === state.activeIndex) {
      setMessage("No other healthy VimMonsters are ready.");
      return false;
    }
    const firstSwitch = !state.flags.switchedParty;
    state.activeIndex = next;
    state.flags.switchedParty = true;
    playSound("switch");
    const shielded = applySwitchShield(activeMonster());
    setMessage(
      firstSwitch
        ? `${activeMonster().name} is now active and following you.${shielded ? " Trickster shield up." : ""} Lesson 3 switch complete.`
        : `Active VimMonster is now ${activeMonster().name}, and it will follow you.${shielded ? " Trickster shield up." : ""}`,
      activeMonster().id
    );
    if (inBattle) {
      onSwitchEnemyTurn(`${state.battle.enemy.name} attacks while you switch.`);
    }
    checkMilestones();
    return true;
  }

  function gainExperience(monster, amount) {
    const parts = [`${monster.name} gains ${amount} XP.`];
    monster.xp += amount;

    while (monster.xp >= monster.nextXp) {
      monster.xp -= monster.nextXp;
      monster.level += 1;
      monster.nextXp += 5;
      monster.maxHp += 4;
      monster.hp = monster.maxHp;
      monster.attack += 1;
      parts.push(`${monster.name} grew to Lv ${monster.level}.`);
    }

    return parts.join(" ");
  }

  function resetAfterDefeat() {
    healParty();
    state.map = "house";
    state.x = 9;
    state.y = 11;
    state.facing = "up";
    state.mode = "overworld";
    state.battle = null;
    state.transition = null;
    state.fx = null;
    state.activeIndex = 0;
    state.score = Math.max(0, state.score - 120);
    setMessage("Your party blacks out and wakes up back in Home Row House. -120 score. The timer keeps running.", "player");
  }

  function queueBattleFinish(message, xpReward, delay, scoreReward) {
    if (!state.battle) {
      return;
    }
    state.battle.result = {
      message,
      xpReward,
      scoreReward: scoreReward || 0,
      resolveAt: performance.now() + delay,
    };
  }

  function finishBattle(message, xpReward, scoreReward) {
    const active = activeMonster();
    state.mode = "overworld";
    state.battle = null;
    state.fx = null;
    if (scoreReward) {
      state.score += scoreReward;
    }
    if (xpReward && active) {
      setMessage(
        `${message}${scoreReward ? ` +${scoreReward} score.` : ""} ${gainExperience(active, xpReward)}`,
        active.id
      );
    } else {
      setMessage(`${message}${scoreReward ? ` +${scoreReward} score.` : ""}`, active ? active.id : "player");
    }
    checkMilestones();
  }

  return {
    startEncounterTransition,
    startBattle,
    maybeEncounter,
    healParty,
    cycleParty,
    findNextAliveIndex,
    resetAfterDefeat,
    queueBattleFinish,
    finishBattle,
  };
}
