// Owns: authored battle mini-drill templates. Does not own: battle state,
// damage math, or input handling.

function wordStart(line, word, occurrence) {
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

export function createBattleChallenge(actionId) {
  const attackTemplates = [
    {
      title: "Append Strike",
      instruction: "Use 2j, then a to release the hit.",
      lines: ["const target = enemy;", "queue follow up now", "append strike here"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "2j", target: { row: 2, col: 0 } },
        { type: "action", expect: "a", target: { row: 2, col: 0 } },
      ],
    },
    {
      title: "Word Strike",
      instruction: "Use j, then 2w, then a to release the hit.",
      lines: ["alpha beta gamma", "append at word now", "hold the line"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "j", target: { row: 1, col: 0 } },
        { type: "motion", expect: "2w", target: { row: 1, col: wordStart("append at word now", "word") } },
        { type: "action", expect: "a", target: { row: 1, col: wordStart("append at word now", "word") } },
      ],
    },
    {
      title: "File Strike",
      instruction: "Use G, then a to release the hit.",
      lines: ["line one", "line two", "append at finish"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "G", target: { row: 2, col: 0 } },
        { type: "action", expect: "a", target: { row: 2, col: 0 } },
      ],
    },
  ];

  const slamTemplates = [
    {
      title: "Heavy Slam",
      instruction: "Use j, then dd to drop the heavy line.",
      lines: ["hold pressure", "delete this training row", "close it out"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "j", target: { row: 1, col: 0 } },
        { type: "action", expect: "dd", target: { row: 1, col: 0 } },
      ],
    },
    {
      title: "Count Slam",
      instruction: "Use 2j, then dd to flatten the line.",
      lines: ["front lane", "middle lane", "delete this row cleanly"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "2j", target: { row: 2, col: 0 } },
        { type: "action", expect: "dd", target: { row: 2, col: 0 } },
      ],
    },
    {
      title: "Bottom Slam",
      instruction: "Use G, then dd to drop the line.",
      lines: ["starter row", "buffer row", "drop this final row"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "G", target: { row: 2, col: 0 } },
        { type: "action", expect: "dd", target: { row: 2, col: 0 } },
      ],
    },
  ];

  const throwTemplates = [
    {
      title: "Find The Catch",
      instruction: "Use fw twice to line up the marked w, then the VimOrb fires.",
      lines: ["wild wisps weave while"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "fw", target: { row: 0, col: 5 } },
        { type: "motion", expect: "fw", target: { row: 0, col: 11 } },
      ],
    },
    {
      title: "Stone Lock",
      instruction: "Use fs twice to line up the marked s, then the VimOrb fires.",
      lines: ["soft stone sprite spark"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "fs", target: { row: 0, col: 5 } },
        { type: "motion", expect: "fs", target: { row: 0, col: 11 } },
      ],
    },
    {
      title: "Rune Lock",
      instruction: "Use fr three times to walk the cursor onto the marked r, then the VimOrb fires.",
      lines: ["rare rune river reeds"],
      cursor: { row: 0, col: 0 },
      steps: [
        { type: "motion", expect: "fr", target: { row: 0, col: 2 } },
        { type: "motion", expect: "fr", target: { row: 0, col: 5 } },
        { type: "motion", expect: "fr", target: { row: 0, col: 10 } },
      ],
    },
  ];

  const source = actionId === "attack" ? attackTemplates : actionId === "slam" ? slamTemplates : throwTemplates;
  const picked = source[Math.floor(Math.random() * source.length)];
  return {
    actionId,
    title: picked.title,
    instruction: picked.instruction,
    lines: picked.lines.slice(),
    cursor: { row: picked.cursor.row, col: picked.cursor.col },
    cursorVisual: { row: picked.cursor.row, col: picked.cursor.col },
    steps: picked.steps.map((step) => ({ ...step, target: { ...step.target } })),
    stepIndex: 0,
    pendingPrefix: "",
    countBuffer: "",
    lastFind: null,
    feedback: picked.instruction,
    feedbackTone: "hint",
    startedAt: performance.now(),
  };
}
