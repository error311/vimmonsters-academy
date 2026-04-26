// Owns: battle mini-drill state, cursor movement, prompt flow, and challenge
// completion/failure handling. Does not own: damage math, encounter setup, or
// broader battle turn sequencing.

import { createBattleChallenge } from "./battle-challenges.js";

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

export function createBattleChallengeRuntime(deps) {
  const {
    state,
    activeMonster,
    setMessage,
    onAttack,
    onSlam,
    onThrow,
  } = deps;

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
      onAttack();
      return;
    }
    if (challenge.actionId === "slam") {
      onSlam();
      return;
    }
    onThrow();
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

  return {
    currentBattleChallengeStep,
    startBattleChallenge,
    handleBattleChallengeKey,
  };
}
