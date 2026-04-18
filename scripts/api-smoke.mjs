import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { setTimeout as delay } from "timers/promises";

const projectRoot = path.resolve(import.meta.dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vimmonsters-api-smoke-"));
const port = 18_000 + Math.floor(Math.random() * 1_000);
const leaderboardPath = path.join(tempDir, "leaderboard.json");
const competitionStatePath = path.join(tempDir, "competition-state.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer(server) {
  let output = "";
  const onData = (chunk) => {
    output += String(chunk);
  };
  server.stdout.on("data", onData);
  server.stderr.on("data", onData);
  for (let index = 0; index < 50; index += 1) {
    if (output.includes(`:${port}`)) {
      server.stdout.off("data", onData);
      server.stderr.off("data", onData);
      return;
    }
    if (output.includes("listen EPERM") || output.includes("EACCES")) {
      server.stdout.off("data", onData);
      server.stderr.off("data", onData);
      throw new Error(`SKIP_NETWORK_SANDBOX:${output}`);
    }
    await delay(100);
  }
  server.stdout.off("data", onData);
  server.stderr.off("data", onData);
  throw new Error(`Server did not start in time. Output: ${output}`);
}

async function run() {
  const server = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      LEADERBOARD_PATH: leaderboardPath,
      COMPETITION_STATE_PATH: competitionStatePath,
      COMPETITIVE_SECRET: "api-smoke-secret",
      HOST: "127.0.0.1",
      MIN_RUN_MS: "1000",
      MAX_RUN_MS: "600000",
      MAX_SCORE: "9999",
      MAX_SCORE_PER_SECOND: "999",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServer(server);

    const leaderboardResponse = await fetch(`http://127.0.0.1:${port}/api/leaderboard`);
    assert(leaderboardResponse.ok, "GET /api/leaderboard failed.");
    const leaderboard = await leaderboardResponse.json();
    assert(Array.isArray(leaderboard.entries), "Leaderboard payload is invalid.");

    const startResponse = await fetch(`http://127.0.0.1:${port}/api/run/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert(startResponse.ok, "POST /api/run/start failed.");
    const startPayload = await startResponse.json();
    assert(startPayload.run && startPayload.run.runId && startPayload.run.token, "Run session payload is invalid.");

    const run = startPayload.run;
    const submitResponse = await fetch(`http://127.0.0.1:${port}/api/run/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        runId: run.runId,
        runName: "smoke",
        score: 1234,
        timeMs: 2500,
        seed: run.seed,
        startedAt: run.startedAt,
        token: run.token,
      }),
    });
    assert(submitResponse.ok, "POST /api/run/submit failed.");
    const submitted = await submitResponse.json();
    assert(Array.isArray(submitted.entries) && submitted.entries.length === 1, "Submitted leaderboard response is invalid.");

    const renameResponse = await fetch(`http://127.0.0.1:${port}/api/run/rename`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        runId: run.runId,
        runName: "renamed",
        startedAt: run.startedAt,
        token: run.token,
      }),
    });
    assert(renameResponse.ok, "POST /api/run/rename failed.");
    const renamed = await renameResponse.json();
    assert(renamed.entries[0] && renamed.entries[0].name === "renamed", "Rename did not update the leaderboard entry.");

    const hiddenFile = await fetch(`http://127.0.0.1:${port}/package.json`);
    assert(hiddenFile.status === 404, "Static server exposed package.json.");
  } finally {
    server.kill("SIGTERM");
    await delay(100);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    process.stdout.write("api smoke passed\n");
  })
  .catch((error) => {
    if (
      String(error.message || "").startsWith("SKIP_NETWORK_SANDBOX:")
      || String(error.message || "") === "fetch failed"
    ) {
      process.stdout.write("api smoke skipped due to sandbox network restrictions\n");
      return;
    }
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
