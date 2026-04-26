# Runtime Smoke Test

Use this checklist after any gameplay or refactor change.

Also run:

```bash
npm test
npm run smoke
```

## Boot

1. Run `node server.js` or `npm run serve`.
2. Open the browser page and confirm the title screen/HUD renders without console errors.
3. Confirm the top run strip, bottom message panel, and canvas all fit on one page without overlap.

## Core Run

1. Start a fresh run and move in the house with `h`, `j`, `k`, `l`.
2. Follow the highlighted house route and confirm stepping on the correct rune awards score.
3. Leave the house and confirm map transition, location label, and lesson goal update.
4. Walk into grass and confirm a random encounter can trigger with transition effects.

## Drills

1. Word Meadow: talk to the mentor with `i`, clear the `w`, `b`, `e`, and `ge` drill, and confirm the success banner plus score reward.
2. Line Ridge: clear the `0`, `$`, `^`, and `x` drill, then press `[` or `]` in the overworld to finish the switch lesson.
3. Count Grove: clear the counted drill, delete the noisy line with `dd`, change a word with `cw`, and confirm counts only pass when exact.
4. Macro Tower: inspect the altar and confirm the final drill appears before the boss battle.
5. In any insert step, type the requested text and press `Esc` to submit.

## Battle Loop

1. Start a wild battle and confirm `a` attacks, `f` throws a VimOrb, and `r` runs.
2. After clearing the ridge lesson, confirm `x` performs Quick Jab.
3. After clearing the grove lesson, confirm `dd` performs Heavy Slam and `cw` powers the next VimOrb.
4. Capture at least one VimMonster and confirm it joins the party.
5. Press `[` or `]` in battle and confirm party switching works.
6. Lose a battle once and confirm defeat applies a score penalty and returns you home.

## Save, Leaderboard, Reset

1. Use `R` to rename the run and confirm the new name appears in the HUD.
2. Use `:w`, refresh the page, then use `:load` and confirm the run state returns.
3. Finish the full run, confirm the completion banner persists until `Esc`, and verify the leaderboard updates.
4. Use `:q` and confirm the run resets on a new seed with a fresh randomized layout.

## Audio

1. Press any key once and confirm music starts.
2. Trigger a reward, a battle hit, and a capture and confirm each has a distinct sound.
3. Press `m` and confirm audio mutes, then press `m` again and confirm it returns.

## VimTree and Commands

1. Press `o` to open VimTree, navigate with `h`, `j`, `k`, `l`, and focus with `Enter`.
2. Confirm long leaderboard entries and long lesson text stay inside the panel.
3. Use `:help`, `:party`, `:map`, and `:lesson` and confirm each returns a readable message.

## Regression Notes

- If movement stops entirely, check the browser console first. A render crash blocks the game loop.
- If a split-module refactor lands, run `npm run check` before opening the browser.
- If a runtime refactor lands, run `npm test` before trusting the manual pass.
