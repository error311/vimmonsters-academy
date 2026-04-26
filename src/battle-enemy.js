export function createBattleEnemyRuntime(deps) {
  const {
    state,
    activeMonster,
    setMessage,
    setFx,
    speciesBattleProfile,
    findNextAliveIndex,
    resetAfterDefeat,
    queueBattleFinish,
  } = deps;

  function statusDamage(monster, amount) {
    monster.hp = Math.max(0, monster.hp - amount);
    return monster.hp === 0;
  }

  function applyEnemyBleedTick() {
    if (!state.battle || state.battle.enemyStatus.bleed <= 0) {
      return false;
    }
    const enemy = state.battle.enemy;
    const damage = 2 + Math.floor(enemy.level / 5);
    state.battle.enemyStatus.bleed -= 1;
    enemy.hp = Math.max(0, enemy.hp - damage);
    setFx("hit", "enemy", 260, { damage, critical: false });
    if (enemy.hp === 0) {
      if (state.battle.isBoss) {
        state.flags.finalWon = true;
        queueBattleFinish("Macrobat buckles under the pressure. The academy clears its final lesson.", 14, 520, 165);
      } else {
        queueBattleFinish(`${enemy.name} bleeds out and collapses.`, 6 + enemy.level, 520, 28 + enemy.level * 3);
      }
      return true;
    }
    return false;
  }

  function applyPlayerOngoingEffects() {
    if (!state.battle) {
      return false;
    }
    const active = activeMonster();
    if (state.battle.playerStatus.bleed <= 0) {
      return false;
    }
    const damage = 2 + Math.floor(state.battle.enemy.level / 6);
    state.battle.playerStatus.bleed -= 1;
    statusDamage(active, damage);
    setFx("hit", "player", 240, { damage, critical: false });

    if (active.hp === 0) {
      const nextAlive = findNextAliveIndex(state.activeIndex, 1);
      if (nextAlive === -1 || nextAlive === state.activeIndex) {
        resetAfterDefeat();
        return true;
      }
      state.activeIndex = nextAlive;
      setMessage(`${active.name} drops from bleed damage. ${activeMonster().name} jumps in.`, activeMonster().id);
      return true;
    }

    setMessage(`${active.name} takes ${damage} bleed damage.`, active.id);
    return true;
  }

  function spendEnemyCooldowns() {
    if (!state.battle) {
      return;
    }
    Object.keys(state.battle.enemyCooldowns).forEach((move) => {
      state.battle.enemyCooldowns[move] = Math.max(0, state.battle.enemyCooldowns[move] - 1);
    });
  }

  function setEnemyCooldown(move, turns) {
    if (!state.battle) {
      return;
    }
    state.battle.enemyCooldowns[move] = turns;
  }

  function chooseEnemyMove() {
    const moves = speciesBattleProfile(state.battle.enemy.id).enemyMoves || ["lash"];
    spendEnemyCooldowns();
    const available = moves.filter((move) => !state.battle.enemyCooldowns[move]);
    const pool = available.length ? available : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function applyEnemyMoveDamage(move, baseDamage, options) {
    const active = activeMonster();
    const status = state.battle.playerStatus;
    const markedBonus = status.marked > 0 && options.markBonus ? options.markBonus : 0;
    const critical = Math.random() < (options.criticalChance || 0.08);
    let damage = baseDamage + markedBonus + (critical ? 2 : 0);

    if (status.guard > 0) {
      damage = Math.max(1, damage - 3);
      status.guard -= 1;
    }

    active.hp = Math.max(0, active.hp - damage);
    setFx("hit", "player", 220, { damage, critical });

    if (options.root) {
      status.rooted = Math.max(status.rooted, 1);
    }
    if (options.mark) {
      status.marked = Math.max(status.marked, 1);
    }
    if (options.bleed) {
      status.bleed = Math.max(status.bleed, 2);
    }
    if (options.clearFocus) {
      state.battle.focusedVimOrb = false;
      state.battle.pendingTechnique = "";
    }

    if (active.hp === 0) {
      const nextAlive = findNextAliveIndex(state.activeIndex, 1);
      if (nextAlive === -1 || nextAlive === state.activeIndex) {
        resetAfterDefeat();
        return;
      }
      state.activeIndex = nextAlive;
      setMessage(`${options.prefix} ${active.name} faints. ${activeMonster().name} jumps in.`, activeMonster().id);
      return;
    }

    setMessage(`${options.prefix} ${critical ? " Critical hit." : ""} ${state.battle.enemy.name} hits ${active.name} for ${damage}.`, state.battle.enemy.id);
  }

  function enemyTurn(prefix) {
    if (!state.battle) {
      return;
    }
    if (applyEnemyBleedTick()) {
      return;
    }

    const enemy = state.battle.enemy;
    const move = chooseEnemyMove();
    state.battle.lastEnemyMove = move;
    state.battle.turn += 1;

    if (move === "guard") {
      state.battle.enemyStatus.guard = Math.min(2, state.battle.enemyStatus.guard + 1);
      setEnemyCooldown(move, 2);
      setMessage(`${prefix} ${enemy.name} braces and raises a guard.`, enemy.id);
      return;
    }
    if (move === "evade") {
      state.battle.enemyStatus.evade = Math.min(1, state.battle.enemyStatus.evade + 1);
      setEnemyCooldown(move, 2);
      setMessage(`${prefix} ${enemy.name} darts sideways and prepares to evade.`, enemy.id);
      return;
    }
    if (move === "mark") {
      applyEnemyMoveDamage(move, enemy.attack + 1, {
        prefix: `${prefix} ${enemy.name} marks the active line.`,
        mark: true,
        markBonus: 0,
      });
      setEnemyCooldown(move, 2);
      return;
    }
    if (move === "root") {
      applyEnemyMoveDamage(move, enemy.attack + 1, {
        prefix: `${prefix} ${enemy.name} tangles the field with roots.`,
        root: true,
        markBonus: 1,
      });
      setEnemyCooldown(move, 2);
      return;
    }
    if (move === "bleed") {
      applyEnemyMoveDamage(move, enemy.attack + 1, {
        prefix: `${prefix} ${enemy.name} opens a bleeding cut.`,
        bleed: true,
        markBonus: 1,
      });
      setEnemyCooldown(move, 2);
      return;
    }
    if (move === "hop") {
      state.battle.enemyStatus.evade = Math.min(1, state.battle.enemyStatus.evade + 1);
      applyEnemyMoveDamage(move, enemy.attack, {
        prefix: `${prefix} ${enemy.name} hops through the opening.`,
        markBonus: 0,
      });
      setEnemyCooldown(move, 1);
      return;
    }
    if (move === "feint") {
      applyEnemyMoveDamage(move, enemy.attack + 1, {
        prefix: `${prefix} ${enemy.name} feints and breaks your setup.`,
        clearFocus: true,
        markBonus: 1,
      });
      setEnemyCooldown(move, 2);
      return;
    }
    if (move === "peck") {
      applyEnemyMoveDamage(move, enemy.attack + 1, {
        prefix: `${prefix} ${enemy.name} pecks at the marked weak point.`,
        markBonus: 2,
      });
      state.battle.playerStatus.marked = 0;
      setEnemyCooldown(move, 1);
      return;
    }
    if (move === "echobite") {
      applyEnemyMoveDamage(move, enemy.attack + 2, {
        prefix: `${prefix} ${enemy.name} bites with an echo burst.`,
        markBonus: 1,
      });
      setEnemyCooldown(move, 2);
      return;
    }
    if (move === "macroguard") {
      state.battle.enemyStatus.guard = Math.min(2, state.battle.enemyStatus.guard + 1);
      state.battle.enemyStatus.evade = Math.min(1, state.battle.enemyStatus.evade + 1);
      setEnemyCooldown(move, 3);
      setMessage(`${prefix} ${enemy.name} layers a macro guard over the field.`, enemy.id);
      return;
    }
    if (move === "macroecho") {
      applyEnemyMoveDamage(move, enemy.attack + 3, {
        prefix: `${prefix} ${enemy.name} unleashes a macro echo.`,
        bleed: true,
        markBonus: 2,
      });
      setEnemyCooldown(move, 2);
      return;
    }

    applyEnemyMoveDamage(move, enemy.attack + (move === "shard" ? 2 : move === "lash" ? 1 : 0), {
      prefix: `${prefix} ${enemy.name} attacks.`,
      markBonus: 1,
    });
    setEnemyCooldown(move, move === "shard" ? 2 : 1);
  }

  return {
    applyPlayerOngoingEffects,
    enemyTurn,
  };
}
