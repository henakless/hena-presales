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

test("server-renders the application experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Hena Kless · Solutions Engineering for Applied AI/i);
  assert.match(html, /I make complex AI decisions easier to trust/i);
  assert.match(html, /One question\. One grounded answer/i);
  assert.match(html, /Ask a decision question about this case/i);
  assert.match(html, /Ask the evidence/i);
  assert.match(html, /AI can interpret and recommend\. It cannot add facts/i);
  assert.match(html, /Microsoft-independent crisis communications/i);
  assert.match(html, /What remains unknown/i);
  assert.match(html, /Final network validation remains pending/i);
  assert.match(html, /Keeping a crisis team connected/i);
  assert.doesNotMatch(html, /Select the decision lens/i);
  assert.doesNotMatch(html, /Build grounded decision brief/i);
  assert.doesNotMatch(html, /Regulated service AI/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
