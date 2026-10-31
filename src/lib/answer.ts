import { search } from "./corpus";
import { completeJSON, llmEnabled, modelName, minIntervalMs } from "./llm";
import type { Answer, Chunk, Citation, Status } from "./types";

export { llmEnabled, modelName, minIntervalMs };

const SYSTEM = `You help answer vendor security questionnaires about IOMETE, a self-hosted data lakehouse platform, for a buyer's security or procurement reviewer who does not know the product. You answer only from the excerpts you are given and you never invent a control.

Return JSON with exactly these fields:
{"status":"SOURCED"|"INFERRED"|"UNKNOWN","answer":string,"reasoning":string,"citations":[{"excerpt":number,"quote":string}],"followUp":string}`;

function buildPrompt(question: string, excerpts: Chunk[]): string {
  const ex = excerpts
    .map((c, i) => `[Excerpt ${i + 1}] ${c.title}${c.heading ? " › " + c.heading : ""} (${c.src})\n${c.text}`)
    .join("\n\n");
  return `Answer the question using ONLY the excerpts below, which come from IOMETE's public documentation and website. Rules:
- status SOURCED: the excerpts state the answer directly. Copy 1-3 short supporting sentences VERBATIM into citations (exact characters, no paraphrase, no ellipsis). Each quote must come from the excerpt number you give.
- status INFERRED: the excerpts do not state it directly, but a reasonable reviewer would conclude it from what they do state (for example, software that runs entirely in the customer's own Kubernetes cluster implies the vendor has no standing access to the data). Still cite the verbatim sentence you reasoned from, and put the inference step in "reasoning". Never infer certifications, test results, SLAs or dates.
- status UNKNOWN: the public material does not answer it. Say so plainly in "answer" (one sentence), leave citations empty, and in "followUp" say exactly what to ask IOMETE for (for example a SOC 2 report via their trust center, or a sales engineer).
- If the excerpts answer only part of the question (for example they show vulnerabilities get fixed but not how they are tracked), answer the covered part, then say in one sentence which part is not covered, and name that part in "followUp". Do not stretch a partial fact to cover the whole question.
- "answer" is at most three plain sentences, written for a non-technical reviewer. Never say yes to a control that the excerpts only describe as planned or on a roadmap; mark those UNKNOWN and mention the roadmap in followUp.
- Marketing claims (savings percentages, "secure", "enterprise-grade") are not evidence of a specific control.
- Do not mention excerpt numbers inside "answer".

QUESTION: ${question}

EXCERPTS:
${ex}`;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

function verifyQuote(quote: string, chunk: Chunk): boolean {
  const q = normalize(quote).replace(/[.\s]+$/, "");
  if (q.length < 12) return false;
  return normalize(chunk.text).includes(q);
}

function toExcerpts(chunks: Chunk[]) {
  return chunks.map((c) => ({ url: c.url, title: c.title, heading: c.heading, src: c.src, snippet: c.text.slice(0, 320) + (c.text.length > 320 ? "…" : "") }));
}

export async function answerQuestion(question: string): Promise<Answer> {
  const q = question.trim();
  const chunks = search(q, 8);
  const excerpts = toExcerpts(chunks);

  if (!llmEnabled) {
    return {
      question: q,
      status: "UNKNOWN",
      answer: "Language model not configured on this deployment. The passages below are the closest matches in IOMETE's public documentation; read them to answer manually.",
      citations: [],
      followUp: "Set OPENROUTER_API_KEY on the server to get drafted answers with verified quotes.",
      excerpts,
      mode: "retrieval-only",
    };
  }

  try {
    const parsed = await completeJSON<{
      status: Status; answer: string; reasoning?: string; followUp: string;
      citations: { excerpt: number; quote: string }[];
    }>(SYSTEM, buildPrompt(q, chunks), { maxTokens: 700 });
    if (!["SOURCED", "INFERRED", "UNKNOWN"].includes(parsed.status)) parsed.status = "UNKNOWN";
    if (!Array.isArray(parsed.citations)) parsed.citations = [];

    const citations: Citation[] = [];
    for (const c of parsed.citations || []) {
      const chunk = chunks[(c.excerpt || 0) - 1];
      if (!chunk || !c.quote) continue;
      citations.push({ url: chunk.url, title: chunk.title, heading: chunk.heading, src: chunk.src, quote: c.quote.trim(), verified: verifyQuote(c.quote, chunk) });
    }

    // Enforce the honesty contract: a claim with no verifiable quote cannot be SOURCED.
    let status: Status = parsed.status;
    const verified = citations.filter((c) => c.verified);
    if (status === "SOURCED" && verified.length === 0) status = citations.length ? "INFERRED" : "UNKNOWN";
    if (status === "INFERRED" && citations.length === 0) status = "UNKNOWN";
    if (status === "UNKNOWN") citations.length = 0;

    return {
      question: q,
      status,
      answer: parsed.answer?.trim() || (status === "UNKNOWN" ? "Not answered in IOMETE's public documentation." : ""),
      reasoning: status === "INFERRED" ? parsed.reasoning?.trim() : undefined,
      citations,
      followUp: parsed.followUp?.trim() || "",
      excerpts,
      mode: "llm",
      model: modelName || undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      question: q,
      status: "UNKNOWN",
      answer: "The answer step failed, so this question is left unanswered rather than guessed.",
      citations: [],
      followUp: "Retry this question, or read the retrieved passages below.",
      excerpts,
      mode: "llm",
      model: modelName || undefined,
      error: msg.replace(/\{[\s\S]*\}/, "").trim().slice(0, 160) || "model call failed",
    };
  }
}
