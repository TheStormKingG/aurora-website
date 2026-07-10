# H.M. AURORA HEALTH SYSTEMS

*Illuminating the Future of Care*

**Website Project Design Requirements (PDR)**
Public Website & Patient Portal — Phase One Build
Version 1.1 | 10 July 2026
Prepared for: Web development / design agency
Owner: Hannah Munro, Founder & CEO

> v1.1 adds Sections 8–11: privacy by design, GDPR & data protection, cybersecurity, and EHR patient-information handling.

---

## 1. Project Overview

H.M. Aurora Health Systems is an emerging health innovation company, founded and led by Hannah Munro, operating as an umbrella organisation that develops healthcare solutions through a phased growth model. Its delivery model spans mobile healthcare, community wellness centres, maternal and child health, chronic disease prevention, active ageing services, and the Aurora Digital Health Platform — a lifelong electronic health record that follows each patient from pregnancy through ageing.

This PDR specifies the public website and its patient-facing entry points. The website is the public gateway to the Aurora ecosystem: it presents the organisation, enables appointment booking and home-visit requests, registers patients, delivers health education, and provides secure login routes into the Patient Portal and staff systems.

## 2. Objectives & Success Criteria

- Establish a credible, trustworthy digital presence for a healthcare brand handling sensitive services.
- Convert visitors into registered patients: appointment bookings, home-visit requests, and programme sign-ups are the primary conversion actions.
- Serve as the front door to the Aurora Digital Health Platform (Patient Portal, staff login, telemedicine).
- Deliver health education content that counters misinformation with evidence-based resources — a core brand differentiator.
- Demonstrate exemplary privacy and security practice — a trust signal consistent with the company mission and a prerequisite for institutional partnerships.
- Scale cleanly across the four-phase service roadmap without redesign.

**Success measures:** booking-flow completion rate, patient registrations, portal adoption, resource engagement, Core Web Vitals in the green, WCAG 2.2 AA conformance, and a clean pre-launch security and privacy audit.

## 3. Target Audiences

| Audience | Primary needs |
|---|---|
| Patients & families | Find services, book appointments, request home visits, access their health record, pay bills |
| Expectant & new mothers | Antenatal programme info, pregnancy-journey tracking via portal, education |
| Caregivers & older adults | Active-ageing services, medication/appointment reminders, permitted family access |
| Healthcare institutions & partners | Company credibility, partnership contact, careers |
| Staff & clinicians | Separate secure login to Aurora EHR and operational systems |
| Donors & community | Mission, impact, donation flow, community programmes |

## 4. Brand Identity

### 4.1 Logo

The primary logo is a chrome/metallic wordmark — "H.M AURORA" — set against an aurora borealis night sky. It integrates three healthcare motifs: a molecular cluster forming the dots of "H.M", an ECG pulse ring beneath the wordmark, and a winged caduceus merged into the final "A". "HEALTH SYSTEMS" sits beneath in letterspaced caps, with the cyan tagline "Illuminating the Future of Care."

Usage rules:

- Primary lockup lives on dark backgrounds (Deep Space Navy or aurora imagery). Never place the full-colour logo on white or light backgrounds — commission a mono/one-colour variant (navy on light, white on mid-tones) for those contexts.
- Maintain clear space equal to the height of the "A" on all sides; minimum display width 180 px for the full lockup.
- Do not recolour, stretch, add effects, or separate the caduceus/molecule elements from the wordmark.
- Favicon/app icon: the caduceus "A" or molecule mark alone on navy.
- Developer note: request layered source files (SVG/PNG with transparency) plus the mono variants before build.

### 4.2 Colour Palette

The palette is drawn directly from the logo: a deep space-navy canvas lit by aurora cyan, blue and violet, with chrome silver and starlight white for type.

| Name | Hex | RGB | Usage |
|---|---|---|---|
| Deep Space Navy | #060B22 | 6, 11, 34 | Primary background (hero, header, footer); the night-sky canvas of the brand |
| Midnight Indigo | #141B3F | 20, 27, 63 | Secondary surfaces, cards and panels on dark sections |
| Aurora Cyan | #2BD9F5 | 43, 217, 245 | Primary accent: CTAs, links, icons, the tagline colour |
| Electric Blue | #3FA9F5 | 63, 169, 245 | Secondary accent: hover states, gradients, data highlights |
| Aurora Violet | #7B3FF2 | 123, 63, 242 | Tertiary accent: gradient partner to cyan, section flourishes |
| Nebula Magenta | #A44BF3 | 164, 75, 243 | Sparing use in aurora gradients and decorative glows only |
| Chrome Silver | #C9D3E0 | 201, 211, 224 | Metallic wordmark tone; secondary text on dark backgrounds |
| Starlight White | #F5F8FC | 245, 248, 252 | Body text on dark surfaces; page background for light sections |

Application rules:

- Dark-first design: hero, navigation and footer on Deep Space Navy; long-form content sections may invert to Starlight White with navy text for readability.
- Aurora Cyan is the single call-to-action colour sitewide (buttons, links, active states). Violet and magenta are decorative — gradients and glows only, never for text or interactive elements.
- Signature gradient: Aurora Cyan → Electric Blue → Aurora Violet, used in hero backgrounds, section dividers and data visualisations.
- All text/background pairings must meet WCAG 2.2 AA contrast (4.5:1 body, 3:1 large text). Aurora Cyan on navy passes; cyan on white does not — use a darkened cyan (#0E8FAE) for links on light backgrounds.

### 4.3 Typography

- Headings: a modern geometric sans-serif with a slightly futuristic character to echo the chrome wordmark (recommended: Montserrat or Exo 2, weights 600–700).
- Body: a highly legible humanist sans-serif (recommended: Inter or Open Sans, 400/600), minimum 16 px, generous line height (1.6) for health-literacy readability.
- Tagline & accents: letterspaced caps in Aurora Cyan, mirroring the logo's "HEALTH SYSTEMS" treatment.

### 4.4 Imagery & Visual Style

- Aurora/starfield textures reserved for hero and section transitions; keep content areas clean and clinical.
- Photography: warm, real people across the full life course (pregnancy, childhood, adulthood, ageing) — reflecting the lifelong-record brand promise. Avoid sterile stock clichés.
- Iconography: thin-line icons with cyan glow accents; subtle ECG-pulse motif as a recurring divider element.
- Motion: restrained aurora gradient animation in the hero only; respect prefers-reduced-motion.

## 5. Information Architecture

Primary navigation (from the approved sitemap):

| Section | Contents |
|---|---|
| Home | Hero, service overview, booking CTA, trust indicators, news highlights |
| About Us | Mission, healthcare philosophy, leadership (Founder & CEO), phased vision |
| Services | Eight pillars: mobile healthcare, NCD prevention (diabetes, hypertension, cardiovascular, obesity), maternal health, child nutrition & development, community wellness centres, active ageing, early childhood centre, digital health platform |
| Book Appointment | Appointment booking and home-visit request flows |
| Patient Login | Entry to the secure Patient Portal |
| Staff Login | Separate authentication route to Aurora EHR/operational systems |
| Telemedicine | Virtual consultation information and access |
| Health Resources | Evidence-based education library, campaigns, misinformation-countering content |
| News | Announcements, community programmes, campaigns |
| Careers | Openings and applications |
| Donations | Giving flow supporting community health programmes |
| Online Payments | Bill payment for services |
| Contact Us | Locations, contact forms, healthcare team contact |
| Privacy Centre | Privacy notice, cookie policy, consent preferences, data-rights request forms (new in v1.1) |

## 6. Functional Requirements

### 6.1 Public Website

- Appointment booking: service → provider/location → date/time → patient details → confirmation with email/SMS reminder. Supports mobile-clinic home-visit requests as a parallel flow.
- Patient registration: account creation feeding the central patient database / Aurora Health Record.
- Programme registration: sign-up forms for wellness programmes, maternal classes, and community events.
- Health Resources: CMS-driven article library with categories, search, and downloadable materials.
- Contact: general enquiry, partnership, and careers forms with spam protection.
- Donations & payments: PCI-DSS-compliant payment gateway integration; no card data stored on Aurora infrastructure.
- Privacy Centre: consent-preference dashboard, privacy notice, cookie controls, and data-subject-rights request forms (see Sections 8–9).

### 6.2 Patient Portal (linked secure area)

The portal is a separate authenticated application reached from the website. Phase One scope for the website is the login handoff plus the following portal capabilities, per the platform specification:

- View personal health record, consultations, medications, laboratory results, and imaging reports.
- Track health goals, glucose/blood-pressure trends, pregnancy journey, and child development milestones.
- Manage appointments, request home visits, receive reminders, and message healthcare providers.
- Exercise data rights self-service: download record (machine-readable), request corrections, manage consents, delete account (see Section 8).

### 6.3 Administration

- CMS for non-technical editing of all public content (services, resources, news, careers).
- Role-based admin access; audit logging of content and configuration changes.

## 7. Technical Requirements

- Responsive, mobile-first build; the mobile-clinic audience is expected to be predominantly on phones.
- Modern stack with a headless or hybrid CMS; cloud hosting with regional availability appropriate to the Caribbean market and future U.S. expansion.
- Booking and portal integrate via API with the Aurora Digital Health Platform (EHR, labs, pharmacy, billing) — the website must not duplicate clinical data stores.
- Performance: Core Web Vitals targets — LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on 4G mobile.
- SEO: semantic markup, schema.org MedicalOrganization/Physician types, multilingual-ready architecture.
- Analytics: privacy-respecting, cookieless-by-default analytics with conversion tracking on booking, registration, and donation flows; no third-party ad trackers on any page that handles health-related input.

## 8. Privacy by Design & by Default

Privacy by design is a legal obligation under GDPR Article 25, not a best practice: data-protection measures must be embedded when the architecture is determined, and the most privacy-protective settings must be the default. Every design and build decision in this project is subject to the principles below.

### 8.1 Design Principles

- Data minimisation by default: every form collects only what its specific purpose requires (booking an appointment does not require a full medical history). Optional fields are clearly marked; progressive collection over time is preferred to up-front interrogation.
- Most-private defaults: third-party data sharing, marketing communications, and caregiver/family record access are all OFF until the patient explicitly opts in. Retention defaults to the minimum period required for the stated purpose.
- Purpose limitation: consent is captured per purpose (care delivery, reminders, education, research, marketing) and data is never repurposed without a new lawful basis.
- Pseudonymisation & separation: identifiers are stored separately from clinical data at the database layer; analytics operate on aggregated or pseudonymised data only.
- Self-service rights: the portal lets patients download their record in a machine-readable format, request corrections, manage every consent, and delete their account — within GDPR Article 15–20 timelines, without phoning support.
- No dark patterns: consent banners present accept/reject with equal prominence; no non-essential cookies or trackers fire before consent; withdrawing consent is as easy as giving it.

### 8.2 Process Requirements

- A Data Protection Impact Assessment (DPIA, GDPR Art. 35) is mandatory before build — large-scale processing of health data triggers it automatically — and must be revisited at each phase of the service roadmap.
- Privacy review is a stage gate: no feature handling personal data ships without sign-off against this section.
- Layered, plain-language privacy notices on website and portal, updated whenever practices change; a public Privacy Centre hosts notices, cookie policy, and rights-request forms.
- Records of processing activities (Art. 30) maintained from day one; the design system documents what each component collects and why.

## 9. GDPR & Data Protection Compliance

Aurora's launch market is the Caribbean with planned regional and U.S. expansion, and its platform will be accessible internationally. The build therefore adopts GDPR as the design benchmark — the strictest widely-recognised standard — layered with local law.

### 9.1 Lawful Basis for Health Data

- Health data is special-category data under GDPR Article 9: processing requires BOTH an Article 6 lawful basis AND a separate Article 9(2) condition. Without both, processing is prohibited.
- Clinical care flows rely on Art. 9(2)(h) (health/social care under professional responsibility); patient-initiated portal and wellness features rely on Art. 9(2)(a) explicit consent — a clear statement naming the data categories and purposes.
- Consent records are logged with timestamp, notice version, and scope; consent is granular per purpose and withdrawable in one step from the Privacy Centre.

### 9.2 Data Subject Rights

- Workflows for access, rectification, erasure, restriction, portability, and objection, with responses within one month; identity verification proportionate to risk.
- Portability delivered as structured, machine-readable export (see Section 11.5).

### 9.3 Governance & Accountability

- Appoint a Data Protection Officer — mandatory given large-scale special-category processing; DPO contact published in the privacy notice.
- Article 28 data-processing agreements with every vendor touching personal data (hosting, CMS, analytics, payment, SMS/email providers); a maintained processor register.
- Breach response: capability to detect, assess, and notify the supervisory authority within 72 hours, and affected patients without undue delay where risk is high.
- International transfers mapped and covered by adequacy decisions or Standard Contractual Clauses; data residency documented per store.

### 9.4 Local & U.S. Law Layering

- Guyana Data Protection Act 2023: registration with the Data Protection Office, DPO appointment, DPIAs, and records of processing. The Act awaits ministerial commencement — Aurora builds to it now rather than retrofitting.
- Regional expansion: per-jurisdiction data-protection review is a launch checklist item for each new Caribbean market.
- U.S. market entry: HIPAA Privacy and Security Rule alignment (Section 10) positions the platform for U.S. partnerships; business associate agreements required with U.S. vendors.

## 10. Cybersecurity Requirements

Controls follow the NIST Cybersecurity Framework and the 2026 HIPAA Security Rule direction, which makes previously "addressable" safeguards mandatory. These are build requirements, not aspirations.

### 10.1 Mandatory Technical Controls

- Encryption everywhere: AES-256 (or equivalent) at rest for all patient records, databases, and backups; TLS 1.2+ in transit for all pages, APIs, and system-to-system exchange. Documented key management.
- Multi-factor authentication: required for all staff and admin access (phishing-resistant methods for privileged accounts); offered and encouraged for patients.
- Access control: role-based access, least privilege, unique user IDs, automatic session timeout, and account lockout on repeated failures.
- System hardening: documented patch-management SLAs, elimination of default credentials, disablement of unnecessary services, configuration baselines, and a maintained asset inventory.
- Network architecture: public website, patient portal, and clinical systems segmented; API gateway mediating all EHR access; WAF and DDoS protection in front of public endpoints.

### 10.2 Operational Security

- Risk management: a documented risk assessment at least every 12 months, with tracked, timely remediation — assessment alone is insufficient.
- Testing: vulnerability scans at least every six months and annual penetration testing by qualified professionals, with written findings and corrective-action records. A clean pre-launch pentest is an acceptance criterion.
- Monitoring: centralised, tamper-evident audit logging; anomaly detection and alerting on authentication and record-access events.
- Resilience: tested backup and recovery with defined RTO/RPO, an incident-response plan with a ransomware playbook, and at least annual tabletop exercises.
- Vendors: security due diligence before onboarding; contractual security obligations (DPAs/BAAs) for all processors.

## 11. EHR & Patient Information Handling

The website and portal are windows onto the Aurora Lifetime Health Record — never a second copy of it. Patient information handling follows the standards below.

### 11.1 Architecture

- Single source of truth: the public website stores no clinical data; the portal reads and writes through authenticated APIs to the Aurora Digital Health Platform.
- Interoperability: HL7 FHIR (R4 or later) as the integration standard between portal and platform — aligning Aurora with U.S. interoperability expectations and the European Health Data Space direction, and keeping future EHR/lab/pharmacy integrations plug-compatible.
- Governance framework: ISO 27001 information-security management with ISO 27799 health-specific controls; certification is a Phase Two roadmap item.

### 11.2 Access & Consent

- Consent-aware record access: caregiver and family access exists only with explicit, granular, revocable patient permission (e.g., appointments visible, mental-health notes excluded).
- Clinician access follows role and treatment relationship; break-glass emergency access is logged and reviewed.

### 11.3 Auditability

- Every access to a patient record is logged: who, what, when, from where. Patients can view their own access history in the portal — a differentiating trust feature.

### 11.4 Lifecycle & Quality

- Retention schedules defined per record type and jurisdiction; secure deletion at end of retention; account deletion honours clinical-record retention law while removing everything else.
- Patient-initiated correction workflow feeds verified amendments back to the EHR.
- Children's records: parental/guardian consent flows with age-of-majority handover of account control; age-appropriate design standards for any child-facing surfaces.

### 11.5 Portability

- Patient export in structured machine-readable format (FHIR JSON) plus human-readable PDF, self-service from the portal.

## 12. Accessibility

- WCAG 2.2 AA conformance across public site and portal entry points.
- Full keyboard operability, visible focus states (Aurora Cyan outline), screen-reader-tested booking flow.
- Plain-language content standard (readability grade ~8) given the health-education mission.
- Respect prefers-reduced-motion; provide text alternatives for all infographic content.

## 13. Phased Delivery Roadmap

| Phase | Website scope | Aligned service phase |
|---|---|---|
| 1 | Public website, booking + home-visit requests, patient registration, resources, portal login handoff, Privacy Centre, DPIA & pentest | Mobile Healthcare Services |
| 2 | Community centre location pages, programme dashboards, expanded portal features, ISO 27001 certification track | Community Wellness Centres |
| 3 | Active-ageing content hub, caregiver access flows, medication-reminder surfaces | Adult Wellness & Active Ageing Centre |
| 4 | Early-childhood development profiles, telemedicine expansion, mobile app handoff | Early Childhood Health & Development Centre |

## 14. Out of Scope (Version 1)

- Native mobile application (future Aurora Mobile App).
- AI decision support, analytics dashboards, and research platform (Advanced Digital Development stage).
- Pharmacy and laboratory e-commerce; full telemedicine video infrastructure (informational page + access link only in v1).

## 15. Deliverables & Acceptance

- Design system (tokens for the palette above, typography, components) delivered in Figma before build.
- Staging environment for stakeholder review at each milestone; content entry via CMS by Aurora team.
- Acceptance: all functional requirements demonstrated; WCAG 2.2 AA audit passed; Core Web Vitals green; DPIA completed and signed off; penetration-test report clear; GDPR/data-protection review passed against Sections 8–11; processor DPA/BAA register complete; brand review approved against Section 4.
- Point of contact: Hannah Munro, Founder & CEO, H.M. Aurora Health Systems.

## 16. Key References

- GDPR Articles 9 (special-category data), 25 (data protection by design/default), 28, 30, 32–35 — gdpr-info.eu
- EDPB Guidelines 4/2019 on Article 25 Data Protection by Design and by Default — edpb.europa.eu
- HIPAA Security Rule 2026 update (mandatory encryption, MFA, biannual scans, annual pentest; enforcement from 2027) — hhs.gov / hipaajournal.com
- NIST Cybersecurity Framework 2.0 — nist.gov
- HL7 FHIR & HL7 Europe EHDS Implementation Guides — hl7.org / hl7europe.org
- ISO/IEC 27001 and ISO 27799 (health informatics security) — iso.org
- Guyana Data Protection Act 2023 (Act No. 18 of 2023) — officialgazette.gov.gy
