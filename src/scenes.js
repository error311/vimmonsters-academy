// Owns: canvas scene composition, HUD layout, overlays, and sprite/window
// drawing orchestration. Does not own: gameplay rules, persistence, or input
// handling.

import { createTreeOverlayRenderer } from "./scene-tree.js";
import { createDrillOverlayRenderer } from "./scene-drill.js";
import { createBattleSceneRenderer } from "./scene-battle.js";

export function createScenes(deps) {
  const {
    ctx,
    state,
    maps,
    species,
    colors,
    screenWidth,
    screenHeight,
    tileSize,
    viewHeight,
    dialogueY,
    playerFrames,
    mentorFrames,
    coachFrames,
    sageFrames,
    scoutFrames,
    scribeFrames,
    playerPalette,
    monsterFrames,
    mentorPalette,
    coachPalette,
    sagePalette,
    scoutPalette,
    scribePalette,
    drawRect,
    drawGradientRect,
    drawEllipse,
    drawText,
    fittedText,
    wrappedLines,
    drawWrapped,
    drawOutlinedSprite,
    drawBitmap,
    drawBitmapFrame,
    bitmapAssets,
    activeMonster,
    elapsedMs,
    formatDuration,
    shortSeed,
    houseStageIndex,
    housePathTone,
    mapRows,
    mapOffset,
    monsterPalette,
    objectiveText,
    controlHintText,
    treeSections,
    currentDrillStep,
    hydrateDrill,
    startBattle,
  } = deps;

  const SIGN_PORTRAIT = [
    "..11111111..",
    ".1222222221.",
    ".1233333321.",
    ".1231111321.",
    ".1233333321.",
    ".1231111321.",
    ".1233333321.",
    ".1222222221.",
    "..11111111..",
  ];

  function drawPanelShadow(x, y, w, h, alpha) {
    drawRect(x + 8, y + 8, w, h, `rgba(8, 14, 24, ${alpha || 0.18})`);
    drawRect(x + 4, y + 4, w, h, `rgba(8, 14, 24, ${(alpha || 0.18) * 0.6})`);
  }

  function drawSparkle(x, y, size, color) {
    const radius = size || 2;
    drawRect(x - radius, y, radius * 2 + 1, 1, color);
    drawRect(x, y - radius, 1, radius * 2 + 1, color);
    drawRect(x - 1, y - 1, 3, 3, color);
  }

  function fxProgress(kind, time) {
    if (!state.fx || state.fx.kind !== kind) {
      return 0;
    }
    const duration = Math.max(1, state.fx.endAt - state.fx.startedAt);
    return Math.max(0, Math.min(1, (time - state.fx.startedAt) / duration));
  }

  function drawWindow(x, y, w, h) {
    drawPanelShadow(x, y, w, h, 0.22);
    drawRect(x, y, w, h, "#132136");
    drawRect(x + 2, y + 2, w - 4, h - 4, "#f6efc9");
    drawRect(x + 5, y + 5, w - 10, h - 10, "#1a2a44");
    drawGradientRect(x + 8, y + 8, w - 16, 24, [
      [0, "#d9edff"],
      [0.55, "#a7d0ff"],
      [1, "#86b8f8"],
    ]);
    drawRect(x + 8, y + 33, w - 16, h - 41, "#fffdf5");
    drawRect(x + 12, y + 37, w - 24, h - 49, "rgba(232, 240, 255, 0.28)");
  }

  function portraitSpec(id) {
    if (id === "mentor") {
      return { pattern: mentorFrames.down[0], palette: mentorPalette, label: "Mentor W", scale: 3, bitmap: "mentor" };
    }
    if (id === "coach") {
      return { pattern: coachFrames.down[0], palette: coachPalette, label: "Coach", scale: 3, bitmap: "coach" };
    }
    if (id === "sage") {
      return { pattern: sageFrames.down[0], palette: sagePalette, label: "Sage", scale: 3, bitmap: "sage" };
    }
    if (id === "scout") {
      return { pattern: scoutFrames.down[0], palette: scoutPalette, label: "Scout Find", scale: 3, bitmap: "scout" };
    }
    if (id === "scribe") {
      return { pattern: scribeFrames.down[0], palette: scribePalette, label: "Scribe Edit", scale: 3, bitmap: "scribe" };
    }
    if (id === "sign") {
      return {
        pattern: SIGN_PORTRAIT,
        palette: { "1": "#6d4b2d", "2": "#d7a061", "3": "#fff1c7" },
        label: "Sign",
        scale: 4,
      };
    }
    if (species[id]) {
      return {
        pattern: monsterFrames[id] ? monsterFrames[id][0] : species[id].sprite,
        palette: monsterPalette(id),
        label: species[id].name,
        scale: id === "macrobat" ? 4 : 5,
        bitmap: id,
      };
    }
    return { pattern: playerFrames.down[0], palette: playerPalette, label: "You", scale: 3, bitmap: "player" };
  }

  function trainerDirectionIndex(direction) {
    return Math.max(0, bitmapAssets.trainerOrder.indexOf(direction));
  }

  function trainerSheet(id) {
    return bitmapAssets && bitmapAssets.trainers ? bitmapAssets.trainers[id] : null;
  }

  function monsterSheet(id) {
    return bitmapAssets && bitmapAssets.monsters ? bitmapAssets.monsters[id] : null;
  }

  function uiAsset(id) {
    return bitmapAssets && bitmapAssets.ui ? bitmapAssets.ui[id] : null;
  }

  function drawTrainerFrame(sheetId, direction, frameIndex, x, y, scale) {
    const sheet = trainerSheet(sheetId);
    if (!sheet) {
      return false;
    }
    return drawBitmapFrame(
      sheet.image,
      frameIndex * sheet.frameWidth,
      trainerDirectionIndex(direction) * sheet.frameHeight,
      sheet.frameWidth,
      sheet.frameHeight,
      x,
      y,
      sheet.frameWidth * scale,
      sheet.frameHeight * scale
    );
  }

  function drawMonsterFrame(id, frameIndex, x, y, scale) {
    const sheet = monsterSheet(id);
    if (!sheet) {
      return false;
    }
    return drawBitmapFrame(
      sheet.image,
      frameIndex * sheet.frameWidth,
      0,
      sheet.frameWidth,
      sheet.frameHeight,
      x,
      y,
      sheet.frameWidth * scale,
      sheet.frameHeight * scale
    );
  }

  function drawMonsterFrameFit(id, frameIndex, x, y, maxWidth, maxHeight) {
    const sheet = monsterSheet(id);
    if (!sheet) {
      return false;
    }
    const scale = Math.min(maxWidth / sheet.frameWidth, maxHeight / sheet.frameHeight);
    const width = Math.floor(sheet.frameWidth * scale);
    const height = Math.floor(sheet.frameHeight * scale);
    const drawX = x + Math.floor((maxWidth - width) / 2);
    const drawY = y + Math.floor((maxHeight - height) / 2);
    return drawBitmapFrame(
      sheet.image,
      frameIndex * sheet.frameWidth,
      0,
      sheet.frameWidth,
      sheet.frameHeight,
      drawX,
      drawY,
      width,
      height
    );
  }

  function drawPortraitCard(x, y, portraitId) {
    const spec = portraitSpec(portraitId || "player");
    drawWindow(x, y, 124, 108);
    drawGradientRect(x + 12, y + 40, 100, 52, [
      [0, "#f4fbff"],
      [0.55, "#d5ebff"],
      [1, "#b3d1ff"],
    ]);
    drawRect(x + 12, y + 84, 100, 8, "rgba(23, 35, 58, 0.08)");
    drawText(spec.label, x + 62, y + 28, {
      align: "center",
      size: 12,
      color: colors.panelDark,
    });
    if (spec.bitmap && trainerSheet(spec.bitmap)) {
      const sheet = trainerSheet(spec.bitmap);
      const cropHeight = Math.floor(sheet.frameHeight * 0.64);
      drawBitmapFrame(sheet.image, 0, 0, sheet.frameWidth, cropHeight, x + 18, y + 40, 88, 50);
      return;
    }
    if (spec.bitmap && monsterSheet(spec.bitmap)) {
      const sheet = monsterSheet(spec.bitmap);
      drawBitmapFrame(sheet.image, 0, 0, sheet.frameWidth, sheet.frameHeight, x + 16, y + 40, 92, 72);
      return;
    }
    const width = spec.pattern[0].length * spec.scale;
    const height = spec.pattern.length * spec.scale;
    drawOutlinedSprite(spec.pattern, spec.palette, x + Math.floor((124 - width) / 2), y + 44 + Math.floor((44 - height) / 2), spec.scale, "#172030");
  }

  function timerColor() {
    if (!state.bestTimeMs) {
      return "#8ee3ff";
    }
    const progress = elapsedMs() / state.bestTimeMs;
    if (progress > 1) {
      return "#ff786d";
    }
    if (progress > 0.72) {
      return "#ffd166";
    }
    return "#8df0a1";
  }

  function drawInfoBadge(x, y, w, label, value, accent) {
    drawPanelShadow(x, y, w, 24, 0.12);
    drawRect(x, y, w, 24, "#13233b");
    drawRect(x + 2, y + 2, w - 4, 20, "#f7efc5");
    drawRect(x + 5, y + 5, w - 10, 14, "#fffaf0");
    drawText(label, x + 12, y + 16, {
      size: 10,
      color: colors.panelDark,
    });
    drawText(value, x + w - 12, y + 16, {
      size: 11,
      align: "right",
      color: accent || colors.ink,
    });
  }

  function drawPlayer(x, y, time) {
    const movedRecently = time - (state.lastMoveAt || 0) < 180;
    const frames = playerFrames[state.facing] || playerFrames.down;
    drawEllipse(x + 18, y + 31, 12, 4, "rgba(16, 22, 32, 0.22)");
    drawEllipse(x + 18, y + 14, 16, 6, "rgba(255,255,255,0.12)");
    const frameIndex = movedRecently ? Math.min(frames.length - 1, state.stepFrame + 1) : 0;
    if (!drawTrainerFrame("player", state.facing, frameIndex, x - 6, y - 2 + (movedRecently ? 1 : 0), 0.34)) {
      drawOutlinedSprite(frames[frameIndex], playerPalette, x + 6, y + (movedRecently ? 1 : 0), 2, "#172030");
    }
    if (state.map === "house") {
      drawSparkle(x + 28, y + 8, 1, "rgba(255, 248, 214, 0.82)");
    }
  }

  function drawFollower(x, y, time) {
    if (!state.flags.starterChosen || !activeMonster()) {
      return;
    }
    const trailStep = Array.isArray(state.followerTrail) ? state.followerTrail[state.followerTrail.length - 1] : null;
    if (!trailStep || trailStep.map !== state.map || (trailStep.x === state.x && trailStep.y === state.y)) {
      return;
    }
    const monsterId = activeMonster().id;
    const frameIndex = time - (state.lastMoveAt || 0) < 180 ? Math.floor(time / 140) % 3 : 0;
    drawEllipse(x + 18, y + 30, 11, 4, "rgba(16, 22, 32, 0.18)");
    if (!drawMonsterFrameFit(monsterId, frameIndex, x + 4, y + 4, 28, 28)) {
      const frames = monsterFrames[monsterId] || [species[monsterId].sprite];
      drawOutlinedSprite(frames[Math.min(frameIndex, frames.length - 1)], monsterPalette(monsterId), x + 9, y + 8, 2, "#172030");
    }
  }

  function baseGround(theme, x, y) {
    if (theme === "house") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#e4ba8c"],
        [0.55, "#d19a67"],
        [1, "#b47442"],
      ]);
      drawRect(x + 2, y + 8, tileSize - 4, 1, "#f6d8b2");
      drawRect(x + 2, y + 18, tileSize - 4, 2, "#f1c996");
      drawRect(x + 2, y + 28, tileSize - 4, 1, "#8a562e");
      drawRect(x + 2, y + 34, tileSize - 4, 2, "#94592d");
      drawRect(x + 17, y + 2, 2, tileSize - 4, "#94592d");
      drawRect(x + 8, y + 2, 1, tileSize - 4, "rgba(255,255,255,0.08)");
      return;
    }
    if (theme === "meadow") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#9dea8a"],
        [0.55, "#66be5a"],
        [1, "#458d42"],
      ]);
      drawRect(x + 3, y + 26, tileSize - 6, 4, "#357b3b");
      drawRect(x + 8, y + 7, 2, 2, "#fff7c8");
      drawRect(x + 24, y + 12, 2, 2, "#f7f7d9");
      drawRect(x + 14, y + 18, 3, 3, "#75c15c");
      drawRect(x + 4, y + 31, 4, 1, "rgba(255,255,255,0.12)");
      return;
    }
    if (theme === "ridge") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#f0c890"],
        [0.55, "#cf935f"],
        [1, "#a96e44"],
      ]);
      drawRect(x + 4, y + 27, tileSize - 8, 4, "#7d5236");
      drawRect(x + 9, y + 10, 3, 3, "#f6e2bd");
      drawRect(x + 23, y + 18, 2, 2, "#e1c59a");
      drawRect(x + 16, y + 7, 2, 2, "#92613a");
      drawRect(x + 5, y + 31, tileSize - 10, 1, "rgba(255,255,255,0.08)");
      return;
    }
    if (theme === "grove") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#a4e89b"],
        [0.5, "#5aa274"],
        [1, "#3b7158"],
      ]);
      drawRect(x + 4, y + 28, tileSize - 8, 4, "#285745");
      drawRect(x + 9, y + 10, 2, 2, "#ffe7f1");
      drawRect(x + 24, y + 16, 2, 2, "#fff6b2");
      drawRect(x + 15, y + 22, 2, 2, "#d1f6c5");
      drawRect(x + 6, y + 6, 6, 1, "rgba(255,255,255,0.1)");
      return;
    }
    if (theme === "fen") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#8ec8a0"],
        [0.55, "#4f8f77"],
        [1, "#355f52"],
      ]);
      drawRect(x + 2, y + 25, tileSize - 4, 6, "#3b6250");
      drawRect(x + 4, y + 30, tileSize - 8, 3, "#20443c");
      drawEllipse(x + 10, y + 11, 7, 5, "#e9f7b8");
      drawEllipse(x + 26, y + 16, 6, 5, "#c4f5d6");
      return;
    }
    if (theme === "studio") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#d7be9b"],
        [0.55, "#ba946d"],
        [1, "#7d5b46"],
      ]);
      drawRect(x + 3, y + 8, tileSize - 6, 3, "#f3e5c2");
      drawRect(x + 4, y + 20, tileSize - 8, 4, "#8d6b58");
      drawRect(x + 10, y + 2, 2, tileSize - 4, "rgba(255,255,255,0.08)");
      drawRect(x + 22, y + 2, 2, tileSize - 4, "rgba(76,47,33,0.2)");
      return;
    }
    drawGradientRect(x, y, tileSize, tileSize, [
      [0, "#bfc7d8"],
      [1, "#81889a"],
    ]);
    drawRect(x + 0, y + 18, tileSize, 2, "#eef3ff");
    drawRect(x + 18, y, 2, tileSize, "#697087");
    drawRect(x + 2, y + 34, tileSize - 4, 2, "#5d6278");
  }

  function drawWall(theme, x, y) {
    if (theme === "house") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#5b6278"],
        [1, "#313649"],
      ]);
      drawRect(x + 2, y + 2, tileSize - 4, 8, "#8b93a8");
      drawRect(x + 2, y + 12, tileSize - 4, tileSize - 14, "#4b5166");
      return;
    }
    if (theme === "meadow") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#34703a"],
        [1, "#234f30"],
      ]);
      drawEllipse(x + 11, y + 12, 10, 9, "#7be269");
      drawEllipse(x + 25, y + 13, 11, 10, "#68c95a");
      drawEllipse(x + 18, y + 20, 13, 10, "#4fa84b");
      drawRect(x + 15, y + 25, 6, 11, "#70533d");
      return;
    }
    if (theme === "ridge") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#b07e58"],
        [1, "#6e4739"],
      ]);
      drawRect(x + 3, y + 6, tileSize - 6, 8, "#dfb081");
      drawRect(x + 3, y + 18, tileSize - 6, 6, "#8d5f47");
      drawRect(x + 7, y + 28, tileSize - 14, 4, "#e8cfaa");
      return;
    }
    if (theme === "grove") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#2f6242"],
        [1, "#224234"],
      ]);
      drawEllipse(x + 12, y + 12, 12, 9, "#79d36c");
      drawEllipse(x + 24, y + 12, 10, 9, "#5cb76d");
      drawEllipse(x + 18, y + 20, 14, 10, "#94e481");
      drawRect(x + 14, y + 24, 7, 12, "#6e543d");
      return;
    }
    if (theme === "fen") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#2d5e4a"],
        [1, "#203d34"],
      ]);
      drawEllipse(x + 11, y + 13, 9, 7, "#99d89d");
      drawEllipse(x + 24, y + 13, 10, 8, "#75c18a");
      drawEllipse(x + 18, y + 22, 12, 8, "#5f9b79");
      drawRect(x + 16, y + 25, 5, 11, "#614836");
      return;
    }
    if (theme === "studio") {
      drawGradientRect(x, y, tileSize, tileSize, [
        [0, "#8d5d49"],
        [1, "#56372d"],
      ]);
      drawRect(x + 4, y + 4, tileSize - 8, tileSize - 8, "#6a4838");
      drawRect(x + 6, y + 7, tileSize - 12, 4, "#c89e73");
      drawRect(x + 6, y + 16, tileSize - 12, 3, "#4a3128");
      drawRect(x + 6, y + 24, tileSize - 12, 3, "#a57f5f");
      return;
    }
    drawGradientRect(x, y, tileSize, tileSize, [
      [0, "#7f77a8"],
      [1, "#423c61"],
    ]);
    drawRect(x + 3, y + 3, tileSize - 6, tileSize - 6, "#5c547e");
    drawRect(x + 8, y + 2, 2, tileSize - 4, "#3c355b");
    drawRect(x + 24, y + 2, 2, tileSize - 4, "#3c355b");
  }

  function drawGrass(x, y, theme, time) {
    baseGround(theme, x, y);
    const sway = Math.floor(time / 220) % 2;
    drawRect(x + 3, y + 7, 2, 21, "#2d6d39");
    drawRect(x + 7, y + 10 + sway, 3, 15, "#255c35");
    drawRect(x + 11, y + 12, 2, 11, "#3d9653");
    drawRect(x + 15, y + 6, 4, 18, "#2b7240");
    drawRect(x + 20, y + 9 + sway, 2, 14, "#3f9d59");
    drawRect(x + 25, y + 11 + sway, 3, 13, "#255c35");
    drawRect(x + 29, y + 9, 2, 16, "#3d9653");
    drawRect(x + 16, y + 6, 2, 5, "#c7f9aa");
    drawRect(x + 24, y + 7, 1, 4, "#defec0");
    drawRect(x + 4, y + 24, tileSize - 8, 6, "rgba(35, 84, 48, 0.35)");
  }

  function drawPath(x, y, theme, mapX, mapY) {
    if (theme === "house") {
      baseGround(theme, x, y);
      const tone = housePathTone(mapX, mapY);
      if (tone === "active") {
        drawRect(x + 4, y + 5, tileSize - 8, 26, "#ffd166");
        drawRect(x + 7, y + 8, tileSize - 14, 20, "#fff3c8");
        drawRect(x + 11, y + 12, tileSize - 22, 2, "#b86712");
        drawRect(x + 11, y + 22, tileSize - 22, 2, "#b86712");
        drawRect(x + 12, y + 16, 10, 2, "#b86712");
        drawRect(x + 18, y + 14, 4, 2, "#b86712");
        drawRect(x + 18, y + 18, 4, 2, "#b86712");
        drawSparkle(x + 27, y + 11, 1, "#fff9e0");
      } else if (tone === "cleared") {
        drawRect(x + 5, y + 6, tileSize - 10, 24, "#6e86a8");
        drawRect(x + 8, y + 9, tileSize - 16, 18, "#d7ebff");
        drawRect(x + 12, y + 13, tileSize - 24, 2, "#49607e");
        drawRect(x + 12, y + 21, tileSize - 24, 2, "#49607e");
      } else {
        drawRect(x + 5, y + 6, tileSize - 10, 24, "#8b5361");
        drawRect(x + 8, y + 9, tileSize - 16, 18, "#dcb49e");
        drawRect(x + 12, y + 13, tileSize - 24, 2, "#6d3543");
        drawRect(x + 12, y + 21, tileSize - 24, 2, "#6d3543");
      }
      return;
    }
    baseGround(theme, x, y);
    drawGradientRect(x + 1, y + 9, tileSize - 2, 16, [
      [0, "#e2d1ad"],
      [0.55, "#c9ad7e"],
      [1, "#9f7f51"],
    ]);
    drawRect(x + 4, y + 12, tileSize - 8, 10, "#f2e1bf");
    drawRect(x + 8, y + 12, 6, 10, "#ccb18a");
    drawRect(x + 18, y + 12, 5, 10, "#e2c89f");
    drawRect(x + 27, y + 12, 4, 10, "#b99362");
    drawRect(x + 6, y + 24, 3, 2, "#8d6a43");
    drawRect(x + 22, y + 10, 2, 2, "#fef3d0");
    drawRect(x + 13, y + 14, 2, 8, "#9f7f51");
    drawRect(x + 16, y + 15, 1, 6, "#fff5dd");
  }

  function drawSign(x, y, theme) {
    baseGround(theme, x, y);
    drawRect(x + 14, y + 18, 6, 12, "#69482d");
    drawRect(x + 6, y + 7, 23, 12, "#c69357");
    drawRect(x + 8, y + 9, 19, 8, "#fee7bb");
    drawRect(x + 8, y + 8, 19, 1, "#fff8e2");
    drawRect(x + 9, y + 11, 17, 1, "#7b5835");
    drawRect(x + 9, y + 14, 14, 1, "#7b5835");
    drawRect(x + 23, y + 18, 2, 8, "#4a3320");
  }

  function drawDoor(x, y, theme, tile) {
    baseGround(theme, x, y);
    drawRect(x + 3, y + 4, 30, 28, tile === "D" ? "#6a7c98" : "#9f4a4f");
    drawRect(x + 6, y + 7, 24, 23, tile === "D" ? "#e1eaff" : "#f1d5b5");
    drawRect(x + 10, y + 10, 8, 20, tile === "D" ? "#c4d1f3" : "#daaf81");
    drawRect(x + 18, y + 10, 8, 20, tile === "D" ? "#b5c7ef" : "#c98f6f");
    drawRect(x + 10, y + 10, 1, 20, "rgba(255,255,255,0.26)");
    drawRect(x + 18, y + 10, 1, 20, "rgba(255,255,255,0.18)");
    drawRect(x + 24, y + 20, 2, 2, tile === "D" ? "#46566f" : "#612232");
  }

  function drawBed(x, y) {
    baseGround("house", x, y);
    drawRect(x + 4, y + 5, 28, 22, "#f7f1df");
    drawRect(x + 6, y + 7, 24, 6, "#ff91a0");
    drawRect(x + 6, y + 14, 24, 9, "#7fbef9");
    drawRect(x + 6, y + 23, 24, 2, "#d5c7aa");
  }

  function drawRune(x, y, letter) {
    baseGround("house", x, y);
    const stage = houseStageIndex();
    const order = { H: 0, J: 1, K: 2, L: 3 }[letter];
    const active = stage === order;
    const cleared = stage > order;
    drawRect(x + 4, y + 4, 28, 28, active ? "#fff5c9" : cleared ? "#e4eefc" : "#f5ebc7");
    drawRect(x + 7, y + 7, 22, 22, active ? "#ffbf4a" : cleared ? "#7d95b8" : "#cf5f67");
    drawRect(x + 10, y + 10, 16, 16, active ? "#c96e15" : cleared ? "#577091" : "#a33d48");
    drawText(letter, x + 16, y + 21, {
      align: "center",
      color: "#fff8eb",
      size: 16,
    });
  }

  function drawMentor(x, y, _time) {
    baseGround("meadow", x, y);
    drawEllipse(x + 18, y + 31, 12, 4, "rgba(16, 22, 32, 0.22)");
    if (!drawTrainerFrame("mentor", "down", 0, x - 6, y - 2, 0.34)) {
      drawOutlinedSprite(mentorFrames.down[0], mentorPalette, x + 6, y, 2, "#172030");
    }
  }

  function drawCoach(x, y, _time) {
    baseGround("ridge", x, y);
    drawEllipse(x + 18, y + 31, 12, 4, "rgba(16, 22, 32, 0.22)");
    if (!drawTrainerFrame("coach", "down", 0, x - 6, y - 2, 0.34)) {
      drawOutlinedSprite(coachFrames.down[0], coachPalette, x + 6, y, 2, "#172030");
    }
  }

  function drawSage(x, y, _time) {
    baseGround("grove", x, y);
    drawEllipse(x + 18, y + 31, 12, 4, "rgba(16, 22, 32, 0.22)");
    if (!drawTrainerFrame("sage", "down", 0, x - 6, y - 2, 0.34)) {
      drawOutlinedSprite(sageFrames.down[0], sagePalette, x + 6, y, 2, "#172030");
    }
  }

  function drawScout(x, y, _time) {
    baseGround("fen", x, y);
    drawEllipse(x + 18, y + 31, 12, 4, "rgba(16, 22, 32, 0.22)");
    if (!drawTrainerFrame("scout", "down", 0, x - 6, y - 2, 0.34)) {
      drawOutlinedSprite(scoutFrames.down[0], scoutPalette, x + 6, y, 2, "#172030");
    }
  }

  function drawScribe(x, y, _time) {
    baseGround("studio", x, y);
    drawEllipse(x + 18, y + 31, 12, 4, "rgba(16, 22, 32, 0.22)");
    if (!drawTrainerFrame("scribe", "down", 0, x - 6, y - 2, 0.34)) {
      drawOutlinedSprite(scribeFrames.down[0], scribePalette, x + 6, y, 2, "#172030");
    }
  }

  function drawCache(x, y, theme) {
    baseGround(theme, x, y);
    drawRect(x + 7, y + 11, 22, 16, "#815130");
    drawRect(x + 9, y + 13, 18, 12, "#d2a06c");
    drawRect(x + 12, y + 10, 12, 4, "#f8e2b4");
    drawRect(x + 17, y + 17, 3, 6, "#704a2e");
    drawRect(x + 15, y + 17, 7, 2, "#ffdc72");
  }

  function drawAltar(x, y) {
    baseGround("tower", x, y);
    drawRect(x + 6, y + 12, 24, 16, "#51466f");
    drawRect(x + 9, y + 8, 18, 6, "#8379ad");
    drawRect(x + 14, y + 6, 8, 8, "#ffd76d");
    drawRect(x + 12, y + 10, 12, 12, "#ff8758");
    drawRect(x + 9, y + 28, 18, 3, "#1a2234");
    drawSparkle(x + 18, y + 7, 1, "#fff8da");
  }

  function drawTile(tile, theme, x, y, time, mapX, mapY) {
    if (tile === "#") {
      drawWall(theme, x, y);
      return;
    }
    if (tile === ",") {
      drawGrass(x, y, theme, time);
      return;
    }
    if (tile === "=") {
      drawPath(x, y, theme, mapX, mapY);
      return;
    }
    if (tile === "S") {
      drawSign(x, y, theme);
      return;
    }
    if (tile === "B") {
      drawBed(x, y);
      return;
    }
    if ("HJKL".includes(tile)) {
      drawRune(x, y, tile);
      return;
    }
    if (tile === "M") {
      drawMentor(x, y, time);
      return;
    }
    if (tile === "C") {
      drawCoach(x, y, time);
      return;
    }
    if (tile === "V") {
      drawSage(x, y, time);
      return;
    }
    if (tile === "N") {
      drawScout(x, y, time);
      return;
    }
    if (tile === "Q") {
      drawScribe(x, y, time);
      return;
    }
    if (tile === "Y") {
      drawCache(x, y, theme);
      return;
    }
    if (tile === "X") {
      drawAltar(x, y);
      return;
    }
    if ("EDRT".includes(tile)) {
      drawDoor(x, y, theme, tile);
      return;
    }
    baseGround(theme, x, y);
  }

  function drawCloud(x, y, color) {
    drawEllipse(x, y + 4, 18, 12, color);
    drawEllipse(x + 18, y, 22, 14, color);
    drawEllipse(x + 38, y + 5, 16, 11, color);
  }

  function drawOverworldBackdrop(theme, time, offset, mapWidth, mapHeight) {
    if (theme === "house") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#2b2147"],
        [0.58, "#45336f"],
        [1, "#5d458e"],
      ]);
      drawEllipse(814, 72, 48, 24, "rgba(255, 236, 178, 0.18)");
      for (let y = 0; y < viewHeight; y += 36) {
        drawRect(0, y, screenWidth, 1, "rgba(255, 255, 255, 0.04)");
      }
    } else if (theme === "meadow") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#f0fbff"],
        [0.5, "#9cd6ff"],
        [1, "#5bafff"],
      ]);
      drawEllipse(786, 84, 42, 42, "rgba(255, 233, 149, 0.8)");
      drawCloud(80 + ((time / 24) % 1100), 62, "rgba(255,255,255,0.82)");
      drawCloud(360 + ((time / 34) % 1000), 96, "rgba(255,255,255,0.74)");
      drawEllipse(160, 196, 180, 56, "#74c570");
      drawEllipse(430, 210, 210, 64, "#5fb061");
      drawEllipse(748, 208, 220, 58, "#4a9853");
      drawRect(0, viewHeight - 40, screenWidth, 20, "rgba(255, 248, 224, 0.16)");
    } else if (theme === "ridge") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#fff4dc"],
        [0.5, "#ffd08f"],
        [1, "#cb7b4d"],
      ]);
      drawEllipse(780, 88, 34, 34, "rgba(255, 225, 151, 0.72)");
      drawEllipse(180, 212, 170, 72, "#c68a5b");
      drawEllipse(470, 194, 220, 84, "#a96742");
      drawEllipse(780, 220, 180, 70, "#8a563a");
      drawRect(0, viewHeight - 56, screenWidth, 24, "rgba(115, 70, 48, 0.2)");
    } else if (theme === "grove") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#e7fff0"],
        [0.6, "#9de2af"],
        [1, "#6cbc86"],
      ]);
      drawRect(0, 0, screenWidth, 94, "rgba(31, 78, 55, 0.18)");
      for (let x = 0; x < screenWidth; x += 56) {
        drawRect(x, 0, 18, 120, "rgba(255,255,255,0.05)");
      }
      drawCloud(116 + ((time / 30) % 1080), 74, "rgba(255,255,255,0.34)");
      drawEllipse(170, 212, 230, 64, "#56976d");
      drawEllipse(510, 196, 260, 74, "#427f60");
      drawEllipse(808, 222, 208, 62, "#376f56");
      drawRect(0, 120, screenWidth, 16, "rgba(235,255,240,0.08)");
    } else if (theme === "fen") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#f3fff3"],
        [0.52, "#a6dec6"],
        [1, "#4d7f74"],
      ]);
      drawRect(0, 134, screenWidth, 26, "rgba(244,255,245,0.22)");
      drawEllipse(170, 218, 250, 68, "#5b8d73");
      drawEllipse(522, 208, 300, 84, "#457768");
      drawEllipse(820, 230, 240, 66, "#345f56");
      for (let index = 0; index < 10; index += 1) {
        drawRect(index * 96 + 10, 84 + (index % 3) * 10, 30, 120, "rgba(255,255,255,0.04)");
      }
    } else if (theme === "studio") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#fff2e2"],
        [0.54, "#ddb98d"],
        [1, "#8f624a"],
      ]);
      drawRect(0, 136, screenWidth, 32, "rgba(252,242,224,0.18)");
      drawEllipse(180, 220, 240, 72, "#b98664");
      drawEllipse(560, 206, 330, 88, "#94634d");
      drawEllipse(824, 220, 210, 70, "#6f4739");
      drawRect(88, 70, 48, 124, "rgba(255,248,238,0.08)");
      drawRect(742, 62, 56, 138, "rgba(255,248,238,0.08)");
    } else {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#6f6898"],
        [0.6, "#443b64"],
        [1, "#271f3f"],
      ]);
      for (let index = 0; index < 22; index += 1) {
        const starX = (index * 43 + Math.floor(time / 14)) % screenWidth;
        const starY = 24 + (index * 29) % 136;
        drawRect(starX, starY, 2, 2, "rgba(255,255,240,0.8)");
      }
      drawEllipse(768, 90, 40, 22, "rgba(245, 236, 255, 0.12)");
      drawRect(90, 110, 40, 150, "rgba(199, 206, 232, 0.16)");
      drawRect(810, 100, 44, 160, "rgba(199, 206, 232, 0.14)");
    }

    drawRect(offset.x - 10, offset.y - 10, mapWidth + 20, mapHeight + 20, "rgba(18, 28, 43, 0.28)");
    drawRect(offset.x - 4, offset.y - 4, mapWidth + 8, mapHeight + 8, "rgba(248, 238, 190, 0.22)");
    drawRect(0, 0, screenWidth, viewHeight, "rgba(8, 14, 24, 0.04)");
  }

  function drawOverworld(time) {
    const map = maps[state.map];
    const rows = mapRows(state.map);
    const offset = mapOffset();
    const mapWidth = rows[0].length * tileSize;
    const mapHeight = rows.length * tileSize;
    drawOverworldBackdrop(map.theme, time, offset, mapWidth, mapHeight);

    rows.forEach((row, y) => {
      row.split("").forEach((tile, x) => {
        drawTile(tile, map.theme, offset.x + x * tileSize, offset.y + y * tileSize, time, x, y);
      });
    });

    if (state.flags.starterChosen && Array.isArray(state.followerTrail) && state.followerTrail.length) {
      const trailStep = state.followerTrail[state.followerTrail.length - 1];
      if (trailStep && trailStep.map === state.map) {
        drawFollower(offset.x + trailStep.x * tileSize, offset.y + trailStep.y * tileSize, time);
      }
    }
    drawPlayer(offset.x + state.x * tileSize, offset.y + state.y * tileSize, time);
  }

  function drawRunStrip() {
    const centerLabel = fittedText(
      `${state.runName}${state.runComplete ? "  |  CLEARED" : ""}`,
      220,
      12
    );
    drawPanelShadow(16, 6, screenWidth - 32, 42, 0.14);
    drawRect(16, 6, screenWidth - 32, 42, "#0f1b2e");
    drawGradientRect(20, 10, screenWidth - 40, 34, [
      [0, "#173355"],
      [0.4, "#295483"],
      [1, "#102440"],
    ]);
    drawRect(24, 14, screenWidth - 48, 1, "rgba(255,255,255,0.22)");
    drawRect(152, 16, 1, 22, "rgba(210, 233, 255, 0.24)");
    drawRect(264, 16, 1, 22, "rgba(210, 233, 255, 0.24)");
    drawRect(screenWidth - 300, 16, 1, 22, "rgba(210, 233, 255, 0.24)");
    drawRect(screenWidth / 2 - 132, 14, 264, 26, "rgba(255,255,255,0.08)");
    drawText("TIMER", 34, 24, { size: 10, color: "#cfe9ff" });
    drawText(formatDuration(elapsedMs(), true), 34, 40, {
      size: 16,
      color: timerColor(),
    });
    drawText("BEST SCORE", 168, 24, {
      size: 10,
      color: "#cfe9ff",
    });
    drawText(String(state.bestScore), 168, 40, {
      size: 16,
      color: "#fff2bd",
    });
    drawText("SCORE", 278, 24, {
      size: 10,
      color: "#cfe9ff",
    });
    drawText(String(state.score), 278, 40, {
      size: 16,
      color: "#ffd166",
    });
    drawText(centerLabel, screenWidth / 2, 31, {
      size: 12,
      align: "center",
      color: "#ffffff",
    });
    drawText("BEST TIME", screenWidth - 278, 24, {
      size: 10,
      color: "#cfe9ff",
    });
    drawText(state.bestTimeMs ? formatDuration(state.bestTimeMs, true) : "--:--.-", screenWidth - 278, 40, {
      size: 15,
      color: "#8ee3ff",
    });
    drawText("VIMMONSTERS ACADEMY", screenWidth - 30, 24, {
      size: 10,
      align: "right",
      color: "#cfe9ff",
    });
    drawText(state.runComplete ? "CLEARED" : `SEED ${shortSeed()}`, screenWidth - 30, 40, {
      size: 11,
      align: "right",
      color: "#ffd166",
    });
  }

  function drawDialogue(time) {
    if (state.mode === "battle") {
      drawBattleDialogue(time);
      return;
    }
    const active = activeMonster();
    const objective = objectiveText();
    const controlHint = controlHintText();
    const panelW = 136;
    const panelX = screenWidth - panelW - 22;
    const mainX = 172;
    const messageW = screenWidth - mainX - 30;
    const objectiveW = panelX - mainX - 10;
    drawWindow(18, dialogueY, screenWidth - 36, screenHeight - dialogueY - 6);
    drawText("Message Log", 42, dialogueY + 26, { size: 14, color: colors.panelDark });
    drawPortraitCard(38, dialogueY + 42, state.portrait || "player");
    drawInfoBadge(panelX, dialogueY + 104, panelW, "TIMER", formatDuration(elapsedMs(), true), timerColor());
    drawInfoBadge(
      panelX,
      dialogueY + 128,
      panelW,
      "BEST",
      state.bestTimeMs ? formatDuration(state.bestTimeMs, true) : "--:--.-",
      "#8ee3ff"
    );
    drawInfoBadge(panelX, dialogueY + 152, panelW, "SEED", shortSeed(), "#ffd166");
    if (state.command.active) {
      const cursor = Math.floor(time / 300) % 2 ? "_" : " ";
      drawText(`:${state.command.text}${cursor}`, mainX, dialogueY + 66, { size: 18 });
      drawText("enter runs command | esc cancels", mainX, dialogueY + 94, {
        size: 12,
        color: colors.panelDark,
      });
      return;
    }
    if (state.rename.active) {
      const cursor = Math.floor(time / 300) % 2 ? "_" : " ";
      drawText(`Run Name: ${state.rename.text}${cursor}`, mainX, dialogueY + 66, { size: 18 });
      drawText("enter saves name | esc cancels", mainX, dialogueY + 94, {
        size: 12,
        color: colors.panelDark,
      });
      return;
    }
    const messageLines = wrappedLines(state.message, messageW, 14).slice(0, 3);
    drawRect(mainX - 6, dialogueY + 44, messageW + 10, messageLines.length * 17 + 10, "rgba(220, 236, 255, 0.26)");
    messageLines.forEach((line, index) => {
      drawText(line, mainX, dialogueY + 56 + index * 17, { size: 14 });
    });
    const objectiveLines = wrappedLines(`Goal: ${objective}`, objectiveW - 10, 10).slice(0, 2);
    const objectiveY = dialogueY + 56 + messageLines.length * 17 + 5;
    drawRect(mainX - 2, objectiveY, objectiveW + 6, objectiveLines.length * 11 + 6, "#163153");
    drawRect(mainX - 2, objectiveY, 44, objectiveLines.length * 11 + 6, "#244a7c");
    objectiveLines.forEach((line, index) => {
      drawText(line, mainX + 6, objectiveY + 10 + index * 10, { size: 10, color: "#f8f5ea" });
    });
    const hintY = objectiveY + objectiveLines.length * 11 + 8;
    const hintLines = wrappedLines(controlHint, objectiveW - 10, 10).slice(0, 2);
    drawRect(mainX - 2, hintY, objectiveW + 6, hintLines.length * 11 + 4, "#f0ead0");
    drawRect(mainX - 2, hintY, 44, hintLines.length * 11 + 4, "#ffe2a0");
    hintLines.forEach((line, index) => {
      drawText(line, mainX + 6, hintY + 10 + index * 10, {
        size: 10,
        color: colors.panelDark,
      });
    });
    const infoY = hintY + hintLines.length * 11 + 14;
    drawText(`${maps[state.map].name}  |  ${active.name} Lv${active.level} ${active.hp}/${active.maxHp}HP`, mainX, infoY, {
      size: 10,
      color: colors.panelDark,
    });
    drawText(`VimOrbs ${state.vimOrbs}  |  Score ${state.score}  |  Run ${fittedText(state.runName, 120, 10)}`, mainX, infoY + 14, {
      size: 10,
      color: colors.panelDark,
    });
  }

  function drawEncounterTransition(time) {
    const elapsed = time - state.transition.startedAt;
    const progress = Math.min(1, elapsed / state.transition.duration);
    drawOverworld(time);
    for (let index = 0; index < 12; index += 1) {
      const thickness = 14 + index * 8;
      const offset = Math.floor(progress * 560) - index * 26;
      drawRect(0, offset, screenWidth, thickness, index % 2 ? "#13233b" : "#ffd57e");
    }
    drawRect(0, 0, screenWidth, screenHeight, `rgba(16,22,32,${progress * 0.62})`);
    drawEllipse(screenWidth / 2, screenHeight / 2 - 30, 40 + progress * 220, 22 + progress * 110, `rgba(255, 242, 190, ${0.08 + progress * 0.1})`);
    drawEllipse(screenWidth / 2, screenHeight / 2 - 26, 18 + progress * 86, 12 + progress * 44, `rgba(255, 214, 125, ${0.1 + progress * 0.16})`);
    drawText(state.transition.isBoss ? "Boss Battle!" : "Wild Encounter!", screenWidth / 2, screenHeight / 2, {
      align: "center",
      size: 30,
      color: "#fff8da",
    });
    drawText(state.transition.enemy.name, screenWidth / 2, screenHeight / 2 + 24, {
      align: "center",
      size: 14,
      color: "#ffd57e",
    });
    if (progress >= 1) {
      startBattle(state.transition.enemy, state.transition.isBoss);
    }
  }

  function tokenizeDrillLine(line, kind) {
    const parts = String(line).match(/(\s+|[A-Za-z_]+|[0-9]+|==|!=|<=|>=|&&|\|\||[^A-Za-z0-9_\s])/g) || [""];
    return parts.map((part) => {
      let color = "#f1f6ff";
      if (/^\s+$/.test(part)) {
        color = "";
      } else if (/^_+$/.test(part)) {
        color = "#ffd166";
      } else if (kind === "code" && /^(const|return|function|if)$/.test(part)) {
        color = "#8ed0ff";
      } else if (kind === "code" && /^(party|current|active|target|next|total|score|bonus|bestScore)$/.test(part)) {
        color = "#ffd8a8";
      } else if (kind === "code" && /^[0-9]+$/.test(part)) {
        color = "#8df0a1";
      } else if (kind === "code" && /^[{}()[\];,+><=]$/.test(part)) {
        color = "#a8bbdb";
      } else if (kind === "prose" && /^(quick|brown|fox|counted|move|left|right|up|down)$/.test(part)) {
        color = "#ffe8a6";
      } else if (kind === "prose" && /^(start|vim|motions|feel|today|hops|clean|crisp|alpha|beta|gamma|delta)$/.test(part)) {
        color = "#d4f4ff";
      }
      return { text: part, color };
    });
  }

  function drawTokenizedDrillLine(line, kind, x, y, size, charWidth) {
    ctx.save();
    ctx.font = `${size || 14}px Lucida Console, Monaco, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    let offset = 0;
    tokenizeDrillLine(line, kind).forEach((part) => {
      for (const character of part.text) {
        if (character !== " " && part.color) {
          ctx.fillStyle = part.color;
          ctx.fillText(character, x + offset * charWidth, y);
        }
        offset += 1;
      }
    });
    ctx.restore();
  }

  const { drawBattle, drawBattleDialogue } = createBattleSceneRenderer({
    state,
    maps,
    species,
    colors,
    screenWidth,
    viewHeight,
    dialogueY,
    monsterFrames,
    drawRect,
    drawGradientRect,
    drawEllipse,
    drawText,
    fittedText,
    wrappedLines,
    drawOutlinedSprite,
    drawBitmap,
    drawWindow,
    drawPanelShadow,
    drawSparkle,
    drawCloud,
    drawMonsterFrame,
    monsterPalette,
    uiAsset,
    fxProgress,
    activeMonster,
    drawTokenizedDrillLine,
  });

  const drawTreeOverlay = createTreeOverlayRenderer({
    state,
    colors,
    screenWidth,
    viewHeight,
    treeSections,
    wrappedLines,
    drawRect,
    drawGradientRect,
    drawText,
    drawWindow,
  });

  const drawDrillOverlay = createDrillOverlayRenderer({
    ctx,
    state,
    colors,
    screenWidth,
    screenHeight,
    currentDrillStep,
    hydrateDrill,
    drawRect,
    drawGradientRect,
    drawText,
    drawWrapped,
    wrappedLines,
    drawPortraitCard,
    drawInfoBadge,
    drawTokenizedDrillLine,
  });

  function drawRewardOverlay() {
    if (!state.fx || state.fx.kind !== "reward") {
      return;
    }
    const duration = Math.max(1, state.fx.endAt - state.fx.startedAt);
    const pulse = Math.max(0, (state.fx.endAt - performance.now()) / duration);
    drawRect(118, 42, 724, 164, `rgba(255, 225, 146, ${0.2 + pulse * 0.2})`);
    drawRect(156, 54, 648, 140, `rgba(255, 225, 146, ${0.28 + pulse * 0.24})`);
    drawRect(170, 68, 620, 112, `rgba(255, 250, 236, ${0.78 + pulse * 0.12})`);
    for (let index = 0; index < 6; index += 1) {
      drawSparkle(214 + index * 92, 84 + (index % 2) * 18, 2, `rgba(255, 216, 120, ${0.65 + pulse * 0.2})`);
    }
    drawText(state.runComplete ? "Academy Clear" : "Lesson Clear", screenWidth / 2, 120, {
      align: "center",
      size: 28,
      color: "#13233b",
    });
    drawText(
      state.runComplete
        ? "Press R to name the run, then use :q for a fresh randomized route."
        : "Score and VimOrbs awarded. Keep pushing the route.",
      screenWidth / 2,
      145,
      { align: "center", size: 12, color: "#32425f" }
    );
    if (state.runComplete) {
      drawText(`${state.runName}  |  ${formatDuration(elapsedMs(), true)}  |  ${state.score} pts`, screenWidth / 2, 160, {
        align: "center",
        size: 12,
        color: "#8f2d2d",
      });
      drawText("Press Esc to close the banner.", screenWidth / 2, 178, {
        align: "center",
        size: 11,
        color: "#32425f",
      });
    }
  }

  function drawStarterOverlay(time) {
    if (!state.starterSelect || !state.starterSelect.open) {
      return;
    }
    const options = state.starterSelect.options || [];
    const selected = Math.max(0, Math.min(state.starterSelect.selected || 0, options.length - 1));
    drawRect(0, 0, screenWidth, screenHeight, "rgba(10, 14, 24, 0.62)");
    drawPanelShadow(96, 108, 768, 436, 0.24);
    drawRect(96, 108, 768, 436, "#102238");
    drawGradientRect(102, 114, 756, 62, [
      [0, "#214b7a"],
      [0.5, "#2c6aa4"],
      [1, "#17395e"],
    ]);
    drawRect(106, 180, 748, 358, "#f8f2d5");
    drawText("Choose Your Starter VimMonster", screenWidth / 2, 148, {
      align: "center",
      size: 24,
      color: "#ffffff",
    });
    drawText("Use h/l or [/] to choose, then press Enter or i to confirm.", screenWidth / 2, 164, {
      align: "center",
      size: 11,
      color: "#d8ecff",
    });
    options.forEach((id, index) => {
      const x = 136 + index * 236;
      const y = 222;
      const monster = species[id];
      const active = index === selected;
      const pulse = 0.2 + ((Math.sin(time / 160) + 1) * 0.12);
      drawPanelShadow(x, y, 196, 252, active ? 0.22 : 0.14);
      drawRect(x, y, 196, 252, active ? "#143459" : "#243956");
      drawRect(x + 4, y + 4, 188, 244, active ? "#fff3bf" : "#efe6c0");
      drawRect(x + 10, y + 10, 176, 126, active ? "#eef8ff" : "#f9f6ea");
      drawRect(x + 10, y + 144, 176, 94, active ? "#fffdf4" : "#faf7ee");
      if (active) {
        drawRect(x + 6, y + 6, 184, 2, `rgba(255,255,255,${0.4 + pulse})`);
      }
      drawText(monster.name, x + 98, y + 164, {
        align: "center",
        size: 16,
        color: "#13233b",
      });
      drawText(`Lv 5 starter`, x + 98, y + 184, {
        align: "center",
        size: 12,
        color: "#4a5f77",
      });
      drawText(`HP ${monster.baseHp + 20}  ATK ${monster.baseAttack + 2}`, x + 98, y + 201, {
        align: "center",
        size: 11,
        color: "#32425f",
      });
      drawText((monster.profile || "Academy starter.").slice(0, 48), x + 98, y + 222, {
        align: "center",
        size: 10,
        color: "#586a83",
      });
      drawEllipse(x + 98, y + 124, 36, 10, "rgba(18,35,59,0.12)");
      if (!drawMonsterFrameFit(id, Math.floor(time / 180) % 3, x + 38, y + 28, 120, 104)) {
        const frames = monsterFrames[id] || [monster.sprite];
        drawOutlinedSprite(frames[Math.floor(time / 180) % frames.length], monsterPalette(id), x + 74, y + 50, 4, "#172030");
      }
      if (active) {
        drawText("ACTIVE", x + 98, y + 246, {
          align: "center",
          size: 11,
          color: "#8a4f00",
        });
      }
    });
  }

  return {
    drawOverworld,
    drawRunStrip,
    drawBattle,
    drawDialogue,
    drawEncounterTransition,
    drawTreeOverlay,
    drawDrillOverlay,
    drawRewardOverlay,
    drawStarterOverlay,
  };
}
