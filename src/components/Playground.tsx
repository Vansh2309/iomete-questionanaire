"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { savePersona, usePersonaId } from "@/lib/usePersona";
import confetti from "canvas-confetti";
import FactCard from "./FactCard";
import {
  DEPLOY_CHOICES, FREE_TIER, LINKS, MISSION_DOCS, PERSONAS, TIME_TRAVEL_DOC,
  type Persona, type PersonaId, getPersona,
} from "@/lib/personas";

type Row = Record<string, string | number>;
type Snap = { v: number; label: string; at: string; rows: Row[] };
type Result = { kind: "rows"; columns: string[]; rows: Row[] } | { kind: "write"; message: string } | { kind: "error"; message: string };
// alasql has no bundled types we can rely on, so keep the surface we use small.
type Db = { exec: (sql: string) => unknown; tables: Record<string, { data: Row[] }> };

const MISSIONS = [
  { key: "explore", title: "Meet your data", doc: MISSION_DOCS.explore },
  { key: "question", title: "Ask a business question", doc: MISSION_DOCS.question },
  { key: "mask", title: "Hide sensitive data", doc: MISSION_DOCS.mask },
  { key: "undo", title: "Undo a mistake", doc: MISSION_DOCS.undo },
  { key: "deploy", title: "Choose where it runs", doc: MISSION_DOCS.deploy },
] as const;
type MissionKey = (typeof MISSIONS)[number]["key"];

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmt = (v: unknown, key?: string) => (typeof v === "number" && key !== "id" ? v.toLocaleString("en-IN") : String(v ?? ""));
function mask(v: unknown) {
  const s = String(v ?? "");
  if (!s) return s;
  return s.replace(/[A-Za-z0-9]/g, (ch, i) => (i === 0 ? ch : "•"));
}

export default function Playground() {
  const params = useSearchParams();
  const router = useRouter();
  const pid: PersonaId = usePersonaId(params.get("for")) ?? "hospital";
  const p: Persona = getPersona(pid);

  const dbRef = useRef<Db | null>(null);
  const [ready, setReady] = useState(false);
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [role, setRole] = useState<"full" | "restricted">("full");
  const [active, setActive] = useState<MissionKey>("explore");
  const [done, setDone] = useState<Record<MissionKey, boolean>>({ explore: false, question: false, mask: false, undo: false, deploy: false });
  const [deleted, setDeleted] = useState(0);
  const [recovered, setRecovered] = useState(0);
  const [topAnswer, setTopAnswer] = useState<string | null>(null);
  const [deploy, setDeploy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const briefRef = useRef<HTMLDivElement>(null);

  const readRows = useCallback((): Row[] => {
    const db = dbRef.current;
    if (!db) return [];
    return (db.exec(`SELECT * FROM ${p.table}`) as Row[]).map((r) => ({ ...r }));
  }, [p.table]);

  // (re)build the in-browser database whenever the persona changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("alasql");
      const alasql = (mod.default ?? mod) as unknown as { Database: new () => Db };
      if (cancelled) return;
      const db = new alasql.Database();
      db.exec(`CREATE TABLE ${p.table}`);
      db.tables[p.table].data = p.rows.map((r) => ({ ...r }));
      dbRef.current = db;
      setSnaps([{ v: 1, label: "Original data loaded", at: now(), rows: p.rows.map((r) => ({ ...r })) }]);
      setRowCount(p.rows.length);
      setSql(`SELECT * FROM ${p.table} LIMIT 10`);
      setResult(null);
      setRole("full");
      setActive("explore");
      setDone({ explore: false, question: false, mask: false, undo: false, deploy: false });
      setDeleted(0); setRecovered(0); setTopAnswer(null); setDeploy(null);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [p]);

  const complete = useCallback((k: MissionKey) => {
    setDone((d) => {
      if (d[k]) return d;
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.75 }, scalar: 0.9 });
      return { ...d, [k]: true };
    });
  }, []);

  const run = useCallback((text?: string) => {
    const db = dbRef.current;
    const q = (text ?? sql).trim().replace(/;+\s*$/, "");
    if (!db || !q) return;
    if (/;/.test(q)) { setResult({ kind: "error", message: "Run one statement at a time." }); return; }
    if (/^\s*(drop|create|alter)\b/i.test(q)) { setResult({ kind: "error", message: "The playground keeps the table structure fixed. Try SELECT, UPDATE or DELETE." }); return; }
    try {
      const before = rowCount;
      const out = db.exec(q);
      if (/^\s*(delete|update|insert)\b/i.test(q)) {
        const rows = readRows();
        const n = typeof out === "number" ? out : 0;
        const verb = q.trim().split(/\s+/)[0].toUpperCase();
        setSnaps((s) => [...s, { v: s.length + 1, label: `${verb} · ${n} ${p.rowNoun}${n === 1 ? "" : "s"} changed`, at: now(), rows }]);
        setRowCount(rows.length);
        setResult({ kind: "write", message: `${verb} done. ${n} ${p.rowNoun}${n === 1 ? "" : "s"} affected. The table now has ${rows.length} rows.` });
        if (verb === "DELETE" && rows.length < before) setDeleted(before - rows.length);
        return;
      }
      const rows = (Array.isArray(out) ? out : []) as Row[];
      const columns = rows.length ? Object.keys(rows[0]) : [];
      setResult({ kind: "rows", columns, rows });
      if (rows.length && new RegExp(`\\bfrom\\s+${p.table}\\b`, "i").test(q)) complete("explore");
      if (columns.length === 2 && rows.length > 1 && typeof rows[0][columns[1]] === "number") {
        complete("question");
        setTopAnswer(`${fmt(rows[0][columns[0]])} (${fmt(rows[0][columns[1]])} ${columns[1].replace(/_/g, " ")})`);
      }
    } catch (err) {
      setResult({ kind: "error", message: `That query didn't run: ${err instanceof Error ? err.message : String(err)}` });
    }
  }, [sql, rowCount, readRows, p.rowNoun, p.table, complete]);

  const restore = (s: Snap) => {
    const db = dbRef.current;
    if (!db) return;
    const before = rowCount;
    db.tables[p.table].data = s.rows.map((r) => ({ ...r }));
    const rows = readRows();
    setSnaps((all) => [...all, { v: all.length + 1, label: `Restored to version ${s.v}`, at: now(), rows }]);
    setRowCount(rows.length);
    if (rows.length > before) { setRecovered(rows.length - before); complete("undo"); }
    run(`SELECT * FROM ${p.table} LIMIT 10`);
  };

  const switchRole = (r: "full" | "restricted") => {
    setRole(r);
    if (r === "restricted") {
      if (result?.kind !== "rows" || !result.columns.some((c) => p.columns.find((x) => x.key === c)?.sensitive)) run(`SELECT * FROM ${p.table} LIMIT 10`);
      complete("mask");
    }
  };

  const fill = (text: string, go = false) => { setSql(text); if (go) run(text); };
  const allDone = MISSIONS.every((m) => done[m.key]);
  const doneCount = MISSIONS.filter((m) => done[m.key]).length;

  useEffect(() => {
    if (!allDone) return;
    const end = Date.now() + 900;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 } });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    setTimeout(() => briefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
  }, [allDone]);

  const sensitive = useMemo(() => p.columns.filter((c) => c.sensitive), [p.columns]);
  const deployChoice = DEPLOY_CHOICES.find((d) => d.id === deploy) || null;

  const briefText = useMemo(() => {
    const lines = [
      `IOMETE: what we saw in a 5-minute hands-on trial (${p.name.toLowerCase()})`,
      ``,
      `We tried IOMETE with sample ${p.rowNoun} data, using the same steps as the real product. We:`,
      `- Ran our first query on the ${p.table} table in seconds.`,
      `- Answered "${p.questionLabel}"${topAnswer ? `: ${topAnswer}.` : "."}`,
      `- Switched to the ${p.roles.restricted} view and saw ${sensitive.map((c) => c.label.toLowerCase()).join(" and ")} hidden automatically. ${p.roles.why}`,
      `- Deleted ${deleted || "a batch of"} records by mistake, then restored ${recovered || "them"} in one click with time travel.`,
      `- Confirmed it can run ${deployChoice ? deployChoice.label.toLowerCase() + " (" + deployChoice.detail.toLowerCase() + ")" : "inside our own infrastructure"}.`,
      ``,
      `Why it matters for us, in IOMETE's own words:`,
      ...p.facts.map((f) => `- ${f.headline}: "${f.quote}" (${f.url})`),
      ``,
      `Suggested next step: start on the free tier (zero license cost, up to 100 vCPUs: ${FREE_TIER.url}) or book a call with IOMETE (${LINKS.contact}).`,
    ];
    return lines.join("\n");
  }, [p, topAnswer, sensitive, deleted, recovered, deployChoice]);

  const copyBrief = async () => {
    try { await navigator.clipboard.writeText(briefText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* header + persona switch */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Playground · {p.name}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">Try IOMETE in five quick missions</h1>
          <p className="mt-1 max-w-2xl text-stone-600">This is a safe practice copy with made-up {p.rowNoun} data. Nothing you do here can break anything, so click freely.</p>
        </div>
        <label className="text-sm text-stone-600">
          Industry{" "}
          <select value={pid} onChange={(e) => { const id = e.target.value as PersonaId; savePersona(id); router.replace(`/playground?for=${id}`, { scroll: false }); }}
            className="ml-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm">
            {PERSONAS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
      </div>

      {/* progress */}
      <div className="mt-6 rounded-lg bg-white p-4 border border-stone-200">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{doneCount === 5 ? "All five missions complete" : `${doneCount} of 5 missions complete`}</span>
          <span className="text-stone-500">about a minute each</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-md bg-stone-100">
          <div className="h-full rounded-md bg-emerald-700 transition-all duration-500" style={{ width: `${doneCount * 20}%` }} />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {MISSIONS.map((m, i) => (
            <button key={m.key} type="button" onClick={() => setActive(m.key)}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm ring-1 transition ${active === m.key ? "bg-stone-900 text-white ring-stone-900" : done[m.key] ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-sm text-[11px] font-semibold ${active === m.key ? "bg-white text-stone-900" : done[m.key] ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-600"}`}>{done[m.key] ? "✓" : i + 1}</span><span>{m.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* mission card */}
        <MissionPanel
          p={p} active={active} done={done} deploy={deploy} deleted={deleted} recovered={recovered}
          onFill={fill} onRole={switchRole} role={role}
          onDeploy={(id) => { setDeploy(id); complete("deploy"); }}
          onNext={() => { const i = MISSIONS.findIndex((m) => m.key === active); const next = MISSIONS.slice(i + 1).find((m) => !done[m.key]) || MISSIONS.find((m) => !done[m.key]); if (next) setActive(next.key); }}
        />

        {/* workspace */}
        <section className="min-w-0 space-y-4">
          {active !== "deploy" ? (
            <>
              <div className="rounded-lg bg-stone-900 p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-xs text-stone-400">
                  <span>SQL editor · table <span className="font-mono text-emerald-300">{p.table}</span> · {rowCount} rows</span>
                  <span className="hidden sm:inline">Ctrl + Enter to run</span>
                </div>
                <textarea value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false} rows={3}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
                  className="w-full resize-y rounded-lg bg-stone-800 p-3 font-mono text-[13px] leading-5 text-emerald-100 outline-none ring-1 ring-stone-700 focus:ring-emerald-500" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => run()} disabled={!ready}
                    className="rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-emerald-400 disabled:opacity-40">Run query</button>
                  <span className="text-xs text-stone-400">Viewing as</span>
                  {(["full", "restricted"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => switchRole(r)}
                      className={`rounded-md px-3 py-1 text-xs ring-1 ${role === r ? "bg-white text-stone-900 ring-white" : "text-stone-300 ring-stone-600 hover:bg-stone-800"}`}>
                      {r === "full" ? p.roles.full : p.roles.restricted}
                    </button>
                  ))}
                </div>
              </div>

              <Results result={result} p={p} role={role} />

              <History snaps={snaps} onRestore={restore} highlight={active === "undo"} table={p.table} />
            </>
          ) : (
            <DeployView choice={deploy} p={p} />
          )}
        </section>
      </div>

      {allDone && (
        <section id="brief" ref={briefRef} className="mt-10 scroll-mt-20 rounded-lg bg-stone-900 p-6 text-white shadow-xl sm:p-10">
          <p className="text-sm font-medium text-white/70">Done in five minutes</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Your one-page brief for the boss</h2>
          <p className="mt-2 max-w-2xl text-white/80">Copy it into an email or save it as a PDF. Every claim links back to IOMETE&apos;s own pages.</p>
          <pre className="mt-6 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-white/10 p-5 font-sans text-sm leading-relaxed ring-1 ring-white/20">{briefText}</pre>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={copyBrief} className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-stone-900 hover:bg-emerald-50">{copied ? "Copied" : "Copy the brief"}</button>
            <button type="button" onClick={() => window.print()} className="rounded-md bg-white/10 px-5 py-2.5 text-sm font-medium ring-1 ring-white/40 hover:bg-white/20">Save as PDF</button>
            <a href={FREE_TIER.url} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-5 py-2.5 text-sm font-medium ring-1 ring-white/40 hover:bg-white/20">Start free</a>
            <a href={LINKS.contact} target="_blank" rel="noreferrer" className="rounded-md bg-white/10 px-5 py-2.5 text-sm font-medium ring-1 ring-white/40 hover:bg-white/20">Book a call with IOMETE</a>
            <Link href={`/ask?for=${p.id}`} className="rounded-md bg-white/10 px-5 py-2.5 text-sm font-medium ring-1 ring-white/40 hover:bg-white/20">Ask a follow-up question</Link>
          </div>
        </section>
      )}
    </main>
  );
}

function MissionPanel({ p, active, done, deploy, deleted, recovered, role, onFill, onRole, onDeploy, onNext }: {
  p: Persona; active: MissionKey; done: Record<MissionKey, boolean>; deploy: string | null; deleted: number; recovered: number;
  role: "full" | "restricted"; onFill: (sql: string, go?: boolean) => void; onRole: (r: "full" | "restricted") => void; onDeploy: (id: string) => void; onNext: () => void;
}) {
  const m = MISSIONS.find((x) => x.key === active)!;
  const idx = MISSIONS.findIndex((x) => x.key === active);
  const sens = p.columns.filter((c) => c.sensitive).map((c) => c.label.toLowerCase()).join(" and ");
  return (
    <aside className="h-fit rounded-lg bg-white p-5 border border-stone-200 lg:sticky lg:top-20">
      <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Mission {idx + 1} of 5</div>
      <h2 className="mt-1 text-xl font-semibold">{m.title}</h2>

      <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-700">
        {active === "explore" && (<>
          <p>Every {p.rowNoun} record lives in one table called <b>{p.table}</b>. In IOMETE you look at it with a simple question written in SQL.</p>
          <p>Press <b>Run</b> to see the first ten rows. No SQL knowledge needed; the query is already written for you.</p>
          <Btn onClick={() => onFill(`SELECT * FROM ${p.table} LIMIT 10`, true)}>Show me the data</Btn>
        </>)}
        {active === "question" && (<>
          <p>Now ask something a manager would ask: <b>“{p.questionLabel}”</b></p>
          <p>The answer appears as a chart, the same kind your team would see in Power BI or Tableau connected to IOMETE.</p>
          <Btn onClick={() => onFill(p.questionSql, true)}>Answer it</Btn>
        </>)}
        {active === "mask" && (<>
          <p>Not everyone should see everything. The <b>{p.roles.restricted}</b> shouldn&apos;t see {sens}. {p.roles.why}</p>
          <p>Switch who you are and watch those columns hide themselves. Nobody had to copy or clean the data.</p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => onRole("restricted")} variant={role === "restricted" ? "solid" : "ghost"}>View as {p.roles.restricted}</Btn>
            <Btn onClick={() => onRole("full")} variant={role === "full" ? "solid" : "ghost"}>Back to {p.roles.full}</Btn>
          </div>
          <Hint>In IOMETE this rule runs inside the query engine, so every tool and every dashboard gets the masked version automatically.</Hint>
        </>)}
        {active === "undo" && (<>
          <p>Everyone makes mistakes. Let&apos;s make a big one on purpose: <b>{p.deleteLabel.toLowerCase()}</b>.</p>
          <Btn onClick={() => onFill(p.deleteSql, true)} variant="danger">Make the mistake</Btn>
          {deleted > 0 && <p className="rounded-lg bg-rose-50 p-2 text-rose-800">Oops: {deleted} records are gone. Now open <b>Table history</b> on the right and restore <b>version 1</b>.</p>}
          {recovered > 0 && <p className="rounded-lg bg-emerald-50 p-2 text-emerald-800">Phew. {recovered} records are back, exactly as they were.</p>}
          <Hint>IOMETE keeps every version of a table, so you can travel back in time. The real command is <code className="rounded bg-stone-100 px-1">SELECT * FROM {p.table} VERSION AS OF &lt;snapshot&gt;</code>. <a className="underline" href={TIME_TRAVEL_DOC} target="_blank" rel="noreferrer">See the docs</a></Hint>
        </>)}
        {active === "deploy" && (<>
          <p>Last one. Where would your organisation want IOMETE to run? Pick the one that fits; all three are supported.</p>
          <div className="space-y-2">
            {DEPLOY_CHOICES.map((d) => (
              <button key={d.id} type="button" onClick={() => onDeploy(d.id)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left ring-1 transition ${deploy === d.id ? "bg-stone-900 text-white ring-stone-900" : "bg-white ring-stone-300 hover:ring-emerald-400"}`}>
                <span><span className="block font-medium">{d.label}</span><span className={`block text-xs ${deploy === d.id ? "text-white/70" : "text-stone-500"}`}>{d.detail}</span></span>
              </button>
            ))}
          </div>
        </>)}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-stone-100 pt-4">
        <a href={m.doc.url} target="_blank" rel="noreferrer" className="text-xs text-stone-500 underline decoration-stone-300 hover:text-stone-800">Read the docs: {m.doc.label}</a>
        {done[active] && <button type="button" onClick={onNext} className="shrink-0 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">Next</button>}
      </div>
    </aside>
  );
}

function Btn({ children, onClick, variant = "solid" }: { children: React.ReactNode; onClick: () => void; variant?: "solid" | "ghost" | "danger" }) {
  const cls = variant === "solid" ? "bg-stone-900 text-white hover:bg-stone-700" : variant === "danger" ? "bg-rose-600 text-white hover:bg-rose-500" : "bg-white ring-1 ring-stone-300 hover:bg-stone-50";
  return <button type="button" onClick={onClick} className={`rounded-md px-4 py-2 text-sm font-medium transition ${cls}`}>{children}</button>;
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="border-l-2 border-emerald-700 bg-stone-50 p-3 text-xs leading-relaxed text-stone-700"><span className="font-semibold text-stone-900">In the real product: </span>{children}</p>;
}

function Results({ result, p, role }: { result: Result | null; p: Persona; role: "full" | "restricted" }) {
  if (!result) return <div className="rounded-lg border-2 border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">Results show up here. Try the button in the mission card.</div>;
  if (result.kind === "error") return <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">{result.message}</div>;
  if (result.kind === "write") return <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-200">{result.message}</div>;
  const { columns, rows } = result;
  const isChart = columns.length === 2 && rows.length > 1 && typeof rows[0][columns[1]] === "number";
  const max = isChart ? Math.max(...rows.map((r) => Number(r[columns[1]]) || 0)) : 0;
  const sens = new Set(p.columns.filter((c) => c.sensitive).map((c) => c.key));
  const label = (k: string) => p.columns.find((c) => c.key === k)?.label || k.replace(/_/g, " ");
  return (
    <div className="space-y-4">
      {isChart && (
        <div className="rounded-lg bg-white p-5 border border-stone-200">
          <div className="text-sm font-medium">{p.questionLabel}</div>
          <div className="mt-4 space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[110px_minmax(0,1fr)_80px] items-center gap-3 text-sm">
                <span className="truncate text-stone-600">{fmt(r[columns[0]])}</span>
                <div className="h-6 rounded-md bg-stone-100">
                  <div className={`h-full rounded-md ${i === 0 ? "bg-emerald-700" : "bg-emerald-300"} transition-all duration-700`} style={{ width: `${max ? (Number(r[columns[1]]) / max) * 100 : 0}%` }} />
                </div>
                <span className="text-right font-mono text-xs tabular-nums">{fmt(r[columns[1]])}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-lg bg-white border border-stone-200">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2 text-xs text-stone-500">
          <span>{rows.length} row{rows.length === 1 ? "" : "s"}</span>
          {role === "restricted" && [...sens].some((k) => columns.includes(k)) && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">Masked for {p.roles.restricted}</span>}
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>{columns.map((c) => <th key={c} className="whitespace-nowrap px-4 py-2 font-medium">{label(c)}{role === "restricted" && sens.has(c) ? " (masked)" : ""}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-t border-stone-100">
                  {columns.map((c) => {
                    const hidden = role === "restricted" && sens.has(c);
                    return <td key={c} className={`whitespace-nowrap px-4 py-2 ${hidden ? "font-mono text-emerald-500" : ""}`}>{hidden ? mask(r[c]) : fmt(r[c], c)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function History({ snaps, onRestore, highlight, table }: { snaps: Snap[]; onRestore: (s: Snap) => void; highlight: boolean; table: string }) {
  return (
    <div className={`rounded-lg bg-white p-4 shadow-sm ring-1 transition ${highlight ? "ring-2 ring-emerald-400" : "ring-stone-200"}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Table history <span className="font-normal text-stone-500">· every change to {table} is kept</span></div>
      </div>
      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {snaps.map((s, i) => (
          <li key={s.v} className={`min-w-[180px] shrink-0 rounded-lg p-3 text-xs ring-1 ${i === snaps.length - 1 ? "bg-emerald-50 ring-emerald-200" : "bg-stone-50 ring-stone-200"}`}>
            <div className="font-semibold">Version {s.v} {i === snaps.length - 1 && <span className="font-normal text-emerald-700">· current</span>}</div>
            <div className="mt-0.5 text-stone-600">{s.label}</div>
            <div className="mt-0.5 text-stone-400">{s.at} · {s.rows.length} rows</div>
            {i !== snaps.length - 1 && (
              <button type="button" onClick={() => onRestore(s)} className="mt-2 rounded-md bg-stone-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-stone-700">Restore this version</button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DeployView({ choice, p }: { choice: string | null; p: Persona }) {
  const d = DEPLOY_CHOICES.find((x) => x.id === choice);
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-6 border border-stone-200">
        <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div className={`relative rounded-lg border-2 border-dashed p-6 transition ${d ? "border-emerald-500 bg-emerald-50/60" : "border-stone-300"}`}>
            <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">Your perimeter {d ? `· ${d.label}` : ""}</div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-md border border-stone-200 bg-white p-3 font-medium">Your {p.rowNoun} data</div>
              <div className="rounded-md border border-emerald-700 bg-white p-3 font-medium text-emerald-800">IOMETE</div>
              <div className="rounded-md border border-stone-200 bg-white p-3 font-medium">Your team</div>
            </div>
            <p className="mt-4 text-center text-sm text-stone-600">{d ? "Everything runs here. Data never has to leave." : "Pick an option in the mission card."}</p>
          </div>
          <div className="text-center text-sm text-stone-400">
            <div className="mx-auto mb-2 h-10 w-10 rounded-md border border-dashed border-stone-300" />
            Outside world
            <div className="mt-1 text-xs">{d ? "No data sent out" : ""}</div>
          </div>
        </div>
      </div>
      {d && <FactCard fact={d.fact} />}
    </div>
  );
}
