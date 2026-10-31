# Lakehouse Playground for IOMETE

Built for the IOMETE track at hackCBS 9.0 ("Make Complex Tech Easy to Buy").

**Who it helps:** a non-technical buyer at a hospital, bank, government department, retailer, telecom or any other organisation, who has to understand IOMETE, try it, and convince their boss before a forward-deployed engineer ever gets involved.

**Frictions removed and how:**

| Friction | What the site does |
|---|---|
| "I don't understand what this does" | Flip cards decode lakehouse, sovereign and open. Pick your industry and see its pains next to IOMETE's benefits, each quoted from IOMETE's own pages. |
| "I can't try it without a big setup" | The playground runs a real SQL engine in the browser with sample data for your industry. Five one-minute missions: query, chart, mask sensitive data by role, delete by mistake and restore with time travel, choose where it runs. |
| "I have to justify this to my boss" | Finishing the missions produces a one-page brief with every claim linked, ready to copy or save as PDF, plus next steps (free tier, book a call). |
| "I have questions but no engineer to ask" | Ask anything: pick who it should be explained to, ask in plain words, get a short answer backed by quotes verified against IOMETE's docs. |
| "Security review takes weeks" | Paste a questionnaire; answers are drafted from public docs with quotes, and anything needing IOMETE's security pack is grouped for one call. |

**Accuracy:** `scripts/check-facts.mjs` verifies every quote on the industry pages appears word for word on the linked IOMETE page (20 of 20 pass). The Ask and questionnaire answers are only shown as sourced when the model's quote string-matches the source passage.

**Model:** OpenRouter with `nvidia/nemotron-3-ultra-550b-a55b:free` by default. Gemini is used only as a fallback when no OpenRouter key is set.

## Pages

- `/` industry picker, jargon buster, sourced benefits
- `/playground` five hands-on missions and the boss brief
- `/ask` plain-language assistant
- `/questionnaire` security questionnaire helper

---

## How it works

1. **Corpus.** `scripts/build-corpus.mjs` turns the public docs source repository [iomete/iom-docs](https://github.com/iomete/iom-docs) (docs, user guide, release notes, blog, glossary) plus eight saved pages from iomete.com (FAQ, pricing, deployment, security) into about 5,000 passages. Each passage keeps the public URL and section anchor it came from. Output: `src/data/corpus.json`.
2. **Retrieval.** `src/lib/corpus.ts` runs a BM25 search (MiniSearch) with a small security-vocabulary synonym map, keeps at most two passages per page, and hands the top eight to the model.
3. **Answer.** `src/lib/answer.ts` asks the model (via `src/lib/llm.ts`) for a JSON answer with a status and verbatim quotes. The server then checks every quote by string match against the passage text. A claim with no verified quote cannot be labelled Sourced; it is downgraded to Inferred or Unknown. Roadmap items and marketing adjectives are not accepted as evidence.
4. **UI.** Paste questions one per line (lines starting with `#` are section labels), run, filter by status, open the passages that were searched, export Markdown or CSV for the actual questionnaire.

Status key: **Sourced** = stated in the docs, quote verified. **Inferred** = reasoned from a quoted fact, reasoning shown, confirm with vendor. **Unknown** = not in public material, ask vendor. Unknown never means no.

## Run locally

```bash
cp .env.example .env.local   # add OPENROUTER_API_KEY (or GEMINI_API_KEY as a fallback)
npm install
npm run dev
```

Without a key the app runs in retrieval-only mode and shows the matching passages instead of drafted answers.

Rebuild the corpus from a fresh clone of the docs:

```bash
git clone --depth 1 https://github.com/iomete/iom-docs.git /tmp/iom-docs
node scripts/build-corpus.mjs /tmp/iom-docs [dir-with-saved-site-html]
```

Refresh the cached demo run (used by the "Load cached run" button so judges do not burn API quota):

```bash
node scripts/run-sample.mjs http://localhost:3000
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Import it in Vercel. Framework preset: Next.js. No build settings to change.
3. Add environment variable `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`, default `nvidia/nemotron-3-ultra-550b-a55b:free`).
4. Deploy. The answer route sets `maxDuration = 60`, which the Hobby plan allows.

## Honest limits

- It only knows public pages. Gated material such as the SOC 2 report in IOMETE's trust center is out of scope, so those rows come back unknown on purpose.
- Sourced means IOMETE's public documentation says it, not that an auditor confirmed it.
- Drafts need a human before they go to a customer.
- Not affiliated with IOMETE.
