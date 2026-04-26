import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const PORT = Number(process.env.PORT || 8002);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const LEADERBOARD_PATH = path.resolve(process.env.LEADERBOARD_PATH || path.join(ROOT, "leaderboard.json"));
const COMPETITION_STATE_PATH = path.resolve(
  process.env.COMPETITION_STATE_PATH || path.join(path.dirname(LEADERBOARD_PATH), "competition-state.json")
);
const COMPETITIVE_SECRET = process.env.COMPETITIVE_SECRET || "dev-only-change-me";
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 8 * 1024);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const START_LIMIT = Number(process.env.START_LIMIT || 30);
const SUBMIT_LIMIT = Number(process.env.SUBMIT_LIMIT || 20);
const RENAME_LIMIT = Number(process.env.RENAME_LIMIT || 20);
const MIN_RUN_MS = Number(process.env.MIN_RUN_MS || 60_000);
const MAX_RUN_MS = Number(process.env.MAX_RUN_MS || 3 * 60 * 60 * 1000);
const MAX_SCORE = Number(process.env.MAX_SCORE || 7000);
const MAX_SCORE_PER_SECOND = Number(process.env.MAX_SCORE_PER_SECOND || 35);
const RUN_SUBMIT_DRIFT_MS = Number(process.env.RUN_SUBMIT_DRIFT_MS || 30_000);
const USED_RUN_RETENTION_MS = Number(process.env.USED_RUN_RETENTION_MS || 7 * 24 * 60 * 60 * 1000);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

const PUBLIC_FILES = new Set(["/index.html"]);
const PUBLIC_PREFIXES = ["/src/", "/assets/", "/docs/media/"];
const rateLimitBuckets = new Map();

if (process.env.NODE_ENV === "production" && COMPETITIVE_SECRET === "dev-only-change-me") {
  process.stderr.write("Warning: COMPETITIVE_SECRET is using the development default.\n");
}

function securityHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

function sendJson(response, statusCode, payload, extraHeaders) {
  response.writeHead(statusCode, securityHeaders({
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  }));
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(response, statusCode, text, extraHeaders) {
  response.writeHead(statusCode, securityHeaders({
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  }));
  response.end(text);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";
    let settled = false;
    request.on("data", (chunk) => {
      if (settled) {
        return;
      }
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error("BODY_TOO_LARGE"));
        return;
      }
      body += chunk;
    });
    request.on("end", () => {
      if (settled) {
        return;
      }
      try {
        settled = true;
        resolve(JSON.parse(body || "{}"));
      } catch {
        settled = true;
        reject(new Error("INVALID_JSON"));
      }
    });
    request.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    });
  });
}

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return request.socket.remoteAddress || "unknown";
}

function enforceRateLimit(request, bucketName, limit) {
  const now = Date.now();
  const key = `${bucketName}:${clientIp(request)}`;
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= limit) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function ensureJsonRequest(request, response) {
  const type = String(request.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (type && type !== "application/json") {
    sendJson(response, 415, { error: "Content-Type must be application/json." });
    return false;
  }
  return true;
}

function normalizeLeaderboardEntry(entry) {
  if (!entry || !Number.isFinite(entry.score) || !Number.isFinite(entry.timeMs)) {
    return null;
  }
  return {
    id: String(entry.id || `${entry.seed || "seed"}-${entry.timeMs}-${entry.score}`),
    name: String(entry.name || "anon").replace(/\s+/g, " ").trim().slice(0, 20) || "anon",
    score: Math.max(0, Math.floor(entry.score)),
    timeMs: Math.max(0, Math.floor(entry.timeMs)),
    seed: Number.isFinite(entry.seed) ? Math.floor(entry.seed) : 0,
  };
}

function sortLeaderboard(entries) {
  return entries
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.timeMs - right.timeMs;
    })
    .slice(0, 10);
}

function readLeaderboardData() {
  try {
    const raw = fs.readFileSync(LEADERBOARD_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.map(normalizeLeaderboardEntry).filter(Boolean)
        : [],
    };
  } catch {
    return { entries: [] };
  }
}

function writeLeaderboardEntries(entries) {
  fs.mkdirSync(path.dirname(LEADERBOARD_PATH), { recursive: true });
  const clean = sortLeaderboard(entries.map(normalizeLeaderboardEntry).filter(Boolean));
  fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify({ entries: clean }, null, 2));
  return clean;
}

function readCompetitionState() {
  try {
    const raw = fs.readFileSync(COMPETITION_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.usedRuns && typeof parsed.usedRuns === "object"
      ? parsed
      : { usedRuns: {} };
  } catch {
    return { usedRuns: {} };
  }
}

function writeCompetitionState(state) {
  fs.mkdirSync(path.dirname(COMPETITION_STATE_PATH), { recursive: true });
  fs.writeFileSync(COMPETITION_STATE_PATH, JSON.stringify(state, null, 2));
}

function pruneCompetitionState(state) {
  const now = Date.now();
  Object.keys(state.usedRuns || {}).forEach((runId) => {
    if (now - state.usedRuns[runId] > USED_RUN_RETENTION_MS) {
      delete state.usedRuns[runId];
    }
  });
}

function signRun(runId, seed, startedAt) {
  const hmac = crypto.createHmac("sha256", COMPETITIVE_SECRET);
  hmac.update(`${runId}.${seed}.${startedAt}`);
  return hmac.digest("hex");
}

function issueRun() {
  const runId = crypto.randomUUID();
  const seed = crypto.randomInt(1, 2_147_483_647);
  const startedAt = Date.now();
  return {
    runId,
    seed,
    startedAt,
    token: signRun(runId, seed, startedAt),
  };
}

function verifyRunTicket(runId, seed, startedAt, token) {
  if (!runId || !Number.isFinite(seed) || !Number.isFinite(startedAt) || typeof token !== "string") {
    return false;
  }
  const expected = signRun(runId, seed, startedAt);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

function parseRunToken(token) {
  if (typeof token !== "string") {
    return null;
  }
  return token;
}

function parseSubmittedRun(body) {
  const runId = typeof body.runId === "string" ? body.runId.trim() : "";
  const token = parseRunToken(body.token);
  const score = Number(body.score);
  const timeMs = Number(body.timeMs);
  const seed = Number(body.seed);
  const runName = String(body.runName || "anon").replace(/\s+/g, " ").trim().slice(0, 20) || "anon";
  const startedAt = Number(body.startedAt);

  if (!runId || !token || !Number.isFinite(score) || !Number.isFinite(timeMs) || !Number.isFinite(seed) || !Number.isFinite(startedAt)) {
    return null;
  }

  return {
    runId,
    token,
    score: Math.floor(score),
    timeMs: Math.floor(timeMs),
    seed: Math.floor(seed),
    runName,
    startedAt: Math.floor(startedAt),
  };
}

function validateSubmittedRun(run) {
  if (run.score < 0 || run.score > MAX_SCORE) {
    return "Score is outside the accepted range.";
  }
  if (run.timeMs < MIN_RUN_MS) {
    return "Run time is too short to be accepted.";
  }
  if (run.timeMs > MAX_RUN_MS) {
    return "Run time is too long to be accepted.";
  }
  if (run.timeMs > (Date.now() - run.startedAt) + RUN_SUBMIT_DRIFT_MS) {
    return "Run time does not match the issued run ticket.";
  }
  const pointsPerSecond = run.score / Math.max(1, run.timeMs / 1000);
  if (pointsPerSecond > MAX_SCORE_PER_SECOND) {
    return "Run score is outside the accepted scoring envelope.";
  }
  return "";
}

function upsertLeaderboardEntry(entry) {
  const current = readLeaderboardData();
  const next = current.entries.filter((item) => item.id !== entry.id);
  next.push(entry);
  return writeLeaderboardEntries(next);
}

function renameLeaderboardEntry(runId, runName) {
  const current = readLeaderboardData();
  const next = current.entries.map((entry) => {
    if (entry.id !== runId) {
      return entry;
    }
    return {
      ...entry,
      name: runName,
    };
  });
  return writeLeaderboardEntries(next);
}

function isPublicPath(pathname) {
  if (PUBLIC_FILES.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function serveFile(request, response, pathname) {
  if (!isPublicPath(pathname) || pathname.includes("/.") || pathname.includes("..")) {
    sendText(response, 404, "Not found");
    return;
  }

  const safePath = path.normalize(path.join(ROOT, pathname));
  if (!safePath.startsWith(ROOT)) {
    sendText(response, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
    sendText(response, 404, "Not found");
    return;
  }

  const ext = path.extname(safePath).toLowerCase();
  const cacheControl = pathname.startsWith("/assets/") || pathname.startsWith("/docs/media/")
    ? "public, max-age=31536000, immutable"
    : pathname.startsWith("/src/")
      ? "public, max-age=300"
      : "no-store";
  response.writeHead(200, securityHeaders({
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    "Cache-Control": cacheControl,
  }));
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(safePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");

  if (!["GET", "HEAD", "POST"].includes(request.method || "")) {
    sendJson(response, 405, { error: "Method not allowed." }, { Allow: "GET, HEAD, POST" });
    return;
  }

  if (url.pathname === "/api/leaderboard" && request.method === "GET") {
    sendJson(response, 200, { entries: readLeaderboardData().entries });
    return;
  }

  if (url.pathname === "/api/run/start" && request.method === "POST") {
    if (!enforceRateLimit(request, "start", START_LIMIT)) {
      sendJson(response, 429, { error: "Too many run starts. Slow down." });
      return;
    }
    if (!ensureJsonRequest(request, response)) {
      return;
    }
    try {
      await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.message === "BODY_TOO_LARGE" ? 413 : 400, {
        error: error.message === "BODY_TOO_LARGE" ? "Request body too large." : "Invalid JSON payload.",
      });
      return;
    }
    sendJson(response, 200, { run: issueRun() });
    return;
  }

  if (url.pathname === "/api/run/submit" && request.method === "POST") {
    if (!enforceRateLimit(request, "submit", SUBMIT_LIMIT)) {
      sendJson(response, 429, { error: "Too many run submissions. Slow down." });
      return;
    }
    if (!ensureJsonRequest(request, response)) {
      return;
    }
    let payload;
    try {
      payload = parseSubmittedRun(await readJsonBody(request));
    } catch (error) {
      sendJson(response, error.message === "BODY_TOO_LARGE" ? 413 : 400, {
        error: error.message === "BODY_TOO_LARGE" ? "Request body too large." : "Invalid JSON payload.",
      });
      return;
    }
    if (!payload) {
      sendJson(response, 400, { error: "Run submission is missing required fields." });
      return;
    }
    if (!verifyRunTicket(payload.runId, payload.seed, payload.startedAt, payload.token)) {
      sendJson(response, 403, { error: "Run ticket verification failed." });
      return;
    }
    const validationError = validateSubmittedRun(payload);
    if (validationError) {
      sendJson(response, 422, { error: validationError });
      return;
    }
    const competitionState = readCompetitionState();
    pruneCompetitionState(competitionState);
    if (competitionState.usedRuns[payload.runId]) {
      sendJson(response, 409, { error: "This run ticket was already submitted." });
      return;
    }
    competitionState.usedRuns[payload.runId] = Date.now();
    writeCompetitionState(competitionState);

    const entries = upsertLeaderboardEntry({
      id: payload.runId,
      name: payload.runName,
      score: payload.score,
      timeMs: payload.timeMs,
      seed: payload.seed,
    });
    sendJson(response, 200, { entries });
    return;
  }

  if (url.pathname === "/api/run/rename" && request.method === "POST") {
    if (!enforceRateLimit(request, "rename", RENAME_LIMIT)) {
      sendJson(response, 429, { error: "Too many rename requests. Slow down." });
      return;
    }
    if (!ensureJsonRequest(request, response)) {
      return;
    }
    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.message === "BODY_TOO_LARGE" ? 413 : 400, {
        error: error.message === "BODY_TOO_LARGE" ? "Request body too large." : "Invalid JSON payload.",
      });
      return;
    }
    const runId = typeof payload.runId === "string" ? payload.runId.trim() : "";
    const runName = String(payload.runName || "anon").replace(/\s+/g, " ").trim().slice(0, 20) || "anon";
    const token = typeof payload.token === "string" ? payload.token : "";
    const startedAt = Number(payload.startedAt);
    const leaderboard = readLeaderboardData();
    const existing = leaderboard.entries.find((entry) => entry.id === runId);
    if (!existing) {
      sendJson(response, 404, { error: "Run not found on the leaderboard." });
      return;
    }
    if (!verifyRunTicket(runId, existing.seed, startedAt, token)) {
      sendJson(response, 403, { error: "Run ticket verification failed." });
      return;
    }
    const entries = renameLeaderboardEntry(runId, runName);
    sendJson(response, 200, { entries });
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "Unknown API route." });
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed." }, { Allow: "GET, HEAD" });
    return;
  }

  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  serveFile(request, response, pathname);
});

server.requestTimeout = 10_000;
server.headersTimeout = 10_000;

server.listen(PORT, HOST, () => {
  process.stdout.write(`VimMonsters Academy running at http://${HOST}:${PORT}\n`);
});
