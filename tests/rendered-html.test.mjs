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

const MOCK_BRIEFING = {
  executiveSummary: "A focused discovery summary.",
  person: {
    authority: "Likely technical sponsor; budget ownership must be validated.",
    priorities: ["Developer velocity", "Operational resilience", "Secure knowledge access"],
    unknowns: ["Economic buyer", "Security approval owner"],
  },
  company: {
    profile: "A fictional global logistics operator.",
    noteworthyEvents: ["Modernization program", "Contract backlog", "Operations refresh"],
  },
  openaiRelevance: {
    motion: "API Platform + agentic workflows",
    rationale: "The workflows are integrated and operational.",
    workflows: ["Operations copilot", "Contract intake", "Multilingual service"],
  },
  compliance: ["Data residency", "Access controls", "Human oversight"],
  risks: ["Data quality", "Unclear baseline", "Operational ownership"],
  discoveryQuestions: [
    "What changed now?",
    "Who owns the outcome?",
    "What is the baseline?",
    "Which data is trusted?",
    "Where is human approval required?",
    "What decides a successful pilot?",
  ],
};

test("server-renders the AI discovery experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Meet Hena · I built this experience just for you/i);
  assert.match(html, /I built this experience just for you/i);
  assert.match(html, /hena-kless-portrait\.png/i);
  assert.match(html, /Curiosity gets me to the problem worth solving/i);
  assert.match(html, /background in cybersecurity taught me/i);
  assert.match(html, /super promising/i);
  assert.doesNotMatch(html, /SUPER PROMISING/);
  assert.match(html, /great, qualified lead with a proper briefing/i);
  assert.match(html, /Discovery starts before the meeting/i);
  assert.match(html, /Help create the lead that came in through the website/i);
  assert.match(html, /OpenAI will generate a fresh, seven-part briefing/i);
  assert.match(html, /Entor Price/i);
  assert.match(html, /Paige Turner/i);
  assert.match(html, /Al Gorithm/i);
  assert.match(html, /Prompt &amp; Circumstance Consulting/i);
  assert.match(html, /Model Citizens Bank/i);
  assert.match(html, /Token Transit Group/i);
  assert.match(html, /We’re looking for an AI tool for 6,000 people/i);
  assert.match(html, /Get the briefing you deserve/i);
  assert.match(html, /A brief summary of/i);
  assert.match(html, /Hena Kless\./i);
  assert.match(html, /President’s Club/i);
  assert.match(html, /Download the full CV/i);
  assert.match(html, /best person for the job/i);
  assert.match(html, /Mario Platt/i);
  assert.match(html, /Chief Information Security Officer at LastPass/i);
  assert.doesNotMatch(html, /at the time of posting/i);
  assert.match(html, /mario-platt-linkedin-reference\.jpg/i);
  assert.match(html, /Let’s chat! I’d love to work together/i);
  assert.doesNotMatch(html, /€542K|ARR contribution in 2024/i);
  assert.doesNotMatch(html, /Paraphrased from memory|replace this paraphrase/i);
  assert.doesNotMatch(html, /Ask the evidence/i);
  assert.doesNotMatch(html, /decision-answer/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);

  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /fetch\("\/api\/briefing"/i);
  assert.match(pageSource, /Executive summary/i);
  assert.match(pageSource, /Person information/i);
  assert.match(pageSource, /Company information/i);
  assert.match(pageSource, /How OpenAI is relevant/i);
  assert.match(pageSource, /Regulatory & compliance/i);
  assert.match(pageSource, /Risks to qualify/i);
  assert.match(pageSource, /Best discovery questions/i);
  assert.match(pageSource, /walk into the meeting with/i);
  assert.match(pageSource, /<h2>A brief summary of <span>Hena Kless\.<\/span><\/h2>/i);
  const credentialsIndex = pageSource.indexOf("<h3>Credentials</h3>");
  const communityIndex = pageSource.indexOf("<h3>Community</h3>");
  const educationIndex = pageSource.indexOf("<h3>Education</h3>");
  assert.ok(credentialsIndex < communityIndex && communityIndex < educationIndex);
});

test("generates a structured briefing through the server endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.openai.com/v1/responses");
    assert.equal(init?.method, "POST");
    const requestBody = JSON.parse(String(init?.body));
    assert.equal(requestBody.model, "gpt-5.6-terra");
    assert.equal(requestBody.store, false);
    assert.equal(requestBody.text.format.type, "json_schema");
    assert.equal(requestBody.text.format.strict, true);

    return Response.json({
      model: "gpt-5.6-terra",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(MOCK_BRIEFING) }],
        },
      ],
    });
  };

  try {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("api-test", `${process.pid}-${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);
    const response = await worker.fetch(
      new Request("http://localhost/api/briefing", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({
          contactId: "entor",
          companyId: "token",
          message: "We need an AI platform for 6,000 employees.",
        }),
      }),
      {
        OPENAI_API_KEY: "test-key",
        ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      },
      { waitUntil() {}, passThroughOnException() {} },
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.briefing, MOCK_BRIEFING);
    assert.equal(body.model, "gpt-5.6-terra");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  }
});

test("normalizes discovery questions that arrive serialized inside one item", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";

  const malformedQuestions = [
    "What changed now?",
    "Who owns the outcome?",
    "What is the baseline?",
    "Which data is trusted?",
    "Where is human approval required?",
    'For employee support, what must escalate?", "For engineering, which tools are in scope?", "What outcome would justify expansion?"]}',
  ];

  globalThis.fetch = async () =>
    Response.json({
      model: "gpt-5.6-terra",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ ...MOCK_BRIEFING, discoveryQuestions: malformedQuestions }),
            },
          ],
        },
      ],
    });

  try {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("normalization-test", `${process.pid}-${Date.now()}`);
    const { default: worker } = await import(workerUrl.href);
    const response = await worker.fetch(
      new Request("http://localhost/api/briefing", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
        body: JSON.stringify({
          contactId: "entor",
          companyId: "token",
          message: "We need an AI platform for 6,000 employees.",
        }),
      }),
      {
        OPENAI_API_KEY: "test-key",
        ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      },
      { waitUntil() {}, passThroughOnException() {} },
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.briefing.discoveryQuestions, [
      "What changed now?",
      "Who owns the outcome?",
      "What is the baseline?",
      "Which data is trusted?",
      "Where is human approval required?",
      "For employee support, what must escalate?",
      "For engineering, which tools are in scope?",
    ]);
    assert.doesNotMatch(body.briefing.discoveryQuestions.join(" "), /[\[\]{}]|\"\s*,\s*\"/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  }
});
