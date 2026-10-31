import { Suspense } from "react";
import Ask from "@/components/Ask";

export const metadata = { title: "Ask anything · Lakehouse Playground for IOMETE" };

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-stone-400">Loading…</div>}>
      <Ask />
    </Suspense>
  );
}
