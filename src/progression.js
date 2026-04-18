// Owns: lesson completion checks, current objective text, gate help text, and
// control unlock rules. Does not own: movement, rendering, or battle rules.

export function createProgressionRuntime(deps) {
  const {
    state,
    lessons,
    controlInfo,
    maps,
    formatDuration,
    elapsedMs,
    currentHouseTargetLabel,
    activeMonster,
  } = deps;

  function houseComplete() {
    return state.flags.runeH && state.flags.runeJ && state.flags.runeK && state.flags.runeL;
  }

  function meadowComplete() {
    return state.flags.metMentor && state.flags.usedW && state.flags.usedB && state.flags.usedE && state.flags.usedGe && state.flags.caughtFirst;
  }

  function ridgeComplete() {
    return state.flags.metCoach && state.flags.usedZero && state.flags.usedDollar && state.flags.usedX && state.flags.switchedParty;
  }

  function groveComplete() {
    return state.flags.metSage && state.flags.usedCountWord && state.flags.usedCountMove && state.flags.usedDd && state.flags.usedCw;
  }

  function fenComplete() {
    return state.flags.metScout
      && state.flags.usedFindForward
      && state.flags.usedTillForward
      && state.flags.usedFindBackward
      && state.flags.usedTillBackward;
  }

  function studioComplete() {
    return state.flags.metScribe && state.flags.usedDw && state.flags.usedCiw;
  }

  function towerComplete() {
    return state.flags.towerDrillCleared && state.flags.finalWon;
  }

  function currentLessonIndex() {
    if (!houseComplete()) {
      return 0;
    }
    if (!meadowComplete()) {
      return 1;
    }
    if (!ridgeComplete()) {
      return 2;
    }
    if (!groveComplete()) {
      return 3;
    }
    if (!fenComplete()) {
      return 4;
    }
    if (!studioComplete()) {
      return 5;
    }
    if (!towerComplete()) {
      return 6;
    }
    return lessons.length - 1;
  }

  function currentLesson() {
    return lessons[currentLessonIndex()];
  }

  function controlUnlocked(id) {
    if (id === "move" || id === "inspect" || id === "tree") {
      return true;
    }
    if (id === "attack" || id === "vimOrb") {
      return houseComplete();
    }
    if (id === "word") {
      return houseComplete();
    }
    if (id === "word-ends") {
      return state.flags.metMentor;
    }
    if (id === "find") {
      return state.flags.metScout;
    }
    if (id === "count") {
      return ridgeComplete();
    }
    if (id === "command") {
      return state.flags.commandUnlocked;
    }
    if (id === "rename") {
      return state.flags.commandUnlocked;
    }
    if (id === "repeat") {
      return meadowComplete();
    }
    if (id === "line") {
      return meadowComplete();
    }
    if (id === "quick") {
      return state.flags.usedX;
    }
    if (id === "line-edit") {
      return state.flags.usedDd || state.flags.usedCw || state.flags.usedDw || state.flags.usedCiw;
    }
    if (id === "cycle") {
      return state.flags.metCoach;
    }
    if (id === "file") {
      return studioComplete();
    }
    return false;
  }

  function objectiveText() {
    if (!houseComplete()) {
      return `Follow the bright training path to the ${currentHouseTargetLabel()}.`;
    }
    if (!meadowComplete()) {
      const goals = [];
      if (!state.flags.metMentor) {
        goals.push("talk to Mentor W");
      }
      if (!state.flags.usedW) {
        goals.push("use w");
      }
      if (!state.flags.usedB) {
        goals.push("use b");
      }
      if (!state.flags.usedE) {
        goals.push("use e");
      }
      if (!state.flags.usedGe) {
        goals.push("use ge");
      }
      if (!state.flags.caughtFirst) {
        goals.push("catch a wild VimMonster with f");
      }
      return `Lesson 2 goal: ${goals.join(" | ")}.`;
    }
    if (!ridgeComplete()) {
      const goals = [];
      if (!state.flags.metCoach) {
        goals.push("talk to Coach Buffer");
      }
      if (!state.flags.usedZero) {
        goals.push("use 0");
      }
      if (!state.flags.usedDollar) {
        goals.push("use $");
      }
      if (!state.flags.usedX) {
        goals.push("use x in the drill");
      }
      if (!state.flags.switchedParty) {
        goals.push("press [ or ] to switch your active VimMonster");
      }
      return `Lesson 3 goal: ${goals.join(" | ")}.`;
    }
    if (!groveComplete()) {
      const goals = [];
      if (!state.flags.metSage) {
        goals.push("talk to Sage Count");
      }
      if (!state.flags.usedCountWord) {
        goals.push("use 3w");
      }
      if (!state.flags.usedCountMove) {
        goals.push("use a counted move like 2j");
      }
      if (!state.flags.usedDd) {
        goals.push("use dd");
      }
      if (!state.flags.usedCw) {
        goals.push("use cw");
      }
      return `Lesson 4 goal: ${goals.join(" | ")}.`;
    }
    if (!fenComplete()) {
      const goals = [];
      if (!state.flags.metScout) {
        goals.push("talk to Scout Find");
      }
      if (!state.flags.usedFindForward) {
        goals.push("use f");
      }
      if (!state.flags.usedTillForward) {
        goals.push("use t");
      }
      if (!state.flags.usedFindBackward) {
        goals.push("use F");
      }
      if (!state.flags.usedTillBackward) {
        goals.push("use T");
      }
      if (!state.flags.fenCacheClaimed) {
        goals.push("optional: inspect the fen cache");
      }
      return `Lesson 5 goal: ${goals.join(" | ")}.`;
    }
    if (!studioComplete()) {
      const goals = [];
      if (!state.flags.metScribe) {
        goals.push("talk to Scribe Edit");
      }
      if (!state.flags.usedDw) {
        goals.push("use dw");
      }
      if (!state.flags.usedCiw) {
        goals.push("use ciw");
      }
      if (!state.flags.studioCacheClaimed) {
        goals.push("optional: inspect the studio cache");
      }
      return `Lesson 6 goal: ${goals.join(" | ")}.`;
    }
    if (!towerComplete()) {
      const goals = [];
      if (!state.flags.usedGG) {
        goals.push("use gg");
      }
      if (!state.flags.usedBigG) {
        goals.push("use G");
      }
      if (!state.flags.towerDrillCleared) {
        goals.push("inspect the altar for the final code test");
      }
      if (!state.flags.finalWon) {
        goals.push("defeat or catch Macrobat");
      }
      return `Final lesson goal: ${goals.join(" | ")}.`;
    }
    return "Academy complete. Use :q for a fresh randomized run and chase the leaderboard.";
  }

  function controlHintText() {
    if (!houseComplete()) {
      return "Stay on the gold route. Each rune teaches one movement key.";
    }
    if (!meadowComplete()) {
      if (!state.flags.metMentor) {
        return "Press i facing Mentor W to open the word-motion drill.";
      }
      if (!state.flags.caughtFirst) {
        return state.flags.usedX
          ? "Walk in grass, weaken with a or x, then throw a VimOrb with f."
          : "Walk in grass, weaken with a, then throw a VimOrb with f.";
      }
      return "Finish the meadow objective, then step on the ridge gate.";
    }
    if (!ridgeComplete()) {
      if (!state.flags.metCoach) {
        return "Press i facing Coach Buffer to start the line-motion lesson.";
      }
      if (!state.flags.switchedParty) {
        return "Press [ or ] once outside battle to switch your active VimMonster and clear Lesson 3.";
      }
      return "x is now Quick Jab in battle. Step on the tower gate at the far end to enter Count Grove.";
    }
    if (!groveComplete()) {
      if (!state.flags.metSage) {
        return "Press i facing Sage Count to open the count drill.";
      }
      return "Use counts like 3w or 2j, then learn dd and cw before heading into Finder Fen.";
    }
    if (!fenComplete()) {
      if (!state.flags.metScout) {
        return "Press i facing Scout Find to open the character-find lesson.";
      }
      return "Finder Fen teaches f, t, F, and T. The cache is optional, but worth score and a rare encounter.";
    }
    if (!studioComplete()) {
      if (!state.flags.metScribe) {
        return "Press i facing Scribe Edit to open the operator lesson.";
      }
      return "Operator Studio teaches dw and ciw. Those operators become real battle tools once the drill is cleared.";
    }
    if (!towerComplete()) {
      if (!state.flags.towerDrillCleared) {
        return "Face the altar and press i to start the final gg/G, /, :replace, and macro code test.";
      }
      if (!state.flags.finalWon) {
        return state.mode === "battle"
          ? "Final battle: a attacks, x quick jabs, dd heavy slams, cw powers the next VimOrb."
          : "The final fight is live. Defeat or catch Macrobat to finish the run.";
      }
    }
    return "Run complete. Press R to rename the run, then use :q for a new seed.";
  }

  function gateBlockedMessage(tile) {
    if (state.map === "house" && tile === "E") {
      return "The door stays locked until all four home row runes are visited.";
    }
    if (state.map === "meadow" && tile === "R") {
      return "The ridge gate opens after you meet Mentor W, use w and b, and catch a VimMonster.";
    }
    if (state.map === "ridge" && tile === "T") {
      return state.flags.metCoach && state.flags.usedZero && state.flags.usedDollar && !state.flags.switchedParty
        ? "Count Grove is still locked. Press [ or ] once to switch your active VimMonster and finish Lesson 3."
        : "Count Grove opens after Coach Buffer teaches 0, $, and party switching.";
    }
    if (state.map === "grove" && tile === "T") {
      return "Finder Fen opens after Sage Count teaches counts, dd, and cw.";
    }
    if (state.map === "fen" && tile === "T") {
      return "Operator Studio opens after Scout Find teaches f, t, F, and T.";
    }
    if (state.map === "studio" && tile === "T") {
      return "Macro Tower opens after Scribe Edit teaches dw and ciw.";
    }
    return "That path is not open yet.";
  }

  function gateInspectMessage(tile) {
    if (state.map === "house" && tile === "E") {
      if (houseComplete() && !state.flags.starterChosen) {
        return "Home Row is complete. Choose your starter VimMonster before leaving the house.";
      }
      return houseComplete()
        ? "The meadow door is open. Step onto it to begin Word Meadow."
        : gateBlockedMessage(tile);
    }
    if (state.map === "meadow" && tile === "R") {
      return meadowComplete()
        ? "The ridge gate is open. Step onto it to enter Line Ridge."
        : gateBlockedMessage(tile);
    }
    if (state.map === "ridge" && tile === "T") {
      return ridgeComplete()
        ? "The Count Grove gate is open. Step onto it to continue."
        : gateBlockedMessage(tile);
    }
    if (state.map === "grove" && tile === "T") {
      return groveComplete()
        ? "Finder Fen is open. Step onto the gate to start character-find motions."
        : gateBlockedMessage(tile);
    }
    if (state.map === "fen" && tile === "T") {
      return fenComplete()
        ? "Operator Studio is open. Step onto the gate to continue."
        : gateBlockedMessage(tile);
    }
    if (state.map === "studio" && tile === "T") {
      return studioComplete()
        ? "Macro Tower is open. Step onto the gate to enter the final lesson."
        : gateBlockedMessage(tile);
    }
    if ((state.map === "meadow" && tile === "D")
      || (state.map === "ridge" && tile === "R")
      || (state.map === "grove" && tile === "R")
      || (state.map === "fen" && tile === "R")
      || (state.map === "studio" && tile === "R")
      || (state.map === "tower" && tile === "T")) {
      return "This gate leads back to the previous lesson area.";
    }
    return "A route gate. Step onto it when its lesson is complete.";
  }

  function treeSections() {
    const commandItems = [":help", ":party", ":map", ":lesson", ":name", ":q"];
    if (controlUnlocked("command")) {
      commandItems.push(":w", ":load", ":heal");
    }

    return [
      {
        title: "Lesson",
        items: [
          currentLesson().title,
          currentLesson().body,
          `Goal: ${objectiveText()}`,
        ],
      },
      {
        title: "Objective",
        items: [
          objectiveText(),
          `Timer: ${formatDuration(elapsedMs())}`,
          `VimOrbs: ${state.vimOrbs}`,
          `Score: ${state.score}`,
          `Partner: ${activeMonster().name}`,
        ],
      },
      {
        title: "Inventory",
        items: [
          `VimOrbs x${state.vimOrbs}`,
          `Score ${state.score}`,
          `Best Score ${state.bestScore}`,
          `Best Time ${state.bestTimeMs ? formatDuration(state.bestTimeMs) : "--:--"}`,
          `${Object.values(state.rewards).filter(Boolean).length} rewards claimed`,
        ],
      },
      {
        title: "Controls",
        items: controlInfo.filter((control) => controlUnlocked(control.id)).map(
          (control) => `${control.keys}  ${control.vim}  ${control.game}`
        ),
      },
      {
        title: "Party",
        items: state.party.map((monster, index) => {
          const marker = index === state.activeIndex ? "*" : " ";
          return `${marker} ${monster.name}  Lv${monster.level}  ${monster.hp}/${monster.maxHp}HP${index === state.activeIndex ? "  FOLLOWING" : ""}`;
        }),
      },
      {
        title: "Commands",
        items: commandItems,
      },
      {
        title: "Leaderboard",
        items: state.leaderboard.length
          ? state.leaderboard.map((entry, index) => `${index + 1}. ${entry.name}  |  ${entry.score}  |  ${formatDuration(entry.timeMs, true)}  |  ${String(entry.seed).slice(-6)}`)
          : ["Clear the academy to post your first run."],
      },
    ];
  }

  return {
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
  };
}
