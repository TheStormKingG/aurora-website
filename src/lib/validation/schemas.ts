/**
 * Server-side zod schemas for every public form (CLAUDE.md: all inputs
 * validated server-side).
 *
 * DATA MINIMISATION (PDR §8.1 — blocking review criterion): each field
 * here must be justified by the purpose of its flow. Booking needs
 * identity + one contact channel + service logistics; it does NOT need
 * a medical history, gender, or address (address is justified only for
 * home visits). Challenge every addition.
 */

import { z } from "zod";
import { bookableServices } from "@/content/services";
import { bookingLocations } from "@/content/locations";

const name = z
  .string()
  .trim()
  .min(2, "Enter a name (at least 2 characters).")
  .max(120, "Keep the name under 120 characters.");

const email = z.string().trim().max(254).email("Enter a valid email address.");

/** Guyana +592 and general international formats. */
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number.");

const futureISODate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
  .refine((d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${d}T00:00:00`) >= today;
  }, "Choose today or a future date.");

const serviceSlugs = bookableServices.map((s) => s.slug) as [string, ...string[]];
const locationIds = bookingLocations.map((l) => l.id) as [string, ...string[]];

export const timeWindows = ["morning", "midday", "afternoon"] as const;

/** Consent to process the details for THIS purpose (Art. 9(2)(a)). */
const consent = z.literal(true, {
  error: "We need your consent to arrange this — please tick the box.",
});

/** Honeypot: hidden field that humans never fill. */
const honeypot = z.string().max(0).optional().or(z.literal("")).optional();

// ── Booking (service → provider/location → date/time → details) ────
export const bookingSchema = z.object({
  service: z.enum(serviceSlugs, { error: "Choose a service." }),
  location: z.enum(locationIds, { error: "Choose a location." }),
  date: futureISODate,
  timeWindow: z.enum(timeWindows, { error: "Choose a time of day." }),
  fullName: name,
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
    .refine((d) => new Date(`${d}T00:00:00`) < new Date(), "Date of birth must be in the past."),
  phone,
  email: email.optional().or(z.literal("")),
  reason: z.string().trim().max(400, "Keep this under 400 characters.").optional().or(z.literal("")),
  remindersOptIn: z.boolean().optional().default(false), // most-private default: OFF
  consent,
  website: honeypot,
});
export type BookingInput = z.infer<typeof bookingSchema>;

// ── Home-visit request (parallel flow; address justified here) ─────
export const homeVisitSchema = z.object({
  service: z.enum(serviceSlugs, { error: "Choose a service." }),
  address: z
    .string()
    .trim()
    .min(8, "Enter the visit address (street/village and area).")
    .max(240, "Keep the address under 240 characters."),
  area: z.string().trim().min(2, "Enter your area or region.").max(120),
  date: futureISODate,
  timeWindow: z.enum(timeWindows, { error: "Choose a time of day." }),
  fullName: name,
  phone,
  mobilityNote: z.string().trim().max(300, "Keep this under 300 characters.").optional().or(z.literal("")),
  consent,
  website: honeypot,
});
export type HomeVisitInput = z.infer<typeof homeVisitSchema>;

// ── Contact (general / partnership / careers / community) ──────────
export const contactSchema = z.object({
  kind: z.enum(["general", "partnership", "careers", "community"], {
    error: "Choose an enquiry type.",
  }),
  fullName: name,
  email,
  organisation: z.string().trim().max(160).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters).")
    .max(2000, "Keep the message under 2000 characters."),
  consent,
  website: honeypot,
});
export type ContactInput = z.infer<typeof contactSchema>;

// ── Data-subject rights request (PDR §9.2) ──────────────────────────
export const rightsRequestSchema = z.object({
  right: z.enum(
    ["access", "rectification", "erasure", "restriction", "portability", "objection"],
    { error: "Choose the right you want to exercise." }
  ),
  fullName: name,
  email,
  details: z.string().trim().max(1500, "Keep this under 1500 characters.").optional().or(z.literal("")),
  confirmIdentityContact: z.literal(true, {
    error: "Please confirm we may contact you to verify identity.",
  }),
  website: honeypot,
});
export type RightsRequestInput = z.infer<typeof rightsRequestSchema>;

// Patient account registration (PRD §6). Data-minimised: email, password,
// name, DOB + explicit consent. No clinical fields.
export const patientRegistrationSchema = z.object({
  fullName: name,
  email,
  password: z.string().min(10, "Use at least 10 characters.").max(200),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
    .refine((d) => new Date(`${d}T00:00:00`) < new Date(), "Date of birth must be in the past."),
  phone: phone.optional().or(z.literal("")),
  marketingOptIn: z.boolean().optional().default(false), // most-private default
  consent,
});
export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;

/** Flatten zod issues to a field→message map for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
