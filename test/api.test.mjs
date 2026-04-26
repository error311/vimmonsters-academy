import assert from "node:assert/strict";
import test from "node:test";

import { withServer } from "./helpers/server-harness.mjs";

async function issueRun(harness) {
  const { response, payload } = await harness.startRun();
  assert.equal(response.status, 200);
  assert(payload.run);
  return payload.run;
}

function validSubmission(run, overrides = {}) {
  return {
    runId: run.runId,
    runName: "smoke",
    score: 1234,
    timeMs: 2500,
    seed: run.seed,
    startedAt: run.startedAt,
    token: run.token,
    ...overrides,
  };
}

test("POST /api/run/start rejects the wrong content type", async () => {
  await withServer({}, async (harness) => {
    const { response, payload } = await harness.json("/api/run/start", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });

    assert.equal(response.status, 415);
    assert.equal(payload.error, "Content-Type must be application/json.");
  });
});

test("POST /api/run/start rejects invalid JSON", async () => {
  await withServer({}, async (harness) => {
    const { response, payload } = await harness.startRun({
      body: "{bad-json",
    });

    assert.equal(response.status, 400);
    assert.equal(payload.error, "Invalid JSON payload.");
  });
});

test("POST /api/run/start rejects oversized bodies", async () => {
  await withServer({ env: { MAX_BODY_BYTES: "16" } }, async (harness) => {
    const { response, payload } = await harness.startRun({
      body: JSON.stringify({ long: "this body is definitely too large" }),
    });

    assert.equal(response.status, 413);
    assert.equal(payload.error, "Request body too large.");
  });
});

test("POST /api/run/submit rejects missing required fields", async () => {
  await withServer({}, async (harness) => {
    const { response, payload } = await harness.submitRun({ runId: "missing-fields" });

    assert.equal(response.status, 400);
    assert.equal(payload.error, "Run submission is missing required fields.");
  });
});

test("POST /api/run/submit rejects a bad token", async () => {
  await withServer({}, async (harness) => {
    const run = await issueRun(harness);
    const { response, payload } = await harness.submitRun(validSubmission(run, {
      token: "definitely-wrong",
    }));

    assert.equal(response.status, 403);
    assert.equal(payload.error, "Run ticket verification failed.");
  });
});

test("POST /api/run/submit rejects too-short runs", async () => {
  await withServer({}, async (harness) => {
    const run = await issueRun(harness);
    const { response, payload } = await harness.submitRun(validSubmission(run, {
      timeMs: 500,
    }));

    assert.equal(response.status, 422);
    assert.equal(payload.error, "Run time is too short to be accepted.");
  });
});

test("POST /api/run/submit rejects too-long runs", async () => {
  await withServer({}, async (harness) => {
    const run = await issueRun(harness);
    const { response, payload } = await harness.submitRun(validSubmission(run, {
      timeMs: 700_000,
    }));

    assert.equal(response.status, 422);
    assert.equal(payload.error, "Run time is too long to be accepted.");
  });
});

test("POST /api/run/submit rejects scores outside the accepted range", async () => {
  await withServer({ env: { MAX_SCORE: "500" } }, async (harness) => {
    const run = await issueRun(harness);
    const { response, payload } = await harness.submitRun(validSubmission(run, {
      score: 600,
    }));

    assert.equal(response.status, 422);
    assert.equal(payload.error, "Score is outside the accepted range.");
  });
});

test("POST /api/run/submit rejects scores outside the scoring envelope", async () => {
  await withServer({ env: { MAX_SCORE_PER_SECOND: "10" } }, async (harness) => {
    const run = await issueRun(harness);
    const { response, payload } = await harness.submitRun(validSubmission(run, {
      score: 500,
      timeMs: 2_000,
    }));

    assert.equal(response.status, 422);
    assert.equal(payload.error, "Run score is outside the accepted scoring envelope.");
  });
});

test("POST /api/run/submit rejects time values that do not match the issued ticket", async () => {
  await withServer({ env: { RUN_SUBMIT_DRIFT_MS: "0" } }, async (harness) => {
    const run = await issueRun(harness);
    const { response, payload } = await harness.submitRun(validSubmission(run, {
      timeMs: 5_000,
    }));

    assert.equal(response.status, 422);
    assert.equal(payload.error, "Run time does not match the issued run ticket.");
  });
});

test("POST /api/run/submit rejects duplicate submissions for the same run ticket", async () => {
  await withServer({}, async (harness) => {
    const run = await issueRun(harness);
    const submission = validSubmission(run);

    const first = await harness.submitRun(submission);
    assert.equal(first.response.status, 200);

    const second = await harness.submitRun(submission);
    assert.equal(second.response.status, 409);
    assert.equal(second.payload.error, "This run ticket was already submitted.");
  });
});

test("POST /api/run/rename rejects runs that are not on the leaderboard", async () => {
  await withServer({}, async (harness) => {
    const run = await issueRun(harness);
    const { response, payload } = await harness.renameRun({
      runId: run.runId,
      runName: "renamed",
      startedAt: run.startedAt,
      token: run.token,
    });

    assert.equal(response.status, 404);
    assert.equal(payload.error, "Run not found on the leaderboard.");
  });
});

test("POST /api/run/rename rejects the wrong token", async () => {
  await withServer({}, async (harness) => {
    const run = await issueRun(harness);
    const submitted = await harness.submitRun(validSubmission(run));
    assert.equal(submitted.response.status, 200);

    const { response, payload } = await harness.renameRun({
      runId: run.runId,
      runName: "renamed",
      startedAt: run.startedAt,
      token: "wrong-token",
    });

    assert.equal(response.status, 403);
    assert.equal(payload.error, "Run ticket verification failed.");
  });
});

test("rate limiting rejects too many run starts", async () => {
  await withServer({ env: { START_LIMIT: "1", RATE_LIMIT_WINDOW_MS: "60000" } }, async (harness) => {
    const first = await harness.startRun();
    assert.equal(first.response.status, 200);

    const second = await harness.startRun();
    assert.equal(second.response.status, 429);
    assert.equal(second.payload.error, "Too many run starts. Slow down.");
  });
});

test("rate limiting rejects too many run submissions", async () => {
  await withServer({ env: { SUBMIT_LIMIT: "1", RATE_LIMIT_WINDOW_MS: "60000" } }, async (harness) => {
    const runA = await issueRun(harness);
    const first = await harness.submitRun(validSubmission(runA));
    assert.equal(first.response.status, 200);

    const runB = await issueRun(harness);
    const second = await harness.submitRun(validSubmission(runB, { runName: "two" }));
    assert.equal(second.response.status, 429);
    assert.equal(second.payload.error, "Too many run submissions. Slow down.");
  });
});

test("rate limiting rejects too many renames", async () => {
  await withServer({ env: { RENAME_LIMIT: "1", RATE_LIMIT_WINDOW_MS: "60000" } }, async (harness) => {
    const run = await issueRun(harness);
    const submitted = await harness.submitRun(validSubmission(run));
    assert.equal(submitted.response.status, 200);

    const first = await harness.renameRun({
      runId: run.runId,
      runName: "one",
      startedAt: run.startedAt,
      token: run.token,
    });
    assert.equal(first.response.status, 200);

    const second = await harness.renameRun({
      runId: run.runId,
      runName: "two",
      startedAt: run.startedAt,
      token: run.token,
    });
    assert.equal(second.response.status, 429);
    assert.equal(second.payload.error, "Too many rename requests. Slow down.");
  });
});

test("static serving still blocks package.json", async () => {
  await withServer({}, async (harness) => {
    const response = await harness.request("/package.json");
    const text = await response.text();

    assert.equal(response.status, 404);
    assert.equal(text, "Not found");
  });
});

test("unknown API routes return 404", async () => {
  await withServer({}, async (harness) => {
    const { response, payload } = await harness.json("/api/unknown");

    assert.equal(response.status, 404);
    assert.equal(payload.error, "Unknown API route.");
  });
});

test("unsupported methods return 405", async () => {
  await withServer({}, async (harness) => {
    const { response, payload } = await harness.json("/api/leaderboard", {
      method: "PUT",
    });

    assert.equal(response.status, 405);
    assert.equal(payload.error, "Method not allowed.");
  });
});
