import type { Metadata } from "next";
import { AuroraHero } from "@/components/AuroraHero";
import { SectionHeading } from "@/components/SectionHeading";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "The H.M. Aurora Health Systems privacy notice: what we collect, why, how long we keep it, who sees it, and the rights you hold.",
};

/**
 * Layered, plain-language privacy notice (PDR §8.2). Versioned — bump
 * site.privacyNoticeVersion and lib/consent NOTICE_VERSION together so
 * consent is re-requested when practices change.
 */
export default function PrivacyNoticePage() {
  return (
    <>
      <AuroraHero>
        <SectionHeading
          as="h1"
          eyebrow={`Privacy notice — v${site.privacyNoticeVersion}`}
          title="How we handle your information"
          lede="The short version: we collect the minimum, use it only for the purpose you gave it, never sell it, and give you self-service control. The detail follows."
        />
      </AuroraHero>

      <article className="section-light">
        <div className="prose-light mx-auto max-w-3xl space-y-10 px-4 py-16 text-base leading-relaxed sm:px-6">
          <section>
            <h2 className="text-2xl">Who we are</h2>
            <p className="mt-4">
              {site.name} (&ldquo;Aurora&rdquo;, &ldquo;we&rdquo;) provides healthcare services
            in Guyana and the wider Caribbean and operates this website. We are the data
              controller for the personal information described here. Our Data Protection
              Officer can be reached at{" "}
              <a href={`mailto:${site.contact.privacyEmail}`}>{site.contact.privacyEmail}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl">What we collect on this website — and why</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-navy text-left">
                    <th className="py-2.5 pr-4 font-semibold">When you…</th>
                    <th className="py-2.5 pr-4 font-semibold">We collect</th>
                    <th className="py-2.5 pr-4 font-semibold">Purpose &amp; lawful basis</th>
                    <th className="py-2.5 font-semibold">Kept for</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  <tr className="border-b border-line-light">
                    <td className="py-3 pr-4">Book an appointment</td>
                    <td className="py-3 pr-4">
                      Name, date of birth, phone, email (optional), service, location, preferred
                      time, brief reason (optional)
                    </td>
                    <td className="py-3 pr-4">
                      Arranging your care — GDPR Art. 6(1)(b) and, where health-related, Art.
                      9(2)(h) with your explicit consent captured on the form
                    </td>
                    <td className="py-3">Until the appointment is completed + 12 months</td>
                  </tr>
                  <tr className="border-b border-line-light">
                    <td className="py-3 pr-4">Request a home visit</td>
                    <td className="py-3 pr-4">The booking details above, plus visit address and access notes</td>
                    <td className="py-3 pr-4">
                      Planning the visit — the address is justified only because care travels to
                      it
                    </td>
                    <td className="py-3">Until the visit is completed + 12 months</td>
                  </tr>
                  <tr className="border-b border-line-light">
                    <td className="py-3 pr-4">Contact us</td>
                    <td className="py-3 pr-4">Name, email, organisation (optional), your message</td>
                    <td className="py-3 pr-4">Responding to you — legitimate interest, Art. 6(1)(f)</td>
                    <td className="py-3">24 months after the enquiry closes</td>
                  </tr>
                  <tr className="border-b border-line-light">
                    <td className="py-3 pr-4">Apply for a role</td>
                    <td className="py-3 pr-4">Your application and CV</td>
                    <td className="py-3 pr-4">Recruitment — Art. 6(1)(b)</td>
                    <td className="py-3">12 months, then deleted</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">Exercise a data right</td>
                    <td className="py-3 pr-4">Name, email, request details</td>
                    <td className="py-3 pr-4">Legal obligation — Art. 6(1)(c)</td>
                    <td className="py-3">Request record kept as legally required</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              <strong>What we never do here:</strong> this public website stores no clinical
              records. Your health record lives in the Aurora Digital Health Platform, reached
              through the secure Patient Portal, with its own layered notice shown at
              registration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl">Defaults that protect you</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>Marketing communications: <strong>off</strong> unless you opt in.</li>
              <li>Third-party data sharing: <strong>off</strong> — and we do not sell data, ever.</li>
              <li>Caregiver/family record access: <strong>off</strong> until you explicitly grant it, and revocable at any time.</li>
              <li>Appointment reminders: per-booking opt-in.</li>
              <li>Cookies: none beyond the one that stores your consent choice — see the <a href="/privacy-centre/cookies">cookie policy</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl">Who can see your information</h2>
            <p className="mt-4">
              Only Aurora staff who need it for the purpose you gave it, under role-based access
              controls. Service providers that process data for us (hosting, email/SMS delivery)
              act under GDPR Article 28 data-processing agreements and cannot use your data for
              their own purposes. We keep a register of every processor. If any transfer leaves
              the region, it is covered by adequacy decisions or Standard Contractual Clauses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl">Your rights</h2>
            <p className="mt-4">
              You can ask for access to your data, correction, deletion, restriction,
              portability (a machine-readable copy), or object to processing. Use the{" "}
              <a href="/privacy-centre/rights-request">rights request form</a> — every request
              gets a tracked reference and a response within one month. You can also complain to
              the Guyana Data Protection Office or your local supervisory authority; we would
              appreciate the chance to resolve concerns first via{" "}
              <a href={`mailto:${site.contact.privacyEmail}`}>{site.contact.privacyEmail}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl">Security, in brief</h2>
            <p className="mt-4">
              Encryption in transit and at rest, strict access controls with multi-factor
              authentication for staff, tamper-evident audit logging, and independent security
              testing before launch and annually after. Details live in our security programme
              aligned to the NIST Cybersecurity Framework and ISO 27001/27799.
            </p>
          </section>

          <section>
            <h2 className="text-2xl">Changes to this notice</h2>
            <p className="mt-4">
              This is version {site.privacyNoticeVersion}. When our practices change, we update
              the notice, announce it in the Privacy Centre, and — where the change affects a
              consent you gave — ask again rather than assume.
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
