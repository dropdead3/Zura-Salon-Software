import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * SEO Growth Report
 *
 * Compiles a daily growth report from autonomous actions + attribution data.
 * Stores in seo_growth_reports and creates an in-app notification for the owner.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Get yesterday's date range
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setUTCHours(23, 59, 59, 999);

    const reportDate = yesterday.toISOString().split("T")[0];

    // Fetch yesterday's autonomous actions
    const { data: actions } = await supabase
      .from("seo_autonomous_actions")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("executed_at", yesterday.toISOString())
      .lte("executed_at", yesterdayEnd.toISOString());

    if (!actions?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No actions yesterday", report: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compile actions summary
    const actionsSummary: Record<string, number> = {};
    let autoCount = 0;
    let assistedCount = 0;
    for (const action of actions) {
      actionsSummary[action.template_key] = (actionsSummary[action.template_key] || 0) + 1;
      if (action.action_type === "auto_executed") autoCount++;
      if (action.action_type === "generated_for_approval") assistedCount++;
    }

    const actionsTaken = Object.entries(actionsSummary).map(([key, count]) => ({
      template_key: key,
      count,
    }));

    // Fetch remaining opportunity from predictions
    const { data: pendingTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .in("status", ["detected", "queued", "assigned", "in_progress"]);

    // Build impact summary
    const impactSummary = {
      auto_executed: autoCount,
      assisted_queued: assistedCount,
      total_actions: actions.length,
    };

    // Find next best human-required action
    const { data: humanTasks } = await supabase
      .from("seo_tasks")
      .select("id, template_key, title")
      .eq("organization_id", organizationId)
      .in("status", ["assigned", "in_progress"])
      .order("priority_score", { ascending: false })
      .limit(1);

    const nextBestAction = humanTasks?.[0]
      ? { task_id: humanTasks[0].id, template_key: humanTasks[0].template_key, title: humanTasks[0].title }
      : null;

    // Upsert growth report
    const { error: reportError } = await supabase
      .from("seo_growth_reports")
      .upsert(
        {
          organization_id: organizationId,
          report_date: reportDate,
          actions_taken: actionsTaken,
          impact_summary: impactSummary,
          remaining_opportunity: pendingTasks?.length ?? 0,
          next_best_action: nextBestAction,
        },
        { onConflict: "organization_id,report_date" }
      );

    if (reportError) {
      console.error("Report upsert error:", reportError);
    }

    // Create in-app notification for org owner
    const { data: admins } = await supabase
      .from("organization_admins")
      .select("user_id")
      .eq("organization_id", organizationId)
      .limit(3);

    if (admins?.length) {
      const notifications = admins.map((admin: any) => ({
        recipient_id: admin.user_id,
        type: "seo_growth_report",
        severity: "info",
        title: "Daily Growth Report Ready",
        message: `Yesterday: ${autoCount} actions auto-completed, ${assistedCount} queued for review.`,
        link: "/dashboard/seo",
        metadata: { report_date: reportDate },
      }));

      await supabase.from("platform_notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_date: reportDate,
        actions_count: actions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Growth report error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
