// Owns: battle scene composition, battle HUD windows, and battle mini-drill
// overlay rendering. Does not own: battle rules, state transitions, or the
// shared overworld/dialogue scene layout.

export function createBattleSceneRenderer(deps) {
  const {
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
  } = deps;

  function drawHpBox(x, y, monster, options) {
    const opts = options || {};
    if (!drawBitmap(uiAsset("battleHpBox") ? uiAsset("battleHpBox").image : null, x, y, 258, 84)) {
      drawWindow(x, y, 258, 84);
    }
    if (opts.nameBg) {
      drawRect(x + 16, y + 12, 136, 22, opts.nameBg);
      drawRect(x + 18, y + 14, 132, 18, opts.nameBgInner || "rgba(255,255,255,0.22)");
    }
    drawText(monster.name, x + 22, y + 26, { size: 16 });
    drawText(`Lv ${monster.level}`, x + 220, y + 26, { align: "right", size: 13 });
    drawText(`HP ${monster.hp}/${monster.maxHp}`, x + 22, y + 58, {
      size: 13,
      color: colors.panelDark,
    });
    drawRect(x + 112, y + 46, 118, 12, "#d7d1b8");
    drawRect(x + 114, y + 48, 114, 8, "#f8f5ea");
    drawRect(
      x + 114,
      y + 48,
      Math.max(12, Math.floor((monster.hp / monster.maxHp) * 114)),
      8,
      opts.color || colors.grassA
    );
    for (let step = 1; step < 7; step += 1) {
      drawRect(x + 114 + step * 16, y + 48, 1, 8, "rgba(20, 30, 48, 0.12)");
    }
  }

  function drawBattleBackdrop(theme, time) {
    if (theme === "meadow") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#f2fdff"],
        [0.54, "#b4e2ff"],
        [1, "#6ab8ff"],
      ]);
      drawEllipse(794, 82, 44, 44, "rgba(255, 233, 149, 0.82)");
      drawEllipse(200, 214, 280, 74, "#83cc79");
      drawEllipse(620, 228, 330, 84, "#69b465");
      drawRect(0, 152, screenWidth, 42, "rgba(255,255,255,0.38)");
      drawRect(0, 182, screenWidth, 2, "rgba(255,255,255,0.18)");
      drawCloud(120 + ((time / 20) % 980), 62, "rgba(255,255,255,0.86)");
      return;
    }
    if (theme === "ridge") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#fff4de"],
        [0.54, "#ffd392"],
        [1, "#c97b49"],
      ]);
      drawEllipse(790, 90, 36, 36, "rgba(255, 223, 139, 0.78)");
      drawEllipse(190, 220, 260, 78, "#cb8c59");
      drawEllipse(620, 202, 300, 96, "#9a603f");
      drawRect(0, 156, screenWidth, 40, "rgba(255,244,224,0.32)");
      drawRect(0, 182, screenWidth, 2, "rgba(255,255,255,0.12)");
      return;
    }
    if (theme === "grove") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#effff4"],
        [0.52, "#b7edbf"],
        [1, "#5f9e7a"],
      ]);
      drawRect(0, 0, screenWidth, 86, "rgba(19, 67, 44, 0.18)");
      drawEllipse(190, 220, 280, 72, "#5f9f73");
      drawEllipse(640, 214, 320, 88, "#40775f");
      drawRect(0, 150, screenWidth, 44, "rgba(255,255,236,0.28)");
      for (let x = 0; x < screenWidth; x += 48) {
        drawRect(x, 70 + (Math.floor(time / 300 + x) % 8), 20, 60, "rgba(62, 110, 66, 0.12)");
      }
      return;
    }
    if (theme === "fen") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#effff2"],
        [0.48, "#b7e6d4"],
        [1, "#4a7c70"],
      ]);
      drawRect(0, 0, screenWidth, 96, "rgba(35, 86, 73, 0.14)");
      drawEllipse(196, 222, 290, 76, "#62917a");
      drawEllipse(646, 216, 340, 88, "#416b61");
      drawRect(0, 154, screenWidth, 40, "rgba(255,255,246,0.2)");
      return;
    }
    if (theme === "studio") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#fff4e1"],
        [0.5, "#e4c29a"],
        [1, "#90664d"],
      ]);
      drawEllipse(790, 92, 34, 34, "rgba(255, 226, 164, 0.72)");
      drawEllipse(170, 218, 280, 78, "#c08b66");
      drawEllipse(620, 206, 320, 92, "#8c5f4a");
      drawRect(0, 160, screenWidth, 38, "rgba(255,247,234,0.24)");
      return;
    }
    if (theme === "tower") {
      drawGradientRect(0, 0, screenWidth, viewHeight, [
        [0, "#7f78aa"],
        [0.55, "#4a416f"],
        [1, "#241d39"],
      ]);
      for (let index = 0; index < 18; index += 1) {
        drawRect((index * 53 + Math.floor(time / 12)) % screenWidth, 26 + (index * 31) % 120, 2, 2, "#ffefc9");
      }
      drawRect(122, 102, 44, 168, "rgba(233, 228, 255, 0.12)");
      drawRect(770, 92, 48, 178, "rgba(233, 228, 255, 0.12)");
      drawRect(0, 162, screenWidth, 24, "rgba(255,255,255,0.05)");
      return;
    }
    drawGradientRect(0, 0, screenWidth, viewHeight, [
      [0, "#ebfbff"],
      [0.58, "#a2d8ff"],
      [1, "#73bcff"],
    ]);
    drawEllipse(210, 214, 260, 72, "#8ccf78");
    drawEllipse(660, 228, 320, 88, "#78bc63");
  }

  function drawBattle(time) {
    const active = activeMonster();
    const enemy = state.battle.enemy;
    const hitEnemy = state.fx && state.fx.kind === "hit" && state.fx.target === "enemy";
    const hitPlayer = state.fx && state.fx.kind === "hit" && state.fx.target === "player";
    const missFx = state.fx && state.fx.kind === "miss";
    const vimOrbFx = state.fx && state.fx.kind === "vimOrb";
    const captureFx = state.fx && state.fx.kind === "capture";
    const enemyBob = Math.floor(time / 260) % 2;
    const playerBob = Math.floor(time / 240) % 2;
    const enemySpriteX = 612 + (hitEnemy ? 8 : 0);
    const enemySpriteY = 94 + enemyBob;
    const playerSpriteX = 156 + (hitPlayer ? -8 : 0);
    const playerSpriteY = 250 + playerBob;
    const enemyHpY = 282;
    const playerHpY = 428;

    drawBattleBackdrop(maps[state.map].theme, time);
    drawEllipse(694, 236, 112, 28, "rgba(16,22,32,0.18)");
    drawEllipse(270, 370, 138, 36, "rgba(16,22,32,0.22)");
    drawGradientRect(560, 218, 260, 54, [
      [0, "rgba(255,255,255,0.16)"],
      [1, "rgba(255,255,255,0.03)"],
    ]);
    drawGradientRect(132, 348, 292, 68, [
      [0, "rgba(255,255,255,0.12)"],
      [1, "rgba(255,255,255,0.02)"],
    ]);
    const enemyScale = captureFx
      ? 5 + Math.max(0, (state.fx.endAt - performance.now()) / 200)
      : 5;
    drawEllipse(690, 242, 110, 24, "rgba(255,255,255,0.16)");
    drawEllipse(268, 376, 136, 28, "rgba(255,255,255,0.12)");
    drawRect(610, 224, 166, 4, "rgba(255,255,255,0.1)");
    drawRect(198, 360, 144, 5, "rgba(255,255,255,0.09)");
    if (state.battle.focusedVimOrb) {
      drawEllipse(268, 326, 72, 26, "rgba(141, 208, 255, 0.28)");
      drawSparkle(228, 298, 2, "#dff6ff");
      drawSparkle(308, 282, 2, "#8ed0ff");
      drawSparkle(334, 320, 1, "#fff6da");
    }
    if (!drawMonsterFrame(
      enemy.id,
      Math.floor(time / 200) % (monsterFrames[enemy.id] || [species[enemy.id].sprite]).length,
      enemySpriteX,
      enemySpriteY,
      enemy.id === "macrobat" ? 1.8 * enemyScale / 5 : 2 * enemyScale / 5
    )) {
      drawOutlinedSprite(
        monsterFrames[enemy.id] ? monsterFrames[enemy.id][Math.floor(time / 200) % monsterFrames[enemy.id].length] : species[enemy.id].sprite,
        monsterPalette(enemy.id),
        630 + (hitEnemy ? 8 : 0),
        104 + enemyBob,
        enemyScale,
        "#141b2b"
      );
    }
    if (!drawMonsterFrame(
      active.id,
      Math.floor(time / 180) % (monsterFrames[active.id] || [species[active.id].sprite]).length,
      playerSpriteX,
      playerSpriteY,
      2
    )) {
      drawOutlinedSprite(
        monsterFrames[active.id] ? monsterFrames[active.id][Math.floor(time / 180) % monsterFrames[active.id].length] : species[active.id].sprite,
        monsterPalette(active.id),
        180 + (hitPlayer ? -8 : 0),
        266 + playerBob,
        5,
        "#141b2b"
      );
    }
    if (hitEnemy) {
      const burst = 1 - fxProgress("hit", time);
      drawRect(664, 180, 86, 10, "#fff6dc");
      drawRect(688, 154, 12, 68, "#ff8d58");
      drawRect(646, 212, 94, 8, "#ffd166");
      drawEllipse(706, 194, 44 + burst * 22, 26 + burst * 14, `rgba(255, 232, 180, ${0.14 + burst * 0.16})`);
      drawText(`-${state.fx.damage || 0}`, 738, 154 - burst * 24, {
        size: state.fx.critical ? 20 : 16,
        align: "center",
        color: state.fx.critical ? "#fff1ba" : "#fff8eb",
      });
      if (state.fx.critical) {
        drawText("CRIT", 738, 132 - burst * 18, {
          size: 10,
          align: "center",
          color: "#ff8d58",
        });
      }
    }
    if (hitPlayer) {
      const burst = 1 - fxProgress("hit", time);
      drawRect(224, 314, 96, 10, "#fff6dc");
      drawRect(256, 284, 12, 62, "#ff8d58");
      drawRect(206, 342, 108, 8, "#ffd166");
      drawEllipse(268, 328, 48 + burst * 20, 28 + burst * 12, `rgba(255, 232, 180, ${0.14 + burst * 0.16})`);
      drawText(`-${state.fx.damage || 0}`, 316, 290 - burst * 22, {
        size: state.fx.critical ? 20 : 16,
        align: "center",
        color: state.fx.critical ? "#fff1ba" : "#fff8eb",
      });
      if (state.fx.critical) {
        drawText("CRIT", 316, 270 - burst * 18, {
          size: 10,
          align: "center",
          color: "#ff8d58",
        });
      }
    }
    if (missFx) {
      const float = Math.sin(time / 90) * 4;
      drawText(state.fx.label || "Miss!", 702, 160 + float, {
        size: 20,
        align: "center",
        color: "#fffaf0",
      });
    }
    drawHpBox(614, enemyHpY, enemy, {
      color: colors.fireA,
      nameBg: "#b3474d",
      nameBgInner: "#dd7b80",
    });
    drawHpBox(56, playerHpY, active, { color: colors.grassA });
    if (vimOrbFx) {
      const progress = fxProgress("vimOrb", time);
      const startX = 308;
      const startY = 368;
      const endX = 708;
      const endY = 208;
      const arcX = startX + (endX - startX) * progress;
      const arcY = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * 104;
      for (let trail = 1; trail <= 3; trail += 1) {
        const trailProgress = Math.max(0, progress - trail * 0.05);
        const trailX = startX + (endX - startX) * trailProgress;
        const trailY = startY + (endY - startY) * trailProgress - Math.sin(trailProgress * Math.PI) * 104;
        drawEllipse(trailX, trailY, 12 - trail * 2, 4, `rgba(${state.fx.focused ? "141, 208, 255" : "255, 255, 255"}, ${0.22 - trail * 0.04})`);
      }
      drawEllipse(arcX, arcY, 20, 6, "rgba(16, 22, 32, 0.18)");
      drawRect(arcX - 16, arcY - 16, 32, 32, state.fx.focused ? "#eaf8ff" : "#f6f7fb");
      drawRect(arcX - 16, arcY - 1, 32, 6, state.fx.focused ? "#8ed0ff" : "#ff8d58");
      drawRect(arcX - 5, arcY - 6, 10, 10, "#1a2236");
      drawRect(arcX - 36, arcY + 8, 8, 3, "rgba(255,255,255,0.5)");
      drawRect(arcX - 50, arcY + 12, 10, 3, "rgba(255,255,255,0.35)");
      drawSparkle(arcX + 18, arcY - 10, 1, "rgba(255,255,255,0.85)");
    }
    if (captureFx) {
      const pulse = 1 - fxProgress("capture", time);
      drawEllipse(710, 198, 80 + pulse * 90, 54 + pulse * 60, `rgba(255, 245, 210, ${pulse * 0.24})`);
      drawEllipse(710, 198, 38 + pulse * 46, 24 + pulse * 28, `rgba(255, 196, 120, ${pulse * 0.32})`);
      drawSparkle(682, 172, 2, "rgba(255, 250, 220, 0.92)");
      drawSparkle(740, 154, 2, "rgba(255, 216, 130, 0.88)");
      drawSparkle(752, 208, 2, "rgba(255, 250, 220, 0.9)");
      const captured = state.fx && state.fx.capturedId ? species[state.fx.capturedId] : null;
      const bannerAlpha = 0.64 + pulse * 0.18;
      drawRect(184, 120, 592, 118, `rgba(14, 23, 39, ${bannerAlpha})`);
      drawRect(190, 126, 580, 106, `rgba(255, 248, 224, ${0.9 - pulse * 0.1})`);
      drawRect(198, 134, 564, 90, `rgba(24, 40, 67, ${0.92 - pulse * 0.08})`);
      drawText(captureFx && state.fx.boss ? "Final Capture" : "Captured Wild VimMonster", screenWidth / 2, 158, {
        size: 24,
        align: "center",
        color: "#fff8df",
      });
      drawText(`You captured ${captured ? captured.name : enemy.name}.`, screenWidth / 2, 186, {
        size: 17,
        align: "center",
        color: "#ffd166",
      });
      drawText("Check it with [ ] or open VimTree with o.", screenWidth / 2, 210, {
        size: 12,
        align: "center",
        color: "#d8e9ff",
      });
    }
  }

  function drawBattleCommandOption(x, y, w, h, title, sublabel, accent, active) {
    drawRect(x, y, w, h, active ? accent : "rgba(21, 38, 66, 0.9)");
    drawRect(x + 2, y + 2, w - 4, h - 4, active ? "#fff7df" : "rgba(255, 255, 255, 0.88)");
    drawRect(x + 5, y + 5, w - 10, h - 10, active ? "rgba(255, 240, 208, 0.95)" : "rgba(239, 244, 255, 0.92)");
    drawText(title, x + 12, y + 17, { size: 12, color: colors.ink });
    drawText(sublabel, x + 12, y + 31, { size: 9, color: colors.panelDark });
  }

  function battleChallengeChip(step) {
    if (!step) {
      return "LOCKED";
    }
    return step.expect;
  }

  function drawBattleChallengeOverlay(time) {
    const challenge = state.battle && state.battle.challenge;
    if (!challenge) {
      return;
    }
    const step = challenge.steps[challenge.stepIndex] || null;
    const progress = Math.max(0, Math.min(1, (time - challenge.startedAt) / 180));
    const panelW = 468;
    const rowHeight = 24;
    const editorH = 22 + challenge.lines.length * rowHeight + 12;
    const panelH = Math.max(176, 92 + editorH);
    const panelX = 248;
    const panelY = dialogueY - panelH - 8 + (1 - progress) * 96;
    const charWidth = 10;
    const lineX = panelX + 64;
    const lineY = panelY + 62;
    const toneMap = {
      hint: { border: "#4e6991", bg: "#0f1d31", fg: "#dce9ff" },
      accent: { border: "#8ed0ff", bg: "#153253", fg: "#e8f6ff" },
      success: { border: "#78da96", bg: "#163626", fg: "#dbffe6" },
      danger: { border: "#ff9e9e", bg: "#4b1f25", fg: "#ffe3e3" },
    };
    const feedbackTone = toneMap[challenge.feedbackTone] || toneMap.hint;

    challenge.cursorVisual.row += (challenge.cursor.row - challenge.cursorVisual.row) * 0.32;
    challenge.cursorVisual.col += (challenge.cursor.col - challenge.cursorVisual.col) * 0.32;

    drawPanelShadow(panelX, panelY, panelW, panelH, 0.28);
    drawRect(panelX, panelY, panelW, panelH, feedbackTone.border);
    drawRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6, "#fff7e3");
    drawRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16, "#16253c");
    drawGradientRect(panelX + 12, panelY + 12, panelW - 24, 26, [
      [0, "#20436f"],
      [1, "#14253f"],
    ]);
    drawText(challenge.title, panelX + 24, panelY + 30, {
      size: 14,
      color: "#fff7e2",
    });
    drawText(`BATTLE DRILL  ${battleChallengeChip(step)}`, panelX + panelW - 22, panelY + 30, {
      size: 11,
      align: "right",
      color: "#ffd166",
    });
    drawRect(panelX + 18, panelY + 48, panelW - 36, editorH, "#0e1a2d");
    challenge.lines.forEach((line, rowIndex) => {
      drawText(String(rowIndex + 1), panelX + 36, lineY + rowIndex * rowHeight + 11, {
        size: 11,
        align: "right",
        color: "#8fa6ca",
      });
      drawTokenizedDrillLine(line, "code", lineX, lineY + rowIndex * rowHeight, 15, charWidth);
    });
    if (step) {
      const width = Math.max(1, step.expect === "dd" ? challenge.lines[step.target.row].length : 1) * charWidth;
      drawRect(
        lineX + step.target.col * charWidth - 4,
        lineY + step.target.row * rowHeight - 4,
        width + 8,
        20,
        challenge.feedbackTone === "danger" ? "rgba(255, 141, 141, 0.22)" : "rgba(141, 208, 255, 0.18)"
      );
    }
    const cursorX = lineX + challenge.cursorVisual.col * charWidth;
    const cursorY = lineY + challenge.cursorVisual.row * rowHeight - 2;
    drawRect(cursorX - 2, cursorY + 15, charWidth + 4, 2, "#ffd166");
    const footerY = panelY + panelH - 34;
    drawRect(panelX + 18, footerY, panelW - 36, 24, feedbackTone.bg);
    drawText(challenge.feedback || challenge.instruction, panelX + 28, footerY + 16, {
      size: 11,
      color: feedbackTone.fg,
    });
  }

  function drawBattleDialogue(time) {
    const active = activeMonster();
    const enemy = state.battle.enemy;
    const leftX = 24;
    const leftY = dialogueY + 6;
    const rightX = 676;
    const rightY = dialogueY + 6;
    const messageLines = wrappedLines(state.message, 492, 15).slice(0, 2);
    const techniqueParts = [];
    const enemyParts = [];
    if (state.flags.usedX) {
      techniqueParts.push("x Quick");
    }
    if (state.flags.usedDd) {
      techniqueParts.push("dd Heavy");
    }
    if (state.flags.usedCw) {
      techniqueParts.push("cw Focus");
    }
    if (state.flags.usedDw) {
      techniqueParts.push("dw Break");
    }
    if (state.flags.usedCiw) {
      techniqueParts.push("ciw Inner");
    }
    if (species[enemy.id] && species[enemy.id].battle && species[enemy.id].battle.specialty) {
      enemyParts.push(species[enemy.id].battle.specialty);
    }
    if (state.battle.enemyStatus.guard > 0) {
      enemyParts.push(`guard ${state.battle.enemyStatus.guard}`);
    }
    if (state.battle.enemyStatus.evade > 0) {
      enemyParts.push("evade");
    }
    if (state.battle.enemyStatus.bleed > 0) {
      enemyParts.push(`bleed ${state.battle.enemyStatus.bleed}`);
    }
    if (state.battle.playerStatus.rooted > 0) {
      enemyParts.push("you rooted");
    }
    if (state.battle.playerStatus.bleed > 0) {
      enemyParts.push(`you bleed ${state.battle.playerStatus.bleed}`);
    }
    if (state.battle.playerStatus.marked > 0) {
      enemyParts.push("you marked");
    }
    drawBitmap(uiAsset("battleDialogueBox") ? uiAsset("battleDialogueBox").image : null, leftX, leftY, 540, 112);
    if (!uiAsset("battleDialogueBox")) {
      drawWindow(leftX, leftY, 540, 112);
    }
    drawText(`${active.name}, make a move.`, leftX + 22, leftY + 26, {
      size: 16,
      color: colors.panelDark,
    });
    messageLines.forEach((line, index) => {
      drawText(line, leftX + 22, leftY + 52 + index * 18, {
        size: 15,
        color: colors.ink,
      });
    });
    if (enemyParts.length) {
      drawText(fittedText(`Battle ${enemyParts.join("  |  ")}`, 476, 10), leftX + 22, leftY + 82, {
        size: 10,
        color: "#8f4027",
      });
    }
    if (techniqueParts.length) {
      drawText(fittedText(`Tech ${techniqueParts.join("   ")}`, 476, 10), leftX + 22, leftY + 96, {
        size: 10,
        color: "#325277",
      });
    }

    drawBitmap(uiAsset("battleCommandBox") ? uiAsset("battleCommandBox").image : null, rightX, rightY, 260, 152);
    if (!uiAsset("battleCommandBox")) {
      drawWindow(rightX, rightY, 260, 152);
    }
    drawText("COMMAND", rightX + 20, rightY + 22, {
      size: 13,
      color: colors.panelDark,
    });
    drawBattleCommandOption(rightX + 18, rightY + 36, 108, 40, "Attack", "press a", "#ffcf7d", true);
    drawBattleCommandOption(rightX + 134, rightY + 36, 108, 40, "VimOrb", "press f", "#89c2ff");
    drawBattleCommandOption(rightX + 18, rightY + 86, 108, 40, "Run", "press r", "#d8e3f7");
    drawBattleCommandOption(rightX + 134, rightY + 86, 108, 40, "Switch", "[ / ]", "#c7f0d2");
    drawText(`VimOrbs ${state.vimOrbs}`, rightX + 238, rightY + 22, {
      size: 9,
      align: "right",
      color: "#9a5b22",
    });
    if (state.battle.pendingTechnique === "d") {
      drawText("dd ready", rightX + 238, rightY + 142, {
        size: 10,
        align: "right",
        color: "#8f4027",
      });
    } else if (state.battle.pendingTechnique === "c") {
      drawText("cw ready", rightX + 238, rightY + 142, {
        size: 10,
        align: "right",
        color: "#275b8f",
      });
    } else if (state.battle.focusedVimOrb) {
      drawText("focus primed", rightX + 238, rightY + 142, {
        size: 10,
        align: "right",
        color: "#275b8f",
      });
    }
    drawBattleChallengeOverlay(time);
  }

  return {
    drawBattle,
    drawBattleDialogue,
  };
}
