"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getPersona, type PersonaId } from "@/lib/personas";

type Row = Record<string, string | number>;
type Db = { exec: (sql: string) => unknown; tables: Record<string, { data: Row[] }> };

const fmt = (v: unknown, key?: string) => (typeof v === "number" && key !== "id" ? v.toLocaleString("en-IN") : String(v ?? ""));
const mask = (v: unknown) => String(v ?? "").replace(/[A-Za-z0-9]/g, (ch, i) => (i === 0 ? ch : "•"));

/** A small, real SQL sandbox for the home page. Same engine and sample data as the full playground. */
export default function LiveDemo({ personaId }: { personaId: PersonaId }) {
  const p = getPersona(personaId);
  const dbRef = useRef<Db | null>(null);
  const [sql, setSql] = useState(`SELECT * FROM ${p.table} LIMIT 5`);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"full" | "restricted">("full");
  const [ran, setRan] = useState(0);

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
      const q = `SELECT * FROM ${p.table} LIMIT 5`;
      setSql(q);
      setRole("full");
      setError(null);
      setRows(db.exec(q) as Row[]);
    })();
    return () => { cancelled = true; };
  }, [p]);

  const run = (q = sql) => {
    const db = dbRef.current;
    if (!db) return;
    const text = q.trim().replace(/;+\s*$/, "");
    if (!/^\s*select\b/i.test(text) || /;/.test(text)) {
      setError("This quick demo runs one SELECT at a time. The full playground also lets you change data and undo it.");
      return;
    }
    try {
      const out = db.exec(text);
      setRows(Array.isArray(out) ? (out as Row[]) : []);
      setError(null);
      setRan((n) => n + 1);
    } catch (e) {
      setError(`That query didn't run: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const columns = rows?.length ? Object.keys(rows[0]) : [];
  const sens = new Set(p.columns.filter((c) => c.sensitive).map((c) => c.key));
  const label = (k: string) => p.columns.find((c) => c.key === k)?.label || k.replace(/_/g, " ");
  const masking = role === "restricted" && columns.some((c) => sens.has(c));

  return (
    <div className="overflow-hidden rounded-lg border border-stone-900 bg-white shadow-[0_1px_0_#1c1917,0_12px_40px_-20px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-4 py-2 text-xs text-stone-600">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" /></span>
          Live · a real SQL engine running in your browser
        </span>
        <span className="font-mono">{p.table} · {p.rows.length} sample rows</span>
      </div>

      <div className="bg-stone-900 p-3">
        <textarea value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false} rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
          aria-label="SQL query"
          className="w-full resize-none rounded-md bg-stone-800 p-3 font-mono text-[13px] leading-5 text-emerald-100 outline-none ring-1 ring-stone-700 focus:ring-emerald-500" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => run()} className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-stone-950 hover:bg-emerald-400">Run query</button>
          <button type="button" onClick={() => { const q = `SELECT * FROM ${p.table} LIMIT 5`; setSql(q); run(q); }} className="rounded-md px-3 py-1.5 text-xs text-stone-300 ring-1 ring-stone-600 hover:bg-stone-800">First five rows</button>
          <button type="button" onClick={() => { setSql(p.questionSql); run(p.questionSql); }} className="rounded-md px-3 py-1.5 text-xs text-stone-300 ring-1 ring-stone-600 hover:bg-stone-800">{p.questionLabel}</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-stone-500">Viewing as</span>
          <div className="inline-flex overflow-hidden rounded-md border border-stone-300">
            {(["full", "restricted"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`px-2.5 py-1 ${role === r ? "bg-stone-900 text-white" : "bg-white text-stone-700 hover:bg-stone-50"}`}>
                {r === "full" ? p.roles.full : p.roles.restricted}
              </button>
            ))}
          </div>
        </div>
        {masking ? <span className="font-medium text-emerald-700">Sensitive columns masked automatically</span> : <span className="text-stone-400">{rows ? `${rows.length} row${rows.length === 1 ? "" : "s"}` : "Loading sample data"}</span>}
      </div>

      <div className="max-h-64 overflow-auto">
        {error ? (
          <p className="p-4 text-sm text-amber-800">{error}</p>
        ) : rows && columns.length ? (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wider text-stone-500">
              <tr>{columns.map((c) => <th key={c} className="whitespace-nowrap border-b border-stone-200 px-4 py-2 font-medium">{label(c)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={`${ran}-${i}`} className="border-t border-stone-100">
                  {columns.map((c) => {
                    const hidden = role === "restricted" && sens.has(c);
                    return <td key={c} className={`whitespace-nowrap px-4 py-1.5 ${hidden ? "font-mono text-emerald-700" : ""}`}>{hidden ? mask(r[c]) : fmt(r[c], c)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-sm text-stone-400">{rows ? "No rows matched." : "Loading sample data…"}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600">
        <span>Made-up {p.rowNoun} data. Nothing leaves this page.</span>
        <Link href={`/playground?for=${p.id}`} className="font-medium text-stone-900 underline decoration-stone-400 underline-offset-2 hover:decoration-stone-900">Open the full playground: undo a mistake, pick where it runs, get the brief</Link>
      </div>
    </div>
  );
}
