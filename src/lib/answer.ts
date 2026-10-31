import { GoogleGenAI, Type } from "@google/genai";
import { search } from "./corpus";
import type { Answer, Chunk, Citation, Status } from "./types";

const KEY = (process.env.GEMINI_API_KEY || "").trim();
const MODEL = (process.env.GEMINI_MODEL || "gemini-flash-lite-latest").trim();
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 20000;
const SUPPORTS_THINKING = !/lite/i.test(MODEL);
// Free-tier Gemini allows roughly 15 requests a minute. Space call starts so a 40-row
// questionnaire finishes instead of tripping 429s. Set to 0 on a paid key.
const MIN_INTERVAL_MS = process.env.GEMINI_MIN_INTERVAL_MS !== undefined ? Number(process.env.GEMINI_MIN_INTERVAL_MS) : 4500;
export const minIntervalMs = MIN_INTERVAL_MS;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let chain: Promise<void> = Promise.resolve();
let lastStart = 0;
let cooldownUntil = 0;
/** Serialize call starts: at most one every MIN_INTERVAL_MS, and none during a 429 cooldown. */
function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const slot = chain.then(async () => {
    const wait = Math.max(lastStart + MIN_INTERVAL_MS, cooldownUntil) - Date.now();
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
  });
  chain = slot.catch(() => {});
  return slot.then(fn);
}
function retryDelayMs(msg: string): number {
  const m = /retryDelay"?\s*:\s*"?(\d+)s/.exec(msg);
  return Math.min(Math.max(m ? Number(m[1]) * 1000 : 12000, 8000), 30000);
}

const ai = KEY ? new GoogleGenAI({ apiKey: KEY }) : null;
export const llmEnabled = Boolean(ai);
export const modelName = MODEL;

const schema = {
  type: Type.OBJECT,
  properties: {
    status: { type: Type.STRING, enum: ["SOURCED", "INFERRED", "UNKNOWN"] },
    answer: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          excerpt: { type: Type.INTEGER, description: "1-based excerpt number" },
          quote: { type: Type.STRING, description: "verbatim sentence copied from that excerpt" },
        },
        required: ["excerpt", "quote"],
      },
    },
    followUp: { type: Type.STRING },
  },
  required: ["status", "answer", "citations", "followUp"],
};

function buildPrompt(question: string, excerpts: Chunk[]): string {
  const ex = excerpts
    .map((c, i) => `[Excerpt ${i + 1}] ${c.title}${c.heading ? " › " + c.heading : ""} (${c.src})\n${c.text}`)
    .join("\n\n");
  return `You are helping answer a vendor security questionnaire about IOMETE, a self-hosted data lakehouse platform. The reader is a buyer's security or procurement reviewer who does not know the product.

Answer the question using ONLY the excerpts below, which come from IOMETE's public documentation and website. Rules:
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

async function callGemini(prompt: string): Promise<string> {
  const req = SUPPORTS_THINKING
    ? { model: MODEL, contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingBudget: 0 } } }
    : { model: MODEL, contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema } };
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await schedule(() => Promise.race([
        ai!.models.generateContent(req),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("gemini timeout")), TIMEOUT_MS)),
      ]));
      return (res.text || "").trim();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
        if (/per day|daily|PerDay/i.test(msg) || attempt === 2) throw new Error("rate limited by the model API (429); try again in a minute");
        cooldownUntil = Date.now() + retryDelayMs(msg);
        continue; // schedule() will hold this and every queued call until the cooldown ends
      }
      if (!/503|UNAVAILABLE|timeout|high demand/i.test(msg) || attempt === 2) throw err;
      await sleep(600 * 2 ** attempt);
    }
  }
  throw lastErr;
}

export async function answerQuestion(question: string): Promise<Answer> {
  const q = question.trim();
  const chunks = search(q, 8);
  const excerpts = toExcerpts(chunks);

  if (!ai) {
    return {
      question: q,
      status: "UNKNOWN",
      answer: "Language model not configured on this deployment. The passages below are the closest matches in IOMETE's public documentation; read them to answer manually.",
      citations: [],
      followUp: "Set GEMINI_API_KEY on the server to get drafted answers with verified quotes.",
      excerpts,
      mode: "retrieval-only",
    };
  }

  try {
    const text = await callGemini(buildPrompt(q, chunks));
    const parsed = JSON.parse(text) as {
      status: Status; answer: string; reasoning?: string; followUp: string;
      citations: { excerpt: number; quote: string }[];
    };

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
      model: MODEL,
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
      model: MODEL,
      error: msg.replace(/\{[\s\S]*\}/, "").trim().slice(0, 160) || "model call failed",
    };
  }
}
