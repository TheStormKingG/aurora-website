"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/icons";
import {
  CheckboxField,
  RadioCard,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/forms/fields";
import { bookableServices } from "@/content/services";

/**
 * Home-visit request — the parallel flow (PDR §6.1). Address IS
 * justified here (the clinic comes to it); it is never asked in the
 * standard booking flow.
 */

const timeWindows = [
  { value: "morning", label: "Morning", description: "8:00 – 11:30" },
  { value: "midday", label: "Midday", description: "11:30 – 14:00" },
  { value: "afternoon", label: "Afternoon", description: "14:00 – 17:00" },
];

type Status =
  | { state: "editing" }
  | { state: "submitting" }
  | { state: "success"; reference: string }
  | { state: "error"; message: string };

export function HomeVisitForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: "editing" });
  const [timeWindow, setTimeWindow] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      service: String(fd.get("service") ?? ""),
      address: String(fd.get("address") ?? ""),
      area: String(fd.get("area") ?? ""),
      date: String(fd.get("date") ?? ""),
      timeWindow,
      fullName: String(fd.get("fullName") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      mobilityNote: String(fd.get("mobilityNote") ?? ""),
      consent: fd.get("consent") === "on",
      website: String(fd.get("website") ?? ""),
    };

    setStatus({ state: "submitting" });
    setErrors({});
    try {
      const res = await fetch("/api/home-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setStatus({ state: "success", reference: body.reference });
      } else if (res.status === 422 && body.errors) {
        setErrors(body.errors);
        setStatus({ state: "editing" });
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
    return (
      <div role="status" className="rounded-2xl border border-cyan/40 bg-cyan/10 p-8">
        <Icon name="check" className="h-10 w-10 text-cyan" />
        <h2 className="mt-4 text-2xl text-starlight">Home-visit request received</h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-silver">
          Our team calls you to confirm the visit and the exact time — usually within one
          working day. Keep your reference:
        </p>
        <p className="mt-4 inline-block rounded-xl border border-cyan/40 bg-navy px-5 py-3 font-heading text-xl font-bold tracking-wider text-cyan">
          {status.reference}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button href="/">Back to home</Button>
          <Button href="/services/mobile-healthcare" variant="secondary">
            About mobile healthcare
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <SelectField id="service" name="service" label="Service needed" error={errors.service} defaultValue="">
        <option value="" disabled>
          Choose a service…
        </option>
        {bookableServices.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
      </SelectField>

      <TextField
        id="address"
        name="address"
        label="Visit address"
        autoComplete="street-address"
        error={errors.address}
        hint="Street / village and landmark — enough for the team to find you. Asked only because the visit comes to you."
      />
      <TextField id="area" name="area" label="Area / region" error={errors.area} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="date" name="date" label="Preferred date" type="date" min={today} error={errors.date} />
        <div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-starlight">Time of day</legend>
            <div className="grid gap-2">
              {timeWindows.map((w) => (
                <RadioCard
                  key={w.value}
                  id={`hv-window-${w.value}`}
                  name="timeWindow"
                  value={w.value}
                  checked={timeWindow === w.value}
                  onChange={setTimeWindow}
                  title={w.label}
                  description={w.description}
                />
              ))}
            </div>
            {errors.timeWindow ? (
              <p role="alert" className="mt-2 text-sm font-medium text-[#ff9db0]">
                {errors.timeWindow}
              </p>
            ) : null}
          </fieldset>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="fullName" name="fullName" label="Full name" autoComplete="name" error={errors.fullName} />
        <TextField
          id="phone"
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="+592 …"
          error={errors.phone}
          hint="We call to confirm before any visit."
        />
      </div>

      <TextAreaField
        id="mobilityNote"
        name="mobilityNote"
        label="Anything the team should know to reach you?"
        optional
        rows={3}
        maxLength={300}
        error={errors.mobilityNote}
        hint="E.g. upstairs flat, gate locked, best entrance — access notes only."
      />

      {/* Honeypot */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="hv-website">Website</label>
        <input id="hv-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <CheckboxField
        id="hv-consent"
        name="consent"
        label="I consent to Aurora using these details to arrange this home visit — the care-delivery purpose only."
        error={errors.consent}
      />

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={status.state === "submitting"}>
          {status.state === "submitting" ? "Sending…" : "Request home visit"}
        </Button>
        {status.state === "error" ? (
          <p role="alert" className="text-sm font-medium text-[#ff9db0]">
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
