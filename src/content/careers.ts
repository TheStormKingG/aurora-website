/**
 * Careers — PDR §5 "Careers".
 * Mirrors the future Payload `careers` collection.
 */

export type Opening = {
  slug: string;
  title: string;
  type: "Full-time" | "Part-time" | "Contract";
  location: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
};

export const openings: Opening[] = [
  {
    slug: "community-health-nurse",
    title: "Community Health Nurse — Mobile Clinics",
    type: "Full-time",
    location: "Georgetown base, travelling routes",
    summary:
      "Deliver nurse-led care aboard Aurora's mobile clinics: screening, triage, health education, and follow-up across community routes.",
    responsibilities: [
      "Run screening and consultation sessions at mobile clinic stops",
      "Deliver NCD, maternal, and child health checks within protocol",
      "Record encounters accurately in the Aurora platform",
      "Provide plain-language health education and referrals",
      "Champion patient privacy and consent at every encounter",
    ],
    requirements: [
      "Registered Nurse licensed to practise in Guyana",
      "3+ years clinical experience; community or public health preferred",
      "Comfortable working independently on the road",
      "Strong plain-language communication skills",
    ],
  },
  {
    slug: "registered-midwife",
    title: "Registered Midwife — Maternal Health Programme",
    type: "Full-time",
    location: "Georgetown + home visits",
    summary:
      "Lead antenatal and postnatal care across clinic sessions and home visits, and shape the maternal education programme.",
    responsibilities: [
      "Provide antenatal and postnatal assessments and education",
      "Conduct home visits for new mothers via the mobile service",
      "Develop birth-preparation and breastfeeding session content",
      "Escalate risk factors through defined referral pathways",
    ],
    requirements: [
      "Registered Midwife licensed to practise in Guyana",
      "Experience across antenatal, delivery, and postnatal care",
      "Commitment to respectful, evidence-based maternity care",
    ],
  },
  {
    slug: "fullstack-engineer-digital-health",
    title: "Full-Stack Engineer — Digital Health Platform",
    type: "Full-time",
    location: "Remote (Caribbean time zones)",
    summary:
      "Build the Aurora Digital Health Platform: FHIR-based patient records, the Patient Portal, and the integrations behind them — with privacy engineering as a first-class discipline.",
    responsibilities: [
      "Develop portal and platform features in TypeScript (Next.js/Node)",
      "Implement HL7 FHIR (R4+) resources and integrations",
      "Build consent, audit-logging, and data-rights tooling",
      "Write tests that treat privacy and accessibility as blocking criteria",
    ],
    requirements: [
      "4+ years full-stack experience with TypeScript",
      "Familiarity with healthcare data standards (FHIR ideal)",
      "Working knowledge of GDPR-style privacy engineering",
      "Accessibility literacy (WCAG 2.2)",
    ],
  },
  {
    slug: "community-wellness-coordinator",
    title: "Community Wellness Coordinator",
    type: "Contract",
    location: "Regional, Guyana",
    summary:
      "Be Aurora's local anchor: organise mobile clinic stops, community screening days, and programme registration in your region.",
    responsibilities: [
      "Coordinate hosting sites and schedules for mobile routes",
      "Organise 'Know Your Numbers' screening days",
      "Support residents with programme and portal registration",
      "Gather community feedback into service planning",
    ],
    requirements: [
      "Deep roots in the community you would serve",
      "Experience organising community programmes or events",
      "Basic digital confidence (scheduling, forms, messaging)",
    ],
  },
];

export function getOpening(slug: string): Opening | undefined {
  return openings.find((o) => o.slug === slug);
}
