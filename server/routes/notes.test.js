import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { test } from "node:test";
import { createNotesRouter } from "./notes.js";

const supabase = {
  auth: {
    getUser: async (token) => token === "valid-token"
      ? { data: { user: { id: "user-1" } }, error: null }
      : { data: { user: null }, error: new Error("Invalid token") },
  },
};

async function withNotesApi(options, run) {
  const app = express();
  app.use(express.json());
  app.use("/api/notes", createNotesRouter(options));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

function openAiResponse(result) {
  return new Response(JSON.stringify({
    choices: [{ message: { content: result } }],
  }), { headers: { "Content-Type": "application/json" } });
}

async function postAction(baseUrl, action, note = "A note", token = "valid-token") {
  return fetch(`${baseUrl}/api/notes/${action}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ note }),
  });
}

test("rejects missing and invalid Supabase tokens before calling OpenAI", async () => {
  let openAiCalls = 0;
  await withNotesApi({
    supabase,
    apiKey: "test-key",
    fetchImpl: async () => {
      openAiCalls += 1;
      return openAiResponse("Rewritten note");
    },
  }, async (baseUrl) => {
    const missingToken = await postAction(baseUrl, "rewrite", "A note", null);
    assert.equal(missingToken.status, 401);
    const invalidToken = await postAction(baseUrl, "rewrite", "A note", "invalid-token");
    assert.equal(invalidToken.status, 401);
    assert.equal(openAiCalls, 0);
  });
});

test("sends a rewrite to OpenAI using the server key and returns its result", async () => {
  let request;
  await withNotesApi({
    supabase,
    apiKey: "test-key",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return openAiResponse("A clearer note.");
    },
  }, async (baseUrl) => {
    const response = await postAction(baseUrl, "rewrite", "Original note");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { result: "A clearer note." });
    assert.equal(request.url, "https://api.openai.com/v1/chat/completions");
    assert.equal(request.options.headers.Authorization, "Bearer test-key");
    assert.equal(request.options.body.includes("Original note"), true);
  });
});

test("rejects oversized notes before calling OpenAI", async () => {
  let openAiCalls = 0;
  await withNotesApi({
    supabase,
    apiKey: "test-key",
    fetchImpl: async () => {
      openAiCalls += 1;
      return openAiResponse("unused");
    },
  }, async (baseUrl) => {
    const response = await postAction(baseUrl, "summarize", "x".repeat(20_001));
    assert.equal(response.status, 413);
    assert.equal(openAiCalls, 0);
  });
});

test("limits each account to 20 requests per 15-minute window", async () => {
  await withNotesApi({
    supabase,
    apiKey: "test-key",
    fetchImpl: async () => openAiResponse("Summary"),
  }, async (baseUrl) => {
    for (let request = 0; request < 20; request += 1) {
      assert.equal((await postAction(baseUrl, "summarize")).status, 200);
    }

    const response = await postAction(baseUrl, "summarize");
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "900");
  });
});

test("reports a missing OpenAI key without making a provider request", async () => {
  let openAiCalls = 0;
  await withNotesApi({
    supabase,
    apiKey: "",
    fetchImpl: async () => {
      openAiCalls += 1;
      return openAiResponse("unused");
    },
  }, async (baseUrl) => {
    const response = await postAction(baseUrl, "summarize");
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /OPENAI_API_KEY/);
    assert.equal(openAiCalls, 0);
  });
});
