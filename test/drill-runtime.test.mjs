import assert from "node:assert/strict";
import test from "node:test";

import { createDrillFixture } from "./helpers/runtime-fixtures.mjs";

test("drill motions require exact counts", (t) => {
  const fixture = createDrillFixture("meadow");
  t.after(() => fixture.globals.restore());

  fixture.state.drill.steps = [
    {
      type: "motion",
      expect: "2w",
      target: { row: 0, col: fixture.state.drill.lines[0].indexOf("fox") },
      instruction: "Use 2w to reach fox.",
    },
  ];
  fixture.state.drill.stepIndex = 0;
  fixture.state.drill.cursor = { row: 0, col: 0 };
  fixture.state.drill.cursorVisual = { row: 0, col: 0 };
  fixture.state.score = 10;

  fixture.handleKey("w");

  assert.equal(fixture.state.drill.cursor.col, fixture.state.drill.lines[0].indexOf("brown"));
  assert.equal(fixture.state.score, 5);
  assert.match(fixture.state.drill.feedback, /Wrong motion\. Expected 2w/);
});

test("repeat-find keys ; and , reuse the last drill search direction correctly", (t) => {
  const fixture = createDrillFixture("fen");
  t.after(() => fixture.globals.restore());

  fixture.state.drill.lines = ["mint more moss"];
  fixture.state.drill.steps = [
    { type: "motion", expect: ";", target: { row: 0, col: 5 }, instruction: "Repeat forward." },
    { type: "motion", expect: ",", target: { row: 0, col: 5 }, instruction: "Repeat backward." },
    { type: "command", expect: "q", instruction: "Leave the buffer." },
  ];
  fixture.state.drill.stepIndex = 0;
  fixture.state.drill.cursor = { row: 0, col: 0 };
  fixture.state.drill.cursorVisual = { row: 0, col: 0 };
  fixture.state.drill.lastFind = { direction: "f", targetChar: "m" };

  fixture.handleKey(";");
  assert.equal(fixture.state.drill.cursor.col, 5);

  fixture.state.drill.cursor = { row: 0, col: 10 };
  fixture.state.drill.cursorVisual = { row: 0, col: 10 };
  fixture.state.drill.lastFind = { direction: "f", targetChar: "m" };
  fixture.handleKey(",");

  assert.equal(fixture.state.drill.cursor.col, 5);
});

test("dd deletes the targeted line in the grove drill", (t) => {
  const fixture = createDrillFixture("grove");
  t.after(() => fixture.globals.restore());

  fixture.state.drill.steps = [
    { type: "edit", expect: "dd", row: 1, instruction: "Delete the noisy line." },
    { type: "command", expect: "q", instruction: "Leave the buffer." },
  ];
  fixture.state.drill.stepIndex = 0;
  fixture.state.drill.cursor = { row: 1, col: 0 };
  fixture.state.drill.cursorVisual = { row: 1, col: 0 };

  fixture.handleKey("d");
  fixture.handleKey("d");

  assert.equal(fixture.state.drill.lines[1], "");
  assert.equal(fixture.state.drill.stepIndex, 1);
});

test("cw enters insert mode and applies the replacement on Esc", (t) => {
  const fixture = createDrillFixture("grove");
  t.after(() => fixture.globals.restore());

  const clumsy = fixture.state.drill.lines[2].indexOf("clumsy");
  fixture.state.drill.steps = [
    {
      type: "edit",
      expect: "cw",
      target: { row: 2, col: clumsy },
      expected: "clean",
      length: "clumsy".length,
      instruction: "Repair the word.",
    },
    { type: "command", expect: "q", instruction: "Leave the buffer." },
  ];
  fixture.state.drill.stepIndex = 0;
  fixture.state.drill.cursor = { row: 2, col: clumsy };
  fixture.state.drill.cursorVisual = { row: 2, col: clumsy };

  fixture.handleKey("c");
  fixture.handleKey("w");
  fixture.typeInsert("clean");
  fixture.handleInsert("Escape");

  assert.equal(fixture.state.drill.mode, "prompt");
  assert.equal(fixture.state.drill.promptPrefix, ":");
  assert.match(fixture.state.drill.lines[2], /clean moves/);
  assert.equal(fixture.state.drill.stepIndex, 1);
});

test("clearing the meadow drill grants its reward flags and score", (t) => {
  const fixture = createDrillFixture("meadow");
  t.after(() => fixture.globals.restore());

  fixture.handleKey("w");
  fixture.handleKey("e");
  fixture.handleKey("b");
  fixture.handleKey("g");
  fixture.handleKey("e");
  fixture.handleKey("2");
  fixture.handleKey("w");
  fixture.handleKey("j");
  fixture.handleKey("i");
  fixture.typeInsert("fast");
  fixture.handleInsert("Escape");
  fixture.handleKey(":");
  fixture.typePrompt("q");
  fixture.handlePrompt("Enter");

  assert.equal(fixture.state.mode, "overworld");
  assert.equal(fixture.state.drill, null);
  assert.equal(fixture.state.flags.usedW, true);
  assert.equal(fixture.state.flags.usedB, true);
  assert.equal(fixture.state.flags.usedE, true);
  assert.equal(fixture.state.flags.usedGe, true);
  assert.equal(fixture.state.score, 110);
  assert.match(fixture.messages.at(-1).message, /Word drill cleared/);
  assert.equal(fixture.milestoneChecks, 1);
});
