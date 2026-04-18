import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MEDIA_DIR = path.join(ROOT, "docs", "media");
const TMP_DIR = path.join(MEDIA_DIR, ".tmp");
const SPRITES_DIR = path.join(ROOT, "assets", "sprites");

fs.mkdirSync(MEDIA_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

function writeFile(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-y", ...args], { stdio: "ignore" });
}

function rel(...parts) {
  return path.relative(TMP_DIR, path.join(ROOT, ...parts)).replaceAll(path.sep, "/");
}

function extractFrame(inputName, frameWidth, frameHeight, outputName) {
  ffmpeg([
    "-i",
    path.join(SPRITES_DIR, inputName),
    "-vf",
    `crop=${frameWidth}:${frameHeight}:0:0`,
    "-frames:v",
    "1",
    path.join(TMP_DIR, outputName),
  ]);
}

function svgShell({ width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${body}
</svg>
`;
}

function renderSvgToPng(svgName, pngName) {
  ffmpeg([
    "-i",
    path.join(TMP_DIR, svgName),
    "-frames:v",
    "1",
    "-update",
    "1",
    path.join(MEDIA_DIR, pngName),
  ]);
}

function buildOverworldSvg() {
  const body = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c8ecff"/>
      <stop offset="100%" stop-color="#70b9ff"/>
    </linearGradient>
    <linearGradient id="hud" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#173355"/>
      <stop offset="100%" stop-color="#102440"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="#0b1422"/>
  <rect x="22" y="16" width="1236" height="48" rx="8" fill="url(#hud)"/>
  <text x="48" y="45" fill="#8df0a1" font-family="monospace" font-size="22">00:42.0</text>
  <text x="190" y="45" fill="#fff2bd" font-family="monospace" font-size="22">BEST 900</text>
  <text x="360" y="45" fill="#ffd166" font-family="monospace" font-size="22">SCORE 180</text>
  <text x="640" y="45" fill="#ffffff" font-family="monospace" font-size="20" text-anchor="middle">anon | WORD MEADOW</text>
  <text x="1230" y="30" fill="#cfe9ff" font-family="monospace" font-size="14" text-anchor="end">VIMMONSTERS ACADEMY</text>
  <text x="1230" y="49" fill="#ffd166" font-family="monospace" font-size="14" text-anchor="end">SEED 123456</text>

  <rect x="44" y="82" width="1192" height="436" rx="10" fill="url(#sky)"/>
  <circle cx="1080" cy="146" r="42" fill="#ffe892" fill-opacity="0.95"/>
  <rect x="44" y="306" width="1192" height="212" fill="#78cb6a"/>
  <rect x="44" y="350" width="1192" height="168" fill="#63b25a"/>
  <rect x="112" y="382" width="988" height="36" rx="18" fill="#ddc38c"/>
  <rect x="164" y="250" width="124" height="132" rx="10" fill="#d39a64"/>
  <rect x="178" y="262" width="96" height="88" rx="8" fill="#f6d0a4"/>
  <rect x="203" y="316" width="48" height="66" fill="#8f5330"/>
  <rect x="520" y="196" width="84" height="70" fill="#4f8f45"/>
  <rect x="540" y="170" width="42" height="54" fill="#5cb052"/>
  <rect x="726" y="182" width="84" height="84" fill="#4f8f45"/>
  <rect x="748" y="154" width="40" height="58" fill="#5cb052"/>
  <rect x="944" y="210" width="84" height="84" fill="#4f8f45"/>
  <rect x="966" y="182" width="40" height="58" fill="#5cb052"/>

  <image href="${rel("assets", "sprites", "player.png")}" x="474" y="300" width="36" height="42" preserveAspectRatio="xMinYMin slice"/>
  <image href="${rel("assets", "sprites", "sproutle.png")}" x="428" y="320" width="30" height="30" preserveAspectRatio="xMinYMin slice"/>

  <rect x="44" y="536" width="1192" height="152" rx="10" fill="#132136"/>
  <rect x="54" y="546" width="1172" height="132" rx="8" fill="#fffdf5"/>
  <rect x="78" y="566" width="118" height="90" rx="8" fill="#eef8ff"/>
  <image href="${rel("assets", "sprites", "mentor.png")}" x="94" y="580" width="84" height="48" preserveAspectRatio="xMinYMin slice"/>
  <text x="222" y="592" fill="#13233b" font-family="monospace" font-size="24">Welcome to Word Meadow.</text>
  <text x="222" y="622" fill="#32425f" font-family="monospace" font-size="18">Find Mentor W, clear the drill, then catch your first VimMonster.</text>
  <text x="222" y="652" fill="#32425f" font-family="monospace" font-size="16">Goal: use w, b, e, and ge in the text lab.</text>
  <text x="1180" y="592" fill="#8df0a1" font-family="monospace" font-size="18" text-anchor="end">TIMER 00:42.0</text>
  <text x="1180" y="622" fill="#8ee3ff" font-family="monospace" font-size="18" text-anchor="end">BEST 00:58.0</text>
  <text x="1180" y="652" fill="#ffd166" font-family="monospace" font-size="18" text-anchor="end">SEED 123456</text>
  `;
  writeFile(path.join(TMP_DIR, "overworld-preview.svg"), svgShell({ width: 1280, height: 720, body }));
}

function buildDrillSvg() {
  const body = `
  <rect width="1280" height="720" fill="#08111d"/>
  <rect x="24" y="52" width="1232" height="622" rx="10" fill="#0b1422"/>
  <rect x="38" y="66" width="1204" height="38" rx="8" fill="#9f5d16"/>
  <text x="64" y="91" fill="#fffdf4" font-family="monospace" font-size="24">Word Meadow Text Drill</text>
  <text x="1190" y="90" fill="#fff7db" font-family="monospace" font-size="16" text-anchor="end">Text Lab | Step 3/8</text>

  <rect x="58" y="130" width="220" height="438" rx="10" fill="#fbfff7"/>
  <rect x="70" y="144" width="196" height="26" rx="6" fill="#fff2bf"/>
  <text x="88" y="162" fill="#9f5d16" font-family="monospace" font-size="14">Lesson Deck</text>
  <rect x="92" y="186" width="152" height="128" rx="10" fill="#eef8ff"/>
  <image href="${rel("assets", "sprites", "mentor.png")}" x="112" y="204" width="112" height="64" preserveAspectRatio="xMinYMin slice"/>
  <text x="92" y="350" fill="#415272" font-family="monospace" font-size="14">EXACT INPUT</text>
  <rect x="92" y="364" width="152" height="48" rx="8" fill="#17314b"/>
  <text x="168" y="395" fill="#fff2bf" font-family="monospace" font-size="28" text-anchor="middle">2w</text>
  <text x="92" y="448" fill="#415272" font-family="monospace" font-size="14">TARGET</text>
  <text x="92" y="474" fill="#13233b" font-family="monospace" font-size="18">L1:C13</text>

  <rect x="300" y="130" width="918" height="438" rx="10" fill="#13243c"/>
  <rect x="318" y="148" width="882" height="28" rx="6" fill="#173154"/>
  <text x="338" y="166" fill="#d7edff" font-family="monospace" font-size="14">word_meadow.txt</text>
  <rect x="324" y="222" width="870" height="30" fill="rgba(255,209,102,0.12)"/>
  <rect x="598" y="248" width="56" height="24" fill="rgba(255,209,102,0.22)"/>
  <text x="348" y="242" fill="#91a6c7" font-family="monospace" font-size="16">01</text>
  <text x="348" y="286" fill="#91a6c7" font-family="monospace" font-size="16">02</text>
  <text x="348" y="330" fill="#91a6c7" font-family="monospace" font-size="16">03</text>
  <text x="404" y="242" fill="#f1f6ff" font-family="monospace" font-size="22">quick brown fox hops</text>
  <text x="404" y="286" fill="#f1f6ff" font-family="monospace" font-size="22">motion hint ____ now</text>
  <text x="404" y="330" fill="#f1f6ff" font-family="monospace" font-size="22">counts make word hops crisp</text>
  <rect x="598" y="252" width="4" height="18" fill="#ffd166"/>

  <rect x="58" y="584" width="1160" height="54" rx="10" fill="#1f3554"/>
  <text x="82" y="618" fill="#d7edff" font-family="monospace" font-size="18">Use the exact Vim motion shown. Counts work here too: 2w 3w 2j 2k.</text>
  `;
  writeFile(path.join(TMP_DIR, "drill-preview.svg"), svgShell({ width: 1280, height: 720, body }));
}

function buildBattleFrame(frameIndex) {
  const enemyX = [852, 860, 868, 860][frameIndex];
  const playerX = [224, 224, 220, 224][frameIndex];
  const vimOrbX = [400, 522, 672, 820][frameIndex];
  const flash = frameIndex >= 2 ? `<circle cx="${enemyX + 42}" cy="220" r="${24 + frameIndex * 6}" fill="rgba(255,236,170,0.48)"/>` : "";
  const body = `
  <rect width="960" height="540" fill="#102238"/>
  <rect x="0" y="0" width="960" height="360" fill="#b4e2ff"/>
  <rect x="0" y="200" width="960" height="160" fill="#78cb6a"/>
  <ellipse cx="760" cy="224" rx="118" ry="28" fill="rgba(16,22,32,0.18)"/>
  <ellipse cx="250" cy="336" rx="138" ry="36" fill="rgba(16,22,32,0.22)"/>
  <rect x="624" y="72" width="252" height="82" rx="8" fill="#fffdf5"/>
  <text x="646" y="100" fill="#13233b" font-family="monospace" font-size="18">Fizzbat</text>
  <text x="830" y="100" fill="#32425f" font-family="monospace" font-size="14">Lv 6</text>
  <rect x="736" y="114" width="112" height="10" rx="4" fill="#d7d1b8"/>
  <rect x="738" y="116" width="${82 - frameIndex * 10}" height="6" rx="3" fill="#5abf5a"/>

  <rect x="74" y="274" width="270" height="92" rx="8" fill="#fffdf5"/>
  <text x="96" y="304" fill="#13233b" font-family="monospace" font-size="18">Sproutle</text>
  <text x="292" y="304" fill="#32425f" font-family="monospace" font-size="14">Lv 5</text>
  <rect x="196" y="318" width="116" height="10" rx="4" fill="#d7d1b8"/>
  <rect x="198" y="320" width="90" height="6" rx="3" fill="#5abf5a"/>

  <image href="${rel("docs", "media", ".tmp", "fizzbat-idle.png")}" x="${enemyX}" y="150" width="84" height="84"/>
  <image href="${rel("docs", "media", ".tmp", "sproutle-idle.png")}" x="${playerX}" y="266" width="92" height="92"/>
  <circle cx="${vimOrbX}" cy="${[316, 270, 236, 216][frameIndex]}" r="10" fill="#fff7da" stroke="#17314b" stroke-width="4"/>
  <circle cx="${vimOrbX}" cy="${[316, 270, 236, 216][frameIndex]}" r="3" fill="#ff786d"/>
  ${flash}

  <rect x="22" y="394" width="916" height="126" rx="10" fill="#fffdf5"/>
  <rect x="592" y="408" width="330" height="92" rx="8" fill="#f2eedf"/>
  <rect x="606" y="420" width="144" height="28" rx="6" fill="#d8efff"/>
  <rect x="764" y="420" width="144" height="28" rx="6" fill="#fff3ca"/>
  <rect x="606" y="458" width="144" height="28" rx="6" fill="#f7f3ea"/>
  <rect x="764" y="458" width="144" height="28" rx="6" fill="#f7f3ea"/>
  <text x="120" y="438" fill="#13233b" font-family="monospace" font-size="20">Battle drill: use f then repeat with ;</text>
  <text x="120" y="470" fill="#32425f" font-family="monospace" font-size="16">Mini-drills resolve attacks, VimOrb throws, and heavy moves.</text>
  <text x="678" y="439" fill="#13233b" font-family="monospace" font-size="16" text-anchor="middle">a Attack</text>
  <text x="836" y="439" fill="#13233b" font-family="monospace" font-size="16" text-anchor="middle">f VimOrb</text>
  <text x="678" y="477" fill="#13233b" font-family="monospace" font-size="16" text-anchor="middle">dd Slam</text>
  <text x="836" y="477" fill="#13233b" font-family="monospace" font-size="16" text-anchor="middle">[ ] Switch</text>
  `;
  writeFile(path.join(TMP_DIR, `battle-preview-${frameIndex}.svg`), svgShell({ width: 960, height: 540, body }));
}

extractFrame("player.png", 96, 112, "player-idle.png");
extractFrame("sproutle.png", 80, 80, "sproutle-idle.png");
extractFrame("fizzbat.png", 80, 80, "fizzbat-idle.png");

buildOverworldSvg();
buildDrillSvg();
renderSvgToPng("overworld-preview.svg", "overworld-preview.png");
renderSvgToPng("drill-preview.svg", "drill-preview.png");

for (let index = 0; index < 4; index += 1) {
  buildBattleFrame(index);
  renderSvgToPng(`battle-preview-${index}.svg`, `.tmp/battle-preview-${index}.png`);
}

ffmpeg([
  "-framerate",
  "2",
  "-i",
  path.join(MEDIA_DIR, ".tmp", "battle-preview-%d.png"),
  "-vf",
  "fps=8,scale=960:-1:flags=neighbor",
  path.join(MEDIA_DIR, "battle-preview.gif"),
]);

process.stdout.write("README media built in docs/media\n");
