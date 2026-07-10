import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { Button } from "@/components/Button";
import { SectionHeading } from "@/components/SectionHeading";
import { CONSENT_MAX_AGE_SECONDS } from "@/lib/consent";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "The complete cookie list for hmaurora.health: one strictly-necessary cookie storing your consent choice. No analytics, no advertising, no third parties.",
};

export default function CookiePolicyPage() {
  const months = Math.round(CONSENT_MAX_AGE_SECONDS / (60 * 60 * 24 * 30));
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow="Cookie policy"
          title="One cookie. Here's everything about it."
          lede="No advertising cookies, no analytics cookies, no third-party scripts or pixels — on any page. This is the complete list."
        />
      </AuroraHero>

      <article className="section-light">
        <div className="prose-light mx-auto max-w-3xl space-y-10 px-4 py-16 text-base leading-relaxed sm:px-6">
          <section>
            <h2 className="text-2xl">The complete cookie table</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-navy text-left">
                    <th className="py-2.5 pr-4 font-semibold">Cookie</th>
                    <th className="py-2.5 pr-4 font-semibold">Type</th>
                    <th className="py-2.5 pr-4 font-semibold">What it stores</th>
                    <th className="py-2.5 font-semibold">Lifetime</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs">aurora-consent</td>
                    <td className="py-3 pr-4">Strictly necessary</td>
                    <td className="py-3 pr-4">
                      Your consent choice: notice version, when you chose, and which purposes
                      you allowed. First-party, never sent anywhere else.
                    </td>
                    <td className="py-3">{months} months</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              That is the whole table. If future features need anything more (for example,
              first-party cookieless analytics), they stay <strong>off by default</strong> and
              appear here — and in your{" "}
              <a href="/privacy-centre/preferences">consent preferences</a> — before anything
              is enabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl">What we deliberately don&rsquo;t do</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>No third-party analytics, advertising, or social-media trackers on any page.</li>
              <li>No tracking pixels in our emails&rsquo; web views.</li>
              <li>No fingerprinting or similar &ldquo;cookieless&rdquo; tracking techniques.</li>
              <li>Fonts and all assets are served from our own origin — visiting this site tells no other company you were here.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl">Managing your choice</h2>
            <p className="mt-4">
              Change or withdraw consent any time — it takes effect immediately and withdrawing
              is exactly as easy as giving:
            </p>
            <div className="mt-5">
              <Button href="/privacy-centre/preferences">Open consent preferences</Button>
            </div>
            <p className="mt-4">
              You can also clear the cookie from your browser settings; the site keeps working
              and simply asks again.
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
