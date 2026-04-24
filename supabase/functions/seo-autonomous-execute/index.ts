import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * SEO Autonomous Execute
 *
 * Daily autonomous execution loop:
 * 1. Check autonomy_enabled setting
 * 2. Fetch detected/queued tasks
 * 3. Classify by autonomy level
 * 4. Auto-execute eligible tasks within rate limits
 * 5. Queue assisted tasks for approval
 * 6. Log all actions
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Autonomy classification map (mirrors client-side config)
const TEMPLATE_AUTONOMY: Record<string, "autonomous" | "assisted" | "human_only"> = {
  review_request: "autonomous",
  gbp_post: "autonomous",
  metadata_fix: "autonomous",
  internal_linking: "autonomous",
  faq_expansion: "autonomous",
  booking_cta_optimization: "autonomous",
  review_response: "autonomous",
  before_after_publish: "assisted",
  service_description_rewrite: "assisted",
  content_refresh: "assisted",
  local_landing_page_creation: "assisted",
  service_page_update: "assisted",
  photo_upload: "human_only",
  stylist_spotlight_publish: "human_only",
  competitor_gap_response: "human_only",
  page_completion: "human_only",
};

// Rate limit key → settings key mapping
const RATE_LIMIT_SETTINGS: Record<string, { settingKey: string; period: "day" | "week"; defaultMax: number }> = {
  review_request: { settingKey: "autonomy_review_requests_per_day", period: "day", defaultMax: 5 },
  review_response: { settingKey: "autonomy_review_requests_per_day", period: "day", defaultMax: 10 },
  gbp_post: { settingKey: "autonomy_posts_per_week", period: "week", defaultMax: 2 },
  metadata_fix: { settingKey: "autonomy_page_edits_per_day", period: "day", defaultMax: 3 },
  internal_linking: { settingKey: "autonomy_page_edits_per_day", period: "day", defaultMax: 3 },
  faq_expansion: { settingKey: "autonomy_page_edits_per_day", period: "day", defaultMax: 3 },
  booking_cta_optimization: { settingKey: "autonomy_page_edits_per_day", period: "day", defaultMax: 2 },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id;
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Check autonomy_enabled
    const { data: settingsRows } = await supabase
      .from("seo_engine_settings")
      .select("setting_key, setting_value")
      .eq("organization_id", organizationId);

    const settings: Record<string, any> = {};
    for (const row of settingsRows || []) {
      settings[row.setting_key] = row.setting_value;
    }

    if (!settings.autonomy_enabled) {
      return new Response(
        JSON.stringify({ success: true, message: "Autonomy disabled", actions: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const minConfidence = settings.autonomy_min_confidence ?? 0.6;

    // Step 2: Fetch eligible tasks (detected or queued)
    const { data: tasks } = await supabase
      .from("seo_tasks")
      .select("id, template_key, seo_object_id, status")
      .eq("organization_id", organizationId)
      .in("status", ["detected", "queued"])
      .limit(50);

    if (!tasks?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No eligible tasks", actions: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Check rate limits — count today's actions per template
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

    const { data: recentActions } = await supabase
      .from("seo_autonomous_actions")
      .select("template_key, executed_at")
      .eq("organization_id", organizationId)
      .eq("action_type", "auto_executed")
      .gte("executed_at", weekStart.toISOString());

    const dailyCounts: Record<string, number> = {};
    const weeklyCounts: Record<string, number> = {};
    for (const action of recentActions || []) {
      weeklyCounts[action.template_key] = (weeklyCounts[action.template_key] || 0) + 1;
      if (new Date(action.executed_at) >= todayStart) {
        dailyCounts[action.template_key] = (dailyCounts[action.template_key] || 0) + 1;
      }
    }

    const actionLogs: any[] = [];
    let autoExecuted = 0;
    let assistedQueued = 0;
    let humanAssigned = 0;

    for (const task of tasks) {
      const autonomyLevel = TEMPLATE_AUTONOMY[task.template_key] || "human_only";

      if (autonomyLevel === "autonomous") {
        // Check rate limit
        const rateConfig = RATE_LIMIT_SETTINGS[task.template_key];
        if (rateConfig) {
          const max = settings[rateConfig.settingKey] ?? rateConfig.defaultMax;
          const count = rateConfig.period === "day"
            ? (dailyCounts[task.template_key] || 0)
            : (weeklyCounts[task.template_key] || 0);
          if (count >= max) continue; // Rate limited — skip
        }

        // Auto-execute: call seo-generate-content, then complete task
        try {
          const { data: genResult } = await supabase.functions.invoke("seo-generate-content", {
            body: { task_id: task.id, organization_id: organizationId },
          });

          // Transition task to completed
          await supabase
            .from("seo_tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              auto_completed: true,
            })
            .eq("id", task.id);

          // Log action
          const logEntry = {
            organization_id: organizationId,
            task_id: task.id,
            template_key: task.template_key,
            action_type: "auto_executed",
            confidence_score: minConfidence,
            content_applied: genResult?.content || null,
            status: "executed",
            executed_at: new Date().toISOString(),
          };
          actionLogs.push(logEntry);
          autoExecuted++;

          // Update daily count for rate limiting within this run
          dailyCounts[task.template_key] = (dailyCounts[task.template_key] || 0) + 1;
          weeklyCounts[task.template_key] = (weeklyCounts[task.template_key] || 0) + 1;
        } catch (err: any) {
          actionLogs.push({
            organization_id: organizationId,
            task_id: task.id,
            template_key: task.template_key,
            action_type: "auto_executed",
            status: "failed",
            error_message: String(err),
            executed_at: new Date().toISOString(),
          });
        }
      } else if (autonomyLevel === "assisted") {
        // Generate content but queue for approval
        try {
          await supabase.functions.invoke("seo-generate-content", {
            body: { task_id: task.id, organization_id: organizationId },
          });

          await supabase
            .from("seo_tasks")
            .update({ status: "awaiting_verification" })
            .eq("id", task.id);

          actionLogs.push({
            organization_id: organizationId,
            task_id: task.id,
            template_key: task.template_key,
            action_type: "generated_for_approval",
            status: "pending_approval",
            executed_at: new Date().toISOString(),
          });
          assistedQueued++;
        } catch (err: any) {
          // Silently skip failed assisted generations
          console.error(`Assisted generation failed for task ${task.id}:`, err);
        }
      } else {
        // Human-only — just log that it was assigned
        actionLogs.push({
          organization_id: organizationId,
          task_id: task.id,
          template_key: task.template_key,
          action_type: "assigned_human",
          status: "executed",
          executed_at: new Date().toISOString(),
        });
        humanAssigned++;
      }
    }

    // Batch insert action logs
    if (actionLogs.length > 0) {
      await supabase.from("seo_autonomous_actions").insert(actionLogs);
    }

    return new Response(
      JSON.stringify({
        success: true,
        auto_executed: autoExecuted,
        assisted_queued: assistedQueued,
        human_assigned: humanAssigned,
        total_processed: tasks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Autonomous execute error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
