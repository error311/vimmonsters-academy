// Shared canvas helpers live here so the main game loop can focus on gameplay
// and scene composition instead of low-level draw primitives.

export function createCanvasRenderer(ctx, colors) {
  function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function drawGradientRect(x, y, w, h, stops) {
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    stops.forEach((entry) => {
      gradient.addColorStop(entry[0], entry[1]);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  }

  function drawEllipse(cx, cy, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawText(text, x, y, options) {
    const opts = options || {};
    ctx.fillStyle = opts.color || colors.ink;
    ctx.textAlign = opts.align || "left";
    ctx.font = `${opts.size || 14}px Lucida Console, Monaco, monospace`;
    ctx.fillText(text, x, y);
  }

  function fittedText(text, maxWidth, size) {
    ctx.font = `${size || 14}px Lucida Console, Monaco, monospace`;
    const value = String(text || "");
    if (ctx.measureText(value).width <= maxWidth) {
      return value;
    }
    let next = value;
    while (next.length > 4 && ctx.measureText(`${next}...`).width > maxWidth) {
      next = next.slice(0, -1);
    }
    return `${next}...`;
  }

  function wrappedLines(text, maxWidth, fontSize) {
    ctx.font = `${fontSize || 14}px Lucida Console, Monaco, monospace`;
    const words = String(text).split(" ");
    let line = "";
    const lines = [];

    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });

    if (line) {
      lines.push(line);
    }

    return lines;
  }

  function drawWrapped(text, x, y, maxWidth, lineHeight, maxLines, options) {
    const lines = wrappedLines(text, maxWidth, (options && options.size) || 14);
    lines.slice(0, maxLines).forEach((entry, index) => {
      drawText(entry, x, y + index * lineHeight, options);
    });
  }

  function drawSprite(pattern, palette, x, y, scale) {
    pattern.forEach((row, rowIndex) => {
      row.split("").forEach((pixel, colIndex) => {
        if (pixel === ".") {
          return;
        }
        const color = palette[pixel];
        if (!color) {
          return;
        }
        drawRect(x + colIndex * scale, y + rowIndex * scale, scale, scale, color);
      });
    });
  }

  function drawOutlinedSprite(pattern, palette, x, y, scale, outline) {
    pattern.forEach((row, rowIndex) => {
      row.split("").forEach((pixel, colIndex) => {
        if (pixel === ".") {
          return;
        }
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].forEach(([dx, dy]) => {
          const otherRow = pattern[rowIndex + dy];
          const otherPixel = otherRow ? otherRow[colIndex + dx] : ".";
          if (otherPixel === "." || typeof otherPixel === "undefined") {
            drawRect(
              x + (colIndex + dx) * scale,
              y + (rowIndex + dy) * scale,
              scale,
              scale,
              outline
            );
          }
        });
      });
    });
    drawSprite(pattern, palette, x, y, scale);
  }

  function drawBitmap(image, x, y, w, h, options) {
    if (!image) {
      return false;
    }
    const dx = Math.round(x);
    const dy = Math.round(y);
    const dw = Math.round(w || image.width);
    const dh = Math.round(h || image.height);
    ctx.save();
    if (options && typeof options.alpha === "number") {
      ctx.globalAlpha = options.alpha;
    }
    ctx.drawImage(image, dx, dy, dw, dh);
    ctx.restore();
    return true;
  }

  function drawBitmapFrame(image, sx, sy, sw, sh, x, y, w, h, options) {
    if (!image) {
      return false;
    }
    const dx = Math.round(x);
    const dy = Math.round(y);
    const dw = Math.round(w || sw);
    const dh = Math.round(h || sh);
    ctx.save();
    if (options && typeof options.alpha === "number") {
      ctx.globalAlpha = options.alpha;
    }
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
    return true;
  }

  function frameAt(frames, time, rate) {
    return frames[Math.floor(time / rate) % frames.length];
  }

  return {
    drawRect,
    drawGradientRect,
    drawEllipse,
    drawText,
    fittedText,
    wrappedLines,
    drawWrapped,
    drawSprite,
    drawOutlinedSprite,
    drawBitmap,
    drawBitmapFrame,
    frameAt,
  };
}
