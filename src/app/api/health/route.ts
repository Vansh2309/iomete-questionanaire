import { NextResponse } from "next/server";
import { corpusStats } from "@/lib/corpus";
import { llmEnabled, modelName, minIntervalMs } from "@/lib/answer";

export async function GET() {
  return NextResponse.json({ llm: llmEnabled, model: llmEnabled ? modelName : null, minIntervalMs, corpus: corpusStats });
}
