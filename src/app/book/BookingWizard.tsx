"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/icons";
import {
  CheckboxField,
  RadioCard,
  TextAreaField,
  TextField,
} from "@/components/forms/fields";
import { bookableServices } from "@/content/services";
import { bookingLocations } from "@/content/locations";

/**
 * Booking flow (PDR §6.1): service → location → date/time → details →
 * confirmation. Keyboard-first: each step change moves focus to the
 * step heading; errors announce via role="alert" on the fields.
 * Data minimisation: every field below is justified by the appointment
 * itself — nothing else is asked (PDR §8.1).
 */

const steps = ["Service", "Location", "Date & time", "Your details"] as const;

const timeWindows = [
  { value: "morning", label: "Morning", description: "8:00 – 11:30" },
  { value: "midday", label: "Midday", description: "11:30 – 14:00" },
  { value: "afternoon", label: "Afternoon", description: "14:00 – 17:00" },
];

type FormState = {
  service: string;
  location: string;
  date: string;
  timeWindow: string;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  reason: string;
  remindersOptIn: boolean;
  consent: boolean;
};

type Status =
  | { state: "editing" }
  | { state: "submitting" }
  | { state: "success"; reference: string }
  | { state: "error"; message: string };

export function BookingWizard({ initialService }: { initialService?: string }) {
  const validInitial = bookableServices.some((s) => s.slug === initialService)
    ? (initialService as string)
    : "";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    service: validInitial,
    location: "",
    date: "",
    timeWindow: "",
    fullName: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    reason: "",
    remindersOptIn: false, // most-private default (PDR §8.1)
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: "editing" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Move focus to the step heading on step change (keyboard/SR flow).
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  function validateStep(current: number): boolean {
    const next: Record<string, string> = {};
    if (current === 0 && !form.service) next.service = "Choose a service to continue.";
    if (current === 1 && !form.location) next.location = "Choose a location to continue.";
    if (current === 2) {
      if (!form.date) next.date = "Choose a date.";
      else if (form.date < today) next.date = "Choose today or a future date.";
      if (!form.timeWindow) next.timeWindow = "Choose a time of day.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, steps.length - 1));
  }
  function goBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });
    setErrors({});
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website: "" }),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setStatus({ state: "success", reference: body.reference });
      } else if (res.status === 422 && body.errors) {
        setErrors(body.errors);
        setStatus({ state: "editing" });
        // Send the user back to the earliest step with an error.
        const stepFields: (keyof FormState)[][] = [
          ["service"],
          ["location"],
          ["date", "timeWindow"],
          ["fullName", "dateOfBirth", "phone", "email", "reason", "consent"],
        ];
        const errKeys = Object.keys(body.errors);
        const target = stepFields.findIndex((fields) => fields.some((f) => errKeys.includes(f)));
        if (target >= 0) setStep(target);
      } else {
        setStatus({
          state: "error",
          message: body.error ?? "Something went wrong. Please try again.",
        });
      }
    } catch {
      setStatus({ state: "error", message: "Network problem — please try again." });
    }
  }

  if (status.state === "success") {
    const service = bookableServices.find((s) => s.slug === form.service);
    const location = bookingLocations.find((l) => l.id === form.location);
    const window = timeWindows.find((w) => w.value === form.timeWindow);
    return (
      <div role="status" className="rounded-2xl border border-cyan/40 bg-cyan/10 p-8">
        <Icon name="check" className="h-10 w-10 text-cyan" />
        <h2 className="mt-4 text-2xl text-starlight sm:text-3xl">Booking request received</h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-silver">
          Thank you, {form.fullName.split(" ")[0]}. Our team confirms your slot by{" "}
          {form.email ? "email" : "phone"} — usually within one working day. Keep your
          reference:
        </p>
        <p className="mt-4 inline-block rounded-xl border border-cyan/40 bg-navy px-5 py-3 font-heading text-xl font-bold tracking-wider text-cyan">
          {status.reference}
        </p>
        <dl className="mt-6 grid max-w-xl gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-starlight">Service</dt>
            <dd className="text-silver">{service?.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-starlight">Where</dt>
            <dd className="text-silver">{location?.name}</dd>
          </div>
          <div>
            <dt className="font-semibold text-starlight">When</dt>
            <dd className="text-silver">
              {form.date} · {window?.label} ({window?.description})
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-starlight">Reminders</dt>
            <dd className="text-silver">{form.remindersOptIn ? "On" : "Off (your default)"}</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button href="/">Back to home</Button>
          <Button href="/resources" variant="secondary">
            Browse health resources
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Progress */}
      <ol className="flex flex-wrap gap-2" aria-label="Booking steps">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={i === step ? "step" : undefined}
              className={`flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold uppercase tracking-wider ${
                i === step
                  ? "border-cyan bg-cyan/10 text-cyan"
                  : i < step
                    ? "border-silver/40 text-silver"
                    : "border-silver/20 text-silver/50"
              }`}
            >
              {i < step ? <Icon name="check" className="h-3.5 w-3.5" /> : `${i + 1}`}
              <span>{label}</span>
            </span>
            {i < steps.length - 1 ? (
              <span aria-hidden className="hidden h-px w-4 bg-silver/30 sm:block" />
            ) : null}
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="mt-8 text-2xl outline-none sm:text-3xl">
        {step === 0 && "Which service do you need?"}
        {step === 1 && "Where suits you?"}
        {step === 2 && "When works for you?"}
        {step === 3 && "Nearly there — your details"}
      </h2>

      {/* Step 1: service */}
      {step === 0 ? (
        <fieldset className="mt-6">
          <legend className="sr-only">Service</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {bookableServices.map((s) => (
              <RadioCard
                key={s.slug}
                id={`service-${s.slug}`}
                name="service"
                value={s.slug}
                checked={form.service === s.slug}
                onChange={(v) => set("service", v)}
                title={s.name}
                description={s.tagline}
              />
            ))}
          </div>
          {errors.service ? (
            <p role="alert" className="mt-3 text-sm font-medium text-[#ff9db0]">
              {errors.service}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {/* Step 2: location */}
      {step === 1 ? (
        <fieldset className="mt-6">
          <legend className="sr-only">Location</legend>
          <div className="grid gap-3">
            {bookingLocations.map((l) => (
              <RadioCard
                key={l.id}
                id={`location-${l.id}`}
                name="location"
                value={l.id}
                checked={form.location === l.id}
                onChange={(v) => set("location", v)}
                title={l.name}
                description={`${l.area} — ${l.note}`}
              />
            ))}
          </div>
          {errors.location ? (
            <p role="alert" className="mt-3 text-sm font-medium text-[#ff9db0]">
              {errors.location}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-silver">
            Can&rsquo;t travel at all?{" "}
            <a href="/book/home-visit" className="text-cyan underline underline-offset-2">
              Request a home visit instead
            </a>
            .
          </p>
        </fieldset>
      ) : null}

      {/* Step 3: date & time */}
      {step === 2 ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="max-w-xs">
            <TextField
              id="date"
              label="Preferred date"
              type="date"
              min={today}
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              error={errors.date}
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-starlight">Time of day</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {timeWindows.map((w) => (
                <RadioCard
                  key={w.value}
                  id={`window-${w.value}`}
                  name="timeWindow"
                  value={w.value}
                  checked={form.timeWindow === w.value}
                  onChange={(v) => set("timeWindow", v)}
                  title={w.label}
                  description={w.description}
                />
              ))}
            </div>
            {errors.timeWindow ? (
              <p role="alert" className="mt-3 text-sm font-medium text-[#ff9db0]">
                {errors.timeWindow}
              </p>
            ) : null}
          </fieldset>
          <p className="text-sm text-silver">
            You choose a window, not a fixed minute — our team confirms the exact time with you.
          </p>
        </div>
      ) : null}

      {/* Step 4: details (data-minimised) */}
      {step === 3 ? (
        <div className="mt-6 flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="fullName"
              label="Full name"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              error={errors.fullName}
            />
            <TextField
              id="dateOfBirth"
              label="Date of birth"
              type="date"
              max={today}
              autoComplete="bday"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              error={errors.dateOfBirth}
              hint="Used to match or create your patient record safely."
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="phone"
              label="Phone"
              type="tel"
              autoComplete="tel"
              placeholder="+592 …"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              error={errors.phone}
              hint="How we confirm your appointment."
            />
            <TextField
              id="email"
              label="Email"
              type="email"
              optional
              autoComplete="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              error={errors.email}
            />
          </div>
          <TextAreaField
            id="reason"
            label="Reason for visit"
            optional
            rows={3}
            maxLength={400}
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            error={errors.reason}
            hint="A few words help us prepare — full history belongs in the consultation, not this form."
          />
          <CheckboxField
            id="remindersOptIn"
            label="Send me appointment reminders for this booking (off unless you choose it)."
            checked={form.remindersOptIn}
            onChange={(e) => set("remindersOptIn", e.target.checked)}
          />
          <CheckboxField
            id="consent"
            label="I consent to Aurora using these details to arrange this appointment — the care-delivery purpose only. I can withdraw consent any time via the Privacy Centre."
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
            error={errors.consent}
          />
        </div>
      ) : null}

      {/* Controls */}
      <div className="mt-9 flex flex-wrap items-center gap-4">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={goBack}>
            Back
          </Button>
        ) : null}
        {step < steps.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Continue <Icon name="arrow" className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={status.state === "submitting"}>
            {status.state === "submitting" ? "Sending…" : "Request booking"}
          </Button>
        )}
        {status.state === "error" ? (
          <p role="alert" className="text-sm font-medium text-[#ff9db0]">
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
