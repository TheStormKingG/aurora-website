/**
 * Health-data consent notice shown at /app/consent (spec §5).
 * GDPR Art. 9(2)(a): explicit consent naming the data categories and
 * purposes. Bump HEALTH_NOTICE_VERSION whenever the text changes — the
 * app re-asks for consent when the stored version differs.
 *
 * Art. 13(1)(f) requires naming the processor and where the data is held;
 * Art. 7(3) requires saying that withdrawal does not undo lawful processing
 * already carried out. Both are stated below in plain language, alongside
 * what happens if the patient declines.
 */
export const HEALTH_NOTICE_VERSION = "1.0-2026-09-08";
export const HEALTH_NOTICE_SCOPE = { readings: true, lifestyle: true, record: true } as const;

export const healthNotice = {
  title: "Before you start",
  intro:
    "The Aurora app keeps health information about you. Health data is sensitive, so we ask for your clear permission first.",
  sections: [
    {
      heading: "What we store",
      body: "Blood pressure, blood sugar and cholesterol readings you enter; water and exercise entries; and the health record you keep here — conditions, surgeries, medications, allergies and family history.",
    },
    {
      heading: "Why",
      body: "So you can watch your own health at home. So Aurora nurses can care for you using accurate information. And so your diet and exercise plans can be built from real readings.",
    },
    {
      heading: "Where it is kept",
      body: "In Aurora's database, which runs on Supabase, a hosting company, on servers in Brazil. Everything is encrypted. Your readings are filed under a code, not your name.",
    },
    {
      heading: "Who can see it",
      body: "Today, only you. In future, Aurora staff on your care team will be able to — and every time anyone opens your record, it is logged where you can see it.",
    },
    {
      heading: "How long",
      body: "Readings stay in the app for 12 months, then move to Aurora's archive. If you withdraw your permission, tracking stops at once and your health data is deleted 30 days later, unless you change your mind in that time.",
    },
    {
      heading: "If you say no",
      body: "Nothing else changes. You keep your Aurora account, you can still book appointments and home visits, and we will hold no health data about you. You can turn this on later whenever you like.",
    },
    {
      heading: "Your choice",
      body: "You can download your data, delete it, or withdraw this permission at any time from More. Withdrawing stops any further use of your data. It does not undo what was already done lawfully while your permission was in place.",
    },
  ],
  checkbox: "I agree to Aurora storing and using my health information as described above.",
  button: "I agree — open the app",
} as const;
