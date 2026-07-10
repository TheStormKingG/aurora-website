import { site } from "@/content/site";

/**
 * schema.org structured data (PDR §7): MedicalOrganization sitewide;
 * pages may add their own nodes via the `extra` prop.
 */
export function OrganizationSchema({ extra }: { extra?: object[] }) {
  const org = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: site.name,
    alternateName: site.shortName,
    slogan: site.tagline,
    description: site.description,
    email: site.contact.email,
    founder: {
      "@type": "Person",
      name: site.founder,
      jobTitle: site.founderRole,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: site.contact.city,
      addressCountry: "GY",
    },
    areaServed: "Caribbean",
    medicalSpecialty: [
      "CommunityHealth",
      "PrimaryCare",
      "Obstetric",
      "Pediatric",
      "Geriatric",
    ],
  };
  const nodes = [org, ...(extra ?? [])];
  return (
    <script
      type="application/ld+json"
      // JSON-LD is inert data, not executable markup.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(nodes.length === 1 ? nodes[0] : nodes) }}
    />
  );
}
