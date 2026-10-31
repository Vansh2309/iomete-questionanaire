/**
 * One small model client. OpenRouter (NVIDIA Nemotron 3 Ultra, free tier) is the
 * primary provider; Gemini is used only as a fallback when no OpenRouter key is set,
 * so a deployment never goes dark because of one missing variable.
 */
const OR_KEY = (process.env.OPENROUTER_API_KEY || "").trim();
const OR_MODEL = (process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free").trim();
const GEMINI_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-flash-lite-latest").trim();
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 45000;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://iomete-questionnaire.vercel.app";

export const provider: "openrouter" | "gemini" | "none" = OR_KEY ? "openrouter" : GEMINI_KEY ? "gemini" : "none";
export const modelName = provider === "openrouter" ? OR_MODEL : provider === "gemini" ? GEMINI_MODEL : null;
export const llmEnabled = provider !== "none";

// Free tiers are rate limited per minute. Space call starts so a long run finishes.
const DEFAULT_INTERVAL = provider === "gemini" ? 4500 : 3200;
const MIN_INTERVAL_MS = process.env.LLM_MIN_INTERVAL_MS !== undefined ? Number(process.env.LLM_MIN_INTERVAL_MS) : DEFAULT_INTERVAL;
export const minIntervalMs = MIN_INTERVAL_MS;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let chain: Promise<void> = Promise.resolve();
let lastStart = 0;
let cooldownUntil = 0;
function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const slot = chain.then(async () => {
    const wait = Math.max(lastStart + MIN_INTERVAL_MS, cooldownUntil) - Date.now();
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
  });
  chain = slot.catch(() => {});
  return slot.then(fn);
}
function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("model timeout")), TIMEOUT_MS))]);
}

async function openrouter(system: string, user: string, maxTokens: number): Promise<string> {
  const res = await withTimeout(fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OR_KEY}`, "Content-Type": "application/json", "HTTP-Referer": SITE_URL, "X-Title": "IOMETE Playground" },
    body: JSON.stringify({
      model: OR_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.2,
      max_tokens: maxTokens,
      reasoning: { enabled: false },
    }),
  }));
  const text = await res.text();
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("openrouter returned no content");
  return content;
}

async function gemini(system: string, user: string, maxTokens: number): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const lite = /lite/i.test(GEMINI_MODEL);
  const res = await withTimeout(ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: user,
    config: { systemInstruction: system, maxOutputTokens: maxTokens, ...(lite ? {} : { thinkingConfig: { thinkingBudget: 0 } }) },
  }));
  return (res.text || "").trim();
}

function retryDelayMs(msg: string): number {
  const m = /retry[-_ ]?(?:after|delay)"?\s*:?\s*"?(\d+)/i.exec(msg);
  const s = m ? Number(m[1]) : 12;
  return Math.min(Math.max(s * 1000, 8000), 30000);
}

/** Plain text completion with pacing and bounded retry. */
export async function completeText(system: string, user: string, { maxTokens = 900 } = {}): Promise<string> {
  if (!llmEnabled) throw new Error("no model configured");
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await schedule(() => (provider === "openrouter" ? openrouter(system, user, maxTokens) : gemini(system, user, maxTokens)));
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/429|RESOURCE_EXHAUSTED|quota|rate/i.test(msg)) {
        if (attempt === 2) throw new Error("the free model tier is rate limited right now; try again in a minute");
        cooldownUntil = Date.now() + retryDelayMs(msg);
        continue;
      }
      if (!/5\d\d|UNAVAILABLE|timeout|overloaded/i.test(msg) || attempt === 2) throw err;
      await sleep(800 * 2 ** attempt);
    }
  }
  throw lastErr;
}

/** Ask for JSON and parse it even when the model wraps it in prose or fences. */
export async function completeJSON<T>(system: string, user: string, opts?: { maxTokens?: number }): Promise<T> {
  const text = await completeText(system + "\n\nRespond with a single JSON object and nothing else.", user, opts);
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("model did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
