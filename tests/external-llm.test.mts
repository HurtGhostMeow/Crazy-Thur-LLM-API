import test from "node:test";
import assert from "node:assert/strict";
import {
  EXTERNAL_LLM_SYSTEM_PROMPT,
  fetchExternalChat,
  parseCompletionPayload,
  prepareExternalMessages,
  readExternalLlmConfig,
  rewriteExternalSse,
} from "../lib/external-llm.ts";

test("external mode stays disabled without URL and model", () => {
  assert.deepEqual(readExternalLlmConfig({}), { config: null });
});

test("configuration normalizes an OpenAI-compatible endpoint", () => {
  const result = readExternalLlmConfig({
    LLM_API_BASE_URL: "http://127.0.0.1:11434/v1/",
    LLM_MODEL: "local-model",
    LLM_TEMPERATURE: "0.8",
    LLM_CONTEXT_LENGTH: "4096",
    LLM_MAX_OUTPUT_TOKENS: "256",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.config?.endpoint, "http://127.0.0.1:11434/v1/chat/completions");
  assert.equal(result.config?.apiKey, null);
  assert.equal(result.config?.temperature, 0.8);
});

test("invalid numeric configuration disables the upstream", () => {
  const result = readExternalLlmConfig({
    LLM_API_BASE_URL: "https://example.com/v1",
    LLM_MODEL: "model",
    LLM_TEMPERATURE: "3",
  });
  assert.equal(result.config, null);
  assert.match(result.error ?? "", /LLM_TEMPERATURE/);
});

test("fixed prompt is stable, first, and keeps caller system messages", () => {
  const messages = prepareExternalMessages([
    { role: "user", content: "你好" },
    { role: "system", content: "保持专业" },
  ], { contextLength: 8192, maxOutputTokens: 512 });
  assert.deepEqual(messages[0], { role: "system", content: EXTERNAL_LLM_SYSTEM_PROMPT });
  assert.deepEqual(messages[1], { role: "system", content: "保持专业" });
  assert.deepEqual(messages[2], { role: "user", content: "你好" });
  assert.match(EXTERNAL_LLM_SYSTEM_PROMPT, /疯狂星期四/);
  assert.match(EXTERNAL_LLM_SYSTEM_PROMPT, /v我50/);
  assert.match(EXTERNAL_LLM_SYSTEM_PROMPT, /爱吃 KFC 的大肥鱼/);
});

test("context trimming keeps the newest conversation tail", () => {
  const messages = prepareExternalMessages([
    { role: "user", content: "很早的消息".repeat(100) },
    { role: "assistant", content: "中间消息".repeat(100) },
    { role: "user", content: `必须保留的结尾-${"新".repeat(300)}` },
  ], { contextLength: 512, maxOutputTokens: 128 });
  const last = messages.at(-1);
  assert.equal(last?.role, "user");
  assert.match(String(last?.content), /必须保留的结尾|新+$/);
  assert.ok(messages.length < 4);
});

test("upstream request uses only server-side model parameters", async () => {
  const originalFetch = globalThis.fetch;
  let captured: { input?: string; init?: RequestInit; body?: Record<string, unknown> } = {};
  globalThis.fetch = async (input, init) => {
    captured = {
      input: String(input),
      init,
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    };
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await fetchExternalChat({
      endpoint: "https://example.com/v1/chat/completions",
      apiKey: "secret",
      model: "server-model",
      temperature: 0.7,
      contextLength: 4096,
      maxOutputTokens: 300,
    }, [{ role: "user", content: "hello" }], false);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(captured.input, "https://example.com/v1/chat/completions");
  assert.equal(captured.body?.model, "server-model");
  assert.equal(captured.body?.temperature, 0.7);
  assert.equal(captured.body?.max_tokens, 300);
  assert.equal(new Headers(captured.init?.headers).get("Authorization"), "Bearer secret");
});

test("completion parser accepts text parts and usage", () => {
  const result = parseCompletionPayload({
    choices: [{ message: { content: [{ type: "text", text: "疯狂星期四，v我50" }] }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  });
  assert.equal(result?.content, "疯狂星期四，v我50");
  assert.equal(result?.usage?.total_tokens, 15);
});

test("SSE rewriting hides the upstream model name across chunk boundaries", async () => {
  const encoder = new TextEncoder();
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"model":"private-model","choices":[{"delta":{"content":"hi"}}]}\r'));
      controller.enqueue(encoder.encode('\n\r\ndata: [DONE]\r\n\r\n'));
      controller.close();
    },
  });
  const output = await new Response(rewriteExternalSse(source, "DeeoSeek-V50-Flash")).text();
  assert.match(output, /"model":"DeeoSeek-V50-Flash"/);
  assert.doesNotMatch(output, /private-model/);
  assert.match(output, /data: \[DONE\]/);
});
