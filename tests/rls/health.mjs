// Proves the health schema's security posture (spec §15): own-rows only,
// consent-gated writes, tamper-proof audit log, anon locked out, archive
// unreachable, withdrawal blocks writes, delete-now purges but keeps the log.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("missing env");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = process.env.RLS_STAMP || String(Date.now());
const fail = (m) => { console.error("✗ " + m); process.exitCode = 1; };
const ok = (m) => console.log("✓ " + m);

async function makeUser(tag) {
  const email = `rls-health+${tag}.${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "Test-passw0rd!", email_confirm: true,
    user_metadata: { full_name: `RLS ${tag}`, dob: "1990-01-01" },
  });
  if (error) throw error;
  return { id: data.user.id, email };
}
async function signedIn(user, headers) {
  const c = createClient(url, anonKey, {
    auth: { persistSession: false },
    ...(headers ? { global: { headers } } : {}),
  });
  const { error } = await c.auth.signInWithPassword({ email: user.email, password: "Test-passw0rd!" });
  if (error) throw error;
  return c;
}
const bp = (patient_id, extra = {}) => ({
  patient_id, kind: "blood_pressure", recorded_at: new Date().toISOString(),
  systolic: 128, diastolic: 82, pulse: 72, ...extra,
});
const H = (c) => c.schema("health");

const a = await makeUser("a");
const b = await makeUser("b");
try {
  const ca = await signedIn(a);

  // 1. Before consent: reads are empty, writes are refused.
  const pre = await H(ca).from("readings").select("id");
  if (!pre.error && pre.data.length === 0) ok("no health rows before consent");
  else fail("unexpected pre-consent read: " + JSON.stringify(pre.error ?? pre.data));

  const noPid = await H(ca).from("readings").insert(bp("00000000-0000-0000-0000-000000000000"));
  if (noPid.error) ok("insert refused without a patient row/consent");
  else fail("LEAK: inserted without consent");

  // 2. Consent creates the patient + settings and returns patient_id.
  const grant = await H(ca).rpc("grant_consent", { notice_version: "test-1", scope: { readings: true } });
  if (grant.error || !grant.data) throw grant.error ?? new Error("no patient id");
  const pidA = grant.data;
  const st = await H(ca).rpc("my_status");
  if (st.data && st.data.patient_id === pidA && st.data.active_version === "test-1") ok("my_status reports the active consent");
  else fail("my_status wrong: " + JSON.stringify(st.data));

  // 3. Own rows: insert, read, update.
  const ins = await H(ca).from("readings").insert(bp(pidA)).select("id").single();
  if (!ins.error) ok("inserts own reading after consent"); else fail("insert failed: " + ins.error.message);
  const upd = await H(ca).from("readings").update({ note: "after breakfast" }).eq("id", ins.data.id).select("note").single();
  if (upd.data && upd.data.note === "after breakfast") ok("updates own reading"); else fail("update failed");

  // 4. Shape + range CHECKs hold.
  const badShape = await H(ca).from("readings").insert(bp(pidA, { glucose_mgdl: 100 }));
  if (badShape.error) ok("shape CHECK rejects mixed columns"); else fail("shape CHECK missing");
  const badRange = await H(ca).from("readings").insert(bp(pidA, { systolic: 400 }));
  if (badRange.error) ok("range CHECK rejects systolic 400"); else fail("range CHECK missing");

  // 5. Another patient sees and touches nothing of A's.
  const cb = await signedIn(b);
  const grantB = await H(cb).rpc("grant_consent", { notice_version: "test-1", scope: { readings: true } });
  const pidB = grantB.data;
  const bRead = await H(cb).from("readings").select("id");
  if (bRead.data && bRead.data.length === 0) ok("B reads none of A's readings"); else fail("LEAK: B read A's readings");
  const bSpoof = await H(cb).from("readings").insert(bp(pidA));
  if (bSpoof.error) ok("B cannot insert under A's patient_id"); else fail("LEAK: B inserted as A");
  await H(cb).from("readings").update({ note: "tampered" }).eq("id", ins.data.id);
  const check = await H(ca).from("readings").select("note").eq("id", ins.data.id).single();
  if (check.data && check.data.note === "after breakfast") ok("B cannot update A's reading"); else fail("LEAK: B updated A's reading");
  const bDel = await H(cb).from("readings").delete().eq("id", ins.data.id);
  const stillThere = await H(ca).from("readings").select("id").eq("id", ins.data.id);
  if (stillThere.data && stillThere.data.length === 1) ok("B cannot delete A's reading");
  else fail("LEAK: B deleted A's reading " + JSON.stringify(bDel.error));
  const bOwn = await H(cb).from("readings").insert(bp(pidB));
  if (!bOwn.error) ok("B inserts own reading"); else fail("B insert failed: " + bOwn.error.message);
  const aCount = await H(ca).from("readings").select("id");
  if (aCount.data && aCount.data.length === 1) ok("A still sees exactly own row"); else fail("A sees " + aCount.data?.length);
  const bStatus = await H(cb).rpc("my_status");
  if (bStatus.data && bStatus.data.patient_id === pidB) ok("my_status is per-caller"); else fail("my_status leaked across users");

  // 6. Anonymous key: nothing, on tables or RPCs.
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const anonRead = await H(anon).from("readings").select("id");
  if (anonRead.error) ok("anon cannot read health"); else fail("LEAK: anon read health rows");
  const anonRpc = await H(anon).rpc("grant_consent", { notice_version: "x", scope: {} });
  if (anonRpc.error) ok("anon cannot call health RPCs"); else fail("LEAK: anon called grant_consent");

  // 7. Audit log: written by the system, readable by A, untouchable by A.
  await H(ca).rpc("log_app_open");
  const log = await H(ca).from("access_log").select("action, resource").order("at", { ascending: true });
  const actions = (log.data ?? []).map((r) => `${r.action}:${r.resource}`);
  const expectLog = ["consent_granted:consents", "insert:settings", "insert:readings", "update:readings", "app_open:app"];
  const missing = expectLog.filter((e) => !actions.includes(e));
  if (missing.length === 0) ok("access_log holds consent, settings, insert, update, app_open");
  else fail("access_log missing " + missing.join(", ") + " (have " + actions.join(", ") + ")");
  if (actions.filter((x) => x === "app_open:app").length === 1) ok("app_open logged once per session");
  else fail("app_open logged " + actions.filter((x) => x === "app_open:app").length + " times");
  const logIns = await H(ca).from("access_log").insert({ actor_role: "patient", patient_id: pidA, action: "read" });
  if (logIns.error) ok("A cannot write access_log"); else fail("TAMPER: A inserted an access_log row");
  const before = log.data.length;
  await H(ca).from("access_log").delete().eq("patient_id", pidA);
  await H(ca).from("access_log").update({ action: "read" }).eq("patient_id", pidA);
  const after = await H(ca).from("access_log").select("id, action");
  if (after.data && after.data.length === before) ok("A cannot delete access_log rows"); else fail("TAMPER: A deleted log rows");
  const bLog = await H(cb).from("access_log").select("patient_id");
  if (bLog.data && !bLog.data.some((r) => r.patient_id === pidA)) ok("B cannot read A's access_log");
  else fail("LEAK: B read A's access_log");

  // 7b. The audit IP is edge-set, not client-set (spec §7).
  const forged = await signedIn(a, { "x-forwarded-for": "203.0.113.7" });
  // Captured (not a bare insert): 8c below deletes `ins.data.id`, so the
  // withdrawal-update check further down needs a row that is still live.
  const forgedIns = await H(forged).from("readings").insert(bp(pidA, { systolic: 121, diastolic: 79 })).select("id").single();
  const ips = await H(admin).from("access_log").select("ip").eq("patient_id", pidA).eq("action", "insert");
  if (!(ips.data ?? []).some((r) => r.ip === "203.0.113.7")) ok("client cannot forge its audit IP");
  else fail("TAMPER: client-supplied x-forwarded-for was recorded as the audit IP");

  // 8. Archive tables are unreachable by patients; the archive job moves old rows.
  const arch = await H(ca).from("readings_archive").select("id");
  if (arch.error) ok("A cannot read readings_archive"); else fail("LEAK: A read the archive");
  const old = new Date(); old.setMonth(old.getMonth() - 13);
  const oldIns = await H(admin).from("readings").insert(bp(pidA, { recorded_at: old.toISOString() }));
  if (oldIns.error) throw oldIns.error;
  await H(admin).rpc("archive_old");
  const live = await H(ca).from("readings").select("id");
  const archived = await H(admin).from("readings_archive").select("id").eq("patient_id", pidA);
  if (live.data.length === 2 && archived.data.length === 1) ok("archive_old moved the 13-month-old reading");
  else fail(`archive_old: live=${live.data?.length} archived=${archived.data?.length}`);

  // 8b. Record entries: own-rows-only, consent-gated, deletable by the owner.
  const peA = await H(ca).from("profile_entries")
    .insert({ patient_id: pidA, category: "condition", label: "Hypertension", is_current: true })
    .select("id").single();
  if (!peA.error) ok("inserts own record entry"); else fail("record insert failed: " + peA.error.message);
  const bSeesPe = await H(cb).from("profile_entries").select("id").eq("id", peA.data.id);
  if (bSeesPe.data && bSeesPe.data.length === 0) ok("B cannot read A's record entry"); else fail("LEAK: B read A's record entry");
  await H(cb).from("profile_entries").update({ label: "tampered" }).eq("id", peA.data.id);
  const peCheck = await H(ca).from("profile_entries").select("label").eq("id", peA.data.id).single();
  if (peCheck.data?.label === "Hypertension") ok("B cannot update A's record entry"); else fail("LEAK: B updated A's record entry");
  await H(cb).from("profile_entries").delete().eq("id", peA.data.id);
  const stillPe = await H(ca).from("profile_entries").select("id").eq("id", peA.data.id);
  if (stillPe.data && stillPe.data.length === 1) ok("B cannot delete A's record entry"); else fail("LEAK: B deleted A's record entry");

  // 8c. A deletes their own rows, and the deletion is audited.
  const delRes = await H(ca).from("readings").delete().eq("id", ins.data.id);
  const goneOne = await H(ca).from("readings").select("id").eq("id", ins.data.id);
  if (!delRes.error && goneOne.data.length === 0) ok("A deletes own reading"); else fail("A could not delete own reading");
  const delLog = await H(ca).from("access_log").select("action, resource").eq("action", "delete");
  if ((delLog.data ?? []).some((r) => r.resource === "readings")) ok("the delete is audited"); else fail("delete not audited");

  // 9. Withdrawal blocks new writes and schedules deletion.
  await H(ca).rpc("withdraw_consent");
  const postWd = await H(ca).from("readings").insert(bp(pidA));
  if (postWd.error) ok("withdrawal blocks inserts"); else fail("LEAK: inserted after withdrawal");
  // Target forgedIns, not ins: 8c already deleted `ins.data.id`, and an
  // update matching zero rows because the row is gone would pass this
  // check without the RLS policy doing anything.
  const postWdUpd = await H(ca).from("readings").update({ note: "later" }).eq("id", forgedIns.data.id).select("note");
  if (postWdUpd.error || (postWdUpd.data ?? []).length === 0) ok("withdrawal blocks updates");
  else fail("LEAK: updated after withdrawal");
  const st2 = await H(ca).rpc("my_status");
  if (st2.data && st2.data.active_version === null && st2.data.delete_after) ok("my_status shows pending deletion");
  else fail("my_status after withdrawal wrong: " + JSON.stringify(st2.data));

  // 9b. Re-consent cancels the deletion (regression: a tie on granted_at once
  //     made my_status keep reporting the withdrawn row's delete_after).
  await H(ca).rpc("grant_consent", { notice_version: "test-2", scope: { readings: true } });
  const st3 = await H(ca).rpc("my_status");
  if (st3.data && st3.data.active_version === "test-2" && st3.data.delete_after === null)
    ok("re-consent clears the pending deletion");
  else fail("re-consent left a pending deletion: " + JSON.stringify(st3.data));
  const purged = await H(admin).rpc("purge_withdrawn");
  const survives = await H(admin).from("patients").select("patient_id").eq("patient_id", pidA);
  if (survives.data.length === 1) ok("purge_withdrawn skips a re-consented patient");
  else fail("PURGED a consenting patient (purge_withdrawn returned " + purged.data + ")");
  const history = await H(ca).from("consents").select("notice_version");
  if (history.data && history.data.length === 2) ok("consent history is append-only");
  else fail("consent history has " + history.data?.length + " rows, expected 2");

  // 10. Delete-now purges everything but keeps the audit trail.
  await H(ca).rpc("delete_my_health_data");
  const gone = await H(admin).from("patients").select("patient_id").eq("patient_id", pidA);
  const goneArch = await H(admin).from("readings_archive").select("id").eq("patient_id", pidA);
  const goneLive = await H(admin).from("readings").select("id").eq("patient_id", pidA);
  const trail = await H(admin).from("access_log").select("action").eq("patient_id", pidA);
  if (gone.data.length === 0 && goneArch.data.length === 0 && goneLive.data.length === 0)
    ok("purge removed patient, live and archive rows");
  else fail(`purge incomplete: patients=${gone.data?.length} archive=${goneArch.data?.length} live=${goneLive.data?.length}`);
  if (trail.data.some((r) => r.action === "purge")) ok("access_log keeps the trail incl. purge"); else fail("purge not logged");
  const bIntact = await H(admin).from("patients").select("patient_id").eq("patient_id", pidB);
  if (bIntact.data.length === 1) ok("B's record survived A's deletion"); else fail("A's purge took B's record");
} finally {
  await admin.auth.admin.deleteUser(a.id);
  await admin.auth.admin.deleteUser(b.id);
}
if (process.exitCode) console.error("HEALTH RLS CHECKS FAILED"); else console.log("ALL HEALTH RLS CHECKS PASSED");
