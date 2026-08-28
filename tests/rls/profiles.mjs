// Proves RLS (PRD §14): a user reads only their own rows; cannot read
// another user's; cannot self-elevate to staff; anon reads nothing.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("missing env");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = process.env.RLS_STAMP || String(Date.now()); // unique emails per run
const fail = (m) => { console.error("✗ " + m); process.exitCode = 1; };
const ok = (m) => console.log("✓ " + m);

async function makeUser(tag) {
  const email = `rls+${tag}.${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "Test-passw0rd!", email_confirm: true,
    user_metadata: { full_name: `RLS ${tag}` },
  });
  if (error) throw error;
  return { id: data.user.id, email };
}
function userClient() {
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

const a = await makeUser("a");
const b = await makeUser("b");
try {
  const ca = userClient();
  await ca.auth.signInWithPassword({ email: a.email, password: "Test-passw0rd!" });

  const own = await ca.from("profiles").select("id").eq("id", a.id);
  if (own.data && own.data.length === 1) ok("reads own profile");
  else fail("cannot read own profile");

  const other = await ca.from("profiles").select("id").eq("id", b.id);
  if (other.data && other.data.length === 0) ok("cannot read other's profile");
  else fail("LEAK: read other's profile");

  const esc = await ca.from("profiles").update({ role: "staff" }).eq("id", a.id);
  if (esc.error) ok("role escalation blocked");
  else fail("ESCALATION: became staff");

  const anon = userClient();
  const anonRead = await anon.from("profiles").select("id");
  if (anonRead.data && anonRead.data.length === 0) ok("anon reads no profiles");
  else fail("LEAK: anon read profiles");
} finally {
  await admin.auth.admin.deleteUser(a.id);
  await admin.auth.admin.deleteUser(b.id);
}
if (process.exitCode) console.error("RLS CHECKS FAILED"); else console.log("ALL RLS CHECKS PASSED");
