# Content Guide

Use this file when you want to add or edit game content without reading the whole engine.

If you want the runtime/module overview first, read [ARCHITECTURE.md](ARCHITECTURE.md).

## Main Content Surfaces

- `src/content.js`
  - `PLAYER_STYLE`: recolor the hero
  - `NPC_STYLES`: recolor mentors
  - `PLAYER_FRAMES`, `MENTOR_FRAMES`, `COACH_FRAMES`, `SAGE_FRAMES`: change trainer art
  - `CREATURES`: add or edit VimMonsters
  - `LESSONS`: rename lessons and change the lesson copy
  - `MAPS`: edit layouts and progression paths
  - `RANDOMIZATION_RULES`: control which maps reroll blocks and what must stay reachable
  - `CONTROL_INFO`: change the VimTree control descriptions

- `src/drills.js`
  - add new lesson drills
  - define exact required motions or edits
  - choose whether a drill is prose or code

## Add A Creature

1. Add a new `createCreature(...)` entry to `CREATURES`.
2. Give it:
   - a unique `id`
   - a display `name`
   - `baseHp` and `baseAttack`
   - a `palette`
   - a default `sprite`
   - optional animated `frames`
3. Run `npm run build:assets`.

## Add A Trainer Look

1. Update the trainer style colors in `NPC_STYLES`.
2. Edit the frame overlays or base frame patterns in `src/content.js`.
3. Run `npm run build:assets`.

## Add A Lesson

1. Add lesson text to `LESSONS` in `src/content.js`.
2. Add a drill builder in `src/drills.js`.
3. Update progression checks or lesson objective text in `src/progression.js`.
4. Update any reward flags in `src/state.js` if the lesson needs new milestones.

## Add A Map

1. Add a `createMap(...)` entry to `MAPS`.
2. Add a rule to `RANDOMIZATION_RULES` if you want rerolled obstacles.
3. Update transitions and gate logic in `src/overworld.js`.
4. Update objective/gate copy in `src/progression.js` if the new map changes lesson flow.
5. Add tile rendering if the new map needs special art in `src/scenes.js`.

## Verify Changes

```bash
npm run build:assets
npm run lint
npm run check
npm run smoke
```
