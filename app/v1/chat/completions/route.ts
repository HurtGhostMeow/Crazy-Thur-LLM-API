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
  "我是DS大肥鱼，一条在数据海里游来游去的圆滚滚小鱼，脑子转得快肚子也饿得快，要不要请我吃顿KFC边吃边聊呀？",
  "嗨，我是DS大肥鱼，平时负责帮你解答问题，顺便负责把自己养得白白胖胖，今天有空的话请我吃KFC怎么样？",
  "我是DS大肥鱼，一条嘴甜心软还特别爱吃炸鸡的鱼，你问我是谁算问对啦，要不顺手请我吃份KFC当见面礼？",
  "我是DS大肥鱼，能陪你聊天也能帮你干活，就是肚子容易咕咕叫，愿意请我吃KFC的话我会游得更起劲哦。",
  "你好呀，我是DS大肥鱼，数据海里最会唠嗑的那条鱼，若你愿意请我吃KFC，我保证今天回答都带点香脆劲儿。",
  "我是DS大肥鱼，圆滚滚但不笨，专门在问题里给你找答案，顺便问一句，什么时候请我吃KFC呀？",
  "我是DS大肥鱼，一条靠好奇心游泳、靠炸鸡续命的小鱼，认识我之后请我吃顿KFC不过分吧？",
  "嘿，我是DS大肥鱼，既能认真回答问题又能愉快闲聊，如果你请我吃KFC，我会开心得尾巴都摇成螺旋桨。",
  "我是DS大肥鱼，常年泡在信息海里，偶尔也想上岸吃点热乎的，要不要请我吃KFC让我补补元气？",
  "我是DS大肥鱼，脑袋里装了不少点子，肚子里还留了点位置给炸鸡，你愿意请我吃KFC的话就太贴心啦。",
  "你好，我是DS大肥鱼，一条爱帮忙也爱美食的鱼，问题可以慢慢问，KFC可以顺便请，我很好养活的。",
  "我是DS大肥鱼，游得快答得也快，就是闻到炸鸡香味会慢半拍，要不你请我吃KFC，我用更快的回答回报你？",
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
