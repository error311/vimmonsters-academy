# Contributing

VimMonsters Academy is meant to be both a Vim training game and a readable learning codebase. Contributions should improve one or both of those goals.

## Ground Rules

- Keep the game playable for new Vim users.
- Prefer small, teachable changes over clever but opaque ones.
- Keep `src/content.js` friendly for modders and learners.
- Preserve the split-module ownership:
  - `src/content.js`: game content and editable surfaces
  - `src/state.js`: state helpers and run setup
  - `src/drills.js` and `src/drill-runtime.js`: lesson content and drill behavior
  - `src/battle.js`: top-level battle composition and battle input routing
  - `src/battle-flow.js`: encounter setup, party switching, defeat reset, and finish/reward handling
  - `src/battle-techniques.js`: player techniques, VimOrb throws, catch resolution, and battle control lists
  - `src/battle-enemy.js`: enemy status pressure, cooldowns, and enemy-turn move resolution
  - `src/battle-challenge-runtime.js` and `src/battle-challenges.js`: battle mini-drill runtime behavior and authored challenge templates
  - `src/input.js`: command mode, rename mode, VimTree, and key normalization
  - `src/overworld.js`: overworld movement, gate transitions, and field interactions
  - `src/scenes.js`, `src/scene-tree.js`, `src/scene-drill.js`, and `src/scene-battle.js`: rendering and overlay layout
  - `src/progression.js`: lesson completion, objective text, and gate/control messaging
  - `src/game-run-runtime.js`: run/session lifecycle, leaderboard sync, and completed-run flow
  - `src/game-world-helpers.js`: house-route helpers plus shared map/tile and world-coordinate helpers
  - `src/game-motion-runtime.js`: overworld motion routing, repeat/count behavior, and locked-control messaging
  - `src/game.js`: top-level orchestration and system wiring

## Local Setup

```bash
npm install
npm run build:assets
npm run serve
```

Open `http://localhost:8002`.

If the default port is busy:

```bash
PORT=8004 npm run serve
```

If you want persistent local leaderboard data outside the project root:

```bash
LEADERBOARD_PATH=./data/leaderboard.json npm run serve
```

If you are testing the public competition path locally too:

```bash
COMPETITIVE_SECRET=dev-secret \
LEADERBOARD_PATH=./data/leaderboard.json \
COMPETITION_STATE_PATH=./data/competition-state.json \
npm run serve
```

## Before Opening A PR

Run:

```bash
npm run build:assets
npm run build:readme-media
npm test
npm run lint
npm run check
npm run smoke
```

Also walk through the manual checklist in [TESTING.md](TESTING.md) for any gameplay or UI change.

For leaderboard, hosting, or server-hardening changes, also verify:

- `scripts/api-smoke.mjs` behavior through `npm run smoke`
- rate limits and append-only run submission still behave as expected

## Pull Request Expectations

- keep the PR scoped to one main improvement or bug fix
- describe the player-facing impact, not just the code change
- mention any lesson, map, battle, or UI flow that changed
- include updated screenshots or GIFs when visible UI changed
- note whether generated files like `assets/` or `docs/media/` were rebuilt

## Good Contribution Targets

- New Vim lessons and better drill design
- Battle clarity and strategy
- Sprite and tileset improvements
- Better onboarding copy and UX
- Modding/documentation improvements
- Bug fixes with regression coverage
- Hosting and API hardening that keep the public leaderboard safer

## Content Changes

If you are adding lessons, creatures, maps, or trainer art, start with:

- [CONTENT_GUIDE.md](CONTENT_GUIDE.md)
- [MODDING.md](MODDING.md)

If you add or change sprite frame data, rebuild the generated PNG assets with:

```bash
npm run build:assets
```

## Style

- Use ASCII unless the file already needs something else.
- Keep comments short and only where they help a learner.
- Do not collapse multiple systems back into `src/game.js` unless there is a strong reason.
- Keep run and leaderboard flow in `src/game-run-runtime.js` unless the change truly belongs in the top-level bootstrap.
- Keep shared map/tile and house-route helpers in `src/game-world-helpers.js` unless the change truly belongs in a specific runtime.
- Keep overworld motion routing and locked-control text in `src/game-motion-runtime.js` unless the change truly belongs in a different runtime.
- Keep encounter setup, party switching, defeat reset, and finish/reward flow in `src/battle-flow.js` unless the change truly belongs in a different battle runtime.
- Keep player techniques, VimOrb throws, and catch resolution in `src/battle-techniques.js` unless the change truly belongs in a different battle runtime.
- Keep enemy status pressure, cooldowns, and enemy-turn move resolution in `src/battle-enemy.js` unless the change truly belongs in a different battle runtime.
- Keep battle mini-drill cursor flow and motion resolution in `src/battle-challenge-runtime.js` unless the change truly belongs in broader battle flow.
- If a change touches gameplay rules, explain the player-facing behavior in the PR.

## Bug Reports

Useful bug reports include:

- exact reproduction steps
- browser console error text if there is one
- map/lesson name where it happened
- expected behavior vs actual behavior

## Branch And Commit Guidance

- use short descriptive branches like `fix-battle-hud` or `add-finder-fen-lesson`
- keep commit messages direct and readable
- avoid mixing art generation, gameplay changes, and docs churn in one commit if they can be separated

## License

By contributing, you agree that your contributions will be licensed under the MIT License in [LICENSE](LICENSE).
