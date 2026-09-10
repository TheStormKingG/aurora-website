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
    /**
     * One real mailbox today. The three keys are kept separate because
     * the site routes general, data-protection and careers enquiries to
     * different names, and splitting them later should be a change here
     * rather than a hunt through 22 call sites. Until then a placeholder
     * that bounces is worse than a shared inbox that does not — the
     * privacy notice in particular has to name an address that answers.
     */
    email: "hmaurorahealthsystems@gmail.com",
    privacyEmail: "hmaurorahealthsystems@gmail.com",
    careersEmail: "hmaurorahealthsystems@gmail.com",
    /** Display form, and the digits-only form a tel: link needs. */
    phone: "+592 693 2201",
    phoneHref: "+5926932201",
    city: "Georgetown",
    country: "Guyana",
    region: "Caribbean",
  },
  privacyNoticeVersion: "1.1 (9 September 2026)",
} as const;

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

/**
 * Primary navigation — PDR §5 approved sitemap, thinned to what a
 * visitor needs in order to decide (what we do, who we are, how to
 * reach us). Health Resources, News and Careers moved to the footer's
 * Learn column, where all three already lived, so nothing is orphaned.
 * Telemedicine stays: /services covers the eight pillars and does not
 * link to it, so the footer would be its only entry point.
 *
 * Home is listed explicitly even though the logo already links there.
 * The logo-as-home convention is learned, not universal, and it is the
 * one route with no visible label — so the mobile panel had always
 * prepended its own Home entry. Carrying it here instead means the two
 * menus render the same array and cannot drift apart.
 */
export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Telemedicine", href: "/telemedicine" },
  { label: "About Us", href: "/about" },
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
      { label: "Book an Appointment", href: "/book" },
      { label: "Our Services", href: "/services" },
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
      { label: "Consent Preferences", href: "/privacy-centre/preferences" },
      { label: "Your Data Rights", href: "/privacy-centre/rights-request" },
    ],
  },
];
