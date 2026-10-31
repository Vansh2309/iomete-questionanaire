"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/playground", label: "Try it live" },
  { href: "/ask", label: "Ask anything" },
  { href: "/questionnaire", label: "Security review" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600 text-sm text-white">⛵</span>
          <span className="hidden sm:inline">Lakehouse Playground</span>
          <span className="whitespace-nowrap rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 ring-1 ring-teal-200">for IOMETE</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto text-sm">
          {ITEMS.map((it) => {
            const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
            return (
              <Link key={it.href} href={it.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 ${active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
