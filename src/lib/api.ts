/**
 * Shared handler for public form endpoints: rate limit → honeypot →
 * server-side zod validation → action. Structured logs carry NO PII
 * (CLAUDE.md) — only event names and correlation references.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { ZodType } from "zod";
import { clientKey, pruneBuckets, rateLimit } from "./rate-limit";
import { fieldErrors } from "./validation/schemas";

export function makeReference(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function handleFormPost<T>(
  request: Request,
  options: {
    scope: string;
    schema: ZodType<T>;
    refPrefix: string;
    action: (data: T, reference: string) => Promise<void>;
  }
): Promise<NextResponse> {
  pruneBuckets();

  const limit = rateLimit(clientKey(request, options.scope));
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot filled → pretend success so bots learn nothing.
  if (
    typeof raw === "object" &&
    raw !== null &&
    "website" in raw &&
    typeof (raw as { website?: unknown }).website === "string" &&
    ((raw as { website: string }).website ?? "").length > 0
  ) {
    return NextResponse.json({ ok: true, reference: makeReference(options.refPrefix) });
  }

  const parsed = options.schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: fieldErrors(parsed.error) },
      { status: 422 }
    );
  }

  const reference = makeReference(options.refPrefix);
  try {
    await options.action(parsed.data, reference);
  } catch {
    console.error(JSON.stringify({ event: `${options.scope}.action_failed`, reference }));
    return NextResponse.json(
      { ok: false, error: "Something went wrong on our side. Please try again." },
      { status: 500 }
    );
  }

  console.info(JSON.stringify({ event: `${options.scope}.received`, reference }));
  return NextResponse.json({ ok: true, reference });
}
