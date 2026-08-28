"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuroraHero } from "@/components/AuroraHero";
import { getSupabase } from "@/lib/supabase/client";
import { NOTICE_VERSION } from "@/lib/consent";
import { asset } from "@/lib/asset";

// detectSessionInUrl parses the verification hash; then we ensure a consent
// row exists (covers the confirm-email case where signUp had no session).
export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Confirming your account…");
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setMsg("This link has expired. Please sign in."); return; }
      const uid = data.session.user.id;
      const { data: existing } = await supabase
        .from("account_consents").select("id").eq("user_id", uid).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from("account_consents").insert({
          user_id: uid, notice_version: NOTICE_VERSION, scope: { account: true, marketing: false },
        });
      }
      router.replace(asset("/account/patient/"));
    });
  }, [router]);
  return (
    <AuroraHero className="min-h-[60vh]">
      <p className="text-lg text-silver" role="status">{msg}</p>
    </AuroraHero>
  );
}
