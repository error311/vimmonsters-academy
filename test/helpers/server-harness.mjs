import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

function randomPort() {
  return 19_000 + Math.floor(Math.random() * 2_000);
}

async function waitForServer(server, port) {
  let output = "";
  const onData = (chunk) => {
    output += String(chunk);
  };

  server.stdout.on("data", onData);
  server.stderr.on("data", onData);

  try {
    for (let index = 0; index < 100; index += 1) {
      if (output.includes(`:${port}`)) {
        return;
      }
      if (server.exitCode !== null) {
        throw new Error(`Server exited before startup. Output: ${output}`);
      }
      await delay(50);
    }
    throw new Error(`Server did not start in time. Output: ${output}`);
  } finally {
    server.stdout.off("data", onData);
    server.stderr.off("data", onData);
  }
}

export async function startServer(options = {}) {
  const port = options.port || randomPort();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vimmonsters-api-test-"));
  const leaderboardPath = path.join(tempDir, "leaderboard.json");
  const competitionStatePath = path.join(tempDir, "competition-state.json");
  const env = {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    LEADERBOARD_PATH: leaderboardPath,
    COMPETITION_STATE_PATH: competitionStatePath,
    COMPETITIVE_SECRET: "api-test-secret",
    MIN_RUN_MS: "1000",
    MAX_RUN_MS: "600000",
    MAX_SCORE: "9999",
    MAX_SCORE_PER_SECOND: "999",
    ...options.env,
  };

  const server = spawn(process.execPath, ["server.js"], {
    cwd: options.projectRoot || path.resolve(import.meta.dirname, "../.."),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  await waitForServer(server, port);

  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(pathname, init = {}) {
    return fetch(`${baseUrl}${pathname}`, init);
  }

  async function json(pathname, init = {}) {
    const response = await request(pathname, init);
    const payload = await response.json().catch(() => null);
    return { response, payload };
  }

  async function startRun(init = {}) {
    return json("/api/run/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      body: init.body === undefined ? JSON.stringify({}) : init.body,
    });
  }

  async function submitRun(run, init = {}) {
    return json("/api/run/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      body: init.body === undefined ? JSON.stringify(run) : init.body,
    });
  }

  async function renameRun(run, init = {}) {
    return json("/api/run/rename", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      body: init.body === undefined ? JSON.stringify(run) : init.body,
    });
  }

  async function stop() {
    if (server.exitCode === null) {
      server.kill("SIGTERM");
      await Promise.race([
        once(server, "exit"),
        delay(1000),
      ]);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return {
    baseUrl,
    tempDir,
    leaderboardPath,
    competitionStatePath,
    env,
    request,
    json,
    startRun,
    submitRun,
    renameRun,
    stop,
  };
}

export async function withServer(options, callback) {
  const harness = await startServer(options);
  try {
    return await callback(harness);
  } finally {
    await harness.stop();
  }
}
