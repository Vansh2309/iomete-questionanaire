import { Suspense } from "react";
import Playground from "@/components/Playground";

export const metadata = { title: "Playground · Lakehouse Playground for IOMETE" };

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-stone-400">Loading the playground…</div>}>
      <Playground />
    </Suspense>
  );
}
