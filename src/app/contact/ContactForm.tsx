"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/icons";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/forms/fields";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; reference: string }
  | { state: "error"; message: string };

export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      kind: String(fd.get("kind") ?? ""),
      fullName: String(fd.get("fullName") ?? ""),
      email: String(fd.get("email") ?? ""),
      organisation: String(fd.get("organisation") ?? ""),
      message: String(fd.get("message") ?? ""),
      consent: fd.get("consent") === "on",
      website: String(fd.get("website") ?? ""),
    };

    setStatus({ state: "submitting" });
    setErrors({});
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setStatus({ state: "success", reference: body.reference });
        form.reset();
      } else if (res.status === 422 && body.errors) {
        setErrors(body.errors);
        setStatus({ state: "idle" });
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
      <div role="status" className="rounded-2xl border border-cyan/40 bg-cyan/10 p-8 text-center">
        <Icon name="check" className="mx-auto h-10 w-10 text-cyan" />
        <h3 className="mt-4 text-2xl text-starlight">Message received</h3>
        <p className="mt-3 text-base text-silver">
          Thank you — we reply within two working days. Your reference is{" "}
          <span className="font-heading font-semibold text-cyan">{status.reference}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <SelectField id="kind" name="kind" label="What's this about?" error={errors.kind} defaultValue="">
        <option value="" disabled>
          Choose an enquiry type…
        </option>
        <option value="general">General enquiry</option>
        <option value="partnership">Partnership / institutional</option>
        <option value="careers">Careers</option>
        <option value="community">Host a mobile clinic stop</option>
      </SelectField>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="fullName" name="fullName" label="Full name" autoComplete="name" error={errors.fullName} />
        <TextField id="email" name="email" type="email" label="Email" autoComplete="email" error={errors.email} />
      </div>
      <TextField
        id="organisation"
        name="organisation"
        label="Organisation"
        optional
        autoComplete="organization"
        error={errors.organisation}
      />
      <TextAreaField
        id="message"
        name="message"
        label="Your message"
        rows={5}
        error={errors.message}
        hint="Please don't include medical details here — clinical questions belong in an appointment."
      />
      {/* Honeypot — hidden from humans and assistive tech */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <CheckboxField
        id="consent"
        name="consent"
        label="I consent to Aurora using these details to respond to my enquiry — and nothing else."
        error={errors.consent}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={status.state === "submitting"}>
          {status.state === "submitting" ? "Sending…" : "Send message"}
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
