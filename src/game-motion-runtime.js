// Owns: high-level overworld motion routing, locked-control messaging, and
// repeat/count behavior outside drill and battle challenge runtimes.

export function createGameMotionRuntime(deps) {
  const {
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
  } = deps;

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

  function applyStepMotion(dx, dy, facing, count, fromRepeat) {
    let moved = false;
    for (let step = 0; step < count; step += 1) {
      if (!tryMove(dx, dy, facing, step > 0)) {
        break;
      }
      moved = true;
    }
    if (moved && count >= 2) {
      state.flags.usedCountMove = true;
      checkMilestones();
    }
    if (moved && !fromRepeat) {
      recordMotion(compositeAction(facing === "left" ? "h" : facing === "down" ? "j" : facing === "up" ? "k" : "l", count));
    }
  }

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
      applyStepMotion(-1, 0, "left", actionCount, fromRepeat);
      return;
    }
    if (actionKey === "j") {
      applyStepMotion(0, 1, "down", actionCount, fromRepeat);
      return;
    }
    if (actionKey === "k") {
      applyStepMotion(0, -1, "up", actionCount, fromRepeat);
      return;
    }
    if (actionKey === "l") {
      applyStepMotion(1, 0, "right", actionCount, fromRepeat);
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

  return {
    parseActionKey,
    lockedControlMessage,
    useMotion,
  };
}
