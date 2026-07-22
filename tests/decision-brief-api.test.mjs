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

test("decision brief API returns the validated fallback without a server key", async () => {
  const builtWorker = await worker();
  const response = await builtWorker.fetch(
    new Request("http://localhost/api/decision-brief", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ caseId: "crisis-comms-v1" }),
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);

  const payload = await response.json();
  assert.equal(payload.generation.mode, "fallback");
  assert.equal(payload.generation.validated, true);
  assert.equal(payload.generation.model, "gpt-5.6-terra");
  assert.equal(payload.brief.successCriteria.length, 5);
  assert.equal(payload.brief.personalContribution.length, 4);
  assert.match(
    payload.brief.currentStatus.map((claim) => claim.text).join(" "),
    /not Closed Won/i,
  );

  const allClaims = [
    payload.brief.executiveSummary,
    ...payload.brief.businessValue,
    ...payload.brief.architectureDirection,
    ...payload.brief.successCriteria,
    ...payload.brief.trustReadiness,
    ...payload.brief.technicalTurningPoint,
    ...payload.brief.currentStatus,
    ...payload.brief.personalContribution,
    ...payload.brief.openQuestions,
  ];
  assert.ok(allClaims.every((claim) => claim.sourceIds.length > 0));
});

test("decision brief API rejects arbitrary cases", async () => {
  const builtWorker = await worker();
  const response = await builtWorker.fetch(
    new Request("http://localhost/api/decision-brief", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ caseId: "invented-case" }),
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unknown case." });
});

