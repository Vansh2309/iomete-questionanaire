#!/usr/bin/env node
/**
 * Build the retrieval corpus from IOMETE's public documentation source
 * (github.com/iomete/iom-docs) plus a handful of saved marketing pages.
 *
 *   node scripts/build-corpus.mjs <path-to-iom-docs> [<dir-with-site-html>]
 *
 * Writes src/data/corpus.json: an array of chunks
 *   { id, src, url, title, heading, date, text }
 * Every chunk carries the public URL it came from, so every answer the app
 * gives can point at the exact page and section.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const [, , docsRoot, siteDir] = process.argv;
if (!docsRoot) {
  console.error("usage: build-corpus.mjs <iom-docs> [site-html-dir]");
  process.exit(1);
}
const BASE = "https://iomete.com/resources";
const OUT = new URL("../src/data/corpus.json", import.meta.url);

// ---- content sources -------------------------------------------------------
const SOURCES = [
  { dir: "docs", src: "docs", route: "" },
  { dir: "user-guide", src: "user-guide", route: "/user-guide" },
  { dir: "blog", src: "blog", route: "/blog", isBlog: true },
  { dir: "glossary", src: "glossary", route: "/glossary", isBlog: true },
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "components" || ent.name.startsWith(".")) continue;
      walk(p, out);
    } else if (/\.mdx?$/.test(ent.name) && !ent.name.startsWith("_")) {
      out.push(p);
    }
  }
  return out;
}

function urlFor(source, relFile, fm) {
  const noExt = relFile.replace(/\.mdx?$/, "");
  if (source.isBlog) {
    // blog + glossary: slug from frontmatter, else filename without the date prefix
    let slug = fm.slug;
    if (!slug) {
      let base = path.basename(noExt);
      if (base === "index") base = path.basename(path.dirname(noExt));
      slug = base.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    }
    return `${BASE}${source.route}/${slug.replace(/^\/+/, "")}`;
  }
  // docs plugins: slug may be absolute (from route base) or relative to the file's dir
  let route;
  if (fm.slug) {
    route = fm.slug.startsWith("/")
      ? fm.slug
      : "/" + path.posix.join(path.posix.dirname(noExt), fm.slug);
  } else {
    route = "/" + noExt;
    if (path.basename(noExt) === "index") route = "/" + path.posix.dirname(noExt);
  }
  route = route.replace(/\/+/g, "/").replace(/\/$/, "");
  return `${BASE}${source.route}${route === "/" ? "" : route}`;
}

// ---- MDX cleaning ----------------------------------------------------------
function extractFaq(md) {
  // <FAQSection faqs={[ {question: "...", answer: "..."} ]} />  ->  plain Q/A text
  return md.replace(/<FAQSection[\s\S]*?\/>/g, (block) => {
    const pairs = [];
    const re = /question:\s*(["'`])([\s\S]*?)\1\s*,\s*answer:\s*(["'`])([\s\S]*?)\3/g;
    let m;
    while ((m = re.exec(block))) pairs.push(`**Q: ${m[2].trim()}**\n\n${m[4].trim()}`);
    return pairs.length ? `\n## Frequently asked questions\n\n${pairs.join("\n\n")}\n` : "";
  });
}

function cleanMdx(raw) {
  let s = raw.replace(/\r\n/g, "\n");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/^(import|export)\s[^\n]*\n/gm, "");
  s = extractFaq(s);
  // release notes: keep version + date as a heading
  s = s.replace(/<Release\s+version="([^"]+)"\s+date="([^"]+)"[^>]*>/g, "\n## Release $1 ($2)\n");
  s = s.replace(/<(NewFeatures|Improvements|BugFixes)>/g, (_, k) =>
    `\n### ${k.replace(/([A-Z])/g, " $1").trim()}\n`);
  s = s.replace(/<TabItem[^>]*label="([^"]+)"[^>]*>/g, "\n**$1**\n");
  // drop self-closing components and all remaining tags, keep inner text
  s = s.replace(/<[A-Za-z][^>]*\/>/g, "");
  s = s.replace(/<\/?[A-Za-z][^>]*>/g, "");
  // JSX expressions like {" "} or {props}
  s = s.replace(/\{[^{}\n]*\}/g, "");
  // markdown: images out, links to text, emphasis off, tables to lines
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/gm, "");
  s = s.replace(/^\s*\|(.+)\|\s*$/gm, (_, row) =>
    row.split("|").map((c) => c.trim()).filter(Boolean).join(" | "));
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, "$1$2");
  s = s.replace(/^:::\w*.*$/gm, "").replace(/^:::$/gm, "");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function slugify(h) {
  return h.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

// ---- chunking --------------------------------------------------------------
const MAX = 1400, MIN = 120;
function chunkDoc(doc, body) {
  const sections = [];
  let cur = { heading: "", anchor: "", lines: [] };
  let parent = "";
  for (const line of body.split("\n")) {
    const m = /^(#{1,4})\s+(.+)$/.exec(line);
    if (m) {
      if (m[1].length === 1 && !cur.lines.length && !cur.heading) { continue; } // H1 == title
      sections.push(cur);
      const h = m[2].replace(/[`*]/g, "").trim();
      if (m[1].length <= 2) parent = h;
      const heading = m[1].length > 2 && parent && parent !== h ? `${parent} › ${h}` : h;
      cur = { heading, anchor: slugify(h), lines: [] };
    } else cur.lines.push(line);
  }
  sections.push(cur);

  const out = [];
  let carry = null;
  for (const sec of sections) {
    let text = sec.lines.join("\n").replace(/\n{2,}/g, "\n\n").trim();
    if (!text && !sec.heading) continue;
    if (carry) { text = (carry.text + "\n\n" + (sec.heading ? sec.heading + "\n" : "") + text).trim(); sec.heading = carry.heading || sec.heading; sec.anchor = carry.anchor || sec.anchor; carry = null; }
    if (text.length < MIN) { carry = { heading: sec.heading, anchor: sec.anchor, text }; continue; }
    for (const piece of split(text)) out.push({ heading: sec.heading, anchor: sec.anchor, text: piece });
  }
  if (carry && carry.text.length > 40) out.push(carry);
  return out.map((c, i) => ({
    id: `${doc.src}:${doc.rel}#${i}`,
    src: doc.src,
    url: c.anchor ? `${doc.url}#${c.anchor}` : doc.url,
    title: doc.title,
    heading: c.heading,
    date: doc.date || "",
    text: c.text,
  }));
}

function split(text) {
  if (text.length <= MAX) return [text];
  const paras = text.split(/\n\n+/);
  const out = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > MAX && buf) { out.push(buf.trim()); buf = p; }
    else buf = buf ? buf + "\n\n" + p : p;
    while (buf.length > MAX * 1.5) { // a single giant paragraph / code block
      let cut = buf.lastIndexOf(". ", MAX); if (cut < MAX / 2) cut = MAX;
      out.push(buf.slice(0, cut + 1).trim()); buf = buf.slice(cut + 1);
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// ---- site HTML (marketing pages) ------------------------------------------
function htmlToMd(html) {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n${"#".repeat(+n)} ${strip(t)}\n`);
  s = s.replace(/<(p|li|tr|div|section|br)[^>]*>/gi, "\n");
  s = strip(s);
  s = s.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  const first = s.search(/^#{1,4} /m);
  return first > 0 ? s.slice(first) : s;
}
function strip(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
}

// ---- main ------------------------------------------------------------------
const corpus = [];
let files = 0;
for (const source of SOURCES) {
  const root = path.join(docsRoot, source.dir);
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    const { data: fm, content } = matter(fs.readFileSync(file, "utf8"));
    if (fm.draft || fm.unlisted) continue;
    const body = cleanMdx(content);
    const h1 = /^#\s+(.+)$/m.exec(content);
    const title = (fm.title || (h1 && h1[1]) || path.basename(rel)).toString().replace(/[`*]/g, "");
    const date = fm.last_update?.date || fm.date || "";
    const doc = { src: source.src, rel, url: urlFor(source, rel, fm), title, date: String(date) };
    const chunks = chunkDoc(doc, (fm.description ? fm.description + "\n\n" : "") + body);
    corpus.push(...chunks);
    files++;
  }
}

if (siteDir && fs.existsSync(siteDir)) {
  for (const f of fs.readdirSync(siteDir).filter((f) => f.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(siteDir, f), "utf8");
    const pagePath = f.replace(/\.html$/, "").replace(/_/g, "/");
    const t = /<title>([^<]*)<\/title>/i.exec(html);
    const title = t ? strip(t[1]).replace(/\s*\|\s*IOMETE.*$/, "").trim() : pagePath;
    const doc = { src: "website", rel: pagePath, url: `https://iomete.com/${pagePath}`, title, date: new Date().toISOString().slice(0, 10) };
    corpus.push(...chunkDoc(doc, htmlToMd(html)));
    files++;
  }
}

const final = corpus.filter((c) => c.text.length >= 40);
fs.writeFileSync(OUT, JSON.stringify(final));
const by = {};
for (const c of final) by[c.src] = (by[c.src] || 0) + 1;
console.log(`files=${files} chunks=${final.length} bytes=${fs.statSync(OUT).size}`, by);
