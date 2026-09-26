// Proves what survives an account deletion — the cascade map, asserted
// rather than described (docs/DATA_CASCADE.md).
//
// A cascade map written only as a document drifts the moment a migration
// adds a table, and nothing notices: the migration passes, the doc is
// still true-looking, and personal data quietly outlives the account it
// belonged to. This walks the whole surface a real patient touches —
// booking, contact, home visit, health record — then deletes the auth
// user and asserts that nothing identifying is left behind.
//
// Article 17 is the reason this is a test and not a checklist. A
// deletion that reports success while leaving a name, phone or email in
// a side table is the same defect class as a save path that reports
// success and writes nothing, and it is the one with legal exposure.
//
//   node --env-file=.env.local tests/rls/cascade.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("missing env");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = process.env.RLS_STAMP || String(Date.now());
const fail = (m) => { console.error("✗ " + m); process.exitCode = 1; };
const ok = (m) => console.log("✓ " + m);
const H = (c) => c.schema("health");

// Every row this test writes carries the stamp, so the assertions below
// can only ever see their own data — never another run's, and never a
// real patient's.
const NAME = `RLS Cascade ${stamp}`;
const EMAIL = `rls-cascade+${stamp}@example.com`;
const PHONE = `+592000${String(stamp).slice(-4)}`;

async function makeUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL, password: "Test-passw0rd!", email_confirm: true,
    user_metadata: { full_name: NAME, dob: "1990-01-01" },
  });
  if (error) throw error;
  return data.user.id;
}
async function signedIn() {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: EMAIL, password: "Test-passw0rd!" });
  if (error) throw error;
  return c;
}

/** Rows of `table` still carrying this run's identifiers, read as service_role. */
async function survivors(table, columns) {
  const or = columns.map((c) => `${c}.eq.${c === "phone" ? PHONE : c === "email" ? EMAIL : NAME}`).join(",");
  const { data, error } = await admin.from(table).select("id").or(or);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data.length;
}

const userId = await makeUser();
let patientId = null;

try {
  const c = await signedIn();

  // ── Touch every surface a real patient touches ──────────────────────
  // Intake forms are insert-only for anon and authenticated alike, which
  // is why they are written through the signed-in client here rather
  // than seeded as service_role: this is the path a patient takes.
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const booking = await c.from("aurora_bookings").insert({
    reference: `RLSB-${stamp}`, service: "general-practice", location: "Georgetown",
    appointment_date: today, time_window: "morning",
    full_name: NAME, date_of_birth: "1990-01-01", phone: PHONE, email: EMAIL,
    consent_notice_version: "cascade-test", consented_at: now, user_id: userId,
  });
  if (booking.error) throw new Error("seed booking: " + booking.error.message);

  const contact = await c.from("aurora_contacts").insert({
    reference: `RLSC-${stamp}`, kind: "general",
    full_name: NAME, email: EMAIL, message: "cascade test",
    consent_notice_version: "cascade-test", consented_at: now,
  });
  if (contact.error) throw new Error("seed contact: " + contact.error.message);

  const visit = await c.from("aurora_home_visits").insert({
    reference: `RLSV-${stamp}`, service: "home-visit", address: "1 Test Street",
    area: "Georgetown", visit_date: today, time_window: "morning",
    full_name: NAME, phone: PHONE,
    consent_notice_version: "cascade-test", consented_at: now,
  });
  if (visit.error) throw new Error("seed home visit: " + visit.error.message);

  const grant = await H(c).rpc("grant_consent", {
    notice_version: "cascade-test", scope: { readings: true },
  });
  if (grant.error) throw new Error("consent: " + grant.error.message);
  patientId = grant.data;

  const reading = await H(c).from("readings").insert({
    patient_id: patientId, kind: "blood_pressure",
    recorded_at: new Date().toISOString(), systolic: 128, diastolic: 82,
  });
  if (reading.error) fail("could not seed a reading: " + reading.error.message);

  ok("seeded booking, contact, home visit, consent and a reading for one patient");

  // ── The account is deleted ──────────────────────────────────────────
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) throw new Error("deleteUser: " + delErr.message);
  ok("auth user deleted");

  // ── What is left? ───────────────────────────────────────────────────
  const gone = async (label, fn) => {
    const n = await fn();
    if (n === 0) ok(`${label}: nothing left`);
    else fail(`ARTICLE 17 BREACH — ${label}: ${n} row(s) still hold this person's data`);
  };

  await gone("health.patients", async () => {
    const { data } = await H(admin).from("patients").select("patient_id").eq("patient_id", patientId);
    return data?.length ?? 0;
  });
  await gone("health.readings", async () => {
    const { data } = await H(admin).from("readings").select("id").eq("patient_id", patientId);
    return data?.length ?? 0;
  });
  await gone("public.profiles", async () => {
    const { data } = await admin.from("profiles").select("id").eq("id", userId);
    return data?.length ?? 0;
  });
  await gone("public.account_consents", async () => {
    const { data } = await admin.from("account_consents").select("id").eq("user_id", userId);
    return data?.length ?? 0;
  });

  // These four hold name/phone/email directly and are the ones that
  // orphan: aurora_bookings.user_id is ON DELETE SET NULL, so the row
  // survives the deletion AND loses the only handle that could find it
  // again. The other three were never linked to an account at all.
  await gone("public.aurora_bookings", () => survivors("aurora_bookings", ["full_name", "email", "phone"]));
  await gone("public.aurora_contacts", () => survivors("aurora_contacts", ["full_name", "email"]));
  await gone("public.aurora_home_visits", () => survivors("aurora_home_visits", ["full_name", "phone"]));
  await gone("public.aurora_rights_requests", () => survivors("aurora_rights_requests", ["full_name", "email"]));

  // ── What SHOULD survive, and why ────────────────────────────────────
  // The audit log is retained deliberately (Art. 17(3)(b) — the legal
  // obligation to keep an access trail). It is safe to keep because
  // patient_id is pseudonymous and the row it pointed at is now gone, so
  // what remains cannot be resolved to a person. Asserting it POSITIVELY
  // matters: if a later migration ever cascades the log away, that is a
  // compliance regression in the opposite direction and nothing else
  // would catch it.
  const { data: log } = await H(admin).from("access_log").select("id").eq("patient_id", patientId);
  if ((log?.length ?? 0) > 0) ok(`access_log retained (${log.length} rows, pseudonymous — deliberate)`);
  else fail("access_log was purged — the audit trail must survive the patient row");
} finally {
  // Belt and braces: if an assertion above threw before the delete, the
  // user (and anything keyed to it) must still not outlive this run.
  await admin.auth.admin.deleteUser(userId).catch(() => {});
  for (const t of ["aurora_bookings", "aurora_contacts", "aurora_home_visits", "aurora_rights_requests"]) {
    await admin.from(t).delete().eq("full_name", NAME).catch(() => {});
    await admin.from(t).delete().eq("full_name", "[erased]").eq("reference", `RLS${t[7].toUpperCase()}-${stamp}`).catch(() => {});
  }
}
