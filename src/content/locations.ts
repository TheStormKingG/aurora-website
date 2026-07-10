/**
 * Locations — PDR §5 "Contact Us" (locations) + booking flow options.
 * Mirrors the future Payload `locations` collection.
 */

export type AuroraLocation = {
  id: string;
  name: string;
  kind: "Mobile route" | "Wellness centre" | "Virtual";
  area: string;
  status: "Active" | "Coming soon";
  note: string;
};

export const locations: AuroraLocation[] = [
  {
    id: "mobile-demerara",
    name: "Mobile Clinic — Demerara routes",
    kind: "Mobile route",
    area: "Georgetown & Region 4 communities",
    status: "Active",
    note: "Scheduled stops published per community; home visits available on request.",
  },
  {
    id: "mobile-essequibo-berbice",
    name: "Mobile Clinic — coastal expansion routes",
    kind: "Mobile route",
    area: "Regions 2, 3, 5 & 6 (phased rollout)",
    status: "Coming soon",
    note: "Register community interest through the contact form to prioritise routes.",
  },
  {
    id: "georgetown-wellness-hub",
    name: "Aurora Community Wellness Centre — Georgetown",
    kind: "Wellness centre",
    area: "Georgetown",
    status: "Coming soon",
    note: "Flagship centre planned for Phase Two: programmes, group classes, screening days.",
  },
  {
    id: "telemedicine",
    name: "Telemedicine (virtual consultations)",
    kind: "Virtual",
    area: "Anywhere in Guyana",
    status: "Active",
    note: "Information and access via the Telemedicine page; video expansion arrives in Phase Four.",
  },
];

/** Options offered in the booking flow's provider/location step. */
export const bookingLocations = locations.filter(
  (l) => l.status === "Active" && l.kind !== "Virtual"
);
