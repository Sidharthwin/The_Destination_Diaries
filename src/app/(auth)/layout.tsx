import Image from "next/image";
import { Logo } from "@/components/layout/logo";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.05fr]">
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-xs text-ink-soft">
          By continuing you agree to our <a className="underline underline-offset-2" href="/terms">terms</a> and{" "}
          <a className="underline underline-offset-2" href="/privacy">privacy summary</a>.
        </p>
      </main>
      <aside className="relative hidden overflow-hidden bg-forest lg:block">
        <Image src="/images/destinations/hampi.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f1a]/85 via-transparent to-transparent" />
        <p className="absolute bottom-12 left-12 right-12 font-serif text-4xl leading-tight text-cream">
          “A good plan is the one you can <span className="italic text-sand">change</span> on the second morning.”
        </p>
        <p className="absolute right-3 top-3 max-w-[15rem] text-right text-[10px] leading-tight text-cream/60">
          Photo: Virupaksha Temple, Hampi — Abhishek.ujoshi, CC BY-SA 4.0, via Wikimedia Commons
        </p>
      </aside>
    </div>
  );
}
