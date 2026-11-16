import Link from "next/link";
import { pill } from "@/components/layout/button-link";

export function DiaryLoading() {
  return <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-16 text-sm text-ink-soft sm:px-8" aria-busy="true">Opening your diary…</div>;
}

export function DiaryMissing({ error }: { error?: string | null }) {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-20 text-center">
      <p className="kicker justify-center">Not on this shelf</p>
      <h1 className="mt-4 text-5xl">We could not find that diary</h1>
      <p className="mt-4 text-ink-soft">
        {error ?? "Diaries are saved in the browser you made them in. This one may have been deleted, or made on another device."}
      </p>
      <Link href="/diaries" className={pill("primary", "md", "mt-8")}>Back to my diaries</Link>
    </div>
  );
}
