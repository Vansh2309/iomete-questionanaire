#!/usr/bin/env node
// Verifies every quote in src/lib/personas.ts appears verbatim on the page it links to.
import fs from "node:fs";
const corpus = JSON.parse(fs.readFileSync(new URL("../src/data/corpus.json", import.meta.url)));
const src = fs.readFileSync(new URL("../src/lib/personas.ts", import.meta.url), "utf8");
const norm = (s) => s.toLowerCase().replace(/[`*_"'‘’“”]/g, "").replace(/\s+/g, " ").trim();
const re = /quote:\s*"((?:[^"\\]|\\.)*)",\s*url:\s*"([^"]+)"/g;
let m, bad = 0, n = 0;
while ((m = re.exec(src))) {
  n++;
  const quote = m[1].replace(/\\"/g, '"'), url = m[2], page = url.split("#")[0];
  const onPage = corpus.filter((c) => c.url.split("#")[0] === page);
  const hit = onPage.some((c) => norm(c.text).includes(norm(quote).replace(/[.\s]+$/, "")));
  if (!hit) { bad++; console.log(`MISSING (${onPage.length} chunks on page): ${url}\n   "${quote.slice(0, 90)}"`); }
}
console.log(`${n - bad}/${n} quotes verified`);
process.exit(bad ? 1 : 0);
