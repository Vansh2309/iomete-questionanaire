import type { Fact } from "@/lib/personas";

export default function FactCard({ fact, accent = "teal" }: { fact: Fact; accent?: "teal" | "indigo" }) {
  const ring = accent === "teal" ? "hover:ring-teal-300" : "hover:ring-indigo-300";
  return (
    <div className={`group flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md ${ring}`}>
      <h3 className="text-base font-semibold leading-snug">{fact.headline}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">“{fact.quote}”</p>
      <a href={fact.url} target="_blank" rel="noreferrer"
        className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200">
        Source: {fact.source} ↗
      </a>
    </div>
  );
}
