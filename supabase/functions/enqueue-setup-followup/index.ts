import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * enqueue-setup-followup
 *
 * Called when a user dismisses the BackfillWelcomeBanner without completing
 * the remaining (intent, apps) steps. Schedules a reminder 48h out.
 *
 * Idempotent: uses (organization_id, user_id) unique constraint via upsert.
 * If a row already exists and hasn't sent yet, we update scheduled_for to
 * the new dismissal time + 48h (resets the clock on subsequent dismissals).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller via anon client + provided JWT
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    ) as any;
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { organization_id } = body as { organization_id?: string };
    if (!organization_id || typeof organization_id !== "string") {
      return json({ error: "organization_id required" }, 400);
    }

    // Use service role for the write (RLS denies direct inserts).
    const admin = createClient(supabaseUrl, serviceKey) as any;

    // Authorize: caller must be org admin.
    const { data: isAdmin } = await admin.rpc("is_org_admin", {
      _user_id: userData.user.id,
      _org_id: organization_id,
    });
    if (!isAdmin) {
      return json({ error: "Not an org admin" }, 403);
    }

    // Dedupe semantics:
    //  - If a row already exists AND has been sent → never reschedule
    //    (prevents the upsert from overwriting sent_at and re-nudging).
    //  - If a row exists and is unsent → keep its original scheduled_for
    //    (snoozing the banner repeatedly cannot push the nudge out).
    //  - Else → insert fresh +48h.
    const { data: existing } = await admin
      .from("setup_followup_queue")
      .select("id, sent_at, scheduled_for")
      .eq("organization_id", organization_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (existing?.sent_at) {
      return json({
        success: true,
        scheduled_for: existing.scheduled_for,
        skipped_reason: "already_sent",
      });
    }

    if (existing) {
      return json({
        success: true,
        scheduled_for: existing.scheduled_for,
        skipped_reason: "already_queued",
      });
    }

    const scheduledFor = new Date(
      Date.now() + 48 * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await admin
      .from("setup_followup_queue")
      .insert({
        organization_id,
        user_id: userData.user.id,
        scheduled_for: scheduledFor,
      });

    if (error) {
      console.error("[enqueue-setup-followup] insert failed:", error);
      return json({ error: error.message }, 500);
    }

    return json({ success: true, scheduled_for: scheduledFor });
  } catch (err: any) {
    console.error("[enqueue-setup-followup] unexpected:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
