"use client";

import Link from "next/link";
import { useRef } from "react";
import FactCard from "./FactCard";
import LiveDemo from "./LiveDemo";
import { FREE_TIER, LINKS, PERSONAS, type PersonaId, getPersona } from "@/lib/personas";
import { savePersona, usePersonaId } from "@/lib/usePersona";

const JARGON = [
  { word: "Lakehouse", plain: "One place to keep huge amounts of data cheaply, like a data lake, and still ask it questions in SQL reliably, like a data warehouse." },
  { word: "Sovereign", plain: "The whole platform runs inside your own infrastructure: your servers, your own cloud account, hybrid, or fully air-gapped. Your data stays under your control." },
  { word: "Open", plain: "Built on open-source Apache Spark and Apache Iceberg, running on Kubernetes. Open formats mean you are never locked in." },
];

const STEPS = [
  { title: "Look at your data", text: "Run a ready-made query on a table of sample records from your industry." },
  { title: "Answer a manager's question", text: "One query, one chart. The kind of thing your team would see in Power BI." },
  { title: "Hide what people shouldn't see", text: "Switch to a restricted role and watch names and sensitive fields mask themselves." },
  { title: "Undo a mistake", text: "Delete records on purpose, then restore them from the table's history." },
  { title: "Choose where it runs", text: "Your servers, your cloud account, or fully offline. All three are supported." },
];

export default function Landing() {
  const pid: PersonaId = usePersonaId() ?? "hospital";
  const p = getPersona(pid);
  const detailRef = useRef<HTMLDivElement>(null);

  const choose = (id: PersonaId) => {
    savePersona(id);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <main className="w-full">
      {/* hero with the live demo */}
      <section className="border-b border-stone-200 bg-[#f7f6f2]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Hands-on trial · no sign-up · nothing to install</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight text-stone-900 sm:text-6xl">
              Try IOMETE before you talk to anyone.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
              IOMETE is a data platform that runs inside your own infrastructure. The box on the right is a real one, with sample {p.rowNoun} data.
              Run a query, switch roles, and see sensitive data hide itself. Then take five minutes in the full playground and leave with a one-page brief for your boss.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={`/playground?for=${pid}`} className="rounded-md bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700">Start the five-minute trial</Link>
              <a href="#who" className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-900 hover:bg-stone-50">I&apos;m not a hospital</a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-stone-300 pt-5 text-sm">
              <div><dt className="text-stone-500">Time needed</dt><dd className="mt-0.5 font-medium">About 5 min</dd></div>
              <div><dt className="text-stone-500">Industries</dt><dd className="mt-0.5 font-medium">{PERSONAS.length} sample sets</dd></div>
              <div><dt className="text-stone-500">Every claim</dt><dd className="mt-0.5 font-medium">Quoted and linked</dd></div>
            </dl>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
              <span>Sample data for</span>
              <select value={pid} onChange={(e) => savePersona(e.target.value as PersonaId)} aria-label="Industry for the sample data"
                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900">
                {PERSONAS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <LiveDemo personaId={pid} />
          </div>
        </div>
      </section>

      {/* what the full trial covers */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Five things you can try in the full playground</h2>
            <p className="mt-3 text-stone-600">Each step takes about a minute and links to the IOMETE page that describes the real feature. Finish all five and the site writes up what you saw.</p>
            <Link href={`/playground?for=${pid}`} className="mt-5 inline-block rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">Open the playground</Link>
          </div>
          <ol className="divide-y divide-stone-200 border-y border-stone-200">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-4">
                <span className="font-display text-2xl text-stone-400">{i + 1}</span>
                <div>
                  <div className="font-medium">{s.title}</div>
                  <p className="mt-0.5 text-sm text-stone-600">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* persona picker */}
      <section id="who" className="scroll-mt-20 border-t border-stone-200 bg-[#f7f6f2]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-3xl tracking-tight">Who are you shopping for?</h2>
          <p className="mt-2 text-stone-600">The sample data, the pains and the next steps change with your answer.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {PERSONAS.map((x) => (
              <button key={x.id} type="button" onClick={() => choose(x.id)}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition ${pid === x.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-800 hover:border-stone-900"}`}>
                {x.name}
              </button>
            ))}
          </div>

          <div ref={detailRef} className="mt-8 scroll-mt-24 rounded-lg border border-stone-200 bg-white p-6 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">{p.name}</p>
            <h3 className="mt-2 font-display text-3xl tracking-tight">{p.tagline}</h3>

            <div className="mt-8 grid gap-10 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Sound familiar?</h4>
                <ul className="mt-3 divide-y divide-stone-200 border-y border-stone-200">
                  {p.frictions.map((f) => (
                    <li key={f.text} className="py-3 text-[15px] leading-relaxed text-stone-800">{f.text}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-500">What changes with IOMETE</h4>
                <p className="mt-1 text-sm text-stone-500">In IOMETE&apos;s own words, with a link to where each one is written.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {p.facts.map((f) => <FactCard key={f.quote} fact={f} />)}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">See it work on {p.rowNoun} data like yours</div>
                <div className="text-sm text-stone-600">Five quick steps. Real queries. Nothing to install.</div>
              </div>
              <Link href={`/playground?for=${p.id}`} className="w-fit rounded-md bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700">Start the playground</Link>
            </div>
          </div>
        </div>
      </section>

      {/* jargon */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-3xl tracking-tight">Three words, decoded</h2>
        <dl className="mt-6 grid gap-6 border-t border-stone-200 pt-6 sm:grid-cols-3">
          {JARGON.map((j) => (
            <div key={j.word}>
              <dt className="font-display text-2xl">{j.word}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-stone-600">{j.plain}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ways to start */}
      <section className="border-t border-stone-200 bg-[#f7f6f2]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-3xl tracking-tight">Three easy ways to take the next step</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href={`/playground?for=${pid}`} className="rounded-lg border border-stone-200 bg-white p-6 transition hover:border-stone-900">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Try</div>
              <div className="mt-2 font-medium">Finish the five-minute playground</div>
              <p className="mt-1 text-sm text-stone-600">Run real queries on sample data, hide sensitive fields, undo a mistake, and get a brief for your boss.</p>
            </Link>
            <a href={FREE_TIER.url} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-200 bg-white p-6 transition hover:border-stone-900">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Start</div>
              <div className="mt-2 font-medium">{FREE_TIER.headline}</div>
              <p className="mt-1 text-sm text-stone-600">IOMETE calls it &ldquo;{FREE_TIER.quote}&rdquo;. Zero license cost to get going.</p>
            </a>
            <Link href="/questionnaire" className="rounded-lg border border-stone-200 bg-white p-6 transition hover:border-stone-900">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Review</div>
              <div className="mt-2 font-medium">Breeze through security review</div>
              <p className="mt-1 text-sm text-stone-600">Paste your vendor questionnaire and get answers drafted from IOMETE&apos;s documentation, each with a source.</p>
            </Link>
          </div>
          <p className="mt-8 text-sm text-stone-600">
            Ready to talk? <a className="font-medium text-stone-900 underline decoration-stone-400 underline-offset-2" href={LINKS.contact} target="_blank" rel="noreferrer">Book a call with IOMETE</a>.
            Learn at your pace with <a className="font-medium text-stone-900 underline decoration-stone-400 underline-offset-2" href={LINKS.university} target="_blank" rel="noreferrer">IOMETE University</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
