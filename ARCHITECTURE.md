# Architecture Guide

Use this file if you want to understand how the repo is organized before editing it.

## What This Repo Optimizes For

The project is split for two reasons:

- readable enough to teach from
- easy enough to fork for new lessons, creatures, art, and maps

That is why most of the game still lives in plain ES modules and plain data objects instead of heavier framework structure.

## Read Order

If you are new to the repo, read files in this order:

1. [README.md](README.md)
2. [CONTENT_GUIDE.md](CONTENT_GUIDE.md)
3. [src/content.js](src/content.js)
4. [src/drills.js](src/drills.js)
5. [src/game.js](src/game.js)
6. [src/game-run-runtime.js](src/game-run-runtime.js)
7. [src/game-world-helpers.js](src/game-world-helpers.js)
8. [src/game-motion-runtime.js](src/game-motion-runtime.js)

That path gets you to editable surfaces first, then the orchestration layer.

## Module Ownership

- [src/content.js](src/content.js)
  - lessons, creatures, trainer colors, trainer frames, maps, palettes, control text
- [src/state.js](src/state.js)
  - run setup, save/load helpers, randomization, monster creation
- [src/drills.js](src/drills.js)
  - authored lesson drills
- [src/drill-runtime.js](src/drill-runtime.js)
  - drill cursor, prompt flow, insert flow, step completion
- [src/battle.js](src/battle.js)
  - top-level battle composition and battle input routing
- [src/battle-flow.js](src/battle-flow.js)
  - encounter setup, party switching, defeat reset, and finish/reward flow
- [src/battle-techniques.js](src/battle-techniques.js)
  - player techniques, VimOrb throws, catch resolution, and battle control lists
- [src/battle-enemy.js](src/battle-enemy.js)
  - enemy status pressure, cooldowns, and enemy-turn move resolution
- [src/battle-challenge-runtime.js](src/battle-challenge-runtime.js)
  - battle mini-drill cursor flow, motion parsing, and challenge resolution
- [src/battle-challenges.js](src/battle-challenges.js)
  - authored battle mini-drill templates
- [src/input.js](src/input.js)
  - command mode, rename mode, VimTree navigation, key normalization
- [src/overworld.js](src/overworld.js)
  - overworld movement, gate transitions, and NPC/sign interactions
- [src/scenes.js](src/scenes.js)
  - scene composition and shared HUD layout
- [src/scene-tree.js](src/scene-tree.js)
  - VimTree overlay rendering
- [src/scene-drill.js](src/scene-drill.js)
  - lesson deck and drill editor overlay rendering
- [src/scene-battle.js](src/scene-battle.js)
  - battle scene composition, battle command window, and battle mini-drill overlay rendering
- [src/progression.js](src/progression.js)
  - lesson completion, objective text, gate text, and control unlock rules
- [src/game-run-runtime.js](src/game-run-runtime.js)
  - run setup/reset, leaderboard sync, rename submission, and completed-run submission flow
- [src/game-world-helpers.js](src/game-world-helpers.js)
  - house lesson route helpers, map/tile queries, map offsets, and shared world-coordinate utilities
- [src/game-motion-runtime.js](src/game-motion-runtime.js)
  - overworld motion routing, repeat/count behavior, and locked-control messaging
- [src/game.js](src/game.js)
  - startup, mode transitions, shared dependency wiring, render loop, and browser input registration
- [server.js](server.js)
  - static hosting plus public leaderboard API

## Common Change Recipes

### Add a creature

Touch:

- [src/content.js](src/content.js)

Then run:

```bash
npm run build:assets
```

### Add a lesson

Touch:

- [src/content.js](src/content.js) for lesson copy
- [src/drills.js](src/drills.js) for the drill
- [src/game.js](src/game.js) for progression wiring, gates, and high-level messaging
- optionally [src/state.js](src/state.js) if you need a new unlock flag

### Add a map

Touch:

- [src/content.js](src/content.js) for map rows
- [src/game.js](src/game.js) for transitions and lesson routing
- optionally [src/scenes.js](src/scenes.js) if the map needs custom art treatment

### Recolor characters

Touch:

- [src/content.js](src/content.js) in `PLAYER_STYLE` or `NPC_STYLES`

### Change sprite art

Touch:

- [src/content.js](src/content.js) in trainer frame data or creature frame data

Then run:

```bash
npm run build:assets
```

### Change leaderboard or hosting behavior

Touch:

- [server.js](server.js)
- [src/persistence.js](src/persistence.js)
- [src/game-run-runtime.js](src/game-run-runtime.js)
- [src/game-world-helpers.js](src/game-world-helpers.js) if the change depends on map/tile helper behavior
- sometimes [src/game.js](src/game.js)

## Why `game.js` Still Exists

[src/game.js](src/game.js) is still the top-level glue file. That is intentional.

It owns:

- startup
- dependency wiring
- high-level progression
- overworld interaction routing
- mode transitions
- render loop
- browser input registration

Lower-level systems already live in `battle.js`, `battle-flow.js`, `battle-techniques.js`, `battle-enemy.js`, `battle-challenge-runtime.js`, `drill-runtime.js`, `input.js`, `state.js`, `scenes.js`, `game-run-runtime.js`, `game-world-helpers.js`, and `game-motion-runtime.js`. Most contributors should not need to touch `game.js` unless they are changing progression rules, render wiring, or connecting systems together.

## What To Avoid

- do not put new content directly into `game.js` if it can live in [src/content.js](src/content.js) or [src/drills.js](src/drills.js)
- do not merge systems back together just because one file feels easier in the moment
- do not hide simple editable data behind unnecessary helper layers

## Validation

Before opening a PR:

```bash
npm run build:assets
npm test
npm run lint
npm run check
npm run smoke
```

For gameplay or UI changes, also use [TESTING.md](TESTING.md).
