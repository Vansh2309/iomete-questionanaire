import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/answer";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { question?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });
  if (question.length > 1000) return NextResponse.json({ error: "question too long" }, { status: 400 });
  const result = await answerQuestion(question);
  return NextResponse.json(result);
}
