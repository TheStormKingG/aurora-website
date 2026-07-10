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

const rights = [
  { value: "access", label: "Access — a copy of the data you hold about me" },
  { value: "rectification", label: "Rectification — correct something that's wrong" },
  { value: "erasure", label: "Erasure — delete my data" },
  { value: "restriction", label: "Restriction — pause processing while we resolve something" },
  { value: "portability", label: "Portability — a machine-readable export" },
  { value: "objection", label: "Objection — stop processing based on legitimate interest" },
];

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; reference: string }
  | { state: "error"; message: string };

export function RightsRequestForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      right: String(fd.get("right") ?? ""),
      fullName: String(fd.get("fullName") ?? ""),
      email: String(fd.get("email") ?? ""),
      details: String(fd.get("details") ?? ""),
      confirmIdentityContact: fd.get("confirmIdentityContact") === "on",
      website: String(fd.get("website") ?? ""),
    };

    setStatus({ state: "submitting" });
    setErrors({});
    try {
      const res = await fetch("/api/rights-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok && body.ok) {
        setStatus({ state: "success", reference: body.reference });
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
      <div role="status" className="rounded-2xl border border-cyan/40 bg-cyan/10 p-8">
        <Icon name="check" className="h-10 w-10 text-cyan" />
        <h2 className="mt-4 text-2xl text-starlight">Request opened</h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-silver">
          Your request is now a tracked record. We may contact you to verify your identity
          (proportionate to the request), and you&rsquo;ll receive our response within one
          month. Quote your reference in any follow-up:
        </p>
        <p className="mt-4 inline-block rounded-xl border border-cyan/40 bg-navy px-5 py-3 font-heading text-xl font-bold tracking-wider text-cyan">
          {status.reference}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <SelectField id="right" name="right" label="Which right do you want to exercise?" error={errors.right} defaultValue="">
        <option value="" disabled>
          Choose a right…
        </option>
        {rights.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="fullName" name="fullName" label="Full name" autoComplete="name" error={errors.fullName} />
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          error={errors.email}
          hint="Where we send the response."
        />
      </div>
      <TextAreaField
        id="details"
        name="details"
        label="Anything that helps us find the data"
        optional
        rows={4}
        error={errors.details}
        hint="E.g. 'I submitted a booking in July under this email.' Don't include medical details."
      />
      {/* Honeypot */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="rr-website">Website</label>
        <input id="rr-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <CheckboxField
        id="confirmIdentityContact"
        name="confirmIdentityContact"
        label="I understand Aurora may contact me to verify my identity before acting — a safeguard so no one else can exercise rights over my data."
        error={errors.confirmIdentityContact}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={status.state === "submitting"}>
          {status.state === "submitting" ? "Opening request…" : "Open my request"}
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
