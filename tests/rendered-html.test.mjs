import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(html, /Meet Hena · I built this experience just for you/i);
  assert.match(html, /I built this experience just for you/i);
  assert.match(html, /background is in cybersecurity/i);
  assert.match(html, /super promising/i);
  assert.match(html, /Discovery starts before the meeting/i);
  assert.match(html, /Entor Price/i);
  assert.match(html, /Paige Turner/i);
  assert.match(html, /Al Gorithm/i);
  assert.match(html, /Prompt &amp; Circumstance Consulting/i);
  assert.match(html, /Model Citizens Bank/i);
  assert.match(html, /Token Transit Group/i);
  assert.match(html, /We’re looking for an AI tool for 6,000 people/i);
  assert.match(html, /Prepare me for the meeting/i);
  assert.match(html, /Download the full CV/i);
  assert.match(html, /most talented Pre-Sales consultant/i);
  assert.match(html, /mario-platt-linkedin-reference\.jpg/i);
  assert.doesNotMatch(html, /Paraphrased from memory|replace this paraphrase/i);
  assert.doesNotMatch(html, /Ask the evidence/i);
  assert.doesNotMatch(html, /decision-answer/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);

  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /Executive summary/i);
  assert.match(pageSource, /Person information/i);
  assert.match(pageSource, /Company information/i);
  assert.match(pageSource, /How OpenAI is relevant/i);
  assert.match(pageSource, /Regulatory & compliance/i);
  assert.match(pageSource, /Risks to qualify/i);
  assert.match(pageSource, /Best discovery questions/i);
});
