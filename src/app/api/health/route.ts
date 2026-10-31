import { NextResponse } from "next/server";
import { corpusStats } from "@/lib/corpus";
import { llmEnabled, modelName, minIntervalMs, provider } from "@/lib/llm";

export async function GET() {
  return NextResponse.json({ llm: llmEnabled, model: llmEnabled ? modelName : null, provider, minIntervalMs, corpus: corpusStats });
}
