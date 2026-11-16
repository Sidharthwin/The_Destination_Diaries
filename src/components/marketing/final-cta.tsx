import Image from "next/image";
import { ButtonLink } from "@/components/layout/button-link";
import { Reveal } from "@/components/motion/reveal";

export function FinalCta({ image, signedIn }: { image: string | null; signedIn: boolean }) {
  return (
    <section className="relative isolate overflow-hidden bg-forest py-36 text-cream">
      {image && (
        <>
          <Image src={image} alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-[#0d1f1a]/70" />
        </>
      )}
      <Reveal className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <h2 className="text-6xl leading-[0.98] sm:text-8xl">
          The diary is empty.<br /><span className="italic text-sand">Fill it.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-cream/80">
          Ten quick questions, then a day-by-day plan you can pull apart and put back together.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href={signedIn ? "/trips/new" : "/signup"} variant="accent" size="lg">
            {signedIn ? "Plan a new trip" : "Start planning — it’s free"}
          </ButtonLink>
          <ButtonLink href="/explore" variant="light" size="lg">Explore destinations</ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
