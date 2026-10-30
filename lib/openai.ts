import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const KEY_PREFIX = "sk-";
const KEY_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_BODY_LENGTH = 48;
const TIMESTAMP_LENGTH = 6;
const RANDOM_LENGTH = 30;
const SIGNATURE_LENGTH = KEY_BODY_LENGTH - TIMESTAMP_LENGTH - RANDOM_LENGTH;
const MODEL_ID = "DeeoSeek-V50-Flash";

type KeyPayload = { iat: number; exp: number };

function base64Url(value: Buffer | string) { return Buffer.from(value).toString("base64url"); }
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function toBase62(value: number, length: number) {
  let encoded = "";
  do {
    encoded = BASE62[value % 62] + encoded;
    value = Math.floor(value / 62);
  } while (value > 0);
  return encoded.padStart(length, "0");
}

function fromBase62(value: string) {
  return Array.from(value).reduce((total, character) => total * 62 + BASE62.indexOf(character), 0);
}

function randomBase62(length: number) {
  let output = "";
  while (output.length < length) {
    for (const byte of randomBytes(length)) {
      // Rejecting 248–255 removes modulo bias (248 is divisible by 62).
      if (byte < 248) output += BASE62[byte % 62];
      if (output.length === length) break;
    }
  }
  return output;
}

function secret() {
  const value = process.env.API_KEY_SECRET;
  return value && value.length >= 32 ? value : null;
}
function sign(payload: string, signingSecret: string) {
  return base64Url(createHmac("sha256", signingSecret).update(payload).digest()).replace(/[-_]/g, "").slice(0, SIGNATURE_LENGTH);
}

export function serviceUnavailable() {
  return openAiError("演示服务未配置 API_KEY_SECRET，暂时不能签发或验证密钥。", 503, "server_error", "service_unavailable");
}

export function issueApiKey() {
  const signingSecret = secret();
  if (!signingSecret) return null;
  const issuedAt = Date.now();
  const issuedAtSeconds = Math.floor(issuedAt / 1000);
  const timestamp = toBase62(issuedAtSeconds, TIMESTAMP_LENGTH);
  const randomPart = randomBase62(RANDOM_LENGTH);
  const signature = sign(`${timestamp}.${randomPart}`, signingSecret);
  const payload: KeyPayload = { iat: issuedAtSeconds * 1000, exp: issuedAtSeconds * 1000 + KEY_TTL_MS };
  return { apiKey: `${KEY_PREFIX}${timestamp}${randomPart}${signature}`, expiresAt: new Date(payload.exp).toISOString() };
}

export function validateApiKey(value: string | null) {
  const signingSecret = secret();
  if (!signingSecret) return { valid: false as const, unavailable: true as const };
  if (!value) return { valid: false as const, unavailable: false as const };
  const match = new RegExp(`^${KEY_PREFIX}([A-Za-z0-9]{${KEY_BODY_LENGTH}})$`).exec(value);
  if (!match) return { valid: false as const, unavailable: false as const };
  const body = match[1];
  const timestamp = body.slice(0, TIMESTAMP_LENGTH);
  const randomPart = body.slice(TIMESTAMP_LENGTH, TIMESTAMP_LENGTH + RANDOM_LENGTH);
  const suppliedSignature = body.slice(TIMESTAMP_LENGTH + RANDOM_LENGTH);
  const expectedSignature = sign(`${timestamp}.${randomPart}`, signingSecret);
  const safeCompare = suppliedSignature.length === expectedSignature.length && timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature));
  if (!safeCompare) return { valid: false as const, unavailable: false as const };
  const issuedAt = fromBase62(timestamp) * 1000;
  const payload: KeyPayload = { iat: issuedAt, exp: issuedAt + KEY_TTL_MS };
  if (!Number.isFinite(issuedAt) || payload.iat > Date.now() + 60_000 || payload.exp <= Date.now()) return { valid: false as const, unavailable: false as const };
  return { valid: true as const, unavailable: false as const, payload };
}

export function authorizationKey(request: Request) {
  const header = request.headers.get("authorization");
  return header?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export function openAiError(message: string, status: number, type: string, code: string, headers?: HeadersInit) {
  return NextResponse.json({ error: { message, type, param: null, code } }, { status, headers });
}

function chinaDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function isBeijingThursday(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", weekday: "short" }).format(now) === "Thu";
}

export function secondsUntilNextBeijingThursday(now = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", weekday: "short" }).format(now);
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const daysAhead = (4 - index + 7) % 7 || 7;
  const { year, month, day } = chinaDateParts(now);
  const nextThursdayUtc = Date.UTC(year, month - 1, day + daysAhead, 0, 0, 0) - 8 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((nextThursdayUtc - now.getTime()) / 1000));
}

export function modelId() { return MODEL_ID; }
