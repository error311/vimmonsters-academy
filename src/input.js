// Owns: command mode, rename mode, VimTree navigation, and shared key
// normalization. Does not own: battle math, drill progression, or scene
// rendering.

export function createInputRuntime(deps) {
  const {
    state,
    maps,
    formatDuration,
    objectiveText,
    currentLesson,
    openRenameMode,
    resetRun,
    healParty,
    saveKey,
    storage,
    cloneMonster,
    createMonster,
    createFollowerTrail,
    randomSeed,
    buildHouseLesson,
    buildRandomizedMaps,
    hydrateDrill,
    saveMeta,
    setMessage,
    commitRunName,
    activeMonster,
    checkMilestones,
    treeSections,
    selectedTreeSection,
    buildSavePayload,
    writeSavePayload,
    readSavePayload,
    applySavePayload,
    defaultState,
  } = deps;

  function commandOutput(command, elapsedMs) {
    if (command === "help") {
      return "Commands: :help, :party, :map, :lesson, :name, :q, :w, :load, :heal. Try o for VimTree, R to rename, and counts like 3w.";
    }
    if (command === "party") {
      return state.party.map((monster) => `${monster.name} Lv${monster.level}`).join(", ");
    }
    if (command === "map") {
      return `${maps[state.map].name}. Objective: ${objectiveText()} Timer: ${formatDuration(elapsedMs())}. Seed: ${state.runSeed}.`;
    }
    if (command === "lesson") {
      return `${currentLesson().title}. ${currentLesson().body}`;
    }
    if (command === "name") {
      openRenameMode();
      return state.message;
    }
    if (command === "q") {
      resetRun("Run reset. A fresh academy layout rolled in. Beat your old route.");
      return state.message;
    }
    if (command === "heal") {
      if (state.map !== "house") {
        return "You can only :heal while standing at home.";
      }
      healParty();
      return "Your party is fully healed at home.";
    }
    if (command === "w") {
      writeSavePayload(
        storage,
        saveKey,
        buildSavePayload(state, cloneMonster)
      );
      return "Game written to local storage.";
    }
    if (command === "load") {
      const data = readSavePayload(storage, saveKey);
      if (!data) {
        return "No save file exists yet.";
      }
      try {
        applySavePayload(state, data, {
          defaultState,
          cloneMonster,
          createMonster,
          createFollowerTrail,
          randomSeed,
          buildHouseLesson,
          buildRandomizedMaps,
          hydrateDrill,
        });
        saveMeta();
        return "Save loaded.";
      } catch {
        return "The save file could not be read.";
      }
    }
    return `Unknown command: :${command}`;
  }

  function handleCommandKey(event, elapsedMs) {
    if (event.key === "Escape") {
      event.preventDefault();
      state.command.active = false;
      state.command.text = "";
      setMessage("Command cancelled.");
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const output = commandOutput(state.command.text.trim().toLowerCase(), elapsedMs);
      state.command.active = false;
      state.command.text = "";
      setMessage(output);
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      state.command.text = state.command.text.slice(0, -1);
      return;
    }
    if (event.key.length === 1 && /[a-z0-9 :]/i.test(event.key)) {
      event.preventDefault();
      state.command.text += event.key.toLowerCase();
    }
  }

  function handleRenameKey(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      state.rename.active = false;
      state.rename.text = "";
      setMessage("Rename cancelled.", "player");
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitRunName();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      state.rename.text = state.rename.text.slice(0, -1);
      return;
    }
    if (event.key.length === 1 && /[a-z0-9 _-]/i.test(event.key) && state.rename.text.length < 20) {
      event.preventDefault();
      state.rename.text += event.key;
    }
  }

  function normalizeKey(key) {
    if (key === "ArrowLeft") {
      return "h";
    }
    if (key === "ArrowDown") {
      return "j";
    }
    if (key === "ArrowUp") {
      return "k";
    }
    if (key === "ArrowRight") {
      return "l";
    }
    if (key === "Escape") {
      return "Escape";
    }
    if (key === "Enter") {
      return "Enter";
    }
    if (key === ":") {
      return ":";
    }
    if (key === ";" || key === ",") {
      return key;
    }
    if (!key) {
      return "";
    }
    if (["G", "F", "T"].includes(key)) {
      return key;
    }
    if (key === "R") {
      return "R";
    }
    if (key.length === 1) {
      return key.toLowerCase();
    }
    return key;
  }

  function handleTreeKey(key) {
    const sections = treeSections();
    const selected = selectedTreeSection();
    const maxItemIndex = Math.max(0, selected.items.length - 1);

    if (key === "o") {
      state.tree.open = false;
      state.tree.focus = "sections";
      state.tree.itemIndex = 0;
      setMessage("VimTree closed.");
      return true;
    }
    if (key === "Escape") {
      state.tree.open = false;
      state.tree.focus = "sections";
      state.tree.itemIndex = 0;
      return true;
    }
    if (key === "h") {
      state.tree.focus = "sections";
      return true;
    }
    if (key === "Enter" || key === "l") {
      if (state.tree.focus === "sections") {
        state.tree.focus = "items";
        state.tree.itemIndex = 0;
      } else if (selected.title === "Party" && selected.items.length > 0) {
        state.activeIndex = Math.min(state.tree.itemIndex, state.party.length - 1);
        state.flags.switchedParty = state.party.length > 1 || state.flags.switchedParty;
        setMessage(`Focused ${activeMonster().name} from VimTree. It is now your active follower.`);
        checkMilestones();
      } else {
        setMessage(selected.items[Math.min(state.tree.itemIndex, maxItemIndex)] || selected.title);
      }
      return true;
    }
    if (key === "j") {
      if (state.tree.focus === "sections") {
        state.tree.selected = Math.min(sections.length - 1, state.tree.selected + 1);
        state.tree.itemIndex = 0;
      } else {
        state.tree.itemIndex = Math.min(maxItemIndex, state.tree.itemIndex + 1);
      }
      return true;
    }
    if (key === "k") {
      if (state.tree.focus === "sections") {
        state.tree.selected = Math.max(0, state.tree.selected - 1);
        state.tree.itemIndex = 0;
      } else {
        state.tree.itemIndex = Math.max(0, state.tree.itemIndex - 1);
      }
      return true;
    }

    return false;
  }

  return {
    handleCommandKey,
    handleRenameKey,
    normalizeKey,
    handleTreeKey,
  };
}
