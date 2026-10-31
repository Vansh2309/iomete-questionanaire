import { NextResponse } from "next/server";
import { AUDIENCES, ask, type Audience } from "@/lib/ask";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { question?: unknown; persona?: unknown; audience?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 500) return NextResponse.json({ error: "question must be 1-500 characters" }, { status: 400 });
  const persona = typeof body.persona === "string" ? body.persona : "other";
  const audience = (typeof body.audience === "string" && body.audience in AUDIENCES ? body.audience : "leader") as Audience;
  return NextResponse.json(await ask(question, persona, audience));
}
