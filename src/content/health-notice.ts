/**
 * Health-data consent notice shown at /app/consent (spec §5).
 * GDPR Art. 9(2)(a): explicit consent naming the data categories and
 * purposes. Bump HEALTH_NOTICE_VERSION whenever the text changes — the
 * app re-asks for consent when the stored version differs.
 */
export const HEALTH_NOTICE_VERSION = "1.0-2026-09-08";
export const HEALTH_NOTICE_SCOPE = { readings: true, lifestyle: true, record: true } as const;

export const healthNotice = {
  title: "Before you start",
  intro:
    "The Aurora app stores health information about you. Health data is sensitive, so we ask for your clear permission first.",
  sections: [
    {
      heading: "What we store",
      body: "Blood pressure, blood sugar and cholesterol readings you enter; water and exercise entries; and the health record you keep here — conditions, surgeries, medications, allergies and family history.",
    },
    {
      heading: "Why",
      body: "So you can monitor your own health at home, so Aurora nurses can care for you using accurate information, and so diet and exercise plans can be based on real readings.",
    },
    {
      heading: "Where and how",
      body: "In Aurora's database, encrypted, in the cloud. Your readings are stored under a code, not your name. Only you can see them today. In future, Aurora staff on your care team will be able to, and every access is logged where you can see it.",
    },
    {
      heading: "How long",
      body: "Readings stay in the app for 12 months, then move to Aurora's archive. If you withdraw, tracking stops at once and your health data is deleted after 30 days unless you change your mind.",
    },
    {
      heading: "Your choice",
      body: "You can download or delete your data, or withdraw this permission, at any time from More.",
    },
  ],
  checkbox: "I agree to Aurora storing and using my health information as described above.",
  button: "I agree — open the app",
} as const;
