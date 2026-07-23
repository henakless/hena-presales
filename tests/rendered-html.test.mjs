import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the discovery experience without live AI", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Meet Hena · Discovery before the meeting/i);
  assert.match(html, /I built this experience so you can get to know me/i);
  assert.match(html, /super promising/i);
  assert.match(html, /Discovery starts before the meeting/i);
  assert.match(html, /Enton Price/i);
  assert.match(html, /Arkada Mobility/i);
  assert.match(html, /We’re looking for an AI tool for 6,000 people/i);
  assert.match(html, /Prepare me for the meeting/i);
  assert.match(html, /no AI, no external research/i);
  assert.doesNotMatch(html, /Ask the evidence/i);
  assert.doesNotMatch(html, /decision-answer/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
