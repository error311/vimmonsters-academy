function clampMin(value, minimum) {
  return Math.max(minimum, value);
}

export function createBattleTechniquesRuntime(deps) {
  const {
    state,
    createMonster,
    activeMonster,
    setMessage,
    setFx,
    playSound,
    speciesBattleProfile,
    queueBattleFinish,
  } = deps;

  function techniqueUnlocked(id) {
    if (id === "quick") {
      return Boolean(state.flags.usedX);
    }
    if (id === "slam") {
      return Boolean(state.flags.usedDd);
    }
    if (id === "focus") {
      return Boolean(state.flags.usedCw);
    }
    if (id === "break") {
      return Boolean(state.flags.usedDw);
    }
    if (id === "inner") {
      return Boolean(state.flags.usedCiw);
    }
    return false;
  }

  function battleTechniqueList() {
    const list = ["a attack"];
    if (techniqueUnlocked("quick")) {
      list.push("x quick jab");
    }
    if (techniqueUnlocked("slam")) {
      list.push("dd heavy slam");
    }
    if (techniqueUnlocked("focus")) {
      list.push("cw focus ball");
    }
    if (techniqueUnlocked("break")) {
      list.push("dw break word");
    }
    if (techniqueUnlocked("inner")) {
      list.push("ciw inner word");
    }
    list.push("f VimOrb");
    list.push("[ ] switch");
    return list;
  }

  function activeTechniqueBonus(type) {
    const profile = speciesBattleProfile(activeMonster().id);
    const bonus = profile.techniqueBonus && profile.techniqueBonus[type];
    return typeof bonus === "number" ? bonus : 0;
  }

  function enemyModifier(type, modifierName) {
    const profile = speciesBattleProfile(state.battle.enemy.id);
    const table = profile[modifierName] || {};
    const value = table[type];
    return typeof value === "number" ? value : 0;
  }

  function applyTechniqueDamage(type, baseBonus, criticalChance, options) {
    const active = activeMonster();
    const enemy = state.battle.enemy;
    const enemyStatus = state.battle.enemyStatus;
    const critical = Math.random() < criticalChance;
    const ignoreEvade = Boolean(options && options.ignoreEvade);

    if (enemyStatus.evade > 0 && !ignoreEvade) {
      enemyStatus.evade -= 1;
      setFx("miss", "enemy", 320, { label: "EVADED" });
      setMessage(`${enemy.name} slips away from the hit.`, enemy.id);
      state.battle.pendingEnemyTurn = {
        resolveAt: performance.now() + 420,
        prefix: `${enemy.name} uses the opening.`,
      };
      return;
    }

    let damage = active.attack
      + Math.floor(Math.random() * 3)
      - 1
      + baseBonus
      + activeTechniqueBonus(type)
      + enemyModifier(type, "weak")
      - enemyModifier(type, "resist")
      + (critical ? 2 : 0);

    if (enemyStatus.marked > 0 && (type === "quick" || type === "break")) {
      damage += 2;
    }
    if (enemyStatus.guard > 0) {
      damage -= 3;
      enemyStatus.guard -= 1;
    }

    damage = clampMin(damage, 2);
    enemy.hp = Math.max(0, enemy.hp - damage);
    setFx("hit", "enemy", options.fxDuration || 340, { damage, critical });

    if (options && options.onHit) {
      options.onHit();
    }
    if (options && options.scoreBonus) {
      state.score += options.scoreBonus;
    }
    state.battle.lastPlayerTechnique = type;

    if (enemy.hp === 0) {
      if (state.battle.isBoss) {
        state.flags.finalWon = true;
        queueBattleFinish("Macrobat falls. The academy clears its final lesson.", 14, 620, 150 + (options.scoreBonus || 0));
        return;
      }
      queueBattleFinish(
        `${critical ? "Critical! " : ""}${active.name} ${options.knockoutVerb || "knocks out"} ${enemy.name}.`,
        6 + enemy.level,
        520,
        25 + enemy.level * 3 + (options.scoreBonus || 0)
      );
      return;
    }

    setMessage(
      `${critical ? "Critical! " : ""}${active.name} ${options.label} ${enemy.name} for ${damage}.${options.scoreBonus ? ` +${options.scoreBonus} score.` : ""}`,
      active.id
    );
    state.battle.pendingEnemyTurn = {
      resolveAt: performance.now() + (options.counterDelay || 650),
      prefix: options.counterPrefix || `${enemy.name} answers back.`,
    };
  }

  function attackEnemy() {
    applyTechniqueDamage("attack", 0, 0.14, {
      label: "strikes",
      scoreBonus: 0,
      fxDuration: 340,
      counterDelay: 650,
      knockoutVerb: "knocks out",
    });
  }

  function quickAttack() {
    applyTechniqueDamage("quick", 1, 0.24, {
      label: "slashes",
      scoreBonus: 6,
      fxDuration: 260,
      counterDelay: 520,
      ignoreEvade: true,
      knockoutVerb: "cuts down",
      counterPrefix: `${state.battle.enemy.name} tries to recover.`,
      onHit() {
        state.battle.enemyStatus.marked = Math.max(1, state.battle.enemyStatus.marked);
      },
    });
  }

  function heavySlam() {
    applyTechniqueDamage("slam", 3, 0.1, {
      label: "drops a heavy slam on",
      scoreBonus: 10,
      fxDuration: 420,
      counterDelay: 760,
      knockoutVerb: "crushes",
      counterPrefix: `${state.battle.enemy.name} staggers, then swings back.`,
    });
  }

  function breakWord() {
    applyTechniqueDamage("break", 2, 0.16, {
      label: "breaks open",
      scoreBonus: 12,
      fxDuration: 360,
      counterDelay: 620,
      knockoutVerb: "splinters",
      counterPrefix: `${state.battle.enemy.name} tries to rebuild its stance.`,
      onHit() {
        state.battle.enemyStatus.guard = 0;
        state.battle.enemyStatus.evade = 0;
        state.battle.enemyStatus.marked = 0;
        state.battle.enemyStatus.bleed = Math.min(2, state.battle.enemyStatus.bleed + 1);
      },
    });
  }

  function innerWord() {
    const active = activeMonster();
    const healed = Math.min(active.maxHp - active.hp, 8 + Math.floor(active.level / 2));
    active.hp += healed;
    state.battle.focusedVimOrb = true;
    state.battle.lastPlayerTechnique = "inner";
    state.battle.playerStatus.rooted = 0;
    state.battle.playerStatus.bleed = 0;
    state.battle.playerStatus.marked = 0;
    state.score += 8;
    playSound("focus");
    setMessage(`ciw restores ${healed} HP, clears status pressure, and primes a Focus Ball. +8 score.`, active.id);
    state.battle.pendingEnemyTurn = {
      resolveAt: performance.now() + 520,
      prefix: `${state.battle.enemy.name} attacks while you refocus.`,
    };
  }

  function focusVimOrb() {
    if (state.battle.focusedVimOrb) {
      setMessage("Focus Ball is already primed. Throw the VimOrb with f.", activeMonster().id);
      return;
    }
    state.battle.focusedVimOrb = true;
    state.battle.lastPlayerTechnique = "focus";
    state.score += 4;
    playSound("focus");
    setMessage("cw sharpens the next VimOrb. Catch rate up. +4 score.", activeMonster().id);
    state.battle.pendingEnemyTurn = {
      resolveAt: performance.now() + 480,
      prefix: `${state.battle.enemy.name} presses while you focus.`,
    };
  }

  function throwVimOrb() {
    if (state.vimOrbs <= 0) {
      setMessage("You are out of VimOrbs.");
      return;
    }
    if (state.battle.throwResult) {
      setMessage("The VimOrb is already mid-flight.");
      return;
    }
    const enemy = state.battle.enemy;
    const enemyProfile = speciesBattleProfile(enemy.id);
    const focused = Boolean(state.battle.focusedVimOrb);
    const activeProfile = speciesBattleProfile(activeMonster().id);
    const focusBonus = typeof activeProfile.techniqueBonus?.focus === "number" ? activeProfile.techniqueBonus.focus : 0;
    const markedBonus = state.battle.enemyStatus.marked > 0 ? 0.08 : 0;
    const penalty = enemyProfile.catchPenalty || 0;

    state.vimOrbs -= 1;
    state.battle.focusedVimOrb = false;
    setFx("vimOrb", "enemy", 420, {
      trail: true,
      focused,
    });

    const missingHp = enemy.maxHp - enemy.hp;
    const catchRate = 0.18
      + missingHp / enemy.maxHp / 1.6
      + (focused ? 0.18 : 0)
      + focusBonus
      + markedBonus
      - penalty;

    const caught = Math.random() < catchRate;
    const now = performance.now();
    state.battle.throwResult = {
      resolveAt: now + 420,
      caught,
      focused,
    };
    setMessage(focused ? "You throw a Focus Ball with a boosted catch rate." : "You arc a VimOrb toward the target.", "player");
  }

  function resolveThrowResult() {
    if (!state.battle || !state.battle.throwResult) {
      return;
    }
    const throwResult = state.battle.throwResult;
    const enemy = state.battle.enemy;
    const active = activeMonster();
    state.battle.throwResult = null;

    if (throwResult.caught) {
      if (state.party.length < 6) {
        state.party.push(createMonster(enemy.id, enemy.level));
      }
      state.flags.caughtFirst = true;
      setFx("capture", "enemy", 1400, { capturedId: enemy.id, boss: state.battle.isBoss });
      if (state.battle.isBoss) {
        state.flags.finalWon = true;
        queueBattleFinish(
          `Click. You caught ${enemy.name}, the academy's final challenge.`,
          12,
          1400,
          180 + (throwResult.focused ? 12 : 0)
        );
        return;
      }
      queueBattleFinish(
        `Click. ${enemy.name} is now part of your party.`,
        Math.max(3, Math.floor(enemy.level / 2)),
        1400,
        35 + enemy.level * 4 + (throwResult.focused ? 12 : 0)
      );
      return;
    }

    setFx("miss", "enemy", 360, { label: "BROKE FREE" });
    if (throwResult.focused) {
      state.score = Math.max(0, state.score - 6);
    }
    state.battle.pendingEnemyTurn = {
      resolveAt: performance.now() + 280,
      prefix: `${active.name} misses the catch.${throwResult.focused ? " -6 score." : ""}`,
    };
    setMessage("The VimOrb snaps shut on empty air.", enemy.id);
  }

  return {
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
  };
}
