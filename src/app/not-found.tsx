import { ButtonLink } from "@/components/layout/button-link";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-5 text-center">
      <Logo />
      <p className="eyebrow mt-12">Page not found</p>
      <h1 className="mt-4 max-w-2xl text-6xl">This road does not go anywhere.</h1>
      <p className="mt-5 max-w-md text-ink-soft">The page may have moved, or the trip may be private.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back home</ButtonLink>
        <ButtonLink href="/explore" variant="outline">Explore destinations</ButtonLink>
      </div>
    </main>
  );
}
