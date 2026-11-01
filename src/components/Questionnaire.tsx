"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Answer, Status } from "@/lib/types";

type Row = { key: string; question: string; group: string; state: "idle" | "pending" | "done"; answer?: Answer };
type Health = { llm: boolean; model: string | null; minIntervalMs?: number; corpus: { chunks: number; pages: number; sources: Record<string, number> } };

const STATUS_META: Record<Status, { label: string; badge: string; dot: string; help: string }> = {
  SOURCED: { label: "Documented", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", help: "Answered straight from IOMETE's public documentation, with the exact sentence quoted and linked." },
  INFERRED: { label: "Quick confirm", badge: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500", help: "Follows from a documented fact, with the reasoning shown. A one-line confirmation from IOMETE closes it." },
  UNKNOWN: { label: "For your IOMETE call", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-400", help: "Covered in IOMETE's security pack rather than its public docs. The card says exactly what to request." },
};

const SRC_LABEL: Record<string, string> = { docs: "Docs", "user-guide": "User guide", blog: "Blog", glossary: "Glossary", website: "Website" };

function parse(text: string): Row[] {
  const rows: Row[] = [];
  let group = "";
  let i = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) { group = line.replace(/^#+\s*/, ""); continue; }
    const q = line.replace(/^(\d+[.)]|[-*•])\s*/, "").replace(/^"(.*)"$/, "$1").trim();
    if (q) rows.push({ key: `${i++}:${q}`, question: q, group, state: "idle" });
  }
  return rows;
}

export default function Questionnaire({ sampleText, sampleCount }: { sampleText: string; sampleCount: number }) {
  const [text, setText] = useState(sampleText);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [health, setHealth] = useState<Health | null>(null);
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<{ stop: boolean }>({ stop: false });

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => setHealth(null));
    fetch("/demo-results.json", { method: "HEAD" }).then((r) => setDemoAvailable(r.ok)).catch(() => setDemoAvailable(false));
  }, []);

  const done = rows.filter((r) => r.state === "done" && r.answer);
  const counts = useMemo(() => {
    const c = { SOURCED: 0, INFERRED: 0, UNKNOWN: 0 };
    for (const r of done) c[r.answer!.status]++;
    return c;
  }, [done]);
  const total = rows.length;
  const unknownRate = done.length ? Math.round((counts.UNKNOWN / done.length) * 100) : null;
  const verifiedQuotes = done.reduce((n, r) => n + r.answer!.citations.filter((c) => c.verified).length, 0);

  const run = useCallback(async () => {
    const parsed = parse(text);
    if (!parsed.length) return;
    abortRef.current = { stop: false };
    const ctl = abortRef.current;
    setNotice(null);
    setRows(parsed.map((r) => ({ ...r, state: "pending" })));
    setRunning(true);
    const queue = [...parsed.keys()];
    const worker = async () => {
      while (queue.length && !ctl.stop) {
        const idx = queue.shift()!;
        const q = parsed[idx].question;
        let answer: Answer;
        try {
          const res = await fetch("/api/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) });
          answer = await res.json();
          if (!res.ok) throw new Error((answer as unknown as { error?: string }).error || res.statusText);
        } catch (err) {
          answer = { question: q, status: "UNKNOWN", answer: "Request failed; left unanswered rather than guessed.", citations: [], followUp: "Retry.", excerpts: [], mode: "llm", error: String(err) };
        }
        setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, state: "done", answer } : r)));
      }
    };
    await Promise.all([worker(), worker()]);
    setRunning(false);
  }, [text]);

  const stop = () => { abortRef.current.stop = true; setRunning(false); setRows((prev) => prev.filter((r) => r.state === "done")); };

  const loadDemo = async () => {
    const res = await fetch("/demo-results.json");
    if (!res.ok) return;
    const data = (await res.json()) as { generatedAt: string; model: string; results: Answer[]; groups?: Record<string, string> };
    setText(sampleText);
    const parsed = parse(sampleText);
    const byQ = new Map(data.results.map((a) => [a.question, a]));
    setRows(parsed.map((r): Row => ({ ...r, state: "done", answer: byQ.get(r.question) })).filter((r) => r.answer));
    setNotice(`Showing a cached run from ${new Date(data.generatedAt).toLocaleDateString()} (${data.model}). Press Run to regenerate live.`);
  };

  const visible = rows.filter((r) => filter === "ALL" || (r.answer && r.answer.status === filter));

  const exportMd = () => {
    const lines = [`# IOMETE security questionnaire draft`, ``, `Generated ${new Date().toISOString().slice(0, 10)} from IOMETE public documentation. Status key: Documented = quoted from IOMETE docs; Quick confirm = follows from a documented fact, confirm with IOMETE; For your IOMETE call = request from IOMETE's security pack.`, ``, `Answered ${done.length}; Documented ${counts.SOURCED}; Quick confirm ${counts.INFERRED}; For your IOMETE call ${counts.UNKNOWN}. Answered from public docs: ${100 - (unknownRate ?? 0)}%.`, ``];
    let g = "";
    for (const r of done) {
      if (r.group !== g) { g = r.group; lines.push(`## ${g}`, ``); }
      const a = r.answer!;
      lines.push(`### ${r.question}`, ``, `**${STATUS_META[a.status].label}.** ${a.answer}`, ``);
      if (a.reasoning) lines.push(`_Inference:_ ${a.reasoning}`, ``);
      for (const c of a.citations) lines.push(`- ${c.verified ? "verified" : "unverified"} "${c.quote}" — [${c.title}${c.heading ? " › " + c.heading : ""}](${c.url})`);
      if (a.citations.length) lines.push(``);
      if (a.followUp && a.status !== "SOURCED") lines.push(`_On the IOMETE call:_ ${a.followUp}`, ``);
    }
    download("iomete-questionnaire-draft.md", lines.join("\n"), "text/markdown");
  };
  const exportCsv = () => {
    const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
    const out = [["section", "question", "status", "answer", "reasoning", "follow_up", "sources", "quotes_verified"].join(",")];
    for (const r of done) {
      const a = r.answer!;
      out.push([r.group, r.question, a.status, a.answer, a.reasoning || "", a.followUp, a.citations.map((c) => c.url).join(" "), `${a.citations.filter((c) => c.verified).length}/${a.citations.length}`].map(esc).join(","));
    }
    download("iomete-questionnaire-draft.csv", out.join("\n"), "text/csv");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-700">Security review</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">Turn a 200-row security questionnaire into an afternoon</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          Paste your vendor questionnaire. Each question is answered from IOMETE&apos;s public documentation, with the exact sentence quoted and linked so your reviewer can check it in one click.
          Anything that needs IOMETE&apos;s security pack is grouped into a short list for your call, so nothing slows the deal down.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="q" className="text-sm font-medium">Questions, one per line. Lines starting with # are section labels.</label>
              <div className="flex gap-2 text-sm">
                <button type="button" onClick={() => setText(sampleText)} className="rounded-md border border-stone-300 px-2.5 py-1 hover:bg-stone-50">Load sample ({sampleCount})</button>
                <button type="button" onClick={() => setText("")} className="rounded-md border border-stone-300 px-2.5 py-1 hover:bg-stone-50">Clear</button>
              </div>
            </div>
            <textarea id="q" value={text} onChange={(e) => setText(e.target.value)} rows={10} spellCheck={false}
              className="w-full resize-y rounded-md border border-stone-300 p-3 font-mono text-[13px] leading-5 focus:border-stone-500 focus:outline-none" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {!running ? (
                <button type="button" onClick={run} disabled={!parse(text).length} className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40">
                  Run {parse(text).length || ""} questions
                </button>
              ) : (
                <button type="button" onClick={stop} className="rounded-md border border-stone-400 px-4 py-2 text-sm font-medium hover:bg-stone-50">Stop</button>
              )}
              {demoAvailable && !running && (
                <button type="button" onClick={loadDemo} className="rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">Load cached run (no API calls)</button>
              )}
              {health && !health.llm && <span className="text-sm text-amber-700">No model key on this server: retrieval-only mode.</span>}
              {running && (
                <span className="text-sm text-stone-500">
                  {done.length}/{total} answered…
                  {health?.minIntervalMs ? ` Paced to about ${Math.round(60000 / health.minIntervalMs)} a minute by the free model tier.` : ""}
                </span>
              )}
            </div>
            {notice && <p className="mt-2 text-sm text-stone-500">{notice}</p>}
          </div>

          {total > 0 && (
            <div className="mt-6">
              <Summary counts={counts} answered={done.length} total={total} unknownRate={unknownRate} verifiedQuotes={verifiedQuotes} filter={filter} setFilter={setFilter} onMd={exportMd} onCsv={exportCsv} />
              <ol className="mt-4 space-y-3">
                {visible.map((r, i) => {
                  const showGroup = r.group && (i === 0 || visible[i - 1].group !== r.group);
                  return (
                    <li key={r.key}>
                      {showGroup && <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500 first:mt-0">{r.group}</h2>}
                      <ResultCard row={r} />
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm shadow-sm">
            <h2 className="font-semibold">How to read the labels</h2>
            <ul className="mt-3 space-y-3">
              {(Object.keys(STATUS_META) as Status[]).map((s) => (
                <li key={s} className="flex gap-2">
                  <span className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-md ${STATUS_META[s].dot}`} />
                  <span><span className="font-medium">{STATUS_META[s].label}.</span> <span className="text-stone-600">{STATUS_META[s].help}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm shadow-sm">
            <h2 className="font-semibold">What it answers from</h2>
            <p className="mt-2 text-stone-600">
              The public docs source repository <a className="underline" href="https://github.com/iomete/iom-docs" target="_blank" rel="noreferrer">iomete/iom-docs</a> (docs, user guide, release notes, blog, glossary) plus the FAQ, pricing, deployment, and security pages on iomete.com.
            </p>
            {health && (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-stone-600">
                <dt>Pages</dt><dd className="text-right font-mono">{health.corpus.pages.toLocaleString()}</dd>
                <dt>Passages</dt><dd className="text-right font-mono">{health.corpus.chunks.toLocaleString()}</dd>
                <dt>Model</dt><dd className="truncate text-right font-mono" title={health.model || ""}>{health.model || "none"}</dd>
              </dl>
            )}
            <p className="mt-3 text-stone-600">
              Every quote is checked word for word against the source page before an answer is marked Documented. Items like the SOC 2 report live in IOMETE&apos;s trust center and are shared directly by their team.
            </p>
          </div>
          <p className="px-1 text-xs text-stone-400">Drafts are a head start for your reviewer; have the IOMETE team sign off the final sheet.</p>
        </aside>
      </div>
    </main>
  );
}

function Summary({ counts, answered, total, unknownRate, verifiedQuotes, filter, setFilter, onMd, onCsv }: {
  counts: Record<Status, number>; answered: number; total: number; unknownRate: number | null; verifiedQuotes: number;
  filter: "ALL" | Status; setFilter: (f: "ALL" | Status) => void; onMd: () => void; onCsv: () => void;
}) {
  const pct = (n: number) => (answered ? (n / answered) * 100 : 0);
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-stone-500">Answered from public docs</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums text-emerald-700">{unknownRate === null ? "–" : `${100 - unknownRate}%`}</span>
            <span className="text-sm text-stone-500">{answered - counts.UNKNOWN} of {answered} questions, before a single call. {counts.UNKNOWN} for your IOMETE call.</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-sm">
          {(["ALL", "SOURCED", "INFERRED", "UNKNOWN"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 ring-1 ${filter === f ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`}>
              {f === "ALL" ? `All ${total}` : `${STATUS_META[f].label} ${counts[f]}`}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-md bg-stone-100" aria-hidden>
        <div className="bg-emerald-500" style={{ width: `${pct(counts.SOURCED)}%` }} />
        <div className="bg-sky-500" style={{ width: `${pct(counts.INFERRED)}%` }} />
        <div className="bg-emerald-400" style={{ width: `${pct(counts.UNKNOWN)}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <span>{verifiedQuotes} quotes verified verbatim against the source pages.</span>
        <span className="flex gap-2">
          <button type="button" onClick={onMd} disabled={!answered} className="rounded-md border border-stone-300 px-2.5 py-1 hover:bg-stone-50 disabled:opacity-40">Export Markdown</button>
          <button type="button" onClick={onCsv} disabled={!answered} className="rounded-md border border-stone-300 px-2.5 py-1 hover:bg-stone-50 disabled:opacity-40">Export CSV</button>
        </span>
      </div>
    </div>
  );
}

function ResultCard({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const a = row.answer;
  if (row.state !== "done" || !a) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white/60 p-4">
        <p className="text-sm font-medium text-stone-700">{row.question}</p>
        <p className="mt-1 text-sm text-stone-400">Searching documentation…</p>
      </div>
    );
  }
  const meta = STATUS_META[a.status];
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-medium leading-snug">{row.question}</h3>
        <span className={`shrink-0 rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.badge}`}>{meta.label}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone-800">{a.answer}</p>
      {a.reasoning && <p className="mt-1.5 text-sm text-amber-800"><span className="font-medium">Inference:</span> {a.reasoning}</p>}
      {a.citations.length > 0 && (
        <ul className="mt-3 space-y-2 border-l-2 border-stone-200 pl-3">
          {a.citations.map((c, i) => (
            <li key={i} className="text-sm">
              <p className="text-stone-700">“{c.quote}”</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                {c.verified ? <span className="text-emerald-700">Found verbatim</span> : <span className="text-amber-700">Not found verbatim, treat as paraphrase</span>}
                <span>·</span>
                <a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-stone-300 hover:decoration-stone-600">{SRC_LABEL[c.src] || c.src}: {c.title}{c.heading ? ` › ${c.heading}` : ""}</a>
              </p>
            </li>
          ))}
        </ul>
      )}
      {a.followUp && a.status !== "SOURCED" && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900"><span className="font-medium">On your IOMETE call:</span> {a.followUp}</p>
      )}
      {a.error && <p className="mt-2 text-xs text-red-600">Error: {a.error}</p>}
      {a.excerpts.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-stone-500 underline decoration-stone-300 hover:text-stone-800">
            {open ? "Hide" : "Show"} the {a.excerpts.length} passages that were searched
          </button>
          {open && (
            <ul className="mt-2 space-y-2">
              {a.excerpts.map((e, i) => (
                <li key={i} className="rounded-md border border-stone-100 bg-stone-50 p-2 text-xs text-stone-600">
                  <a href={e.url} target="_blank" rel="noreferrer" className="font-medium text-stone-800 underline decoration-stone-300">{SRC_LABEL[e.src] || e.src}: {e.title}{e.heading ? ` › ${e.heading}` : ""}</a>
                  <p className="mt-1 whitespace-pre-line">{e.snippet}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
