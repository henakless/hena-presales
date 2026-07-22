import assert from "node:assert/strict";
import test from "node:test";

async function worker() {
  process.env.OPENAI_API_KEY = "";
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("api-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: builtWorker } = await import(workerUrl.href);
  return builtWorker;
}

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

test("decision answer API returns a grounded fallback without a server key", async () => {
  const builtWorker = await worker();
  const response = await builtWorker.fetch(
    new Request("http://localhost/api/decision-answer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        caseId: "crisis-comms-v1",
        question: "What is the biggest hidden risk in this PoV?",
      }),
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);

  const payload = await response.json();
  assert.equal(payload.generation.mode, "fallback");
  assert.equal(payload.generation.validated, true);
  assert.equal(payload.generation.model, "gpt-5.6");
  assert.equal(payload.answer.evidence.length, 2);
  assert.match(payload.answer.recommendation.text, /hidden dependency/i);
  assert.ok(payload.answer.recommendation.sourceIds.length > 0);
  assert.ok(payload.answer.uncertainty.sourceIds.includes("pending-retest"));
});

test("decision answer API rejects arbitrary cases", async () => {
  const builtWorker = await worker();
  const response = await builtWorker.fetch(
    new Request("http://localhost/api/decision-answer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        caseId: "invented-case",
        question: "What should happen next?",
      }),
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unknown case." });
});

test("decision answer API rejects vague questions", async () => {
  const builtWorker = await worker();
  const response = await builtWorker.fetch(
    new Request("http://localhost/api/decision-answer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ caseId: "crisis-comms-v1", question: "Why?" }),
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /between 8 and 240/i);
});
