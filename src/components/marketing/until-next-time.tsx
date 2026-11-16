import Image from "next/image";
import { ButtonLink } from "@/components/layout/button-link";
import { Reveal } from "@/components/motion/reveal";

export function UntilNextTime({ image, signedIn }: { image: string | null; signedIn: boolean }) {
  return (
    <section className="relative isolate overflow-hidden bg-forest py-40 text-cream">
      {image && (
        <>
          <Image src={image} alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-[#0d1f1a]/75" />
        </>
      )}
      <Reveal className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p className="hand text-7xl leading-none text-sand sm:text-9xl">Until next time.</p>
        <p className="mx-auto mt-8 max-w-xl font-serif text-2xl font-medium leading-snug text-cream/90">
          The trip ends. The book stays on the shelf, ready to be opened on a slow evening years from now.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href={signedIn ? "/diaries/new" : "/signup?next=/diaries/new"} variant="accent" size="lg">Start your diary</ButtonLink>
          <ButtonLink href="/plan" variant="light" size="lg">Or plan the next trip</ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
