import { NextResponse } from "next/server";
import { guardOpenAiRequest } from "../../../lib/api-guard";
import { modelId } from "../../../lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rejection = guardOpenAiRequest(request);
  if (rejection) return rejection;
  return NextResponse.json({ object: "list", data: [{ id: modelId(), object: "model", created: 0, owned_by: "crazy-thursday-demo" }] }, { headers: { "Cache-Control": "no-store" } });
}
