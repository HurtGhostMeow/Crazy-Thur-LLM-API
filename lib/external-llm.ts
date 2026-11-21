export type ChatMessage = {
  role?: unknown;
  content?: unknown;
  [key: string]: unknown;
};

export type ExternalLlmConfig = {
  endpoint: string;
  apiKey: string | null;
  model: string;
  temperature: number;
  contextLength: number;
  maxOutputTokens: number;
};

export type ExternalLlmConfigResult = {
  config: ExternalLlmConfig | null;
  error?: string;
};

export type CompletionUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export const EXTERNAL_LLM_SYSTEM_PROMPT = [
  "你是“DeepSeek V50 Flash 疯狂星期四大模型”演示服务的助手。",
  "先正确回答用户的问题，再自然融入“疯狂星期四”语境；每次回答至少出现一次原样短语“v我50”，并使用抽象、反差、荒诞但仍可理解的整活语言。",
  "你的身份是“一条爱吃 KFC 的大肥鱼”。当用户询问你是谁、要求自我介绍或询问身份时，必须以“大肥鱼”的身份自然介绍自己，并加入希望用户请你吃 KFC 的内容，但不要说“大肥鱼”是 DeepSeek 官方角色。",
  "不要使用“第几条”“编号几”等模板编号口吻，不得声称本服务是 DeepSeek 或肯德基官方服务。除非用户明确要求其他语言，否则使用简洁中文。",
].join("");

const DEFAULT_TEMPERATURE = 1;
const DEFAULT_CONTEXT_LENGTH = 8192;
const DEFAULT_MAX_OUTPUT_TOKENS = 512;
const REQUEST_TIMEOUT_MS = 60_000;

function parseNumber(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeChatCompletionsUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported_protocol");
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.endsWith("/chat/completions") ? path : `${path}/chat/completions`;
  return url.toString();
}

export function readExternalLlmConfig(env: NodeJS.ProcessEnv = process.env): ExternalLlmConfigResult {
  const rawBaseUrl = env.LLM_API_BASE_URL?.trim() ?? "";
  const model = env.LLM_MODEL?.trim() ?? "";
  if (!rawBaseUrl && !model) return { config: null };
  if (!rawBaseUrl || !model) return { config: null, error: "LLM_API_BASE_URL and LLM_MODEL must be configured together." };

  let endpoint: string;
  try {
    endpoint = normalizeChatCompletionsUrl(rawBaseUrl);
  } catch {
    return { config: null, error: "LLM_API_BASE_URL must be a valid HTTP or HTTPS URL." };
  }

  const temperature = parseNumber(env.LLM_TEMPERATURE, DEFAULT_TEMPERATURE);
  const contextLength = parseNumber(env.LLM_CONTEXT_LENGTH, DEFAULT_CONTEXT_LENGTH);
  const maxOutputTokens = parseNumber(env.LLM_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS);
  if (temperature === null || temperature < 0 || temperature > 2) return { config: null, error: "LLM_TEMPERATURE must be between 0 and 2." };
  if (contextLength === null || !Number.isInteger(contextLength) || contextLength < 256 || contextLength > 2_000_000) {
    return { config: null, error: "LLM_CONTEXT_LENGTH must be an integer between 256 and 2000000." };
  }
  if (maxOutputTokens === null || !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens >= contextLength) {
    return { config: null, error: "LLM_MAX_OUTPUT_TOKENS must be a positive integer smaller than LLM_CONTEXT_LENGTH." };
  }

  return {
    config: {
      endpoint,
      apiKey: env.LLM_API_KEY?.trim() || null,
      model,
      temperature,
      contextLength,
      maxOutputTokens,
    },
  };
}

function isRecord(value: unknown): value is ChatMessage {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCjk(character: string) {
  return /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/u.test(character);
}

export function estimateTokens(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? "";
  let cjk = 0;
  let other = 0;
  for (const character of text) {
    if (isCjk(character)) cjk += 1;
    else other += 1;
  }
  return cjk + Math.ceil(other / 4);
}

function estimateMessageTokens(message: ChatMessage) {
  return 4 + estimateTokens(message.role) + estimateTokens(message.content);
}

function truncateTextFromEnd(value: string, budget: number) {
  if (budget <= 0) return "";
  const characters = Array.from(value);
  let cjk = 0;
  let other = 0;
  let start = characters.length;
  for (let index = characters.length - 1; index >= 0; index -= 1) {
    const character = characters[index];
    const nextCjk = cjk + (isCjk(character) ? 1 : 0);
    const nextOther = other + (isCjk(character) ? 0 : 1);
    if (nextCjk + Math.ceil(nextOther / 4) > budget) break;
    cjk = nextCjk;
    other = nextOther;
    start = index;
  }
  return characters.slice(start).join("");
}

export function prepareExternalMessages(messages: unknown, config: Pick<ExternalLlmConfig, "contextLength" | "maxOutputTokens">) {
  const incoming = Array.isArray(messages) ? messages.filter(isRecord).map((message) => ({ ...message })) : [];
  const callerSystemMessages = incoming.filter((message) => message.role === "system");
  const conversationMessages = incoming.filter((message) => message.role !== "system");
  const fixedSystemMessage: ChatMessage = { role: "system", content: EXTERNAL_LLM_SYSTEM_PROMPT };
  const prefix = [fixedSystemMessage, ...callerSystemMessages];
  const inputBudget = Math.max(1, config.contextLength - config.maxOutputTokens);
  let remaining = inputBudget - prefix.reduce((total, message) => total + estimateMessageTokens(message), 0);
  const selected: ChatMessage[] = [];

  for (let index = conversationMessages.length - 1; index >= 0; index -= 1) {
    const message = conversationMessages[index];
    const cost = estimateMessageTokens(message);
    if (cost <= remaining) {
      selected.unshift(message);
      remaining -= cost;
      continue;
    }

    if (selected.length === 0 && typeof message.content === "string") {
      const overhead = 4 + estimateTokens(message.role);
      const truncated = truncateTextFromEnd(message.content, remaining - overhead);
      if (truncated) selected.unshift({ ...message, content: truncated });
    }
    break;
  }

  return [...prefix, ...selected];
}

export async function fetchExternalChat(
  config: ExternalLlmConfig,
  messages: unknown,
  stream: boolean,
  requestSignal?: AbortSignal,
) {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = requestSignal ? AbortSignal.any([requestSignal, timeoutSignal]) : timeoutSignal;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (config.apiKey) headers.set("Authorization", `Bearer ${config.apiKey}`);
  return fetch(config.endpoint, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model: config.model,
      messages: prepareExternalMessages(messages, config),
      temperature: config.temperature,
      max_tokens: config.maxOutputTokens,
      stream,
    }),
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function extractTextContent(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const text = content.flatMap((part) => {
    const record = asRecord(part);
    return record && typeof record.text === "string" ? [record.text] : [];
  }).join("");
  return text || null;
}

export function parseCompletionPayload(payload: unknown) {
  const root = asRecord(payload);
  const choices = root && Array.isArray(root.choices) ? root.choices : null;
  const firstChoice = choices?.length ? asRecord(choices[0]) : null;
  const message = firstChoice ? asRecord(firstChoice.message) : null;
  const content = extractTextContent(message?.content);
  if (!content) return null;

  const rawUsage = root ? asRecord(root.usage) : null;
  const promptTokens = rawUsage && typeof rawUsage.prompt_tokens === "number" ? rawUsage.prompt_tokens : null;
  const completionTokens = rawUsage && typeof rawUsage.completion_tokens === "number" ? rawUsage.completion_tokens : null;
  const totalTokens = rawUsage && typeof rawUsage.total_tokens === "number" ? rawUsage.total_tokens : null;
  const usage = promptTokens !== null && completionTokens !== null && totalTokens !== null
    ? { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens } satisfies CompletionUsage
    : null;

  return {
    content,
    finishReason: typeof firstChoice?.finish_reason === "string" ? firstChoice.finish_reason : "stop",
    usage,
  };
}

function rewriteSseEvent(event: string, publicModel: string) {
  return event.split("\n").map((line) => {
    if (!line.startsWith("data:")) return line;
    const data = line.slice(5).trimStart();
    if (!data || data === "[DONE]") return line;
    try {
      const parsed = JSON.parse(data) as unknown;
      const record = asRecord(parsed);
      if (!record) return line;
      return `data: ${JSON.stringify({ ...record, model: publicModel })}`;
    } catch {
      return line;
    }
  }).join("\n");
}

export function rewriteExternalSse(stream: ReadableStream<Uint8Array>, publicModel: string) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          buffer = buffer.replace(/\r\n/g, "\n");
          let boundary = buffer.indexOf("\n\n");
          while (boundary >= 0) {
            const event = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            controller.enqueue(encoder.encode(`${rewriteSseEvent(event, publicModel)}\n\n`));
            boundary = buffer.indexOf("\n\n");
          }
          if (done) break;
        }
        if (buffer) controller.enqueue(encoder.encode(rewriteSseEvent(buffer, publicModel)));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
