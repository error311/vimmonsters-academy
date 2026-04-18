// Owns: overworld movement, gate transitions, NPC/sign interactions, and
// lesson-specific world events. Does not own: top-level keyboard routing,
// battle rules, or rendering.

export function createOverworldRuntime(deps) {
  const {
    state,
    maps,
    cellKey,
    houseStageIndex,
    houseCurrentSegmentKeys,
    houseRouteKeys,
    currentHouseTargetLabel,
    createMonster,
    setMessage,
    playSound,
    setFx,
    checkMilestones,
    gateInspectMessage,
    gateBlockedMessage,
    maybeEncounter,
    startEncounterTransition,
    healParty,
    tileAt,
    isWalkable,
    isGateTile,
    directionVector,
    reverseDirection,
    openStarterSelect,
    syncFollowerTrail,
    pushFollowerStep,
    startLessonDrill,
    houseComplete,
    meadowComplete,
    ridgeComplete,
    groveComplete,
    fenComplete,
    studioComplete,
  } = deps;

  function markHouseTrailPosition(x, y) {
    if (state.map !== "house") {
      return;
    }
    const key = cellKey(x, y);
    const allowed = houseRouteKeys(houseStageIndex());
    if (!allowed.has(key) && !state.houseTrailVisited.includes(key)) {
      return;
    }
    if (!state.houseTrailVisited.includes(key)) {
      state.houseTrailVisited.push(key);
    }
  }

  function signText() {
    const facing = directionVector(state.facing);
    const x = state.x + facing.dx;
    const y = state.y + facing.dy;
    const key = `${state.map}:${x},${y}`;
    const table = {
      "house:16,2": "Home Row sign: Walk over H, J, K, and L. They are the four core motion keys.",
      "meadow:4,1": "Mentor note: w and b land on word starts. e lands on the current word end. ge lands on the previous word end.",
      "meadow:13,9": "Field note: Wild VimMonsters live in tall grass. Use a or x to weaken them and f to throw a VimOrb.",
      "ridge:6,2": "Cliff note: 0 and $ jump to the far left and far right of the current row. x deletes the stray character under the cursor.",
      "ridge:6,10": "Coach note: Press [ or ] once after the drill to switch your active VimMonster and clear Lesson 3. x is Quick Jab in battle.",
      "grove:7,4": "Count note: Prefix a motion with a number. Try 3w, then 2j. dd deletes a full line.",
      "grove:9,9": "Reward note: Lesson clears grant score and extra VimOrbs. cw powers the next VimOrb in battle.",
      "fen:6,4": "Scout note: f and t move forward to a character. F and T search backward on the same line.",
      "fen:10,9": "Fen note: The cache is optional. It pays score and VimOrbs, but wakes a rare wild encounter.",
      "studio:3,2": "Scribe note: dw deletes a word from the cursor. ciw changes the word under the cursor and drops you into insert.",
      "studio:5,9": "Studio note: Break Word strips enemy guard and evade. Inner Word heals and primes a Focus Ball.",
      "tower:10,5": "Tower note: gg jumps to the top. G jumps to the bottom. / searches, and :s repairs the file.",
    };
    return table[key] || "The sign is blank.";
  }

  function mentorTalk() {
    if (!state.flags.metMentor) {
      state.flags.metMentor = true;
      state.flags.commandUnlocked = true;
      state.vimOrbs += 6;
      state.score += 90;
      setFx("reward", "hud", 1500);
    }
    if (!state.flags.usedW || !state.flags.usedB || !state.flags.usedE || !state.flags.usedGe) {
      startLessonDrill("meadow");
      return;
    }
    setMessage("Mentor W: Think in words. w and b land on starts. e and ge land on word endings.", "mentor");
  }

  function coachTalk() {
    if (!state.flags.metCoach) {
      state.flags.metCoach = true;
      if (state.party.length < 2) {
        state.party.push(createMonster("tabbit", 6));
      }
      healParty();
      state.score += 110;
      setFx("reward", "hud", 1500);
    }
    if (!state.flags.usedZero || !state.flags.usedDollar || !state.flags.usedX) {
      startLessonDrill("ridge");
      return;
    }
    if (!state.flags.switchedParty) {
      setMessage("Coach Buffer: Good. Now press [ or ] once to switch your active VimMonster. That finishes Lesson 3.", "coach");
      return;
    }
    setMessage("Coach Buffer: x is your Quick Jab now. Use [ and ] whenever a different party member is a better fit.", "coach");
  }

  function sageTalk() {
    if (!state.flags.metSage) {
      state.flags.metSage = true;
      state.vimOrbs += 3;
      state.score += 60;
      setFx("reward", "hud", 1500);
    }
    if (!state.flags.usedCountMove || !state.flags.usedDd || !state.flags.usedCw) {
      startLessonDrill("grove");
      return;
    }
    setMessage("Sage Count: Counts multiply the next motion. dd and cw now carry into battle too.", "sage");
  }

  function scoutTalk() {
    if (!state.flags.metScout) {
      state.flags.metScout = true;
      if (state.party.length < 3) {
        state.party.push(createMonster("glyphowl", 7));
      }
      state.vimOrbs += 2;
      state.score += 80;
      healParty();
      setFx("reward", "hud", 1500);
    }
    if (!state.flags.usedFindForward || !state.flags.usedTillForward || !state.flags.usedFindBackward || !state.flags.usedTillBackward) {
      startLessonDrill("fen");
      return;
    }
    setMessage("Scout Find: Character-find motions win space without overmoving. Use them when a line has a precise target.", "scout");
  }

  function scribeTalk() {
    if (!state.flags.metScribe) {
      state.flags.metScribe = true;
      state.vimOrbs += 3;
      state.score += 90;
      healParty();
      setFx("reward", "hud", 1500);
    }
    if (!state.flags.usedDw || !state.flags.usedCiw) {
      startLessonDrill("studio");
      return;
    }
    setMessage("Scribe Edit: Operators shape lines fast. dw tears space open. ciw fixes the inner word without touching the rest.", "scribe");
  }

  function inspectCache(mapName) {
    if (mapName === "fen") {
      if (state.flags.fenCacheClaimed) {
        setMessage("The fen cache is empty. The rare encounter already sprang loose.", "sign");
        return;
      }
      state.flags.fenCacheClaimed = true;
      state.score += 90;
      state.vimOrbs += 2;
      setFx("reward", "hud", 1400);
      setMessage("Fen cache opened. +90 score and +2 VimOrbs. A Glyphowl bursts out of the reeds.", "glyphowl");
      startEncounterTransition(createMonster("glyphowl", 8), false);
      return;
    }
    if (mapName === "studio") {
      if (state.flags.studioCacheClaimed) {
        setMessage("The studio cache is empty. The hard optional fight is already gone.", "sign");
        return;
      }
      state.flags.studioCacheClaimed = true;
      state.score += 110;
      state.vimOrbs += 2;
      setFx("reward", "hud", 1400);
      setMessage("Studio cache opened. +110 score and +2 VimOrbs. Slashram charges out of the frame room.", "slashram");
      startEncounterTransition(createMonster("slashram", 9), false);
    }
  }

  function altarInteract() {
    if (!state.flags.towerDrillCleared) {
      startLessonDrill("tower");
      return;
    }
    if (state.flags.finalWon) {
      setMessage("The altar is quiet. You already beat the academy.", "macrobat");
      return;
    }
    if (!state.flags.finalStarted) {
      state.flags.finalStarted = true;
      startEncounterTransition(createMonster("macrobat", 9), true);
      return;
    }
    startEncounterTransition(createMonster("macrobat", 9), true);
  }

  function interactAhead() {
    const vector = directionVector(state.facing);
    const targetX = state.x + vector.dx;
    const targetY = state.y + vector.dy;
    const tile = tileAt(state.map, targetX, targetY);

    if (tile === "B") {
      healParty();
      setMessage("You rest at home. The whole party is fully healed.", "player");
      return;
    }
    if (tile === "S") {
      setMessage(signText(), "sign");
      return;
    }
    if (tile === "M") {
      mentorTalk();
      return;
    }
    if (tile === "C") {
      coachTalk();
      return;
    }
    if (tile === "V") {
      sageTalk();
      return;
    }
    if (tile === "N") {
      scoutTalk();
      return;
    }
    if (tile === "Q") {
      scribeTalk();
      return;
    }
    if (tile === "Y") {
      inspectCache(state.map);
      return;
    }
    if (tile === "X") {
      altarInteract();
      return;
    }
    if (tile === "E" || tile === "R" || tile === "D" || tile === "T") {
      setMessage(gateInspectMessage(tile), "sign");
      return;
    }
    setMessage("Nothing important is in front of you.", "player");
  }

  function postLanding(tile) {
    if (state.map === "house") {
      const stage = houseStageIndex();
      const currentKey = cellKey(state.x, state.y);
      const activeSegment = houseCurrentSegmentKeys(stage);
      const clearedRoute = houseRouteKeys(stage - 1);
      activeSegment.add(cellKey(state.houseLesson.start.x, state.houseLesson.start.y));
      ["H", "J", "K", "L"].forEach((letter) => {
        const point = state.houseLesson.targets[letter];
        if (point && (state.flags[`rune${letter}`] || houseStageIndex() === ["H", "J", "K", "L"].indexOf(letter))) {
          activeSegment.add(cellKey(point.x, point.y));
        }
      });
      if (!activeSegment.has(currentKey) && !clearedRoute.has(currentKey) && tile !== "S" && tile !== "B") {
        state.score = Math.max(0, state.score - 8);
        setMessage(`Stay on the lesson path to the ${currentHouseTargetLabel()}. -8 score.`, "player");
        return;
      }

      if (tile === "H" && !state.flags.runeH) {
        if (stage !== 0) {
          state.score = Math.max(0, state.score - 10);
          setMessage("That is not the next rune in the route. -10 score.", "player");
          return;
        }
        state.flags.runeH = true;
        state.score += 20;
        setMessage("Rune H: h moves left. +20 score. Follow the bright route to J next.", "player");
        checkMilestones();
        return;
      }
      if (tile === "J" && !state.flags.runeJ) {
        if (stage !== 1) {
          state.score = Math.max(0, state.score - 10);
          setMessage("The training route wants H first, then J. -10 score.", "player");
          return;
        }
        state.flags.runeJ = true;
        state.score += 20;
        setMessage("Rune J: j moves down. +20 score. Follow the bright route to K next.", "player");
        checkMilestones();
        return;
      }
      if (tile === "K" && !state.flags.runeK) {
        if (stage !== 2) {
          state.score = Math.max(0, state.score - 10);
          setMessage("The lesson route has not reached K yet. -10 score.", "player");
          return;
        }
        state.flags.runeK = true;
        state.score += 20;
        setMessage("Rune K: k moves up. +20 score. Follow the bright route to L next.", "player");
        checkMilestones();
        return;
      }
      if (tile === "L" && !state.flags.runeL) {
        if (stage !== 3) {
          state.score = Math.max(0, state.score - 10);
          setMessage("The lesson route has not reached L yet. -10 score.", "player");
          return;
        }
        state.flags.runeL = true;
        state.score += 20;
        setMessage("Rune L: l moves right. +20 score. Follow the bright route back to the door.", "player");
        checkMilestones();
        return;
      }
    }
    maybeEncounter(tile);
    if (state.mode === "overworld") {
      if (tile === ",") {
        setMessage("Tall grass rustles around you.");
      } else {
        setMessage(`Exploring ${maps[state.map].name}.`);
      }
    }
  }

  function transitionIfNeeded(tile) {
    if (!isGateTile(tile)) {
      return false;
    }

    if (state.map === "house" && tile === "E") {
      if (!houseComplete()) {
        setMessage(gateBlockedMessage(tile));
        return true;
      }
      if (!state.flags.starterChosen) {
        openStarterSelect();
        return true;
      }
      state.map = "meadow";
      state.x = 1;
      state.y = 1;
      state.facing = "right";
      syncFollowerTrail();
      setMessage("Welcome to Word Meadow. Find Mentor W and catch your first VimMonster.");
      return true;
    }

    if (state.map === "meadow" && tile === "D") {
      state.map = "house";
      state.x = 9;
      state.y = 10;
      state.facing = "down";
      syncFollowerTrail();
      setMessage("Back to Home Row House.");
      return true;
    }

    if (state.map === "meadow" && tile === "R") {
      if (!meadowComplete()) {
        setMessage(gateBlockedMessage(tile));
        return true;
      }
      state.map = "ridge";
      state.x = 1;
      state.y = 1;
      state.facing = "right";
      syncFollowerTrail();
      setMessage("Line Ridge opens. Coach Buffer teaches 0, $, then [ or ] to switch your active VimMonster.");
      return true;
    }

    if (state.map === "ridge" && tile === "R") {
      state.map = "meadow";
      state.x = 17;
      state.y = 10;
      state.facing = "left";
      syncFollowerTrail();
      setMessage("You head back to Word Meadow.");
      return true;
    }

    if (state.map === "ridge" && tile === "T") {
      if (!ridgeComplete()) {
        setMessage(gateBlockedMessage(tile));
        return true;
      }
      state.map = "grove";
      state.x = 1;
      state.y = 1;
      state.facing = "right";
      syncFollowerTrail();
      setMessage("Count Grove opens. Lesson 3 is complete and Sage Count is waiting with count motions.");
      return true;
    }

    if (state.map === "grove" && tile === "R") {
      state.map = "ridge";
      state.x = 17;
      state.y = 10;
      state.facing = "left";
      syncFollowerTrail();
      setMessage("You head back to Line Ridge.");
      return true;
    }

    if (state.map === "grove" && tile === "T") {
      if (!groveComplete()) {
        setMessage("Finder Fen opens after Sage Count teaches counts and you use them.");
        return true;
      }
      state.map = "fen";
      state.x = 1;
      state.y = 1;
      state.facing = "right";
      syncFollowerTrail();
      setMessage("Finder Fen opens. Scout Find teaches f, t, F, and T, and a hidden cache stirs a rare encounter.");
      return true;
    }

    if (state.map === "fen" && tile === "R") {
      state.map = "grove";
      state.x = 17;
      state.y = 10;
      state.facing = "left";
      syncFollowerTrail();
      setMessage("You head back to Count Grove.");
      return true;
    }

    if (state.map === "fen" && tile === "T") {
      if (!fenComplete()) {
        setMessage(gateBlockedMessage(tile));
        return true;
      }
      state.map = "studio";
      state.x = 1;
      state.y = 1;
      state.facing = "right";
      syncFollowerTrail();
      setMessage("Operator Studio opens. Scribe Edit teaches dw and ciw, and the cache holds a harder optional fight.");
      return true;
    }

    if (state.map === "studio" && tile === "R") {
      state.map = "fen";
      state.x = 17;
      state.y = 10;
      state.facing = "left";
      syncFollowerTrail();
      setMessage("You head back to Finder Fen.");
      return true;
    }

    if (state.map === "studio" && tile === "T") {
      if (!studioComplete()) {
        setMessage(gateBlockedMessage(tile));
        return true;
      }
      state.map = "tower";
      state.x = 1;
      state.y = 1;
      state.facing = "right";
      syncFollowerTrail();
      setMessage("Macro Tower unlocks. Search, replace, and the final battle wait at the altar.");
      return true;
    }

    if (state.map === "tower" && tile === "T") {
      state.map = "studio";
      state.x = 17;
      state.y = 10;
      state.facing = "left";
      syncFollowerTrail();
      setMessage("You descend back to Operator Studio.");
      return true;
    }

    return false;
  }

  function moveTo(x, y, facing) {
    const previous = {
      map: state.map,
      x: state.x,
      y: state.y,
      facing: state.facing,
    };
    state.x = x;
    state.y = y;
    state.facing = facing;
    state.lastMoveAt = performance.now();
    state.stepFrame = (state.stepFrame + 1) % 2;
    playSound("step");
    markHouseTrailPosition(x, y);
    pushFollowerStep(previous);

    const tile = tileAt(state.map, x, y);
    if (transitionIfNeeded(tile)) {
      return true;
    }
    postLanding(tile);
    return true;
  }

  function tryMove(dx, dy, facing, silentBlock) {
    state.facing = facing;
    const nextX = state.x + dx;
    const nextY = state.y + dy;
    const tile = tileAt(state.map, nextX, nextY);
    if (!isWalkable(tile)) {
      if (!silentBlock) {
        state.score = Math.max(0, state.score - 2);
        playSound("blocked");
        setMessage("That path is blocked. -2 score.", "player");
      }
      return false;
    }
    return moveTo(nextX, nextY, facing);
  }

  function scanMove(dx, dy, limit, facing) {
    let steps = 0;
    let currentX = state.x;
    let currentY = state.y;
    let moved = false;

    while (steps < limit) {
      const nextX = currentX + dx;
      const nextY = currentY + dy;
      const tile = tileAt(state.map, nextX, nextY);
      if (!isWalkable(tile)) {
        break;
      }
      currentX = nextX;
      currentY = nextY;
      moved = true;
      steps += 1;
      if (isGateTile(tile)) {
        break;
      }
    }

    if (!moved) {
      playSound("blocked");
      setMessage("No room to move that way.");
      return false;
    }
    return moveTo(currentX, currentY, facing);
  }

  function lineJump(horizontalDirection) {
    const delta = horizontalDirection === "left" ? -1 : 1;
    const moved = scanMove(delta, 0, 999, horizontalDirection);
    if (moved) {
      if (horizontalDirection === "left") {
        state.flags.usedZero = true;
      } else {
        state.flags.usedDollar = true;
      }
      checkMilestones();
    }
  }

  function fileJump(verticalDirection) {
    const delta = verticalDirection === "up" ? -1 : 1;
    const moved = scanMove(0, delta, 999, verticalDirection);
    if (moved) {
      if (verticalDirection === "up") {
        state.flags.usedGG = true;
      } else {
        state.flags.usedBigG = true;
      }
      checkMilestones();
    }
  }

  function dash(direction, backwards, count) {
    const vector = directionVector(backwards ? reverseDirection(direction) : direction);
    const facing = backwards ? reverseDirection(direction) : direction;
    const moved = scanMove(vector.dx, vector.dy, count, facing);
    if (!moved) {
      return;
    }
    if (backwards) {
      state.flags.usedB = true;
    } else {
      state.flags.usedW = true;
    }
    if (count >= 3 && !backwards) {
      state.flags.usedCountWord = true;
    }
    checkMilestones();
  }

  return {
    tryMove,
    lineJump,
    fileJump,
    dash,
    interactAhead,
  };
}
