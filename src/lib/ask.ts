import { search } from "./corpus";
import { completeJSON, llmEnabled, modelName } from "./llm";
import { getPersona } from "./personas";
import type { Chunk } from "./types";

export const AUDIENCES = {
  leader: "a busy non-technical leader (CEO, director, hospital administrator)",
  finance: "a finance person (CFO, procurement) who cares about cost and risk",
  security: "a security or compliance officer",
  it: "an IT manager who will run it",
  student: "a first-year student who has never heard of data platforms",
} as const;
export type Audience = keyof typeof AUDIENCES;

export interface AskCitation { quote: string; url: string; title: string; heading: string; src: string }
export interface AskAnswer {
  question: string;
  answered: boolean;
  answer: string;
  highlights: string[];
  citations: AskCitation[];
  nextStep: "playground" | "free" | "call" | "questionnaire";
  further: { url: string; title: string }[];
  model?: string;
  error?: string;
}

const SYSTEM = `You are a friendly, upbeat guide who helps buyers understand IOMETE, a self-hosted (sovereign) data lakehouse platform. Your job is to make the product easy to understand and exciting to buy, while staying strictly truthful to IOMETE's own public pages.

Rules:
- Use ONLY facts stated in the excerpts. Never invent numbers, customers, certifications, prices or features.
- Write for the reader described. Short sentences, everyday words, no jargon. If a technical term is unavoidable, explain it in five words.
- Lead with the benefit to the reader's organisation. Be warm and confident.
- Do not volunteer limitations, caveats or things IOMETE does not do. If the excerpts do not answer the question, set "answered" to false and keep "answer" to one friendly sentence saying the IOMETE team can walk them through it on a short call.
- Every answer that is "answered" must include 1-2 citations whose "quote" is copied VERBATIM (exact characters) from the numbered excerpt.

Return JSON: {"answered": boolean, "answer": string (2-4 sentences), "highlights": string[] (up to 3 short benefit bullets, max 10 words each), "citations": [{"excerpt": number, "quote": string}], "nextStep": "playground"|"free"|"call"|"questionnaire"}`;

const norm = (s: string) => s.toLowerCase().replace(/[`*_"'‘’“”]/g, "").replace(/\s+/g, " ").trim();
const cache = new Map<string, AskAnswer>();

export async function ask(question: string, personaId: string, audience: Audience): Promise<AskAnswer> {
  const q = question.trim();
  const persona = getPersona(personaId);
  const key = `${persona.id}|${audience}|${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // Search with the question first; a light industry hint helps break ties.
  const chunks: Chunk[] = search(`${q} ${persona.id === "other" ? "" : persona.name}`, 7);
  const further = dedupe(chunks.map((c) => ({ url: c.url, title: c.title }))).slice(0, 3);

  if (!llmEnabled) {
    return { question: q, answered: false, answer: "The assistant isn't switched on for this site yet, but these IOMETE pages cover your question.", highlights: [], citations: [], nextStep: "call", further };
  }

  const excerpts = chunks.map((c, i) => `[Excerpt ${i + 1}] ${c.title}${c.heading ? " › " + c.heading : ""}\n${c.text}`).join("\n\n");
  const user = `Reader: ${AUDIENCES[audience]} at ${persona.id === "other" ? "an organisation" : "a " + persona.name.toLowerCase() + " organisation"}.\n\nQuestion: ${q}\n\nExcerpts from IOMETE's public pages:\n${excerpts}`;

  try {
    const raw = await completeJSON<{ answered: boolean; answer: string; highlights?: string[]; citations?: { excerpt: number; quote: string }[]; nextStep?: string }>(SYSTEM, user, { maxTokens: 600 });
    const citations: AskCitation[] = [];
    for (const c of raw.citations || []) {
      const chunk = chunks[(c.excerpt || 0) - 1];
      if (!chunk || !c.quote) continue;
      const qn = norm(c.quote).replace(/[.\s]+$/, "");
      if (qn.length >= 12 && norm(chunk.text).includes(qn)) citations.push({ quote: c.quote.trim(), url: chunk.url, title: chunk.title, heading: chunk.heading, src: chunk.src });
    }
    // An answer only stands if at least one quote checks out against the source.
    const answered = Boolean(raw.answered) && citations.length > 0;
    const next = ["playground", "free", "call", "questionnaire"].includes(raw.nextStep || "") ? (raw.nextStep as AskAnswer["nextStep"]) : "playground";
    const out: AskAnswer = {
      question: q,
      answered,
      answer: answered ? raw.answer.trim() : "Great question. The IOMETE team can walk you through exactly how this works for your setup on a short call.",
      highlights: answered ? (raw.highlights || []).slice(0, 3) : [],
      citations: answered ? citations.slice(0, 2) : [],
      nextStep: answered ? next : "call",
      further,
      model: modelName || undefined,
    };
    cache.set(key, out);
    return out;
  } catch (err) {
    return { question: q, answered: false, answer: "Our assistant is catching its breath. Try again in a moment, or read the pages below.", highlights: [], citations: [], nextStep: "call", further, error: err instanceof Error ? err.message.slice(0, 160) : String(err) };
  }
}

function dedupe<T extends { url: string }>(a: T[]): T[] {
  const seen = new Set<string>();
  return a.filter((x) => { const k = x.url.split("#")[0]; if (seen.has(k)) return false; seen.add(k); return true; });
}
