// Un-archive a team member. Reverses the status flags only.
// Does NOT restore reassigned/cancelled work. Available within 90 days.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  requireAuth,
  requireOrgAdmin,
  authErrorResponse,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  organizationId: string;
  userId: string;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, supabaseAdmin } = await requireAuth(req);
    const body = (await req.json()) as Body;

    if (!body.organizationId || !body.userId) {
      return new Response(
        JSON.stringify({ error: "organizationId and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await requireOrgAdmin(supabaseAdmin, user.id, body.organizationId);

    const { data: profile, error } = await supabaseAdmin
      .from("employee_profiles")
      .select("user_id, organization_id, archived_at")
      .eq("user_id", body.userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile || profile.organization_id !== body.organizationId) {
      return new Response(
        JSON.stringify({ error: "User not in this organization." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!profile.archived_at) {
      return new Response(
        JSON.stringify({ error: "User is not archived." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const archivedAt = new Date(profile.archived_at).getTime();
    if (Date.now() - archivedAt > NINETY_DAYS_MS) {
      return new Response(
        JSON.stringify({
          error: "Un-archive window (90 days) has passed. Re-invite the user instead.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("employee_profiles")
      .update({
        archived_at: null,
        archived_by: null,
        archive_reason: null,
        is_active: true,
        deactivated_at: null,
        deactivated_by: null,
      })
      .eq("user_id", body.userId)
      .eq("organization_id", body.organizationId);
    if (updErr) throw updErr;

    // Mark the most recent archive log row as un-archived.
    const { data: latestLog } = await supabaseAdmin
      .from("team_member_archive_log")
      .select("id")
      .eq("organization_id", body.organizationId)
      .eq("user_id", body.userId)
      .is("unarchived_at", null)
      .order("archived_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestLog?.id) {
      await supabaseAdmin
        .from("team_member_archive_log")
        .update({ unarchived_at: nowIso, unarchived_by: user.id })
        .eq("id", latestLog.id);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return authErrorResponse(err, corsHeaders);
  }
});
