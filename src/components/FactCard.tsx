import type { Fact } from "@/lib/personas";

export default function FactCard({ fact }: { fact: Fact; accent?: "teal" | "indigo" }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="text-[15px] font-semibold leading-snug">{fact.headline}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">&ldquo;{fact.quote}&rdquo;</p>
      <a href={fact.url} target="_blank" rel="noreferrer"
        className="mt-3 w-fit text-xs text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-900 hover:decoration-stone-900">
        Source: {fact.source}
      </a>
    </div>
  );
}
