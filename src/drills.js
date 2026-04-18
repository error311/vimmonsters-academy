// Drill builders are isolated here so lesson content and expected Vim motions
// are easy to extend without digging through the rest of the game loop.

function findWordStart(line, word, occurrence) {
  const matches = [...String(line).matchAll(/[A-Za-z_]+/g)];
  let seen = 0;
  for (const match of matches) {
    if (match[0] === word) {
      if (seen === (occurrence || 0)) {
        return match.index;
      }
      seen += 1;
    }
  }
  return 0;
}

function drillTheme(id) {
  if (id === "meadow") {
    return {
      accent: "#ffd166",
      accentDeep: "#9f5d16",
      accentSoft: "#fff2bf",
      border: "#17314b",
      editorBg: "#13243c",
      editorAlt: "#173154",
      lineTint: "rgba(255, 209, 102, 0.12)",
      targetTint: "rgba(255, 209, 102, 0.2)",
      portrait: "mentor",
      tab: "word_meadow.txt",
    };
  }
  if (id === "ridge") {
    return {
      accent: "#8ed0ff",
      accentDeep: "#275b8f",
      accentSoft: "#daf2ff",
      border: "#17314b",
      editorBg: "#102339",
      editorAlt: "#173154",
      lineTint: "rgba(142, 208, 255, 0.12)",
      targetTint: "rgba(142, 208, 255, 0.22)",
      portrait: "coach",
      tab: "buffer_fix.js",
    };
  }
  if (id === "grove") {
    return {
      accent: "#8df0a1",
      accentDeep: "#21613e",
      accentSoft: "#d8ffe0",
      border: "#15342a",
      editorBg: "#102d23",
      editorAlt: "#173a2d",
      lineTint: "rgba(141, 240, 161, 0.12)",
      targetTint: "rgba(141, 240, 161, 0.2)",
      portrait: "sage",
      tab: "count_grove.txt",
    };
  }
  if (id === "fen") {
    return {
      accent: "#8ee3ff",
      accentDeep: "#205b77",
      accentSoft: "#d7f6ff",
      border: "#163246",
      editorBg: "#0e2533",
      editorAlt: "#16384d",
      lineTint: "rgba(142, 227, 255, 0.12)",
      targetTint: "rgba(142, 227, 255, 0.22)",
      portrait: "scout",
      tab: "finder_fen.txt",
    };
  }
  if (id === "studio") {
    return {
      accent: "#ffcb8a",
      accentDeep: "#8a4f27",
      accentSoft: "#ffe8ca",
      border: "#4a2d1c",
      editorBg: "#2a1c14",
      editorAlt: "#3a271c",
      lineTint: "rgba(255, 203, 138, 0.12)",
      targetTint: "rgba(255, 203, 138, 0.22)",
      portrait: "scribe",
      tab: "operator_studio.txt",
    };
  }
  return {
    accent: "#ff9d6b",
    accentDeep: "#8f4027",
    accentSoft: "#ffe0c8",
    border: "#2a1f35",
    editorBg: "#1a1830",
    editorAlt: "#232042",
    lineTint: "rgba(255, 157, 107, 0.12)",
    targetTint: "rgba(255, 157, 107, 0.22)",
    portrait: "macrobat",
    tab: "final_fix.js",
  };
}

export function hydrateDrill(drill) {
  if (!drill) {
    return null;
  }
  const theme = drill.theme || drillTheme(drill.id);
  return Object.assign(drill, {
    theme,
    input: drill.input || "",
    mode: drill.mode || "normal",
    countBuffer: drill.countBuffer || "",
    pendingPrefix: drill.pendingPrefix || "",
    feedback: drill.feedback || "Use the exact Vim motion shown.",
    feedbackTone: drill.feedbackTone || "hint",
    cursorVisual: drill.cursorVisual || {
      row: drill.cursor ? drill.cursor.row : 0,
      col: drill.cursor ? drill.cursor.col : 0,
    },
    bannerUntil: drill.bannerUntil || 0,
    promptPrefix: drill.promptPrefix || "",
    promptText: drill.promptText || "",
  });
}

function makeDrill(id, title, lines, cursor, steps, kind) {
  return hydrateDrill({
    id,
    title,
    kind,
    lines: lines.slice(),
    cursor: { row: cursor.row, col: cursor.col },
    steps,
    stepIndex: 0,
    input: "",
    mode: "normal",
    countBuffer: "",
    pendingPrefix: "",
    feedback: "Use the exact Vim motion shown.",
    feedbackTone: "hint",
    bannerUntil: 0,
    promptPrefix: "",
    promptText: "",
  });
}

function createMeadowDrill() {
  const lines = [
    "quick brown fox hops",
    "motion hint ____ now",
    "counts make word hops crisp",
  ];
  const brown = findWordStart(lines[0], "brown");
  const fox = findWordStart(lines[0], "fox");
  const blank = lines[1].indexOf("____");
  return makeDrill(
    "meadow",
    "Word Meadow Text Drill",
    lines,
    { row: 0, col: 0 },
    [
      { type: "motion", expect: "w", target: { row: 0, col: brown }, instruction: "Use w to jump to the start of brown." },
      { type: "motion", expect: "e", target: { row: 0, col: brown + "brown".length - 1 }, instruction: "Use e to land on the end of brown." },
      { type: "motion", expect: "b", target: { row: 0, col: brown }, instruction: "Use b to jump back to the start of brown." },
      { type: "motion", expect: "ge", target: { row: 0, col: "quick".length - 1 }, instruction: "Use ge to land on the end of the previous word, quick." },
      { type: "motion", expect: "2w", target: { row: 0, col: fox }, instruction: "Use 2w to jump ahead to fox." },
      { type: "motion", expect: "j", target: { row: 1, col: fox }, instruction: "Use j to drop to the line below while holding your column." },
      { type: "insert", row: 1, col: blank, expected: "fast", length: 4, instruction: "Press i, type fast, then Esc to repair the sentence." },
      { type: "command", expect: "q", instruction: "Type :q and press Enter to close the lesson buffer like Vim." },
    ],
    "prose"
  );
}

function createRidgeDrill() {
  const lines = [
    "const active = party[current];",
    "  const xarget = next;",
    "return active + target;",
  ];
  const indentCol = lines[1].indexOf("const");
  const brokenWord = lines[1].indexOf("xarget");
  return makeDrill(
    "ridge",
    "Coach Buffer Code Drill",
    lines,
    { row: 0, col: 0 },
    [
      { type: "motion", expect: "$", target: { row: 0, col: lines[0].length - 1 }, instruction: "Use $ to snap to the end of the current line." },
      { type: "motion", expect: "0", target: { row: 0, col: 0 }, instruction: "Use 0 to jump back to column 0." },
      { type: "motion", expect: "2j", target: { row: 2, col: 0 }, instruction: "Use 2j to drop two full lines." },
      { type: "motion", expect: "2k", target: { row: 0, col: 0 }, instruction: "Use 2k to return to the top line." },
      { type: "motion", expect: "j", target: { row: 1, col: 0 }, instruction: "Use j once to line up with the broken assignment." },
      { type: "motion", expect: "^", target: { row: 1, col: indentCol }, instruction: "Use ^ to jump to the first non-blank character on the indented line." },
      { type: "motion", expect: "w", target: { row: 1, col: brokenWord }, instruction: "Use w to jump to the broken word." },
      { type: "edit", expect: "x", target: { row: 1, col: brokenWord }, deleteCount: 1, instruction: "Use x to delete the stray x and fix target." },
      { type: "motion", expect: "j", target: { row: 2, col: brokenWord }, instruction: "Use j to drop to the return line and confirm the fix before you leave the drill." },
      { type: "command", expect: "q", instruction: "Type :q and press Enter to close the lesson buffer like Vim." },
    ],
    "code"
  );
}

function createGroveDrill() {
  const lines = [
    "alpha beta gamma delta",
    "delete this noisy line",
    "counted hops make clumsy moves",
    "reward paths stay crisp",
    "score routes stay sharp",
  ];
  const delta = findWordStart(lines[0], "delta");
  const clumsy = findWordStart(lines[2], "clumsy");
  return makeDrill(
    "grove",
    "Count Grove Text Drill",
    lines,
    { row: 0, col: 0 },
    [
      { type: "motion", expect: "3w", target: { row: 0, col: delta }, instruction: "Use 3w to jump from alpha all the way to delta." },
      { type: "motion", expect: "3b", target: { row: 0, col: 0 }, instruction: "Use 3b to jump back across three words." },
      { type: "motion", expect: "j", target: { row: 1, col: 0 }, instruction: "Use j to move onto the noisy line." },
      { type: "edit", expect: "dd", row: 1, instruction: "Use dd to delete the whole noisy line." },
      { type: "motion", expect: "j", target: { row: 2, col: 0 }, instruction: "Use j to move onto the counted sentence." },
      { type: "motion", expect: "3w", target: { row: 2, col: clumsy }, instruction: "Use 3w to jump straight onto clumsy." },
      { type: "edit", expect: "cw", target: { row: 2, col: clumsy }, expected: "clean", length: "clumsy".length, instruction: "Use cw, type clean, then press Esc to change the word." },
      { type: "motion", expect: "2j", target: { row: 4, col: clumsy }, instruction: "Use 2j to drop two lines and prove counted movement still works after edits." },
      { type: "command", expect: "q", instruction: "Type :q and press Enter to close the lesson buffer like Vim." },
    ],
    "prose"
  );
}

function createTowerDrill() {
  const lines = [
    "function finishRun(score, bonus) {",
    "  const total = score + ____;",
    "  if (total > worstScore) {",
    "    return total;",
    "  }",
    "  return ____;",
    "}",
    "#persistBestScore(runTotal);",
    "#persistBestSeed(seed);",
    "#persistBestTime(runTime);",
  ];
  const bonusBlank = lines[1].indexOf("____");
  const worstScore = lines[2].indexOf("worstScore");
  const scoreBlank = lines[5].indexOf("____");
  return makeDrill(
    "tower",
    "Macro Tower Code Fix",
    lines,
    { row: 6, col: 0 },
    [
      { type: "motion", expect: "gg", target: { row: 0, col: 0 }, instruction: "Use gg to jump straight to the top of the file." },
      { type: "motion", expect: "j", target: { row: 1, col: 0 }, instruction: "Use j to drop onto the first broken line." },
      { type: "motion", expect: "4w", target: { row: 1, col: bonusBlank }, instruction: "Use 4w to cross the whole expression and land on the blank." },
      { type: "insert", row: 1, col: bonusBlank, expected: "bonus", length: 5, instruction: "Press i, type bonus, then Esc to restore the total." },
      { type: "search", expect: "worstScore", target: { row: 2, col: worstScore }, instruction: "Use / to search for worstScore, then press Enter." },
      { type: "replace", expect: "s/worstScore/bestScore/", row: 2, find: "worstScore", replace: "bestScore", scope: "line", instruction: "Type :s/worstScore/bestScore/ and press Enter to fix just this line." },
      { type: "motion", expect: "G", target: { row: 9, col: 0 }, instruction: "Use G to jump to the bottom of the file, where the repeated lines wait." },
      { type: "motion", expect: "4k", target: { row: 5, col: 0 }, instruction: "Use 4k to move back up into the fallback return." },
      { type: "motion", expect: "2w", target: { row: 5, col: scoreBlank }, instruction: "Use 2w to reach the final missing value." },
      { type: "insert", row: 5, col: scoreBlank, expected: "score", length: 5, instruction: "Press i, type score, then Esc to complete the function." },
      { type: "replace", expect: "%s/total/runTotal/g", find: "total", replace: "runTotal", scope: "global", instruction: "Finish with :%s/total/runTotal/g to replace the name across the file." },
      { type: "motion", expect: "G", target: { row: 9, col: 0 }, instruction: "Use G to jump back to the repeated persistence lines at the bottom." },
      { type: "motion", expect: "2k", target: { row: 7, col: 0 }, instruction: "Use 2k to move up to the first repeated line and set up the macro on the leading #." },
      {
        type: "macro",
        expect: "qqxjq",
        instruction: "Type qqxjq to record a macro in register q: delete the leading #, move down, then stop recording.",
        edits: [{ row: 7, col: 0, deleteCount: 1 }],
        cursorAfter: { row: 8, col: 0 },
      },
      {
        type: "macro",
        expect: "2@q",
        instruction: "Type 2@q to replay the macro twice and clean the next two lines in one move.",
        edits: [
          { row: 8, col: 0, deleteCount: 1 },
          { row: 9, col: 0, deleteCount: 1 },
        ],
        cursorAfter: { row: 9, col: 0 },
      },
      { type: "command", expect: "q", instruction: "Type :q and press Enter to close the lesson buffer like Vim." },
    ],
    "code"
  );
}

export function createLessonDrill(id) {
  if (id === "meadow") {
    return createMeadowDrill();
  }
  if (id === "ridge") {
    return createRidgeDrill();
  }
  if (id === "grove") {
    return createGroveDrill();
  }
  if (id === "fen") {
    return createFenDrill();
  }
  if (id === "studio") {
    return createStudioDrill();
  }
  if (id === "tower") {
    return createTowerDrill();
  }
  return null;
}

function createFenDrill() {
  const lines = [
    "find marker stones safely",
    "track target letters fast",
    "finder motions stay exact",
  ];
  return makeDrill(
    "fen",
    "Finder Fen Motion Drill",
    lines,
    { row: 0, col: 0 },
    [
      { type: "motion", expect: "fm", target: { row: 0, col: lines[0].indexOf("m") }, instruction: "Use fm to jump straight to m in marker." },
      { type: "motion", expect: "te", target: { row: 0, col: lines[0].indexOf("e", lines[0].indexOf("m")) - 1 }, instruction: "Use te to stop just before the next e." },
      { type: "motion", expect: "Ff", target: { row: 0, col: lines[0].indexOf("f") }, instruction: "Use Ff to search backward for f." },
      { type: "motion", expect: "j", target: { row: 1, col: lines[0].indexOf("f") }, instruction: "Use j to carry your column into the line below." },
      { type: "motion", expect: "tf", target: { row: 1, col: lines[1].lastIndexOf("f") - 1 }, instruction: "Use tf to stop just before f in fast." },
      { type: "motion", expect: "Tt", target: { row: 1, col: lines[1].lastIndexOf("t", lines[1].lastIndexOf("f")) + 1 }, instruction: "Use Tt to move backward until just after the previous t." },
      { type: "command", expect: "q", instruction: "Type :q and press Enter to close the lesson buffer like Vim." },
    ],
    "prose"
  );
}

function createStudioDrill() {
  const lines = [
    "change this wobrd cleanly",
    "trim extra token noise",
    "operators make code crisp",
  ];
  const wobrd = findWordStart(lines[0], "wobrd");
  const extra = findWordStart(lines[1], "extra");
  return makeDrill(
    "studio",
    "Operator Studio Edit Drill",
    lines,
    { row: 0, col: 0 },
    [
      { type: "motion", expect: "2w", target: { row: 0, col: wobrd }, instruction: "Use 2w to land on wobrd." },
      { type: "edit", expect: "ciw", target: { row: 0, col: wobrd }, expected: "word", length: "wobrd".length, instruction: "Use ciw, type word, then press Esc to repair the inner word." },
      { type: "motion", expect: "j", target: { row: 1, col: wobrd }, instruction: "Use j to move down to the next edit line." },
      { type: "motion", expect: "2b", target: { row: 1, col: extra }, instruction: "Use 2b to jump back onto extra." },
      { type: "edit", expect: "dw", target: { row: 1, col: extra }, length: "extra ".length, instruction: "Use dw to delete the extra word and the following space." },
      { type: "motion", expect: "j", target: { row: 2, col: extra }, instruction: "Use j to land on the final clean line." },
      { type: "command", expect: "q", instruction: "Type :q and press Enter to close the lesson buffer like Vim." },
    ],
    "code"
  );
}
