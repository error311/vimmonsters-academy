# Modding VimMonsters Academy

`src/content.js` is the main modding file. The engine in `src/game.js` reads exported data from it, so most visual and gameplay content changes can happen there without touching engine code.

If you do want to read the runtime side, it is now split by responsibility:

- `src/state.js`: run setup, map randomization, save data, and monster creation
- `src/drills.js`: lesson drill content and setup
- `src/drill-runtime.js`: how drill cursor movement, prompts, and insert-mode fixes work
- `src/battle.js`: catch flow, enemy turns, party switching, and battle outcomes
- `src/battle-challenges.js`: authored battle mini-drill templates
- `src/input.js`: command mode, rename mode, VimTree controls, and key normalization
- `src/overworld.js`: overworld movement, gate transitions, and NPC/sign interactions
- `src/progression.js`: lesson completion checks, objective text, and gate text
- `src/render.js`: canvas drawing primitives and text wrapping
- `src/scenes.js`: scene composition and shared HUD layout
- `src/scene-tree.js`: VimTree overlay rendering
- `src/scene-drill.js`: lesson deck and drill overlay rendering
- `src/scene-battle.js`: battle scene, command window, and battle mini-drill overlay rendering
- `src/game.js`: how those pieces work together during play

## Fastest Way To Customize The Game

1. Change `PLAYER_STYLE` to recolor the hero.
2. Change `NPC_STYLES` to recolor mentors.
3. Add a new `createCreature(...)` entry to `CREATURES`.
4. Edit `LESSONS`, `MAPS`, and `WORLD_COLORS` to change what the player learns and how the world looks.
5. Use [CONTENT_GUIDE.md](CONTENT_GUIDE.md) when you want the shortest route for adding content without reading every runtime file.

## Player And NPC Colors

Use `createCharacterStyle(...)` to override only the colors you care about.

```js
export const PLAYER_STYLE = createCharacterStyle({
  clothes: "#3666d6",
  hair: "#ff7b72",
  accent: "#8bc5ff",
});
```

The available character color slots are:

- `outline`
- `clothes`
- `hair`
- `accent`
- `skin`
- `boots`

NPCs use the same shape and the same color slots:

```js
export const NPC_STYLES = {
  mentor: createCharacterStyle({
    clothes: "#556f96",
    hair: "#ffe07a",
  }),
  coach: createCharacterStyle({
    clothes: "#705e8a",
    hair: "#ff9ac0",
  }),
  sage: createCharacterStyle({
    clothes: "#3d735c",
    hair: "#f6f2cf",
  }),
};
```

## Add A New Creature

Add a new object to `CREATURES` with `createCreature(...)`.

```js
createCreature({
  id: "sparkit",
  name: "Sparkit",
  baseHp: 18,
  baseAttack: 6,
  sprite: [
    "..33..",
    ".3443.",
    "344443",
    ".2332.",
    "..22..",
  ],
  palette: {
    "1": "#182033",
    "2": "#ffd166",
    "3": "#fff4d1",
    "4": "#ff8d58",
  },
  frames: [
    [
      "..33..",
      ".3443.",
      "344443",
      ".2332.",
      "..22..",
    ],
    [
      "..33..",
      ".3443.",
      "344443",
      "..332.",
      "..22..",
    ],
  ],
}),
```

Notes:

- `sprite` is the default frame.
- `frames` is optional. If you omit it, the engine uses `sprite` as a single-frame creature.
- Each row is a string. Each character maps to a color in `palette`.
- `.` means transparent.

## Edit Lesson Copy

Use `createLesson(...)` inside `LESSONS`:

```js
createLesson({
  id: "grove",
  title: "Lesson 4: Counts",
  body: "Meet Sage Count, use counted motions like 3w and 2j, then climb onward.",
}),
```

## Edit Or Add Maps

Maps are defined with `createMap(...)`.

```js
export const MAPS = {
  meadow: createMap({
    name: "Word Meadow",
    theme: "meadow",
    rows: [
      "####################",
      "#D==S======,,,,....#",
      "#....==.....,,,,...#",
      "#...............==R#",
      "####################",
    ],
  }),
};
```

Tile rows are plain strings, so the fastest way to teach level design is to sketch the layout directly in code.

## Add Or Edit Drills

The lesson editor content lives in `src/drills.js`.

- use `type: "motion"` for cursor movement checks like `w`, `e`, `2j`, or `gg`
- use `type: "insert"` for `i ... Esc` repairs
- use `type: "edit"` for edits like `x`, `dd`, or `cw`
- use `type: "search"` and `type: "replace"` for `/` and `:s` drills

That split keeps lesson content readable without mixing it into `src/game.js`.

## Change World Colors

The shared UI and environment palette lives in `WORLD_COLORS`.

```js
export const WORLD_COLORS = {
  skyA: "#7ec8ff",
  skyB: "#d6f3ff",
  grassA: "#5abf5a",
  grassB: "#8fe36d",
  panelAccent: "#ffd166",
  // ...
};
```

That is the easiest place to theme the game without touching render logic in `src/game.js`.

## Randomized Obstacles

`RANDOMIZATION_RULES` controls which maps reroll obstacles between runs and which marker tiles must remain reachable.

```js
export const RANDOMIZATION_RULES = {
  meadow: {
    start: { x: 1, y: 1 },
    markers: ["M", "R"],
    maxBlocks: 9,
  },
};
```

## Recommended Workflow

1. Make content edits in `src/content.js`.
2. Only open `src/game.js` if you need top-level orchestration or system wiring.
3. Use `src/overworld.js` for map flow and NPC interaction changes.
4. Use `src/scene-battle.js`, `src/scene-tree.js`, or `src/scene-drill.js` for specific UI/overlay work.
5. Run `node --check src/game.js` and `node --check src/content.js`.
6. Run `npm run smoke` to catch runtime wiring mistakes.
7. Start the local server with `node server.js`.
