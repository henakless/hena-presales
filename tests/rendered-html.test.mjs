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
  assert.match(html, /Hena Kless · Enterprise Solutions Engineering/i);
  assert.match(html, /From complex requirements to/i);
  assert.match(html, /Bring me an enterprise problem/i);
  assert.match(html, /Choose or describe a scenario|Review the prepared scenario/i);
  assert.match(html, /Select the decision lens/i);
  assert.match(html, /Crisis communications/i);
  assert.match(html, /Regulated service AI/i);
  assert.match(html, /Pilot blocked by trust/i);
  assert.match(html, /Build grounded decision brief/i);
  assert.match(html, /primary identity stack are unavailable or no longer trusted/i);
  assert.match(html, /Server-side OpenAI/i);
  assert.match(html, /structured output/i);
  assert.match(html, /Keeping a Crisis Team Connected/i);
  assert.match(html, /Final network validation pending/i);
  assert.match(html, /Evidence, not claims/i);
  assert.doesNotMatch(html, /Governed enterprise agents/i);
  assert.doesNotMatch(html, /Staying with the value after the contract/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
