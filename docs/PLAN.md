# H.M. Aurora Website — Claude Code Build Plan

Source of truth: docs/PDR.md (v1.1). Stack: Next.js (App Router, TypeScript) · Tailwind CSS · Payload CMS · PostgreSQL · Playwright/axe for testing.

Payload over Sanity: self-hosted, so public content never leaves Aurora-controlled infrastructure — one fewer GDPR Art. 28 processor, and it shares the Next.js/Postgres stack.

## 1. One-time setup

- [x] `mkdir aurora-website && git init`
- [x] Scaffold the project, add CLAUDE.md (repo root) — CLAUDE.md is how the PDR's rules become enforceable on every session.
- [x] Convert the PDR to docs/PDR.md; keep this plan as docs/PLAN.md.

## 2. Milestones

Run each as its own Claude Code session. Pattern: plan mode first, then execute, then the verification loop. Tick off "Done when" items.

### M0 — Scaffold & guardrails (Week 1)

Scaffold Next.js 15 App Router + TypeScript strict + Tailwind. Add Payload CMS with Postgres. Set up ESLint, Prettier, Playwright with axe-core, and a GitHub Actions CI running lint/typecheck/test/axe/Lighthouse CI. Add `npm run verify`. Create `src/styles/tokens.css` with the brand tokens from CLAUDE.md.

Done when:
- [x] Scaffold: Next.js 15 App Router + TS strict + Tailwind, ESLint
- [x] `src/styles/tokens.css` matches PDR §4.2
- [x] `npm run verify` script exists
- [ ] Payload CMS + Postgres wired (deferred: needs a provisioned Postgres instance — content served from typed content layer `src/content/` until then; see §4 note)
- [ ] CI green on empty app; Lighthouse CI budget set (LCP < 2.5s, CLS < 0.1)

### M1 — Design system (Weeks 1–2)

Component library per PDR §4: Button (cyan CTA), NavBar (navy, mobile-first), Footer, Card, SectionHeading with ECG-pulse divider, AuroraHero with the cyan→blue→violet gradient (animated, respecting prefers-reduced-motion), form primitives with error states. `/dev/components` page to review them.

Done when:
- [ ] Every component passes axe
- [ ] Contrast checked on both dark and light surfaces
- [ ] `/dev/components` eyeballed against the logo

### M2 — Public pages & CMS (Weeks 2–4)

Model collections: Services (8 pillars), Resources, News, Careers, Locations, Team. Build pages per PDR §5: Home, About, Services (+detail), Health Resources (searchable library), News, Careers, Donations (static for now), Contact. schema.org MedicalOrganization markup. No clinical data anywhere.

Done when:
- [ ] All §5 pages render from content collections
- [ ] SEO/meta done
- [ ] CWV green on 4G throttle
- [ ] Content editable by a non-developer (CMS phase)

### M3 — Booking & home-visit flows (Weeks 4–6)

Booking flow per PDR §6.1: service → provider/location → date/time → patient details → confirmation, plus the parallel home-visit request flow. Zod validation, rate limiting, email/SMS confirmation via provider abstraction (Resend/Twilio behind an interface). Collect ONLY the fields the PDR justifies.

Done when:
- [ ] Playwright covers happy path + validation errors + keyboard-only completion
- [ ] A screen reader can complete a booking
- [ ] No PII in logs

### M4 — Privacy Centre & consent (Weeks 6–7)

Privacy Centre per PDR §6.1/§8: privacy notice page (versioned), cookie/consent manager (no non-essential scripts before opt-in, accept/reject equal prominence), consent-preferences dashboard, and data-subject-rights request form that opens a tracked ticket. Consent log records timestamp + notice version + scope.

Done when:
- [ ] With all consent declined the site sets zero non-essential cookies (Playwright test)
- [ ] Rights requests generate an auditable record

### M5 — Registration & portal handoff (Weeks 7–9)

Patient registration and auth per PDR §6.2/§10: Auth.js (or Keycloak) with email verification, optional TOTP MFA for patients, mandatory MFA on the staff route (separate login page). Session hardening per CLAUDE.md. Portal handoff = authenticated redirect with short-lived token; FHIR client interface stub in `src/lib/fhir/` for Phase 2.

Done when:
- [ ] Auth flows pass security-focused tests (lockout, session expiry, token reuse)
- [ ] Staff and patient routes fully separated
- [ ] /security-review run on the auth PR

### M6 — Payments & donations (Weeks 9–10)

PCI-DSS-compliant hosted payment provider (Stripe Checkout or regional equivalent — hosted fields only, no card data touching our servers) for bill payments and donations per PDR §6.1.

Done when:
- [ ] Payment succeeds in test mode
- [ ] Webhook handling idempotent
- [ ] No card data in requests to our origin

### M7 — Hardening & audit prep (Weeks 10–11)

Full pass: CSP report-only → enforce, security headers, dependency audit, rate-limit review, structured audit logging for auth events, backup/restore runbook for Postgres, error pages. Then /security-review across the repo.

Done when:
- [ ] Clean /security-review
- [ ] OWASP ZAP baseline scan clean
- [ ] docs/runbooks exist

### M8 — Launch gate (Week 12)

Not code: DPIA signed off, external pentest booked/passed, WCAG 2.2 AA external audit, processor DPA register complete, Guyana DPO registration status confirmed. Generate the launch checklist from docs/PDR.md §15 acceptance criteria and verify everything automatable.

## 3. Working practices with Claude Code

- Plan mode before every milestone — review the plan, then let it execute.
- One milestone step per session/PR. `/clear` between tasks; rely on CLAUDE.md + docs/PLAN.md for continuity.
- Verification loop: after each feature run `npm run verify`, then re-review the diff against CLAUDE.md's privacy/security/a11y rules before merge.
- Use /security-review on every PR that touches auth, forms, or data handling (M3–M7).
- Custom skill worth adding: a privacy-review skill that checks any new form/field against PDR §8.1 data-minimisation rules (`.claude/skills/`).
- Screenshots for design fidelity: compare rendered output to the brand rules.
- Hooks: pre-commit lint + typecheck; post-edit grep of staged diffs for console.log of user data.

## 4. Build notes (living)

- **2026-07-10 — initial build session.** M0–M4 first pass built in one session (scaffold, tokens, design system, all public pages, booking + home-visit flows, Privacy Centre, login stubs). Payload CMS deferred: requires a provisioned Postgres instance and env secrets that can't be created autonomously. The content layer lives in `src/content/` as typed TS modules mirroring the future Payload collections (services, resources, news, careers, locations, team) — swapping to Payload is a data-source change, not a page rewrite. Email/SMS confirmation stubbed behind `src/lib/notify/` provider interface per M3. No logo source files exist yet (PDR §4.1 developer note) — `AuroraLogo` SVG component is an interpretation of the §4.1 description; replace with commissioned brand files when available.

Estimated timeline: ~12 weeks to launch gate.
