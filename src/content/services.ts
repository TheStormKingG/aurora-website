/**
 * The eight service pillars — PDR §5 "Services".
 * Mirrors the future Payload `services` collection.
 */

import type { IconName } from "@/components/icons";

export type Service = {
  slug: string;
  name: string;
  navLabel: string;
  tagline: string;
  summary: string;
  body: string[];
  offerings: string[];
  audiences: string[];
  phase: 1 | 2 | 3 | 4;
  phaseLabel: string;
  icon: IconName;
  bookable: boolean;
};

export const services: Service[] = [
  {
    slug: "mobile-healthcare",
    name: "Mobile Healthcare Services",
    navLabel: "Mobile Healthcare",
    tagline: "The clinic that comes to you.",
    summary:
      "Fully equipped mobile clinics bring check-ups, screening, vaccination support, and follow-up care to homes, workplaces, and communities across Guyana.",
    body: [
      "Getting to a clinic is the single biggest barrier to care for many families — distance, work hours, mobility, and cost all get in the way. Our mobile healthcare units remove that barrier by bringing trained clinicians and diagnostic equipment directly to your community on a published schedule.",
      "Every mobile visit is recorded in your Aurora Health Record with your consent, so your care continues seamlessly whether your next appointment is on the road, in a wellness centre, or online. You can also request a private home visit for yourself or a family member who cannot travel.",
    ],
    offerings: [
      "General check-ups and nurse-led triage",
      "Blood pressure, blood glucose, and BMI screening",
      "Vaccination support and immunisation record checks",
      "Wound care, dressing changes, and follow-up visits",
      "Home visits for patients with limited mobility",
      "Referrals into the wider Aurora network and public system",
    ],
    audiences: [
      "Families far from a fixed clinic",
      "Older adults and patients with limited mobility",
      "Workplaces and community organisations",
    ],
    phase: 1,
    phaseLabel: "Available now — Phase One",
    icon: "van",
    bookable: true,
  },
  {
    slug: "ncd-prevention",
    name: "Chronic Disease Prevention",
    navLabel: "NCD Prevention",
    tagline: "Catch it early. Manage it well. Live fully.",
    summary:
      "Screening, education, and long-term support for diabetes, hypertension, cardiovascular disease, and obesity — the conditions that cause most preventable illness in the Caribbean.",
    body: [
      "Non-communicable diseases (NCDs) — diabetes, high blood pressure, heart disease, and obesity — account for the majority of illness and early death in our region. Most of that harm is preventable when risks are found early and managed consistently.",
      "Our NCD programme combines regular screening with practical, culturally grounded coaching on food, movement, and medication. Your readings and goals live in your Aurora Health Record, so you and your care team can see trends over time instead of isolated numbers.",
    ],
    offerings: [
      "Diabetes and pre-diabetes screening and risk scoring",
      "Blood pressure monitoring with trend tracking in your record",
      "Cardiovascular risk assessment",
      "Nutrition and lifestyle coaching in plain language",
      "Medication adherence support and reminders",
      "Group programmes run through community wellness centres",
    ],
    audiences: [
      "Adults with a family history of diabetes or hypertension",
      "Anyone told their pressure or sugar is 'a little high'",
      "People already managing an NCD who want better control",
    ],
    phase: 1,
    phaseLabel: "Available now — Phase One",
    icon: "pulse",
    bookable: true,
  },
  {
    slug: "maternal-health",
    name: "Maternal Health",
    navLabel: "Maternal Health",
    tagline: "Cared for through every trimester — and beyond.",
    summary:
      "Antenatal and postnatal programmes that pair clinical care with education, and a pregnancy journey you can follow in your own health record.",
    body: [
      "Pregnancy should never feel like guesswork. Our maternal health programme gives expectant and new mothers a clear, supported path: scheduled antenatal visits, screening, birth preparation, and postnatal follow-up for both mother and baby.",
      "The Aurora Digital Health Platform records the journey from the first antenatal visit onward — a lifelong record that begins before birth. With your explicit consent, you choose exactly who else can see any part of it.",
    ],
    offerings: [
      "Antenatal check-ups and risk screening",
      "Birth preparation and breastfeeding education",
      "Postnatal visits for mother and newborn",
      "Pregnancy-journey tracking in the Patient Portal",
      "Maternal nutrition and mental wellbeing support",
      "Home visits for new mothers through the mobile service",
    ],
    audiences: [
      "Expectant mothers at every stage",
      "New mothers and newborns",
      "Partners and birth supporters",
    ],
    phase: 1,
    phaseLabel: "Available now — Phase One",
    icon: "heart",
    bookable: true,
  },
  {
    slug: "child-nutrition-development",
    name: "Child Nutrition & Development",
    navLabel: "Child Health",
    tagline: "Strong starts, tracked milestone by milestone.",
    summary:
      "Growth monitoring, nutrition guidance, and development milestone tracking from infancy through the early school years.",
    body: [
      "The first years of a child's life set the foundation for everything that follows. Our child health programme monitors growth and development against recognised milestones, supports parents with practical feeding guidance, and flags concerns early — when help makes the biggest difference.",
      "Each child's growth curves and milestones are recorded in their own Aurora Health Record, managed by a parent or guardian until the child comes of age. That record follows them into adulthood — no more lost clinic cards.",
    ],
    offerings: [
      "Growth monitoring and nutrition assessment",
      "Development milestone screening",
      "Infant and young-child feeding guidance",
      "Immunisation schedule tracking and reminders",
      "Parent education sessions in communities and online",
      "Referral pathways for children needing specialist review",
    ],
    audiences: [
      "Parents and guardians of children 0–8",
      "Expectant parents planning ahead",
      "Schools and early-childhood educators",
    ],
    phase: 1,
    phaseLabel: "Available now — Phase One",
    icon: "sprout",
    bookable: true,
  },
  {
    slug: "community-wellness-centres",
    name: "Community Wellness Centres",
    navLabel: "Wellness Centres",
    tagline: "A health home in the heart of the community.",
    summary:
      "Fixed centres offering programmes, group classes, screening days, and a base for our mobile teams — opening across communities in Phase Two.",
    body: [
      "Community Wellness Centres are the fixed anchors of the Aurora network: welcoming spaces where you can attend a screening day, join a group programme, meet a nurse, or simply ask questions about your health without needing to be sick first.",
      "Centres host our NCD prevention groups, maternal classes, active-ageing sessions, and child health clinics, and serve as the home base for mobile healthcare routes into surrounding communities.",
    ],
    offerings: [
      "Walk-in screening and health-check days",
      "Group wellness programmes and classes",
      "Community health education events",
      "Base stations for mobile clinic routes",
      "Programme registration and portal sign-up support",
    ],
    audiences: [
      "Whole communities — every age and stage",
      "Programme participants who prefer in-person groups",
      "Anyone wanting help getting started with the Patient Portal",
    ],
    phase: 2,
    phaseLabel: "Opening in Phase Two",
    icon: "building",
    bookable: false,
  },
  {
    slug: "active-ageing",
    name: "Adult Wellness & Active Ageing",
    navLabel: "Active Ageing",
    tagline: "More life in your years.",
    summary:
      "Strength, balance, medication support, and social connection for older adults — with optional, patient-controlled family access to appointments and reminders.",
    body: [
      "Ageing well is an active project. Our active-ageing programme helps older adults stay strong, independent, and connected: movement and balance classes, chronic condition support, medication and appointment reminders, and regular check-ins.",
      "For families, the platform offers caregiver access — but only when the patient explicitly grants it, and only to what they choose to share. A daughter might see appointment reminders while private notes stay private. Access can be changed or revoked at any time.",
    ],
    offerings: [
      "Strength, balance, and falls-prevention classes",
      "Chronic condition monitoring and support",
      "Medication and appointment reminders",
      "Caregiver access controlled entirely by the patient",
      "Social connection and peer group programmes",
      "Home visits through the mobile healthcare service",
    ],
    audiences: [
      "Adults 55+ planning to stay independent",
      "Older adults managing long-term conditions",
      "Families supporting an ageing parent",
    ],
    phase: 3,
    phaseLabel: "Phase Three roadmap",
    icon: "sun",
    bookable: false,
  },
  {
    slug: "early-childhood-centre",
    name: "Early Childhood Health & Development Centre",
    navLabel: "Early Childhood",
    tagline: "Where healthy habits begin.",
    summary:
      "A dedicated centre combining early-childhood health services, development support, and parent education — the fourth phase of the Aurora roadmap.",
    body: [
      "The Early Childhood Health & Development Centre brings together paediatric wellness checks, development assessment, nutrition services, and parent coaching under one roof, designed around young children rather than retrofitted for them.",
      "The centre extends the child health programme with specialist development support and school-readiness assessment, all recorded in the child's lifelong Aurora Health Record with age-appropriate design and guardian consent controls.",
    ],
    offerings: [
      "Paediatric wellness and development assessments",
      "Early intervention and referral coordination",
      "Nutrition and feeding clinics",
      "Parent and caregiver education programmes",
      "School-readiness health checks",
    ],
    audiences: [
      "Children 0–6 and their families",
      "Parents seeking development assessment",
      "Early-childhood educators and partners",
    ],
    phase: 4,
    phaseLabel: "Phase Four roadmap",
    icon: "blocks",
    bookable: false,
  },
  {
    slug: "digital-health-platform",
    name: "Aurora Digital Health Platform",
    navLabel: "Digital Platform",
    tagline: "One record. Your whole life. Your control.",
    summary:
      "A lifelong electronic health record that follows you from pregnancy through ageing — accessible through the Patient Portal, protected by consent-first design.",
    body: [
      "Most people's health history is scattered across paper cards, old folders, and clinics that no longer have their file. The Aurora Digital Health Platform replaces that with one secure, lifelong record that begins before birth and follows you through every stage of life.",
      "Through the Patient Portal you can see your consultations, medications, laboratory results, and imaging reports; track goals like glucose and blood pressure trends; manage appointments; and message your care team. Every access to your record is logged — and you can see that log yourself. Your data is yours: download it in a portable format, correct it, control who sees it, or delete your account, all self-service.",
    ],
    offerings: [
      "Lifelong personal health record (FHIR-based, portable)",
      "Consultations, medications, labs, and imaging in one place",
      "Glucose, blood pressure, pregnancy, and child milestone tracking",
      "Appointment management, reminders, and secure messaging",
      "A visible log of everyone who has accessed your record",
      "Self-service data rights: export, correction, consent, deletion",
    ],
    audiences: [
      "Every Aurora patient — the platform underpins all services",
      "Families managing children's and elders' care with consent",
      "Partners and institutions needing interoperable records",
    ],
    phase: 1,
    phaseLabel: "Live with Phase One services",
    icon: "orbit",
    bookable: false,
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/** Services offered in the booking flow (PDR §6.1). */
export const bookableServices = services.filter((s) => s.bookable);
