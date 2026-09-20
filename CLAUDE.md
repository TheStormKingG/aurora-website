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

### Ship through a pull request — never straight to main

Every change goes branch → PR → review → merge. This is not ceremony: it is the only
point at which anything reads the diff before it reaches the live site. Until
2026-09-20 this repo had **zero** pull requests and every change was merged locally and
pushed, which is how a photograph with no faces in it, and the same crop defect on a
second page, both reached production unread.

```
git switch -c feat/thing
npm run verify          # lint + typecheck + unit + build
npm run review          # the same AI reviewer CI runs, before you push
git push -u origin feat/thing && gh pr create
```

`npm run review` is optional locally and automatic on the PR. Running it first is
cheaper than a CI round-trip and it is the same brief either way.

### What the reviewer is for, and what it is not

`scripts/ai-review.mjs` reviews **architecture, not syntax** — the brief tells it to
ignore anything a linter decides, and it weights the defect classes that have actually
shipped here (silent success, guards that cannot fail, empty results read as findings,
basePath, responsive crops, consent and RLS). Every finding must carry a concrete
failure scenario or it is not reported; a reviewer that cries wolf gets muted, and then
it protects nothing.

- **Critical blocks the merge** — silent data loss, a consent/auth/RLS bypass, patient
  data escaping, an unconfirmed destructive action, injection, or a guard that cannot fail.
- **Warnings are informational** — read them, act if they are right.
- **You make the call.** The reviewer is a second pair of eyes, not an authority. When
  it is wrong, override it and say so in the PR; when a critical finding is a false
  positive, that is worth a line in the PR so the brief can be tightened later.

It does not replace `npm run verify`, the e2e suite, or looking at the rendered page.
It reads a diff — it cannot see what the site looks like, and it never will.

### Running gates

| Gate | Runs | Blocks on |
|------|------|-----------|
| `npm run verify` | locally, by hand | lint, types, unit tests, build |
| AI review | every PR, automatically | critical findings only |
| Deploy | push to `main` | build failure |

The AI review job fails loudly when the review could not run at all — a missing key, a
rate limit, an unparseable response. That is deliberate: a reviewer that silently does
not run is indistinguishable from one that found nothing, and this repo has been bitten
by exactly that shape of failure before.
