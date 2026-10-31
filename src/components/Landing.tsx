"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import FactCard from "./FactCard";
import { FREE_TIER, LINKS, PERSONAS, type PersonaId, getPersona } from "@/lib/personas";
import { savePersona, usePersonaId } from "@/lib/usePersona";

const JARGON = [
  { word: "Lakehouse", emoji: "🏠", plain: "One place to keep huge amounts of data cheaply, like a data lake, and still ask it questions in SQL reliably, like a data warehouse." },
  { word: "Sovereign", emoji: "🛡️", plain: "The whole platform runs inside your own infrastructure: your servers, your own cloud account, hybrid, or fully air-gapped. Your data stays under your control." },
  { word: "Open", emoji: "🔓", plain: "Built on open-source Apache Spark and Apache Iceberg, running on Kubernetes. Open formats mean you are never locked in." },
];

export default function Landing() {
  const pid = usePersonaId();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const detailRef = useRef<HTMLDivElement>(null);

  const choose = (id: PersonaId) => {
    savePersona(id);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const p = pid ? getPersona(pid) : null;

  return (
    <main className="w-full">
      {/* hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-white to-stone-50">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-700 shadow-sm ring-1 ring-teal-100">
            ⏱️ 5 minutes · no sign-up · no engineers needed
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
            Your data. <span className="bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">Your building.</span> Your rules.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">
            IOMETE is a data platform that runs inside your own infrastructure. Try it with sample data from your industry,
            see your sensitive data protected, undo a mistake, and walk away with a one-page brief for your boss.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#who" className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-stone-900/10 hover:bg-stone-700">Pick your industry ↓</a>
            <Link href="/playground" className="rounded-full bg-white px-5 py-3 text-sm font-medium ring-1 ring-stone-300 hover:bg-stone-50">Jump into the playground</Link>
          </div>
        </div>
      </section>

      {/* jargon buster */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Three words, decoded</h2>
        <p className="mt-1 text-stone-600">Tap a card to flip it.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {JARGON.map((j) => {
            const on = flipped[j.word];
            return (
              <button key={j.word} type="button" onClick={() => setFlipped((f) => ({ ...f, [j.word]: !f[j.word] }))}
                className="group h-48 text-left [perspective:1000px]" aria-pressed={on}>
                <div className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${on ? "[transform:rotateY(180deg)]" : ""}`}>
                  <div className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 [backface-visibility:hidden] group-hover:ring-teal-300">
                    <span className="text-4xl">{j.emoji}</span>
                    <div>
                      <div className="text-2xl font-semibold">{j.word}</div>
                      <div className="text-sm text-stone-500">What does it actually mean? ↻</div>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-600 to-indigo-600 p-6 text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="text-sm font-medium uppercase tracking-wider text-white/70">{j.word}</div>
                    <p className="mt-2 text-[15px] leading-relaxed">{j.plain}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* persona picker */}
      <section id="who" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-6 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Who are you shopping for?</h2>
        <p className="mt-1 text-stone-600">We&apos;ll tailor the story and the sample data to you.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PERSONAS.map((x) => (
            <button key={x.id} type="button" onClick={() => choose(x.id)}
              className={`flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 ${pid === x.id ? "bg-stone-900 text-white shadow-lg" : "bg-white shadow-sm ring-1 ring-stone-200 hover:ring-teal-300"}`}>
              <span className="text-3xl">{x.emoji}</span>
              <span className="text-sm font-medium leading-tight">{x.name}</span>
            </button>
          ))}
        </div>
      </section>

      {p && (
        <section ref={detailRef} className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-10">
            <p className="text-sm font-medium text-teal-700">{p.emoji} {p.name}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">{p.tagline}</h2>

            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-stone-500">Sound familiar?</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {p.frictions.map((f) => (
                <li key={f.text} className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-stone-800 ring-1 ring-amber-100">
                  <span className="text-2xl">{f.emoji}</span><span>{f.text}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-10 text-sm font-semibold uppercase tracking-wider text-stone-500">Here&apos;s what changes with IOMETE</h3>
            <p className="mt-1 text-sm text-stone-500">In IOMETE&apos;s own words, with a link to where each one is written.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {p.facts.map((f) => <FactCard key={f.quote} fact={f} />)}
            </div>

            <div className="mt-10 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold">See it work on {p.rowNoun} data like yours</div>
                <div className="text-sm text-white/80">Five quick missions. Real queries. Nothing to install.</div>
              </div>
              <Link href={`/playground?for=${p.id}`} className="w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-900 hover:bg-teal-50">
                Start the playground →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ways to start */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Three easy ways to take the next step</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link href={`/playground${p ? `?for=${p.id}` : ""}`} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:ring-teal-300">
            <div className="text-3xl">🎮</div>
            <div className="mt-3 font-semibold">Try it yourself</div>
            <p className="mt-1 text-sm text-stone-600">Run real queries on sample data, hide sensitive fields, undo a mistake. About five minutes.</p>
          </Link>
          <a href={FREE_TIER.url} target="_blank" rel="noreferrer" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:ring-teal-300">
            <div className="text-3xl">🎁</div>
            <div className="mt-3 font-semibold">{FREE_TIER.headline}</div>
            <p className="mt-1 text-sm text-stone-600">IOMETE calls it “{FREE_TIER.quote}”. Zero license cost to get going. ↗</p>
          </a>
          <Link href="/questionnaire" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:ring-teal-300">
            <div className="text-3xl">✅</div>
            <div className="mt-3 font-semibold">Breeze through security review</div>
            <p className="mt-1 text-sm text-stone-600">Paste your vendor questionnaire and get answers drafted from IOMETE&apos;s documentation, each with a source.</p>
          </Link>
        </div>
        <p className="mt-8 text-center text-sm text-stone-500">
          Ready to talk? <a className="font-medium text-teal-700 underline" href={LINKS.contact} target="_blank" rel="noreferrer">Book a call with IOMETE</a> ·
          Learn at your pace with <a className="font-medium text-teal-700 underline" href={LINKS.university} target="_blank" rel="noreferrer">IOMETE University</a>
        </p>
      </section>
    </main>
  );
}
