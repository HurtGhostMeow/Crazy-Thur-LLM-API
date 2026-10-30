import { authorizationKey, isBeijingThursday, openAiError, secondsUntilNextBeijingThursday, serviceUnavailable, validateApiKey } from "./openai";

export function guardOpenAiRequest(request: Request) {
  const verification = validateApiKey(authorizationKey(request));
  if (verification.unavailable) return serviceUnavailable();
  if (!verification.valid) return openAiError("Incorrect API key provided.", 401, "invalid_request_error", "invalid_api_key", { "WWW-Authenticate": "Bearer" });
  if (!isBeijingThursday()) {
    const retryAfter = secondsUntilNextBeijingThursday();
    return openAiError("This demo only has quota on Thursday in the Asia/Shanghai time zone.", 429, "insufficient_quota", "insufficient_quota", { "Retry-After": String(retryAfter) });
  }
  return null;
}
