/**
 * Site-wide organisation + navigation content.
 * Mirrors the future Payload "globals" — swap the data source, keep the shape.
 * No clinical data lives here or anywhere in src/content/ (PDR §11.1).
 */

export const site = {
  name: "H.M. Aurora Health Systems",
  shortName: "H.M. Aurora",
  tagline: "Illuminating the Future of Care",
  description:
    "H.M. Aurora Health Systems brings healthcare to people where they live — mobile clinics, community wellness centres, maternal and child health programmes, and a lifelong digital health record that follows you from pregnancy through ageing.",
  founder: "Hannah Munro",
  founderRole: "Founder & CEO",
  contact: {
    email: "hello@hmaurora.health",
    privacyEmail: "privacy@hmaurora.health",
    careersEmail: "careers@hmaurora.health",
    city: "Georgetown",
    country: "Guyana",
    region: "Caribbean",
  },
  privacyNoticeVersion: "1.0 (10 July 2026)",
} as const;

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

/** Primary navigation — PDR §5 approved sitemap. */
export const primaryNav: NavItem[] = [
  { label: "About Us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Telemedicine", href: "/telemedicine" },
  { label: "Health Resources", href: "/resources" },
  { label: "News", href: "/news" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

/** Utility navigation (right side of header). */
export const utilityNav: NavItem[] = [
  { label: "Patient Login", href: "/patient-login" },
  { label: "Staff Login", href: "/staff-login" },
];

export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Care",
    items: [
      { label: "Our Services", href: "/services" },
      { label: "Book an Appointment", href: "/book" },
      { label: "Request a Home Visit", href: "/book/home-visit" },
      { label: "Telemedicine", href: "/telemedicine" },
      { label: "Patient Portal", href: "/patient-login" },
    ],
  },
  {
    heading: "Learn",
    items: [
      { label: "Health Resources", href: "/resources" },
      { label: "News & Programmes", href: "/news" },
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Donations", href: "/donations" },
      { label: "Online Payments", href: "/payments" },
      { label: "Contact Us", href: "/contact" },
      { label: "Staff Login", href: "/staff-login" },
    ],
  },
  {
    heading: "Privacy",
    items: [
      { label: "Privacy Centre", href: "/privacy-centre" },
      { label: "Privacy Notice", href: "/privacy-centre/notice" },
      { label: "Cookie Policy", href: "/privacy-centre/cookies" },
      { label: "Consent Preferences", href: "/privacy-centre/preferences" },
      { label: "Your Data Rights", href: "/privacy-centre/rights-request" },
    ],
  },
];
