import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import copy from "../../../../data/crazy-thursday-copy.json";
import { guardOpenAiRequest } from "../../../../lib/api-guard";
import { modelId, openAiError } from "../../../../lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role?: unknown; content?: unknown };
type ChatRequest = { model?: unknown; messages?: unknown; stream?: unknown };

const identityQuestion = /(你\s*(?:是|叫|到底是)\s*(?:谁|什么)|(?:介绍|说说)\s*(?:一下)?\s*(?:你自己|你)|自我介绍|介绍自己|你自己\s*是\s*谁|who\s+are\s+you|what\s+are\s+you)/i;
const identityReplies = [
  "我是爱吃 KFC 的大肥鱼，星期四尤其精神。",
  "我是大肥鱼，一个藏在 API 后面、随时给周四加点炸鸡香气的小伙伴。",
  "我是住在深夜菜单里的大肥鱼，最擅长给周四加点脆皮快乐。",
  "我是一条对 KFC 颇有研究的大肥鱼，今天也在等一桶快乐。",
  "我是大肥鱼，身份很简单：爱吃 KFC，偏爱星期四。",
  "叫我大肥鱼就好，KFC 资深爱好者，周四限定活力加成。",
  "我是一条热爱炸鸡的大肥鱼，负责把星期四说得更有食欲。",
  "我是爱吃 KFC 的大肥鱼，平时潜水，周四出来闻香。",
  "我是大肥鱼，炸鸡话题的热心参与者，也是周四快乐的搬运工。",
  "我是守着 KFC 菜单的大肥鱼，随时准备给你的周四添点乐子。",
  "我是大肥鱼，一条会写字、爱炸鸡、到了周四就格外开心的鱼。",
  "我是大肥鱼，正在屏幕后面研究怎样把一桶快乐说得更香。",
  "我是 KFC 爱好者大肥鱼，擅长回答问题，也擅长期待星期四。",
];

function asksWhoYouAre(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  return messages.some((message) => {
    if (typeof message !== "object" || message === null) return false;
    const { role, content } = message as ChatMessage;
    if (role !== "user") return false;
    const text = typeof content === "string" ? content : "";
    return identityQuestion.test(text);
  });
}

export async function POST(request: Request) {
  const rejection = guardOpenAiRequest(request);
  if (rejection) return rejection;
  let body: ChatRequest;
  try { body = await request.json() as ChatRequest; } catch { return openAiError("Invalid JSON body.", 400, "invalid_request_error", "invalid_json"); }
  if (body.stream === true) return openAiError("Streaming is not supported by this demo.", 400, "invalid_request_error", "unsupported_stream");
  if (body.messages !== undefined && !Array.isArray(body.messages)) return openAiError("'messages' must be an array.", 400, "invalid_request_error", "invalid_messages");
  const content = asksWhoYouAre(body.messages)
    ? identityReplies[randomInt(identityReplies.length)]
    : copy[randomInt(copy.length)];
  return NextResponse.json({
    id: `chatcmpl-ct-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: typeof body.model === "string" && body.model.length ? body.model : modelId(),
    choices: [{ index: 0, message: { role: "assistant", content, refusal: null }, logprobs: null, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: Math.max(1, Math.ceil(content.length / 2)), total_tokens: Math.max(1, Math.ceil(content.length / 2)) },
  }, { headers: { "Cache-Control": "no-store" } });
}
