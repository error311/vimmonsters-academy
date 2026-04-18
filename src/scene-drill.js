// Owns: lesson deck and drill editor overlay rendering. Does not own: drill
// step definitions or drill state transitions.

export function createDrillOverlayRenderer(deps) {
  const {
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
  } = deps;

  function drillFeedbackColors(drill) {
    if (!drill) {
      return { bg: "#1b2b45", fg: "#dce9ff", border: "#37537d" };
    }
    if (drill.feedbackTone === "success") {
      return { bg: "#173b29", fg: "#c9ffda", border: "#4caf69" };
    }
    if (drill.feedbackTone === "danger") {
      return { bg: "#4b1f25", fg: "#ffd8d8", border: "#ff8d8d" };
    }
    if (drill.feedbackTone === "warning") {
      return { bg: "#533719", fg: "#fff0cf", border: "#ffd166" };
    }
    if (drill.feedbackTone === "accent") {
      return { bg: "#1f3554", fg: "#d7edff", border: "#8ed0ff" };
    }
    return { bg: "#1c2942", fg: "#dfe9ff", border: drill.theme ? drill.theme.accent : "#8ed0ff" };
  }

  function drillStepChip(step) {
    if (!step) {
      return "CLEAR";
    }
    if (step.type === "motion") {
      return step.expect;
    }
    if (step.type === "insert") {
      return `i ${step.expected}`;
    }
    if (step.type === "edit") {
      return step.expect;
    }
    if (step.type === "search") {
      return `/${step.expect}`;
    }
    if (step.type === "replace") {
      return `:${step.expect}`;
    }
    if (step.type === "macro") {
      return step.expect;
    }
    if (step.type === "command") {
      return `:${step.expect}`;
    }
    return "STEP";
  }

  function drillTargetWidth(step, line) {
    if (!step) {
      return 1;
    }
    if (step.type === "macro") {
      return 8;
    }
    if (step.type === "command") {
      return Math.max(8, String(line || "").length);
    }
    if (step.type === "insert") {
      return step.length;
    }
    if (step.type === "edit") {
      if (step.expect === "dd") {
        return Math.max(8, String(line || "").length);
      }
      return step.length || step.deleteCount || 1;
    }
    const token = String(line || "").slice(step.target.col).match(/^[A-Za-z_]+/);
    if (token && /[wb]$/.test(step.expect)) {
      return token[0].length;
    }
    return 1;
  }

  function drillTargetLabel(step) {
    if (!step) {
      return "";
    }
    if (step.type === "macro") {
      return "macro";
    }
    if (step.type === "command") {
      return ":prompt";
    }
    if (step.type === "replace") {
      return step.scope === "global" ? "file" : `L${step.row + 1}`;
    }
    if (step.type === "edit" && step.expect === "dd") {
      return `L${step.row + 1}`;
    }
    if (step.type === "edit") {
      return `L${step.target.row + 1}:C${step.target.col + 1}`;
    }
    const row = (step.type === "insert" ? step.row : step.target.row) + 1;
    const col = (step.type === "insert" ? step.col : step.target.col) + 1;
    return `L${row}:C${col}`;
  }

  function drillCursorMatchesStep(step) {
    if (!step || !state.drill) {
      return false;
    }
    if (step.type === "macro" || step.type === "command") {
      return state.drill.mode === "prompt";
    }
    if (step.type === "replace") {
      return step.scope === "global" || state.drill.cursor.row === step.row;
    }
    if (step.type === "edit" && step.expect === "dd") {
      return state.drill.cursor.row === step.row;
    }
    if (step.type === "edit") {
      return state.drill.cursor.row === step.target.row && state.drill.cursor.col === step.target.col;
    }
    const row = step.type === "insert" ? step.row : step.target.row;
    const col = step.type === "insert" ? step.col : step.target.col;
    return state.drill.cursor.row === row && state.drill.cursor.col === col;
  }

  return function drawDrillOverlay(time) {
    const drill = hydrateDrill(state.drill);
    const step = currentDrillStep();
    const theme = drill.theme;
    const outerX = 34;
    const outerY = 66;
    const outerW = screenWidth - 68;
    const outerH = screenHeight - 100;
    const sideX = outerX + 24;
    const sideY = outerY + 64;
    const sideW = 218;
    const sideH = outerH - 124;
    const editorX = sideX + sideW + 20;
    const editorY = sideY;
    const editorW = outerW - (editorX - outerX) - 24;
    const editorH = sideH;
    const footerX = sideX;
    const footerY = sideY + sideH + 16;
    const footerW = outerW - 48;
    const footerH = 46;
    const charWidth = 10;
    const rowHeight = 34;
    const lineX = editorX + 76;
    const lineY = editorY + 92;
    const feedbackColors = drillFeedbackColors(drill);

    drill.cursorVisual.row += (drill.cursor.row - drill.cursorVisual.row) * 0.28;
    drill.cursorVisual.col += (drill.cursor.col - drill.cursorVisual.col) * 0.28;

    drawRect(20, 52, screenWidth - 40, screenHeight - 70, "rgba(7, 11, 18, 0.78)");
    drawRect(outerX, outerY, outerW, outerH, theme.border);
    drawGradientRect(outerX + 4, outerY + 4, outerW - 8, outerH - 8, [
      [0, "#0d1829"],
      [0.45, "#111f35"],
      [1, "#0b1422"],
    ]);
    drawGradientRect(outerX + 12, outerY + 12, outerW - 24, 38, [
      [0, theme.accentDeep],
      [0.5, theme.accent],
      [1, theme.accentDeep],
    ]);
    drawText(drill.title, outerX + 28, outerY + 38, { size: 20, color: "#fffdf4" });
    drawText(`${drill.kind === "code" ? "Code Lab" : "Text Lab"}  |  Step ${drill.stepIndex + 1}/${drill.steps.length}`, outerX + outerW - 28, outerY + 38, {
      size: 12,
      align: "right",
      color: "#fff7db",
    });
    drawRect(sideX, sideY, sideW, sideH, "rgba(8, 15, 26, 0.82)");
    drawRect(sideX + 3, sideY + 3, sideW - 6, sideH - 6, theme.accentSoft);
    drawRect(sideX + 8, sideY + 8, sideW - 16, sideH - 16, "#fbfff7");
    drawGradientRect(sideX + 12, sideY + 12, sideW - 24, 24, [
      [0, theme.accentSoft],
      [1, "#ffffff"],
    ]);
    drawText("Lesson Deck", sideX + 20, sideY + 28, { size: 12, color: theme.accentDeep });
    drawPortraitCard(sideX + 42, sideY + 44, theme.portrait);
    drawText("EXACT INPUT", sideX + 18, sideY + 178, { size: 10, color: "#415272" });
    drawRect(sideX + 18, sideY + 188, sideW - 36, 42, theme.border);
    drawGradientRect(sideX + 21, sideY + 191, sideW - 42, 36, [
      [0, theme.accentDeep],
      [1, theme.accent],
    ]);
    const chipText = drillStepChip(step);
    const chipSize = chipText.length > 18 ? 11 : chipText.length > 12 ? 13 : 16;
    const chipLines = wrappedLines(chipText, sideW - 58, chipSize).slice(0, 2);
    const chipLineHeight = chipSize > 13 ? 13 : 11;
    const chipCenterY = sideY + 212;
    const chipStartY = chipCenterY - Math.floor(((chipLines.length - 1) * chipLineHeight) / 2);
    chipLines.forEach((line, index) => {
      drawText(line, sideX + sideW / 2, chipStartY + index * chipLineHeight, {
        align: "center",
        size: chipSize,
        color: "#fff8eb",
      });
    });
    drawText("WHAT VIM IS TEACHING", sideX + 18, sideY + 248, { size: 10, color: "#415272" });
    drawWrapped(step ? step.instruction : "Drill complete.", sideX + 18, sideY + 268, sideW - 36, 18, 5, {
      size: 12,
      color: colors.ink,
    });
    drawText("MODE", sideX + 18, sideY + 374, { size: 10, color: "#415272" });
    drawInfoBadge(sideX + 18, sideY + 382, sideW - 36, "STATE", drill.mode === "insert" ? "INSERT" : drill.mode === "prompt" ? "PROMPT" : "NORMAL", drill.mode === "insert" ? theme.accentDeep : drill.mode === "prompt" ? "#8ed0ff" : theme.accent);
    drawInfoBadge(sideX + 18, sideY + 410, sideW - 36, "COUNT", drill.countBuffer || "-", theme.accent);
    drawInfoBadge(sideX + 18, sideY + 438, sideW - 36, drill.mode === "insert" ? "ESC" : "GO TO", drill.mode === "insert" ? "submit fix" : drillTargetLabel(step) || "-", drill.feedbackTone === "danger" ? "#ff8d8d" : "#ffd166");
    drawRect(editorX, editorY, editorW, editorH, "rgba(8, 14, 24, 0.88)");
    drawRect(editorX + 3, editorY + 3, editorW - 6, editorH - 6, theme.border);
    drawGradientRect(editorX + 8, editorY + 8, editorW - 16, 28, [
      [0, theme.editorAlt],
      [1, theme.editorBg],
    ]);
    drawText(`vimmonsters://${theme.tab}`, editorX + 20, editorY + 27, { size: 12, color: "#f6f7ff" });
    drawText(drill.mode === "insert" ? "-- INSERT --" : "-- NORMAL --", editorX + editorW - 20, editorY + 27, {
      size: 11,
      align: "right",
      color: drill.mode === "insert" ? theme.accent : "#d9ebff",
    });
    drawRect(editorX + 8, editorY + 42, editorW - 16, editorH - 50, theme.editorBg);
    for (let scanY = editorY + 46; scanY < editorY + editorH - 10; scanY += 4) {
      drawRect(editorX + 12, scanY, editorW - 24, 1, "rgba(255,255,255,0.02)");
    }
    if (drill.bannerUntil > time) {
      const alpha = Math.max(0, (drill.bannerUntil - time) / 650);
      drawRect(outerX + outerW - 214, outerY + 16, 170, 26, `rgba(255, 255, 255, ${0.08 + alpha * 0.22})`);
      drawRect(outerX + outerW - 211, outerY + 19, 164, 20, `rgba(15, 26, 44, ${0.72 + alpha * 0.12})`);
      drawText("MOTION LOCKED", outerX + outerW - 129, outerY + 33, {
        align: "center",
        size: 12,
        color: theme.accentSoft,
      });
    }
    if (step && step.type !== "command") {
      const macroRow = step.type === "macro" && Array.isArray(step.edits) && step.edits.length ? step.edits[0].row : null;
      const targetRow = step.type === "insert"
        ? step.row
        : step.type === "edit" && step.expect === "dd"
          ? step.row
          : step.type === "edit"
            ? step.target.row
            : step.type === "replace"
              ? (typeof step.row === "number" ? step.row : 0)
              : step.type === "macro"
                ? macroRow
                : step.target.row;
      if (typeof targetRow === "number") {
        const highlightY = lineY + targetRow * rowHeight - 6;
        const guideActive = !drillCursorMatchesStep(step) && drill.feedbackTone === "danger";
        drawRect(editorX + 12, highlightY, editorW - 24, 26, guideActive ? "rgba(255, 141, 141, 0.14)" : theme.lineTint);
      }
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(editorX + 12, editorY + 46, editorW - 24, editorH - 62);
    ctx.clip();
    drill.lines.forEach((rawLine, rowIndex) => {
      const y = lineY + rowIndex * rowHeight;
      let line = rawLine;
      const liveEditStep = step
        && drill.mode === "insert"
        && (
          (step.type === "insert" && step.row === rowIndex)
          || (step.type === "edit" && (step.expect === "cw" || step.expect === "ciw") && step.target.row === rowIndex)
        );
      if (liveEditStep) {
        const editCol = step.type === "insert" ? step.col : step.target.col;
        const placeholder = step.type === "insert" ? "_" : " ";
        const fill = (drill.input + placeholder.repeat(Math.max(0, step.length - drill.input.length))).slice(0, step.length);
        line = rawLine.slice(0, editCol) + fill + rawLine.slice(editCol + step.length);
      }
      drawRect(editorX + 12, y - 2, 44, 24, rowIndex % 2 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)");
      drawText(String(rowIndex + 1).padStart(2, "0"), editorX + 40, y + 13, {
        size: 12,
        align: "right",
        color: "#91a6c7",
      });
      drawTokenizedDrillLine(line, drill.kind, lineX, y, 16, charWidth);
    });
    if (step) {
      if (step.type !== "command" && step.type !== "macro") {
        const targetCol = step.type === "insert"
          ? step.col
          : step.type === "edit" && step.expect === "dd"
            ? 0
            : step.type === "edit"
              ? step.target.col
              : step.type === "replace"
                ? 0
                : step.target.col;
        const targetRow = step.type === "insert"
          ? step.row
          : step.type === "edit" && step.expect === "dd"
            ? step.row
            : step.type === "edit"
              ? step.target.row
              : step.type === "replace"
                ? (typeof step.row === "number" ? step.row : 0)
                : step.target.row;
        const targetLine = drill.lines[targetRow] || "";
        const width = (step.type === "replace" ? Math.max(8, targetLine.length) : Math.max(1, drillTargetWidth(step, targetLine))) * charWidth;
        const pulse = 0.2 + ((Math.sin(time / 160) + 1) * 0.16);
        const guideActive = !drillCursorMatchesStep(step) && drill.feedbackTone === "danger";
        const fillColor = guideActive ? "rgba(255, 141, 141, 0.2)" : theme.targetTint;
        const edgeColor = guideActive ? `rgba(255, 219, 219, ${0.5 + pulse * 0.3})` : `rgba(255,255,255,${pulse})`;
        drawRect(lineX + targetCol * charWidth - 4, lineY + targetRow * rowHeight - 4, width + 8, 24, fillColor);
        drawRect(lineX + targetCol * charWidth - 2, lineY + targetRow * rowHeight - 2, width + 4, 20, edgeColor);
        if (guideActive) {
          const gutterY = lineY + targetRow * rowHeight;
          drawRect(editorX + 16, gutterY - 2, 34, 20, "rgba(255, 141, 141, 0.22)");
          drawRect(editorX + 20, gutterY + 7, 18, 3, "#ffb3b3");
          drawRect(editorX + 35, gutterY + 4, 3, 9, "#ffb3b3");
          drawRect(lineX + targetCol * charWidth - 6, lineY + targetRow * rowHeight - 6, width + 12, 2, "#ffd5d5");
          drawRect(lineX + targetCol * charWidth - 6, lineY + targetRow * rowHeight + 20, width + 12, 2, "#ffd5d5");
          drawRect(lineX + targetCol * charWidth - 6, lineY + targetRow * rowHeight - 6, 2, 28, "#ffd5d5");
          drawRect(lineX + targetCol * charWidth + width + 4, lineY + targetRow * rowHeight - 6, 2, 28, "#ffd5d5");
        }
      } else if (step.type === "macro") {
        const macroRows = Array.isArray(step.edits) ? [...new Set(step.edits.map((edit) => edit.row))] : [];
        const pulse = 0.2 + ((Math.sin(time / 160) + 1) * 0.16);
        macroRows.forEach((row) => {
          const targetLine = drill.lines[row] || "";
          const width = Math.max(8, targetLine.length) * charWidth;
          drawRect(lineX - 4, lineY + row * rowHeight - 4, width + 8, 24, theme.targetTint);
          drawRect(lineX - 2, lineY + row * rowHeight - 2, width + 4, 20, `rgba(255,255,255,${pulse})`);
        });
      } else {
        drawRect(editorX + 22, editorY + 18, 120, 20, "rgba(141, 208, 255, 0.18)");
      }
    }
    const cursorPulse = 0.55 + (Math.sin(time / 110) + 1) * 0.18;
    const insertOffset = drill.mode === "insert" ? drill.input.length * charWidth : 0;
    const cursorX = lineX + drill.cursorVisual.col * charWidth + insertOffset;
    const cursorY = lineY + drill.cursorVisual.row * rowHeight - 2;
    if (drill.mode === "insert") {
      drawRect(cursorX - 1, cursorY, 2, 20, `rgba(255,255,255,${cursorPulse})`);
      drawRect(cursorX, cursorY + 1, 1, 18, theme.accent);
    } else {
      drawRect(cursorX - 3, cursorY, charWidth + 6, 20, `rgba(255,255,255,${0.12 + cursorPulse * 0.12})`);
      drawRect(cursorX - 2, cursorY + 17, charWidth + 4, 2, theme.accent);
    }
    ctx.restore();
    drawRect(footerX, footerY, footerW, footerH, feedbackColors.border);
    drawRect(footerX + 3, footerY + 3, footerW - 6, footerH - 6, feedbackColors.bg);
    drawText(
      drill.mode === "prompt"
        ? `${drill.promptPrefix}${drill.promptText}${Math.floor(time / 250) % 2 ? "_" : " "}`
        : drill.feedback,
      footerX + 18,
      footerY + 28,
      { size: 13, color: feedbackColors.fg }
    );
    drawText(
      drill.mode === "insert"
        ? "Type in place, then Esc submits the fix"
        : step && step.type === "macro"
          ? "Macro step: type the full sequence directly, no Enter"
          : drill.mode === "prompt"
            ? "Use Enter to submit the / or : command"
            : "Counts work here too: 2w 3w 2j 2k 2h 2l",
      footerX + footerW - 18,
      footerY + 28,
      { size: 11, align: "right", color: "#c7d9f7" }
    );
  };
}
