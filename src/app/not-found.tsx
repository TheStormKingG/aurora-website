import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { EcgDivider } from "@/components/EcgDivider";

export default function NotFound() {
  return (
    <AuroraHero className="min-h-[70vh]">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow">404 — page not found</p>
        <h1 className="mt-5 text-4xl sm:text-5xl">This page has drifted off the map.</h1>
        <div className="mt-6 flex justify-center">
          <EcgDivider />
        </div>
        <p className="mt-6 text-lg text-silver">
          The link may be old, or the page may have moved as Aurora grows. The pulse is still
          strong — here&rsquo;s the way back.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Button href="/">Go home</Button>
          <Button href="/services" variant="secondary">
            Browse services
          </Button>
          <Button href="/contact" variant="secondary">
            Contact us
          </Button>
        </div>
      </div>
    </AuroraHero>
  );
}
