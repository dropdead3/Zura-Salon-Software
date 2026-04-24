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
  const admin = createClient(supabaseUrl, serviceKey) as any;

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

    // Pre-flight: org still exists and user is still an admin?
    // 48h+ can pass between enqueue and dispatch; org may have been
    // deleted or the user demoted in the meantime.
    const { data: orgExists } = await admin
      .from("organizations")
      .select("id")
      .eq("id", row.organization_id)
      .maybeSingle();
    if (!orgExists) {
      await admin
        .from("setup_followup_queue")
        .update({ skipped_at: nowIso, skipped_reason: "org_deleted" })
        .eq("id", row.id);
      skipped += 1;
      continue;
    }

    const { data: stillAdmin } = await admin.rpc("is_org_admin", {
      _user_id: row.user_id,
      _org_id: row.organization_id,
    });
    if (!stillAdmin) {
      await admin
        .from("setup_followup_queue")
        .update({ skipped_at: nowIso, skipped_reason: "no_longer_admin" })
        .eq("id", row.id);
      skipped += 1;
      continue;
    }

    // Check commit log: latest entry per system. We require source='wizard'
    // so a synthetic backfill 'completed' row doesn't satisfy the gate.
    const { data: log } = await admin
      .from("org_setup_commit_log")
      .select("system, status, source, attempted_at")
      .eq("organization_id", row.organization_id)
      .order("attempted_at", { ascending: false });

    const latest = new Map<string, { status: string; source: string }>();
    for (
      const r of (log ?? []) as Array<
        { system: string; status: string; source: string }
      >
    ) {
      if (!latest.has(r.system)) {
        latest.set(r.system, { status: r.status, source: r.source });
      }
    }
    const allDone = COMPLETION_SYSTEMS.every((s: any) => {
      const entry = latest.get(s);
      return entry?.status === "completed" && entry.source === "wizard";
    });

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

    // Pull org name + signup_source for source-aware copy
    const { data: org } = await admin
      .from("organizations")
      .select("name, signup_source")
      .eq("id", row.organization_id)
      .maybeSingle();

    const source =
      ((org as { signup_source?: string | null } | null)?.signup_source) ??
      "legacy";
    const copy = pickFollowupCopy(source);

    const deepLink = `/onboarding/setup?org=${row.organization_id}&step=step_7_intent&skipIntro=1`;

    // Wave 7 — Email upgrade path: prefer transactional email when the
    // project has email infrastructure configured. Falls back to in-app
    // notification when send-transactional-email is not deployed (404).
    let dispatched = false;
    let dispatchReason: string | null = null;

    try {
      const { data: ownerProfile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", row.user_id)
        .maybeSingle();
      const ownerEmail = (ownerProfile as { email?: string } | null)?.email;
      const ownerName = (ownerProfile as { full_name?: string } | null)
        ?.full_name;

      if (ownerEmail) {
        const emailResp = await admin.functions.invoke(
          "send-transactional-email",
          {
            body: {
              to: ownerEmail,
              purpose: "transactional",
              idempotency_key: `setup-followup:${row.id}`,
              template: "setup_followup",
              subject: copy.subject,
              data: {
                org_name: org?.name ?? "your salon",
                owner_name: ownerName ?? null,
                deep_link: deepLink,
                signup_source: source,
                headline: copy.headline,
                body: copy.body,
              },
            },
          },
        );
        if (!emailResp.error) {
          dispatched = true;
          dispatchReason = "email_sent";
        } else {
          dispatchReason = `email_error:${emailResp.error.message}`;
          console.warn(
            "[process-setup-followups] email failed, falling back:",
            emailResp.error,
          );
        }
      } else {
        dispatchReason = "no_owner_email";
      }
    } catch (err) {
      // Function not deployed (no email infra) → fall back silently
      dispatchReason = `email_unavailable:${(err as Error).message}`;
    }

    // In-app fallback (always runs if email didn't dispatch)
    if (!dispatched) {
      const result = await createNotification(
        admin,
        {
          type: "setup_followup_pending",
          severity: "info",
          title: copy.headline,
          message: copy.body,
          metadata: {
            organization_id: row.organization_id,
            user_id: row.user_id,
            org_name: org?.name ?? null,
            deep_link: deepLink,
            signup_source: source,
          },
        },
        { cooldownMinutes: 60 * 24 * 7 }, // one nudge per week max
      );
      dispatched = result.inserted;
      dispatchReason = result.inserted
        ? "notification_sent"
        : (dispatchReason ?? result.reason ?? "notification_skipped");
    }

    await admin
      .from("setup_followup_queue")
      .update({
        sent_at: dispatched ? nowIso : null,
        skipped_at: dispatched ? null : nowIso,
        skipped_reason: dispatchReason,
      })
      .eq("id", row.id);

    if (dispatched) sent += 1;
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

/**
 * Source-aware follow-up copy. Backfilled orgs already have structural
 * setup inferred — they just skipped intent + apps. Organic orgs walked
 * the wizard but bailed. Migrated orgs imported data without setup.
 */
function pickFollowupCopy(source: string): {
  subject: string;
  headline: string;
  body: string;
} {
  switch (source) {
    case "backfilled":
      return {
        subject: "You skipped intent — two minutes to sharpen Zura",
        headline: "Tell Zura what you want",
        body:
          "We pre-filled your structure from your existing operation. The last two minutes — your intent and apps — is what makes recommendations land. Finish when you have a moment.",
      };
    case "migrated":
      return {
        subject: "Your data is in — finish the operating layer",
        headline: "Finish the operating layer",
        body:
          "Your appointments and clients are imported. Define your intent and pick your apps so Zura can start recommending the right next move.",
      };
    case "organic":
      return {
        subject: "Welcome back — two minutes left to finish setup",
        headline: "Two minutes left",
        body:
          "You started strong. Tell us what you want from Zura and pick the apps you'll use — recommendations sharpen the moment you do.",
      };
    case "invited":
      return {
        subject: "Your team set you up — finish in two minutes",
        headline: "Your team set you up — finish the last 2 minutes",
        body:
          "Someone on your team got Zura ready for you. Tell us what matters to you and pick the apps you'll use — recommendations sharpen the moment you do.",
      };
    case "imported":
    case "legacy":
    default:
      return {
        subject: "Finish setting up Zura",
        headline: "Finish setting up Zura",
        body:
          "Two minutes left: tell us what you want from Zura and pick the apps you'll use. Recommendations sharpen the moment you do.",
      };
  }
}
