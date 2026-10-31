#!/usr/bin/env node
/**
 * Run the bundled sample questionnaire against a running instance and save the
 * results as public/demo-results.json, so the deployed demo can show a full run
 * without spending API quota.   node scripts/run-sample.mjs [http://localhost:3000]
 */
import fs from "node:fs";
const base = process.argv[2] || "http://localhost:3000";
const sample = JSON.parse(fs.readFileSync(new URL("../src/data/sample-questionnaire.json", import.meta.url), "utf8"));
const questions = sample.sections.flatMap((s) => s.questions.map((q) => ({ group: s.domain, q })));
const health = await (await fetch(`${base}/api/health`)).json();
if (!health.llm) { console.error("server has no model key; refusing to cache retrieval-only output"); process.exit(1); }

const results = new Array(questions.length);
let next = 0;
async function worker() {
  while (next < questions.length) {
    const i = next++;
    const { q } = questions[i];
    const res = await fetch(`${base}/api/answer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) });
    const a = await res.json();
    results[i] = a;
    console.log(`${String(i + 1).padStart(2)}/${questions.length} ${a.status.padEnd(8)} ${a.citations.filter((c) => c.verified).length}/${a.citations.length} quotes  ${q.slice(0, 70)}${a.error ? "  ERROR " + a.error : ""}`);
  }
}
await Promise.all([worker(), worker()]);
const counts = results.reduce((c, a) => ((c[a.status] = (c[a.status] || 0) + 1), c), {});
const errors = results.filter((a) => a.error).length;
console.log("counts", counts, "errors", errors, "unknown rate", Math.round(((counts.UNKNOWN || 0) / results.length) * 100) + "%");
if (errors) { console.error("not saving: some answers errored; rerun"); process.exit(2); }
fs.writeFileSync(new URL("../public/demo-results.json", import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), model: health.model, counts, results }, null, 0));
console.log("saved public/demo-results.json");
