# H.M. Aurora Health Systems — Website

Healthcare website + patient portal entry. Requirements live in docs/PDR.md — consult it before any feature work.

## Stack

Next.js App Router + TypeScript (strict), Tailwind, Payload CMS, PostgreSQL, Playwright + axe-core tests.

## Brand (never deviate — PDR §4)

- Tokens in `src/styles/tokens.css`. Colors: navy #060B22 (bg), indigo #141B3F (surfaces),
  cyan #2BD9F5 (ONLY CTA/link/focus color), blue #3FA9F5, violet #7B3FF2 + magenta #A44BF3
  (decorative gradients only, never text/interactive), silver #C9D3E0, white #F5F8FC.
- On light backgrounds use #0E8FAE for links (contrast), never raw cyan.
- Headings: Montserrat 600/700. Body: Inter 400/600, min 16px, line-height 1.6.
- Dark-first: nav/hero/footer on navy; long-form content sections invert to light.

## Privacy rules (PDR §8–9 — treat as blocking review criteria)

- Data minimisation: challenge every new form field — if the purpose doesn't need it, delete it.
- Most-private defaults: sharing/marketing/caregiver-access default OFF.
- No third-party scripts, fonts, or trackers. Self-host fonts. No non-essential cookies before consent.
- The website NEVER stores clinical data. Portal data flows only through the FHIR API client (`src/lib/fhir/`).
- Every consent capture: log timestamp, notice version, scope.
- PII in logs is a bug. Structured logging with an explicit redact list.

## Security rules (PDR §10)

- All inputs validated server-side with zod. Parameterised queries only.
- Security headers + strict CSP via middleware. Rate-limit all form/auth endpoints.
- MFA required on staff/admin auth. Sessions: httpOnly, secure, sameSite=strict, timeout.
- No secrets in code. `.env` is gitignored; `.env.example` documents required vars.

## Accessibility (PDR §12 — WCAG 2.2 AA)

- Every interactive element keyboard-operable with a visible cyan focus ring.
- axe tests must pass in CI; new pages need a Playwright + axe spec.
- Respect prefers-reduced-motion. Alt text on all images.

## Workflow

- TDD where practical. Run `npm run verify` (lint + typecheck + test + axe) before claiming done.
- Conventional commits. Small PRs, one milestone step each.
- Never mark a milestone complete until its "Done when" checks in docs/PLAN.md pass.
