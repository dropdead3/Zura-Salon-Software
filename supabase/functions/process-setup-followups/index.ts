import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COMPLETION_SYSTEMS = ["intent", "apps"] as const;

/**
 * process-setup-followups
 *
 * Cron-driven (hourly): scans the setup_followup_queue for due entries and:
 *  - If the org has BOTH `intent` and `apps` committed → mark skipped (done already).
 *  - Otherwise → emit a platform notification nudging the owner to finish,
 *    and mark sent_at.
 *
 * The notification is the in-app surface today. When Lovable Emails is wired,
 * swap this for a `send-transactional-email` invoke with a "finish setup"
 * template — the queue and dispatch logic stay identical.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const nowIso = new Date().toISOString();

  // Pull due rows
  const { data: due, error: dueErr } = await admin
    .from("setup_followup_queue")
    .select("id, organization_id, user_id, scheduled_for")
    .is("sent_at", null)
    .is("skipped_at", null)
    .lte("scheduled_for", nowIso)
    .limit(200);

  if (dueErr) {
    console.error("[process-setup-followups] fetch due error:", dueErr);
    return json({ error: dueErr.message }, 500);
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;

  for (const row of due ?? []) {
    processed += 1;

    // Check commit log: latest entry per system
    const { data: log } = await admin
      .from("org_setup_commit_log")
      .select("system, status, attempted_at")
      .eq("org_id", row.organization_id)
      .order("attempted_at", { ascending: false });

    const latest = new Map<string, string>();
    for (const r of (log ?? []) as Array<{ system: string; status: string }>) {
      if (!latest.has(r.system)) latest.set(r.system, r.status);
    }
    const allDone = COMPLETION_SYSTEMS.every(
      (s) => latest.get(s) === "completed",
    );

    if (allDone) {
      await admin
        .from("setup_followup_queue")
        .update({
          skipped_at: nowIso,
          skipped_reason: "intent_and_apps_completed",
        })
        .eq("id", row.id);
      skipped += 1;
      continue;
    }

    // Pull org name for the notification copy
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", row.organization_id)
      .maybeSingle();

    const result = await createNotification(
      admin,
      {
        type: "setup_followup_pending",
        severity: "info",
        title: "Finish setting up Zura",
        message:
          "Two minutes left: tell us what you want from Zura and pick the apps you'll use. Recommendations sharpen the moment you do.",
        metadata: {
          organization_id: row.organization_id,
          user_id: row.user_id,
          org_name: org?.name ?? null,
          deep_link: `/onboarding/setup?org=${row.organization_id}&step=step_7_intent&skipIntro=1`,
        },
      },
      { cooldownMinutes: 60 * 24 * 7 }, // one nudge per week max
    );

    await admin
      .from("setup_followup_queue")
      .update({
        sent_at: nowIso,
        skipped_reason: result.inserted ? null : result.reason,
      })
      .eq("id", row.id);

    if (result.inserted) sent += 1;
  }

  console.log(
    `[process-setup-followups] processed=${processed} sent=${sent} skipped=${skipped}`,
  );

  return json({ success: true, processed, sent, skipped });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
