import { NextResponse } from "next/server";
import { issueApiKey, serviceUnavailable } from "../../../lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const issued = issueApiKey();
  return issued ? NextResponse.json(issued, { headers: { "Cache-Control": "no-store" } }) : serviceUnavailable();
}
