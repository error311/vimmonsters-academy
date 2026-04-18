// Owns: drill cursor movement, prompt parsing, insert-mode edits, and drill
// completion flow. Does not own: drill content definitions or drill rendering.

function drillTargetLabel(step) {
  if (!step) {
    return "";
  }
  if (step.type === "replace") {
    return step.scope === "global" ? "file" : `L${step.row + 1}`;
  }
  if (step.type === "macro") {
    return "macro";
  }
  if (step.type === "command") {
    return "buffer";
  }
  const row = (step.type === "insert" ? step.row : step.target.row) + 1;
  const col = (step.type === "insert" ? step.col : step.target.col) + 1;
  return `L${row}:C${col}`;
}

export function createDrillRuntime(deps) {
  const {
    state,
    parseActionKey,
    setMessage,
    setFx,
    checkMilestones,
    startEncounterTransition,
    createMonster,
  } = deps;

  function currentDrillStep() {
    if (!state.drill) {
      return null;
    }
    return state.drill.steps[state.drill.stepIndex] || null;
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

  function resolveRepeatFindKey(key) {
    if (!state.drill || !state.drill.lastFind) {
      return null;
    }
    const direction = key === "," ? reverseFindDirection(state.drill.lastFind.direction) : state.drill.lastFind.direction;
    return `${direction}${state.drill.lastFind.targetChar}`;
  }

  function setDrillFeedback(message, tone) {
    if (!state.drill) {
      return;
    }
    state.drill.feedback = message;
    state.drill.feedbackTone = tone || "hint";
  }

  function drillLineLength(row) {
    return Math.max(1, (state.drill.lines[row] || "").length);
  }

  function resetDrillPrompt() {
    if (!state.drill) {
      return;
    }
    state.drill.promptPrefix = "";
    state.drill.promptText = "";
  }

  function setDrillCursor(row, col) {
    const clampedRow = Math.max(0, Math.min(row, state.drill.lines.length - 1));
    const maxCol = drillLineLength(clampedRow) - 1;
    state.drill.cursor.row = clampedRow;
    state.drill.cursor.col = Math.max(0, Math.min(col, maxCol));
    if (!state.drill.cursorVisual) {
      state.drill.cursorVisual = {
        row: state.drill.cursor.row,
        col: state.drill.cursor.col,
      };
    }
  }

  function drillWordTokens() {
    const tokens = [];
    state.drill.lines.forEach((line, row) => {
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

  function drillMoveWordForward(count) {
    const tokens = drillWordTokens();
    let row = state.drill.cursor.row;
    let col = state.drill.cursor.col;
    for (let step = 0; step < count; step += 1) {
      const next = tokens.find((token) => token.row > row || (token.row === row && token.col > col));
      if (!next) {
        return false;
      }
      row = next.row;
      col = next.col;
    }
    setDrillCursor(row, col);
    return true;
  }

  function drillMoveWordBackward(count) {
    const tokens = drillWordTokens();
    let row = state.drill.cursor.row;
    let col = state.drill.cursor.col;
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
    setDrillCursor(row, col);
    return true;
  }

  function drillMoveWordEndForward(count) {
    const tokens = drillWordTokens();
    let row = state.drill.cursor.row;
    let col = state.drill.cursor.col;
    for (let step = 0; step < count; step += 1) {
      const next = tokens.find((token) => {
        return token.row > row || (token.row === row && token.end >= col);
      });
      if (!next) {
        return false;
      }
      row = next.row;
      col = next.end;
    }
    setDrillCursor(row, col);
    return true;
  }

  function drillMoveWordEndBackward(count) {
    const tokens = drillWordTokens();
    let row = state.drill.cursor.row;
    let col = state.drill.cursor.col;
    for (let step = 0; step < count; step += 1) {
      let previous = null;
      tokens.forEach((token) => {
        if (token.row < row || (token.row === row && token.end < col)) {
          previous = token;
        }
      });
      if (!previous) {
        return false;
      }
      row = previous.row;
      col = previous.end;
    }
    setDrillCursor(row, col);
    return true;
  }

  function drillSearchToken(term) {
    const tokens = drillWordTokens();
    const currentRow = state.drill.cursor.row;
    const currentCol = state.drill.cursor.col;
    const found = tokens.find((token) => {
      return token.text === term && (token.row > currentRow || (token.row === currentRow && token.col >= currentCol));
    }) || tokens.find((token) => token.text === term);
    if (!found) {
      return false;
    }
    setDrillCursor(found.row, found.col);
    return true;
  }

  function applyDrillReplaceStep(step) {
    if (step.scope === "line") {
      const line = state.drill.lines[step.row] || "";
      state.drill.lines[step.row] = line.replace(step.find, step.replace);
      const nextCol = state.drill.lines[step.row].indexOf(step.replace);
      setDrillCursor(step.row, Math.max(0, nextCol));
      return;
    }
    state.drill.lines = state.drill.lines.map((line) => line.split(step.find).join(step.replace));
    const row = state.drill.lines.findIndex((line) => line.includes(step.replace));
    if (row >= 0) {
      setDrillCursor(row, state.drill.lines[row].indexOf(step.replace));
    }
  }

  function applyDrillMacroStep(step) {
    (step.edits || []).forEach((edit) => {
      const line = state.drill.lines[edit.row] || "";
      state.drill.lines[edit.row] =
        line.slice(0, edit.col) +
        line.slice(edit.col + (edit.deleteCount || 1));
    });
    if (step.cursorAfter) {
      setDrillCursor(step.cursorAfter.row, step.cursorAfter.col);
    }
  }

  function applyDrillMotion(key) {
    const parsed = parseActionKey(key);
    const actionKey = parsed.key;
    const actionCount = parsed.count;
    const row = state.drill.cursor.row;
    const col = state.drill.cursor.col;

    if (actionKey === "h") {
      setDrillCursor(row, col - actionCount);
      return true;
    }
    if (actionKey === "l") {
      setDrillCursor(row, col + actionCount);
      return true;
    }
    if (actionKey === "j") {
      setDrillCursor(row + actionCount, col);
      return true;
    }
    if (actionKey === "k") {
      setDrillCursor(row - actionCount, col);
      return true;
    }
    if (actionKey === "0") {
      setDrillCursor(row, 0);
      return true;
    }
    if (actionKey === "^") {
      const line = state.drill.lines[row] || "";
      const nextCol = line.search(/\S/);
      setDrillCursor(row, nextCol >= 0 ? nextCol : 0);
      return true;
    }
    if (actionKey === "$") {
      setDrillCursor(row, drillLineLength(row) - 1);
      return true;
    }
    if (actionKey === "gg") {
      setDrillCursor(0, 0);
      return true;
    }
    if (actionKey === "G") {
      setDrillCursor(state.drill.lines.length - 1, 0);
      return true;
    }
    if (actionKey === "w") {
      return drillMoveWordForward(actionCount);
    }
    if (actionKey === "b") {
      return drillMoveWordBackward(actionCount);
    }
    if (actionKey === "e") {
      return drillMoveWordEndForward(actionCount);
    }
    if (actionKey === "ge") {
      return drillMoveWordEndBackward(actionCount);
    }
    if (key === ";" || key === ",") {
      const repeated = resolveRepeatFindKey(key);
      if (!repeated) {
        return false;
      }
      key = repeated;
    }
    if (/^[ftFT].$/.test(key)) {
      const direction = key[0];
      const targetChar = key[1];
      const line = state.drill.lines[row] || "";
      state.drill.lastFind = {
        direction,
        targetChar,
      };
      if (direction === "f") {
        const next = line.indexOf(targetChar, col + 1);
        if (next < 0) {
          return false;
        }
        setDrillCursor(row, next);
        return true;
      }
      if (direction === "t") {
        const next = line.indexOf(targetChar, col + 1);
        if (next < 1) {
          return false;
        }
        setDrillCursor(row, next - 1);
        return true;
      }
      if (direction === "F") {
        const next = line.lastIndexOf(targetChar, col - 1);
        if (next < 0) {
          return false;
        }
        setDrillCursor(row, next);
        return true;
      }
      if (direction === "T") {
        const next = line.lastIndexOf(targetChar, col - 1);
        if (next < 0 || next + 1 > col) {
          return false;
        }
        setDrillCursor(row, next + 1);
        return true;
      }
    }
    return false;
  }

  function applyDrillEditStep(step) {
    if (step.expect === "x") {
      const line = state.drill.lines[step.target.row] || "";
      state.drill.lines[step.target.row] =
        line.slice(0, step.target.col) +
        line.slice(step.target.col + (step.deleteCount || 1));
      setDrillCursor(step.target.row, step.target.col);
      return;
    }
    if (step.expect === "dd") {
      state.drill.lines[step.row] = "";
      setDrillCursor(step.row, 0);
      return;
    }
    if (step.expect === "dw") {
      const row = step.target.row;
      const line = state.drill.lines[row] || "";
      state.drill.lines[row] = line.slice(0, step.target.col) + line.slice(step.target.col + step.length);
      setDrillCursor(row, step.target.col);
    }
  }

  function completeDrillStep() {
    state.drill.stepIndex += 1;
    state.drill.countBuffer = "";
    state.drill.pendingPrefix = "";
    state.drill.input = "";
    state.drill.mode = "normal";
    state.drill.bannerUntil = performance.now() + 650;
    const step = currentDrillStep();
    if (step) {
      if (step.type === "macro") {
        state.drill.mode = "prompt";
        state.drill.promptPrefix = "";
        state.drill.promptText = "";
        state.drill.lastFind = null;
        setDrillFeedback(`Type ${step.expect} to record or replay the macro.`, "accent");
        return;
      }
      if (step.type === "command") {
      state.drill.mode = "prompt";
      state.drill.promptPrefix = ":";
      state.drill.promptText = "";
      state.drill.lastFind = null;
      setDrillFeedback(`Type :${step.expect} and press Enter to close the lesson buffer.`, "accent");
      return;
    }
      setDrillFeedback(`Locked in. ${step.instruction}`, "success");
      return;
    }

    const drillId = state.drill.id;
    state.mode = "overworld";
    state.drill = null;
    if (drillId === "meadow") {
      state.flags.usedW = true;
      state.flags.usedB = true;
      state.flags.usedE = true;
      state.flags.usedGe = true;
      state.score += 110;
      setFx("reward", "hud", 1500);
      setMessage("Word drill cleared. +110 score. Mentor W now expects you to catch a VimMonster and use word-end motion cleanly.", "mentor");
    } else if (drillId === "ridge") {
      state.flags.usedZero = true;
      state.flags.usedDollar = true;
      state.flags.usedX = true;
      state.score += 130;
      setFx("reward", "hud", 1500);
      setMessage("Code line drill cleared. +130 score. x is now live in battle as Quick Jab. Next: press [ or ] once outside battle to finish Line Ridge.", "coach");
    } else if (drillId === "grove") {
      state.flags.usedCountWord = true;
      state.flags.usedCountMove = true;
      state.flags.usedDd = true;
      state.flags.usedCw = true;
      state.score += 170;
      setFx("reward", "hud", 1500);
      setMessage("Count drill cleared. +170 score. dd and cw are now live in battle as Heavy Slam and Focus Ball.", "sage");
    } else if (drillId === "fen") {
      state.flags.usedFindForward = true;
      state.flags.usedTillForward = true;
      state.flags.usedFindBackward = true;
      state.flags.usedTillBackward = true;
      state.score += 180;
      setFx("reward", "hud", 1500);
      setMessage("Find drill cleared. +180 score. Scout Find now opens the fen gate, and Finder Fen creatures reward precise timing.", "scout");
    } else if (drillId === "studio") {
      state.flags.usedDw = true;
      state.flags.usedCiw = true;
      state.score += 210;
      setFx("reward", "hud", 1500);
      setMessage("Operator drill cleared. +210 score. dw and ciw now matter in battle as Break Word and Inner Word.", "scribe");
    } else if (drillId === "tower") {
      state.flags.usedGG = true;
      state.flags.usedBigG = true;
      state.flags.towerDrillCleared = true;
      state.score += 140;
      setFx("reward", "hud", 1500);
      state.flags.finalStarted = true;
      setMessage("Macro Tower code test cleared. +140 score. Macrobat drops in now. Defeat or capture it to clear the academy.", "macrobat");
      startEncounterTransition(createMonster("macrobat", 9), true);
    }
    checkMilestones();
  }

  function handleDrillKey(key) {
    const step = currentDrillStep();
    if (!step) {
      return;
    }

    if (state.drill.mode === "insert") {
      return;
    }

    if (key === "Escape") {
      state.mode = "overworld";
      state.drill = null;
      setMessage("Drill closed. Talk to the trainer again to reopen it.", "player");
      return;
    }

    if (/^[1-9]$/.test(key)) {
      state.drill.countBuffer += key;
      setDrillFeedback(`Count prefix: ${state.drill.countBuffer}`, "accent");
      return;
    }
    if (state.drill.countBuffer && key === "0") {
      state.drill.countBuffer += "0";
      setDrillFeedback(`Count prefix: ${state.drill.countBuffer}`, "accent");
      return;
    }

    if (state.drill.pendingPrefix === "g") {
      state.drill.pendingPrefix = "";
      if (key === "g") {
        key = "gg";
      } else if (key === "e") {
        key = "ge";
      }
    } else if (["f", "t", "F", "T"].includes(state.drill.pendingPrefix)) {
      key = `${state.drill.pendingPrefix}${key}`;
      state.drill.pendingPrefix = "";
    } else if (state.drill.pendingPrefix === "d") {
      state.drill.pendingPrefix = "";
      if (key === "d") {
        key = "dd";
      } else if (key === "w") {
        key = "dw";
      }
    } else if (state.drill.pendingPrefix === "c") {
      state.drill.pendingPrefix = "";
      if (key === "w") {
        key = "cw";
      } else if (key === "i") {
        state.drill.pendingPrefix = "ci";
        setDrillFeedback("Waiting for the text object. Try w for ciw.", "accent");
        return;
      }
    } else if (state.drill.pendingPrefix === "ci") {
      state.drill.pendingPrefix = "";
      if (key === "w") {
        key = "ciw";
      }
    } else if (key === "g") {
      state.drill.pendingPrefix = "g";
      setDrillFeedback("Waiting for the second g.", "accent");
      return;
    } else if (["f", "t", "F", "T"].includes(key)) {
      state.drill.pendingPrefix = key;
      setDrillFeedback(`Waiting for the target character after ${key}.`, "accent");
      return;
    } else if (key === "d") {
      state.drill.pendingPrefix = "d";
      setDrillFeedback("Waiting for d or w.", "accent");
      return;
    } else if (key === "c") {
      state.drill.pendingPrefix = "c";
      setDrillFeedback("Waiting for w or i. Try cw or ciw.", "accent");
      return;
    }

    if (step.type === "insert" || (step.type === "edit" && (step.expect === "cw" || step.expect === "ciw"))) {
      if (key === "i" && state.drill.cursor.row === step.row && state.drill.cursor.col === step.col) {
        state.drill.mode = "insert";
        state.drill.input = "";
        setDrillFeedback(`Insert mode: type ${step.expected} and press Esc.`, "accent");
        return;
      }
      if ((key === "cw" || key === "ciw") && step.type === "edit" && state.drill.cursor.row === step.target.row && state.drill.cursor.col === step.target.col) {
        state.drill.mode = "insert";
        state.drill.input = "";
        setDrillFeedback(`Change word: type ${step.expected} and press Esc.`, "accent");
        return;
      }
      if (step.type === "edit" && (step.expect === "cw" || step.expect === "ciw")) {
        setDrillFeedback(`Move to ${drillTargetLabel(step)}, then use ${step.expect}. ${step.instruction}`, "warning");
        return;
      }
      setDrillFeedback(`Move to ${drillTargetLabel(step)}, then press i. ${step.instruction}`, "warning");
      return;
    }

    if (step.type === "edit") {
      const rowMatches = typeof step.row === "number" ? state.drill.cursor.row === step.row : true;
      const cursorMatches = step.target
        ? state.drill.cursor.row === step.target.row && state.drill.cursor.col === step.target.col
        : rowMatches;
      if (key === step.expect && cursorMatches) {
        applyDrillEditStep(step);
        completeDrillStep();
        return;
      }
      setDrillFeedback(`Use ${step.expect} at ${drillTargetLabel(step)}. ${step.instruction}`, "warning");
      return;
    }

    if (step.type === "search") {
      if (key === "/") {
        state.drill.mode = "prompt";
        state.drill.promptPrefix = "/";
        state.drill.promptText = "";
        setDrillFeedback(`Search for ${step.expect} and press Enter.`, "accent");
        return;
      }
      setDrillFeedback(`Use / to search, then locate ${step.expect}.`, "warning");
      return;
    }

    if (step.type === "replace") {
      if (key === ":") {
        state.drill.mode = "prompt";
        state.drill.promptPrefix = ":";
        state.drill.promptText = "";
        setDrillFeedback(`Type :${step.expect} and press Enter.`, "accent");
        return;
      }
      setDrillFeedback(`Use :${step.expect} to apply the replacement.`, "warning");
      return;
    }

    if (step.type === "macro") {
      state.drill.mode = "prompt";
      state.drill.promptPrefix = "";
      state.drill.promptText = "";
      setDrillFeedback(`Type ${step.expect} to show the macro.`, "accent");
      return;
    }

    if (step.type === "command") {
      if (key === ":" || key === "q") {
        state.drill.mode = "prompt";
        state.drill.promptPrefix = ":";
        state.drill.promptText = key === "q" ? "q" : "";
        setDrillFeedback(`Type :${step.expect} and press Enter to close the lesson buffer.`, "accent");
        return;
      }
      setDrillFeedback(`Use :${step.expect} to exit the lesson buffer.`, "warning");
      return;
    }

    const withCount = state.drill.countBuffer && /^(h|j|k|l|w|b|e)$/.test(key)
      ? `${state.drill.countBuffer}${key}`
      : key;
    state.drill.countBuffer = "";
    const moved = applyDrillMotion(withCount);
    if (!moved) {
      setDrillFeedback(`That key does not move the drill cursor. Expected ${step.expect}.`, "danger");
      return;
    }

    if (
      withCount === step.expect &&
      state.drill.cursor.row === step.target.row &&
      state.drill.cursor.col === step.target.col
    ) {
      completeDrillStep();
      return;
    }

    setDrillFeedback(`Wrong motion. Expected ${step.expect}. Return to ${drillTargetLabel(step)}.`, "danger");
    state.score = Math.max(0, state.score - 5);
  }

  function handleDrillPromptKey(event) {
    const step = currentDrillStep();
    if (!step || !state.drill || state.drill.mode !== "prompt") {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      state.drill.mode = "normal";
      resetDrillPrompt();
      setDrillFeedback("Prompt cancelled.", "warning");
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const value = state.drill.promptText;
      if (step.type === "search") {
        if (
          value === step.expect &&
          drillSearchToken(step.expect) &&
          state.drill.cursor.row === step.target.row &&
          state.drill.cursor.col === step.target.col
        ) {
          state.drill.mode = "normal";
          resetDrillPrompt();
          completeDrillStep();
          return;
        }
        state.drill.mode = "normal";
        resetDrillPrompt();
        setDrillFeedback(`Search failed. Need /${step.expect} and land on ${drillTargetLabel(step)}.`, "danger");
        state.score = Math.max(0, state.score - 8);
        return;
      }
      if (step.type === "replace") {
        if (value === step.expect) {
          applyDrillReplaceStep(step);
          state.drill.mode = "normal";
          resetDrillPrompt();
          completeDrillStep();
          return;
        }
        state.drill.mode = "normal";
        resetDrillPrompt();
        setDrillFeedback(`Replace failed. Need :${step.expect}.`, "danger");
        state.score = Math.max(0, state.score - 8);
        return;
      }
      if (step.type === "macro") {
        return;
      }
      if (step.type === "command") {
        if (value === step.expect) {
          state.drill.mode = "normal";
          resetDrillPrompt();
          completeDrillStep();
          return;
        }
        state.drill.mode = "normal";
        resetDrillPrompt();
        setDrillFeedback(`Command failed. Need :${step.expect}.`, "danger");
        state.score = Math.max(0, state.score - 8);
      }
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      state.drill.promptText = state.drill.promptText.slice(0, -1);
      return;
    }
    if (event.key === ":" && step.type === "command" && state.drill.promptPrefix === ":" && !state.drill.promptText) {
      event.preventDefault();
      return;
    }
    if (step.type === "macro" && event.key === "Enter") {
      event.preventDefault();
      setDrillFeedback("Macros run as typed keys here. Finish the sequence directly without Enter.", "warning");
      return;
    }
    if (step.type === "macro" && event.key.length === 1 && /[A-Za-z0-9@]/.test(event.key)) {
      event.preventDefault();
      state.drill.promptText += event.key;
      if (step.expect.startsWith(state.drill.promptText)) {
        if (state.drill.promptText === step.expect) {
          applyDrillMacroStep(step);
          state.drill.mode = "normal";
          resetDrillPrompt();
          completeDrillStep();
        }
        return;
      }
      state.drill.mode = "normal";
      resetDrillPrompt();
      setDrillFeedback(`Macro failed. Need ${step.expect}.`, "danger");
      state.score = Math.max(0, state.score - 8);
      return;
    }
    if (event.key.length === 1 && /[A-Za-z0-9_%/:@]/.test(event.key)) {
      event.preventDefault();
      state.drill.promptText += event.key;
    }
  }

  function handleDrillInsertKey(event) {
    const step = currentDrillStep();
    if (!step || !(step.type === "insert" || (step.type === "edit" && (step.expect === "cw" || step.expect === "ciw")))) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (state.drill.input === step.expected) {
        const row = step.type === "insert" ? step.row : step.target.row;
        const col = step.type === "insert" ? step.col : step.target.col;
        const line = state.drill.lines[row];
        state.drill.lines[row] =
          line.slice(0, col) +
          step.expected +
          line.slice(col + step.length);
        completeDrillStep();
      } else {
        state.drill.mode = "normal";
        setDrillFeedback(
          `Typed "${state.drill.input || "..."}". Need ${step.expected}. Return to ${drillTargetLabel(step)} and try again.`,
          "danger"
        );
        state.score = Math.max(0, state.score - 8);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      setDrillFeedback("Use Esc to leave insert mode and submit the fix, like Vim.", "warning");
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      state.drill.input = state.drill.input.slice(0, -1);
      return;
    }
    if (event.key.length === 1 && /[A-Za-z_]/.test(event.key) && state.drill.input.length < step.expected.length) {
      event.preventDefault();
      state.drill.input += event.key;
    }
  }

  return {
    currentDrillStep,
    handleDrillKey,
    handleDrillPromptKey,
    handleDrillInsertKey,
  };
}
