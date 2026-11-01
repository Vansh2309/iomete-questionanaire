"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { savePersona, usePersonaId } from "@/lib/usePersona";
import { FREE_TIER, LINKS, PERSONAS, type PersonaId, getPersona } from "@/lib/personas";
import type { AskAnswer } from "@/lib/ask";

const AUDIENCE_OPTIONS = [
  { id: "leader", label: "A busy leader" },
  { id: "finance", label: "Finance" },
  { id: "security", label: "Security" },
  { id: "it", label: "IT team" },
  { id: "student", label: "A total beginner" },
] as const;

const NEXT: Record<AskAnswer["nextStep"], { label: string; href: string; external?: boolean }> = {
  playground: { label: "See it live in the playground", href: "/playground" },
  free: { label: "Start free (up to 100 vCPUs)", href: FREE_TIER.url, external: true },
  call: { label: "Book a call with IOMETE", href: LINKS.contact, external: true },
  questionnaire: { label: "Run your security questionnaire", href: "/questionnaire" },
};

type Item = { id: number; question: string; pending: boolean; answer?: AskAnswer };

export default function Ask() {
  const params = useSearchParams();
  const router = useRouter();
  const pid: PersonaId = usePersonaId(params.get("for")) ?? "other";
  const [audience, setAudience] = useState<(typeof AUDIENCE_OPTIONS)[number]["id"]>("leader");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const idRef = useRef(0);
  const p = getPersona(pid);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question) return;
    const id = ++idRef.current;
    setItems((all) => [{ id, question, pending: true }, ...all]);
    setQ("");
    let answer: AskAnswer;
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, persona: pid, audience }) });
      answer = await res.json();
      if (!res.ok) throw new Error((answer as unknown as { error?: string }).error || res.statusText);
    } catch (err) {
      answer = { question, answered: false, answer: "That didn't go through. Try again in a moment.", highlights: [], citations: [], nextStep: "call", further: [], error: String(err) };
    }
    setItems((all) => all.map((it) => (it.id === id ? { ...it, pending: false, answer } : it)));
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium text-emerald-700">Ask anything</p>
      <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">Questions in plain words, answers in plain words</h1>
      <p className="mt-2 text-stone-600">Every answer is drawn from IOMETE&apos;s own documentation and shows you where it came from.</p>

      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">Explain it to</span>
          {AUDIENCE_OPTIONS.map((a) => (
            <button key={a.id} type="button" onClick={() => setAudience(a.id)}
              className={`rounded-md border px-3 py-1.5 transition ${audience === a.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-900"}`}>
              {a.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">at a</span>
          <select value={pid} onChange={(e) => { const id = e.target.value as PersonaId; savePersona(id); router.replace(`/ask?for=${id}`, { scroll: false }); }}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5">
            {PERSONAS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>

        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(q); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Does our data ever leave our building?" maxLength={500}
            className="min-w-0 flex-1 rounded-md border border-stone-300 px-4 py-2.5 text-sm focus:border-stone-900 focus:outline-none" />
          <button type="submit" disabled={!q.trim()} className="shrink-0 rounded-md bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-40">Ask</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.askSuggestions.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-left text-xs text-stone-700 hover:border-stone-900 hover:bg-white">{s}</button>
          ))}
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        {items.map((it) => (
          <li key={it.id} className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="text-sm font-medium text-stone-500">You asked</div>
            <div className="mt-0.5 font-semibold">{it.question}</div>
            {it.pending || !it.answer ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-stone-400">
                <span className="inline-flex gap-1"><Dot d={0} /><Dot d={150} /><Dot d={300} /></span> Reading IOMETE&apos;s docs
              </div>
            ) : (
              <AnswerView a={it.answer} persona={pid} />
            )}
          </li>
        ))}
        {!items.length && <li className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-400">Pick a suggestion above to see how it works.</li>}
      </ol>
    </main>
  );
}

function Dot({ d }: { d: number }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: `${d}ms` }} />;
}

function AnswerView({ a, persona }: { a: AskAnswer; persona: PersonaId }) {
  const next = NEXT[a.nextStep];
  const href = next.href === "/playground" ? `/playground?for=${persona}` : next.href;
  return (
    <div className="mt-3">
      <p className="text-[15px] leading-relaxed text-stone-800">{a.answer}</p>
      {a.highlights.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {a.highlights.map((h) => <li key={h} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900">{h}</li>)}
        </ul>
      )}
      {a.citations.length > 0 && (
        <div className="mt-4 space-y-2 border-l-2 border-stone-300 pl-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Where this comes from</div>
          {a.citations.map((c) => (
            <div key={c.quote} className="text-sm">
              <p className="text-stone-600">&ldquo;{c.quote}&rdquo;</p>
              <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900">{c.title}{c.heading ? ` › ${c.heading}` : ""}</a>
            </div>
          ))}
        </div>
      )}
      {!a.answered && a.further.length > 0 && (
        <div className="mt-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Good pages to read meanwhile</div>
          <ul className="mt-1 space-y-1">
            {a.further.map((f) => <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer" className="text-stone-700 underline decoration-stone-300 underline-offset-2 hover:text-stone-900">{f.title}</a></li>)}
          </ul>
        </div>
      )}
      <div className="mt-4">
        {next.external
          ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">{next.label}</a>
          : <Link href={href} className="inline-flex rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">{next.label}</Link>}
      </div>
    </div>
  );
}
