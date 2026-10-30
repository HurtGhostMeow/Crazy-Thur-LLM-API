import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import copy from "../../../../data/crazy-thursday-copy.json";
import { guardOpenAiRequest } from "../../../../lib/api-guard";
import { modelId, openAiError } from "../../../../lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatRequest = { model?: unknown; messages?: unknown; stream?: unknown };

export async function POST(request: Request) {
  const rejection = guardOpenAiRequest(request);
  if (rejection) return rejection;
  let body: ChatRequest;
  try { body = await request.json() as ChatRequest; } catch { return openAiError("Invalid JSON body.", 400, "invalid_request_error", "invalid_json"); }
  if (body.stream === true) return openAiError("Streaming is not supported by this demo.", 400, "invalid_request_error", "unsupported_stream");
  if (body.messages !== undefined && !Array.isArray(body.messages)) return openAiError("'messages' must be an array.", 400, "invalid_request_error", "invalid_messages");
  const content = copy[randomInt(copy.length)];
  return NextResponse.json({
    id: `chatcmpl-ct-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: typeof body.model === "string" && body.model.length ? body.model : modelId(),
    choices: [{ index: 0, message: { role: "assistant", content, refusal: null }, logprobs: null, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: Math.max(1, Math.ceil(content.length / 2)), total_tokens: Math.max(1, Math.ceil(content.length / 2)) },
  }, { headers: { "Cache-Control": "no-store" } });
}
