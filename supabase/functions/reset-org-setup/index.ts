// Wave 12 — reset-org-setup
// Admin-only destructive action: clears synthetic backfill state so the org
// can re-run the wizard from scratch. Preserves wizard-source commit history.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller via anon-with-token, then act with service role.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    }) as any;
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const orgId = body?.organization_id as string | undefined;
    const confirm = body?.confirm as string | undefined;
    if (!orgId) return json({ error: "organization_id required" }, 400);
    if (confirm !== "RESET") {
      return json({ error: "confirm must equal 'RESET'" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey) as any;

    // Authorize: caller must be an org admin
    const { data: isAdmin, error: roleErr } = await admin.rpc("is_org_admin", {
      _user_id: userId,
      _org_id: orgId,
    });
    if (roleErr) {
      console.error("[reset-org-setup] role check failed:", roleErr);
      return json({ error: "Permission check failed" }, 500);
    }
    if (!isAdmin) {
      return json({ error: "Org admin required" }, 403);
    }

    // 1. Wipe drafts
    const { error: draftErr } = await admin
      .from("org_setup_drafts")
      .delete()
      .eq("organization_id", orgId);
    if (draftErr) console.warn("[reset-org-setup] draft delete:", draftErr);

    // 2. Wipe ONLY synthetic commit log entries (preserve wizard history)
    const { error: commitErr, count: removedSynthetic } = await admin
      .from("org_setup_commit_log")
      .delete({ count: "exact" })
      .eq("organization_id", orgId)
      .eq("source", "backfill");
    if (commitErr) console.warn("[reset-org-setup] commit delete:", commitErr);

    // 3. Reset org-level setup state
    const { error: orgErr } = await admin
      .from("organizations")
      .update({
        signup_source: "organic",
        setup_completed_at: null,
      })
      .eq("id", orgId);
    if (orgErr) {
      console.error("[reset-org-setup] org update failed:", orgErr);
      return json({ error: "Failed to reset organization" }, 500);
    }

    // 4. Clear per-user dismissal/snooze state for this org
    await admin
      .from("org_setup_user_state")
      .delete()
      .eq("organization_id", orgId);

    return json({
      success: true,
      removed_synthetic_commits: removedSynthetic ?? 0,
    });
  } catch (err: any) {
    console.error("[reset-org-setup] error:", err);
    return json({ error: (err as Error).message }, 500);
  }

  function json(b: unknown, status = 200) {
    return new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
