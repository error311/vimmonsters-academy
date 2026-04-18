// Owns: VimTree overlay rendering. Does not own: tree data generation or
// general scene composition.

export function createTreeOverlayRenderer(deps) {
  const {
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
  } = deps;

  return function drawTreeOverlay() {
    const sections = treeSections();
    const selected = sections[state.tree.selected];
    const selectedItems = selected.items.length ? selected.items : ["No entries"];
    const itemIndex = Math.max(0, Math.min(state.tree.itemIndex, selectedItems.length - 1));
    const outerX = 24;
    const outerY = 74;
    const outerW = screenWidth - 48;
    const outerH = viewHeight - 90;
    const leftX = 38;
    const leftY = 90;
    const leftW = 274;
    const panelH = viewHeight - 124;
    const rightX = 328;
    const rightY = 90;
    const rightW = screenWidth - 366;

    const sectionDescription = selected.title === "Controls"
      ? "Unlocked controls explain both the real Vim meaning and the in-game effect."
      : selected.title === "Party"
        ? "Your active VimMonster is marked with * and FOLLOWING. Press [ or ] outside battle to switch."
        : selected.title === "Commands"
          ? "Unlocked ex commands live here, including :q to restart on a fresh seed."
          : selected.title === "Leaderboard"
            ? "Fast clears and high scores stay here between runs."
            : selected.title === "Objective"
              ? "Run status, current goal, and partner state stay visible here."
              : "Lesson progress and current academy context are kept inside the game.";

    drawRect(outerX, outerY, outerW, outerH, "rgba(7, 12, 20, 0.84)");
    drawRect(outerX + 4, outerY + 4, outerW - 8, outerH - 8, "rgba(255,255,255,0.04)");
    drawWindow(leftX, leftY, leftW, panelH);
    drawWindow(rightX, rightY, rightW, panelH);

    drawGradientRect(leftX + 14, leftY + 14, leftW - 28, 42, [
      [0, "#1a3d64"],
      [0.55, "#2b6ba3"],
      [1, "#163658"],
    ]);
    drawText("VimTree", leftX + 28, leftY + 40, { size: 20, color: "#ffffff" });
    drawRect(leftX + 18, leftY + 62, leftW - 36, 28, "#f6edd0");
    drawRect(leftX + 22, leftY + 66, leftW - 44, 20, "#fffaf0");
    drawText("j/k move   Enter/l focus", leftX + 28, leftY + 74, {
      size: 10,
      color: colors.panelDark,
    });
    drawText("h back   o close", leftX + 28, leftY + 86, {
      size: 10,
      color: colors.panelDark,
    });

    const navStartY = leftY + 116;
    const navBottomY = leftY + panelH - 42;
    const navSpacing = Math.max(34, Math.floor((navBottomY - navStartY) / Math.max(1, sections.length - 1)));

    sections.forEach((section, index) => {
      const y = navStartY + index * navSpacing;
      const active = index === state.tree.selected;
      const navActive = active && state.tree.focus === "sections";
      drawRect(leftX + 16, y - 17, leftW - 32, 28, active ? "#fff5d8" : "#f8f3e7");
      drawRect(leftX + 20, y - 13, leftW - 40, 20, active ? (navActive ? "#d7eeff" : "#ffe8ae") : "rgba(209, 221, 239, 0.42)");
      if (active) {
        drawRect(leftX + 22, y - 11, 5, 16, navActive ? "#3f8cd5" : "#d39b2e");
      }
      drawText(section.title, leftX + 38, y, {
        size: 14,
        color: active ? colors.ink : colors.panelDark,
      });
      drawText(String(section.items.length).padStart(2, "0"), leftX + leftW - 34, y, {
        size: 11,
        align: "right",
        color: active ? colors.ink : "#617493",
      });
    });

    drawGradientRect(rightX + 14, rightY + 14, rightW - 28, 48, [
      [0, "#173555"],
      [0.55, "#275887"],
      [1, "#122941"],
    ]);
    drawText(selected.title, rightX + 28, rightY + 42, { size: 20, color: "#ffffff" });
    drawText(state.tree.focus === "items" ? "ITEM FOCUS" : "SECTION FOCUS", rightX + rightW - 28, rightY + 32, {
      size: 10,
      align: "right",
      color: "#d8ecff",
    });
    drawText(`${itemIndex + 1}/${selectedItems.length}`, rightX + rightW - 28, rightY + 46, {
      size: 12,
      align: "right",
      color: "#ffe6a8",
    });
    const detailLines = wrappedLines(sectionDescription, rightW - 48, 11).slice(0, 4);
    detailLines.forEach((line, index) => {
      drawText(line, rightX + 24, rightY + 74 + index * 16, {
        size: 11,
        color: colors.panelDark,
      });
    });

    const dividerY = rightY + 74 + detailLines.length * 16 + 10;
    drawRect(rightX + 18, dividerY, rightW - 36, 1, "rgba(31, 54, 86, 0.18)");

    let itemY = dividerY + 28;
    const maxItemY = rightY + panelH - 28;
    const startIndex = state.tree.focus === "items" ? Math.max(0, itemIndex - 4) : 0;
    const visibleItems = selectedItems.slice(startIndex);
    if (startIndex > 0) {
      drawText("▲ more", rightX + rightW - 26, dividerY + 16, {
        size: 10,
        align: "right",
        color: colors.panelDark,
      });
    }
    let drawnCount = 0;
    visibleItems.forEach((item, visibleIndex) => {
      const index = startIndex + visibleIndex;
      const active = state.tree.focus === "items" && index === itemIndex;
      const lines = wrappedLines(item, rightW - 84, 11).slice(0, 4);
      const itemHeight = Math.max(32, lines.length * 14 + 12);
      if (itemY + itemHeight > maxItemY) {
        return;
      }
      drawnCount += 1;
      drawRect(rightX + 18, itemY - 16, rightW - 36, itemHeight, active ? "#fff3ca" : "#f7f3ea");
      drawRect(rightX + 22, itemY - 12, rightW - 44, itemHeight - 8, active ? "#d8efff" : "rgba(213, 224, 239, 0.4)");
      drawText(String(index + 1).padStart(2, "0"), rightX + 36, itemY + 2, {
        size: 10,
        color: active ? "#25486f" : "#70829d",
      });
      lines.forEach((line, lineIndex) => {
        drawText(line, rightX + 64, itemY + lineIndex * 14 + 1, {
          size: 11,
          color: active ? colors.ink : colors.panelDark,
        });
      });
      itemY += itemHeight + 10;
    });
    if (startIndex + drawnCount < selectedItems.length) {
      drawText("▼ more", rightX + rightW - 26, rightY + panelH - 12, {
        size: 10,
        align: "right",
        color: colors.panelDark,
      });
    }
  };
}
