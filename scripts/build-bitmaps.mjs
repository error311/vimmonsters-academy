import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawnSync } from "child_process";
import {
  PLAYER_FRAMES,
  MENTOR_FRAMES,
  COACH_FRAMES,
  SAGE_FRAMES,
  SCOUT_FRAMES,
  SCRIBE_FRAMES,
  PLAYER_PALETTE,
  MENTOR_PALETTE,
  COACH_PALETTE,
  SAGE_PALETTE,
  SCOUT_PALETTE,
  SCRIBE_PALETTE,
  MONSTER_FRAMES,
  SPECIES,
} from "../src/content.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SPRITES_DIR = path.join(ROOT, "assets", "sprites");
const UI_DIR = path.join(ROOT, "assets", "ui");
const DIRECTIONS = ["down", "left", "right", "up"];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function svgForPattern(pattern, palette, pixelSize, offsetX = 0, offsetY = 0) {
  return pattern.flatMap((row, rowIndex) => {
    return row.split("").map((pixel, colIndex) => {
      if (pixel === "." || !palette[pixel]) {
        return "";
      }
      return `<rect x="${offsetX + colIndex * pixelSize}" y="${offsetY + rowIndex * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${palette[pixel]}"/>`;
    });
  }).join("");
}

function writeSvgPng(svg, outputPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vimmonsters-asset-"));
  const svgPath = path.join(tempDir, "asset.svg");
  fs.writeFileSync(svgPath, svg, "utf8");
  const binary = spawnSync("magick", ["-version"]).status === 0 ? "magick" : "convert";
  const args = binary === "magick"
    ? ["-background", "none", svgPath, "-alpha", "on", "-define", "png:color-type=6", outputPath]
    : ["-background", "none", svgPath, "-alpha", "on", outputPath];
  execFileSync(binary, args);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function buildTrainerSheet(name, frames, palette) {
  const pixelSize = 8;
  const frameWidth = frames.down[0][0].length * pixelSize;
  const frameHeight = frames.down[0].length * pixelSize;
  const width = frameWidth * frames.down.length;
  const height = frameHeight * DIRECTIONS.length;
  const body = DIRECTIONS.map((direction, rowIndex) => {
    return frames[direction].map((frame, colIndex) => {
      return svgForPattern(frame, palette, pixelSize, colIndex * frameWidth, rowIndex * frameHeight);
    }).join("");
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><rect width="${width}" height="${height}" fill="transparent"/>${body}</svg>`;
  writeSvgPng(svg, path.join(SPRITES_DIR, `${name}.png`));
}

function buildMonsterSheet(id) {
  const frames = MONSTER_FRAMES[id];
  const palette = SPECIES[id].palette;
  const pixelSize = id === "macrobat" ? 8 : 8;
  const frameWidth = frames[0][0].length * pixelSize;
  const frameHeight = frames[0].length * pixelSize;
  const width = frameWidth * frames.length;
  const height = frameHeight;
  const body = frames.map((frame, index) => {
    return svgForPattern(frame, palette, pixelSize, index * frameWidth, 0);
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><rect width="${width}" height="${height}" fill="transparent"/>${body}</svg>`;
  writeSvgPng(svg, path.join(SPRITES_DIR, `${id}.png`));
}

function buildPanelSvg(width, height, headerHeight, accentA, accentB, bodyA, bodyB) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">
    <rect width="${width}" height="${height}" fill="#0f1b2f"/>
    <rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="#f4efcc"/>
    <rect x="6" y="6" width="${width - 12}" height="${height - 12}" fill="#152642"/>
    <rect x="10" y="10" width="${width - 20}" height="${headerHeight}" fill="${accentA}"/>
    <rect x="10" y="${10 + Math.floor(headerHeight / 2)}" width="${width - 20}" height="${Math.ceil(headerHeight / 2)}" fill="${accentB}"/>
    <rect x="10" y="${14 + headerHeight}" width="${width - 20}" height="${height - headerHeight - 24}" fill="${bodyA}"/>
    <rect x="14" y="${18 + headerHeight}" width="${width - 28}" height="${height - headerHeight - 32}" fill="${bodyB}"/>
    <rect x="18" y="${22 + headerHeight}" width="${width - 36}" height="2" fill="rgba(255,255,255,0.22)"/>
  </svg>`;
}

function buildUiAssets() {
  writeSvgPng(
    buildPanelSvg(258, 84, 20, "#b5cff7", "#89b3ee", "#fffdf2", "#eef5ff"),
    path.join(UI_DIR, "battle-hp-box.png")
  );
  writeSvgPng(
    buildPanelSvg(540, 112, 22, "#d4e7ff", "#97c1ff", "#fffdf4", "#eef4ff"),
    path.join(UI_DIR, "battle-dialogue-box.png")
  );
  writeSvgPng(
    buildPanelSvg(260, 152, 22, "#ffefc4", "#ffd36c", "#fffdf4", "#fff5dc"),
    path.join(UI_DIR, "battle-command-box.png")
  );
}

ensureDir(SPRITES_DIR);
ensureDir(UI_DIR);

buildTrainerSheet("player", PLAYER_FRAMES, PLAYER_PALETTE);
buildTrainerSheet("mentor", MENTOR_FRAMES, MENTOR_PALETTE);
buildTrainerSheet("coach", COACH_FRAMES, COACH_PALETTE);
buildTrainerSheet("sage", SAGE_FRAMES, SAGE_PALETTE);
buildTrainerSheet("scout", SCOUT_FRAMES, SCOUT_PALETTE);
buildTrainerSheet("scribe", SCRIBE_FRAMES, SCRIBE_PALETTE);

Object.keys(MONSTER_FRAMES).forEach(buildMonsterSheet);
buildUiAssets();

process.stdout.write("Bitmap assets built.\n");
