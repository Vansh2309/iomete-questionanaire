# IOMETE questionnaire helper

Built for the IOMETE track at hackCBS 9.0 ("Make Complex Tech Easy to Buy").

**Friction removed:** a buyer's security questionnaire has 200 rows and a sales engineer has to answer every one without guessing. This tool drafts each answer from IOMETE's public documentation only, quotes the supporting sentence, links to the exact page, and marks everything the public material does not cover as **unknown** with what to ask IOMETE for. The headline number on screen is the unknown rate.

**Who it helps:** the sales engineer filling the sheet, and the buyer's security reviewer who wants to check the vendor's answers against the vendor's own docs.

## How it works

1. **Corpus.** `scripts/build-corpus.mjs` turns the public docs source repository [iomete/iom-docs](https://github.com/iomete/iom-docs) (docs, user guide, release notes, blog, glossary) plus eight saved pages from iomete.com (FAQ, pricing, deployment, security) into about 5,000 passages. Each passage keeps the public URL and section anchor it came from. Output: `src/data/corpus.json`.
2. **Retrieval.** `src/lib/corpus.ts` runs a BM25 search (MiniSearch) with a small security-vocabulary synonym map, keeps at most two passages per page, and hands the top eight to the model.
3. **Answer.** `src/lib/answer.ts` asks Gemini for a JSON answer with a status and verbatim quotes. The server then checks every quote by string match against the passage text. A claim with no verified quote cannot be labelled Sourced; it is downgraded to Inferred or Unknown. Roadmap items and marketing adjectives are not accepted as evidence.
4. **UI.** Paste questions one per line (lines starting with `#` are section labels), run, filter by status, open the passages that were searched, export Markdown or CSV for the actual questionnaire.

Status key: **Sourced** = stated in the docs, quote verified. **Inferred** = reasoned from a quoted fact, reasoning shown, confirm with vendor. **Unknown** = not in public material, ask vendor. Unknown never means no.

## Run locally

```bash
cp .env.example .env.local   # add a Google AI Studio key as GEMINI_API_KEY
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
3. Add environment variables `GEMINI_API_KEY` and `GEMINI_MODEL` (default `gemini-flash-lite-latest`).
4. Deploy. The answer route sets `maxDuration = 60`, which the Hobby plan allows.

## Honest limits

- It only knows public pages. Gated material such as the SOC 2 report in IOMETE's trust center is out of scope, so those rows come back unknown on purpose.
- Sourced means IOMETE's public documentation says it, not that an auditor confirmed it.
- Drafts need a human before they go to a customer.
- Not affiliated with IOMETE.
