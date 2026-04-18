// Owns: encounter tables, battle state transitions, damage/capture flow, and
// party switching rules. Does not own: canvas rendering, keyboard parsing
// outside battle mode, or broader lesson/map progression decisions.

import { createBattleChallenge } from "./battle-challenges.js";

function clampMin(value, minimum) {
  return Math.max(minimum, value);
}

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

  function parseBattleMotion(key) {
    const match = String(key).match(/^([1-9][0-9]*)([hjklwbe])$/);
    if (!match) {
      return { key, count: 1 };
    }
    return {
      key: match[2],
      count: Number(match[1]),
    };
  }

  function reverseFindDirection(direction) {
    if (direction === "f") {
      return "F";
    }
    if (direction === "t") {
      return "T";
    }
    if (direction === "F") {
      return "f";
    }
    if (direction === "T") {
      return "t";
    }
    return direction;
  }

  function resolveBattleRepeatFindKey(challenge, key) {
    if (!challenge || !challenge.lastFind) {
      return null;
    }
    const direction = key === "," ? reverseFindDirection(challenge.lastFind.direction) : challenge.lastFind.direction;
    return `${direction}${challenge.lastFind.targetChar}`;
  }

  function currentBattleChallengeStep() {
    if (!state.battle || !state.battle.challenge) {
      return null;
    }
    return state.battle.challenge.steps[state.battle.challenge.stepIndex] || null;
  }

  function setBattleChallengeFeedback(message, tone) {
    if (!state.battle || !state.battle.challenge) {
      return;
    }
    state.battle.challenge.feedback = message;
    state.battle.challenge.feedbackTone = tone || "hint";
  }

  function challengeLineLength(challenge, row) {
    return Math.max(1, (challenge.lines[row] || "").length);
  }

  function setChallengeCursor(challenge, row, col) {
    const nextRow = Math.max(0, Math.min(row, challenge.lines.length - 1));
    const maxCol = challengeLineLength(challenge, nextRow) - 1;
    challenge.cursor.row = nextRow;
    challenge.cursor.col = Math.max(0, Math.min(col, maxCol));
    if (!challenge.cursorVisual) {
      challenge.cursorVisual = {
        row: challenge.cursor.row,
        col: challenge.cursor.col,
      };
    }
  }

  function challengeWordTokens(challenge) {
    const tokens = [];
    challenge.lines.forEach((line, row) => {
      [...String(line).matchAll(/[A-Za-z_]+/g)].forEach((match) => {
        tokens.push({
          row,
          col: match.index,
          end: match.index + match[0].length - 1,
          text: match[0],
        });
      });
    });
    return tokens;
  }

  function challengeMoveWordForward(challenge, count) {
    const tokens = challengeWordTokens(challenge);
    let row = challenge.cursor.row;
    let col = challenge.cursor.col;
    for (let step = 0; step < count; step += 1) {
      const next = tokens.find((token) => token.row > row || (token.row === row && token.col > col));
      if (!next) {
        return false;
      }
      row = next.row;
      col = next.col;
    }
    setChallengeCursor(challenge, row, col);
    return true;
  }

  function challengeMoveWordBackward(challenge, count) {
    const tokens = challengeWordTokens(challenge);
    let row = challenge.cursor.row;
    let col = challenge.cursor.col;
    for (let step = 0; step < count; step += 1) {
      let previous = null;
      tokens.forEach((token) => {
        if (token.row < row || (token.row === row && token.col < col)) {
          previous = token;
        }
      });
      if (!previous) {
        return false;
      }
      row = previous.row;
      col = previous.col;
    }
    setChallengeCursor(challenge, row, col);
    return true;
  }

  function challengeMoveWordEndForward(challenge, count) {
    const tokens = challengeWordTokens(challenge);
    let row = challenge.cursor.row;
    let col = challenge.cursor.col;
    for (let step = 0; step < count; step += 1) {
      const next = tokens.find((token) => token.row > row || (token.row === row && token.end >= col));
      if (!next) {
        return false;
      }
      row = next.row;
      col = next.end;
    }
    setChallengeCursor(challenge, row, col);
    return true;
  }

  function applyBattleChallengeMotion(challenge, key) {
    const parsed = parseBattleMotion(key);
    const actionKey = parsed.key;
    const count = parsed.count;
    const row = challenge.cursor.row;
    const col = challenge.cursor.col;

    if (actionKey === "h") {
      setChallengeCursor(challenge, row, col - count);
      return true;
    }
    if (actionKey === "l") {
      setChallengeCursor(challenge, row, col + count);
      return true;
    }
    if (actionKey === "j") {
      setChallengeCursor(challenge, row + count, col);
      return true;
    }
    if (actionKey === "k") {
      setChallengeCursor(challenge, row - count, col);
      return true;
    }
    if (actionKey === "0") {
      setChallengeCursor(challenge, row, 0);
      return true;
    }
    if (actionKey === "$") {
      setChallengeCursor(challenge, row, challengeLineLength(challenge, row) - 1);
      return true;
    }
    if (actionKey === "gg") {
      setChallengeCursor(challenge, 0, 0);
      return true;
    }
    if (actionKey === "G") {
      setChallengeCursor(challenge, challenge.lines.length - 1, 0);
      return true;
    }
    if (actionKey === "w") {
      return challengeMoveWordForward(challenge, count);
    }
    if (actionKey === "b") {
      return challengeMoveWordBackward(challenge, count);
    }
    if (actionKey === "e") {
      return challengeMoveWordEndForward(challenge, count);
    }
    if (key === ";" || key === ",") {
      const repeated = resolveBattleRepeatFindKey(challenge, key);
      if (!repeated) {
        return false;
      }
      key = repeated;
    }
    if (/^[ftFT].$/.test(key)) {
      const direction = key[0];
      const targetChar = key[1];
      const line = challenge.lines[row] || "";
      challenge.lastFind = {
        direction,
        targetChar,
      };
      if (direction === "f") {
        const next = line.indexOf(targetChar, col + 1);
        if (next < 0) {
          return false;
        }
        setChallengeCursor(challenge, row, next);
        return true;
      }
      if (direction === "t") {
        const next = line.indexOf(targetChar, col + 1);
        if (next < 1) {
          return false;
        }
        setChallengeCursor(challenge, row, next - 1);
        return true;
      }
      if (direction === "F") {
        const next = line.lastIndexOf(targetChar, col - 1);
        if (next < 0) {
          return false;
        }
        setChallengeCursor(challenge, row, next);
        return true;
      }
      if (direction === "T") {
        const next = line.lastIndexOf(targetChar, col - 1);
        if (next < 0 || next + 1 > col) {
          return false;
        }
        setChallengeCursor(challenge, row, next + 1);
        return true;
      }
    }
    return false;
  }

  function completeBattleChallenge() {
    if (!state.battle || !state.battle.challenge) {
      return;
    }
    const challenge = state.battle.challenge;
    challenge.stepIndex += 1;
    challenge.pendingPrefix = "";
    challenge.countBuffer = "";
    const step = currentBattleChallengeStep();
    if (step) {
      setBattleChallengeFeedback(step.type === "action"
        ? `Now use ${step.expect} to finish the technique.`
        : `Locked in. ${challenge.instruction}`, "success");
      return;
    }
    state.battle.challenge = null;
    if (challenge.actionId === "attack") {
      attackEnemy();
      return;
    }
    if (challenge.actionId === "slam") {
      heavySlam();
      return;
    }
    throwVimOrb();
  }

  function failBattleChallenge(message) {
    if (!state.battle || !state.battle.challenge) {
      return;
    }
    const actionId = state.battle.challenge.actionId;
    state.battle.challenge = null;
    state.score = Math.max(0, state.score - 8);
    setMessage(`${message} Turn lost. -8 score.`, state.battle.enemy.id);
    state.battle.pendingEnemyTurn = {
      resolveAt: performance.now() + 420,
      prefix:
        actionId === "throw"
          ? `${state.battle.enemy.name} punishes the failed throw setup.`
          : `${state.battle.enemy.name} punishes the missed technique.`,
    };
  }

  function startBattleChallenge(actionId) {
    if (!state.battle) {
      return;
    }
    state.battle.challenge = createBattleChallenge(actionId);
    setMessage(
      actionId === "attack"
        ? "Battle drill: move the cursor, then use a to release the strike."
        : actionId === "slam"
          ? "Battle drill: line up the row, then use dd to drop the slam."
          : "Battle drill: line up the marked character with repeated find motions to throw the VimOrb.",
      activeMonster().id
    );
  }

  function handleBattleChallengeKey(key) {
    const challenge = state.battle && state.battle.challenge;
    const step = currentBattleChallengeStep();
    if (!challenge || !step) {
      return false;
    }

    if (/^[1-9]$/.test(key)) {
      challenge.countBuffer += key;
      setBattleChallengeFeedback(`Count prefix: ${challenge.countBuffer}`, "accent");
      return true;
    }
    if (challenge.countBuffer && key === "0") {
      challenge.countBuffer += "0";
      setBattleChallengeFeedback(`Count prefix: ${challenge.countBuffer}`, "accent");
      return true;
    }

    if (challenge.pendingPrefix === "g") {
      challenge.pendingPrefix = "";
      if (key === "g") {
        key = "gg";
      }
    } else if (["f", "t", "F", "T"].includes(challenge.pendingPrefix)) {
      key = `${challenge.pendingPrefix}${key}`;
      challenge.pendingPrefix = "";
    } else if (challenge.pendingPrefix === "d") {
      challenge.pendingPrefix = "";
      if (key === "d") {
        key = "dd";
      }
    } else if (key === "g") {
      challenge.pendingPrefix = "g";
      setBattleChallengeFeedback("Waiting for the second g.", "accent");
      return true;
    } else if (["f", "t", "F", "T"].includes(key)) {
      challenge.pendingPrefix = key;
      setBattleChallengeFeedback(`Waiting for the target character after ${key}.`, "accent");
      return true;
    } else if (key === "d" && step.type === "action" && step.expect === "dd") {
      challenge.pendingPrefix = "d";
      setBattleChallengeFeedback("Heavy Slam primed. Press d again to complete dd.", "accent");
      return true;
    }

    if (step.type === "action") {
      if (key === step.expect && challenge.cursor.row === step.target.row && challenge.cursor.col === step.target.col) {
        completeBattleChallenge();
        return true;
      }
      failBattleChallenge(`Need ${step.expect} at line ${step.target.row + 1}, col ${step.target.col + 1}.`);
      return true;
    }

    const withCount = challenge.countBuffer && /^(h|j|k|l|w|b|e)$/.test(key)
      ? `${challenge.countBuffer}${key}`
      : key;
    challenge.countBuffer = "";
    const moved = applyBattleChallengeMotion(challenge, withCount);
    if (!moved) {
      failBattleChallenge(`That key does not move the battle drill cursor. Expected ${step.expect}.`);
      return true;
    }

    if (withCount === step.expect && challenge.cursor.row === step.target.row && challenge.cursor.col === step.target.col) {
      completeBattleChallenge();
      return true;
    }

    failBattleChallenge(`Wrong motion. Expected ${step.expect}.`);
    return true;
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
      enemyTurn(`${state.battle.enemy.name} attacks while you switch.`);
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
