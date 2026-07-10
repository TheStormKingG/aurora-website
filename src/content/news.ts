/**
 * News & announcements — PDR §5 "News".
 * Mirrors the future Payload `news` collection.
 */

export type NewsItem = {
  slug: string;
  title: string;
  date: string;
  kind: "Announcement" | "Programme" | "Campaign";
  summary: string;
  body: string[];
};

export const news: NewsItem[] = [
  {
    slug: "aurora-launches-phase-one",
    title: "H.M. Aurora Health Systems launches Phase One: mobile healthcare for Guyana",
    date: "2026-07-01",
    kind: "Announcement",
    summary:
      "Aurora begins operations with mobile clinic services, home-visit care, and the first release of the Aurora Digital Health Platform.",
    body: [
      "H.M. Aurora Health Systems today announced the launch of its Phase One services: mobile healthcare units serving communities across Guyana, home-visit care for patients who cannot travel, and the first release of the Aurora Digital Health Platform — a lifelong electronic health record that follows each patient from pregnancy through ageing.",
      "\"Healthcare should reach people where they live, and their health story should follow them for life,\" said Hannah Munro, Founder & CEO. \"Phase One puts clinics on the road and a secure, patient-controlled record behind every visit.\"",
      "Appointment booking and home-visit requests are open now through this website. The mobile clinic schedule will be published community by community as routes are confirmed.",
    ],
  },
  {
    slug: "mobile-clinic-pilot-routes",
    title: "Mobile clinic pilot routes: registration of interest open",
    date: "2026-07-08",
    kind: "Programme",
    summary:
      "Communities can now register interest in hosting a mobile clinic stop as Aurora finalises its first routes.",
    body: [
      "Aurora is finalising its first mobile clinic routes and invites community organisations, workplaces, and residents' groups to register interest in hosting a regular stop.",
      "A hosting site needs a safe parking area, access to the community, and a local contact person. Screening days cover blood pressure, blood sugar, BMI, and general nurse-led consultations, with referral pathways for anything needing follow-up.",
      "Use the contact form to register your community's interest — include your area and an estimate of how many households a stop would serve.",
    ],
  },
  {
    slug: "know-your-numbers-campaign",
    title: "'Know Your Numbers' — free blood pressure and sugar screening campaign",
    date: "2026-07-05",
    kind: "Campaign",
    summary:
      "Aurora's first public health campaign focuses on the two numbers most adults in the Caribbean don't know: their blood pressure and blood sugar.",
    body: [
      "Most chronic disease in our region develops silently. Aurora's first public health campaign, 'Know Your Numbers', offers free blood pressure and blood glucose screening at mobile clinic stops during launch months.",
      "Everyone screened receives their readings explained in plain language, a record they keep, and — where readings warrant it — a supported referral for follow-up care. With consent, readings can start a patient's Aurora Health Record so future results build into a trend.",
      "No appointment is needed at campaign stops, but you can book a screening slot in advance through the booking page.",
    ],
  },
  {
    slug: "partnership-call-institutions",
    title: "Working with Aurora: a call to healthcare institutions and partners",
    date: "2026-07-03",
    kind: "Announcement",
    summary:
      "Aurora invites hospitals, laboratories, insurers, and community organisations to explore partnership as the network grows.",
    body: [
      "Aurora's model works through partnership: mobile services need referral destinations, laboratories, and community hosts; the digital platform is built for interoperability with HL7 FHIR as its integration standard.",
      "We are actively seeking conversations with hospitals and clinics, laboratory and pharmacy providers, insurers, employers, and community organisations across Guyana and the wider Caribbean.",
      "Institutional partners can reach the leadership team directly through the partnership option on the contact form.",
    ],
  },
];

export function getNewsItem(slug: string): NewsItem | undefined {
  return news.find((n) => n.slug === slug);
}
