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
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg tracking-tight">Lakehouse Playground</span>
          <span className="hidden text-xs text-stone-500 sm:inline">for IOMETE</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto text-sm">
          {ITEMS.map((it) => {
            const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
            return (
              <Link key={it.href} href={it.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 ${active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}>
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
