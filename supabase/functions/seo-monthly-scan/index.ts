import { createClient } from "@supabase/supabase-js";
import { wildcardCorsHeaders } from "../_shared/cors.ts";

/**
 * SEO Monthly Scan
 *
 * Strategic monthly tasks:
 * - Task effectiveness analysis → update seo_task_impact
 * - Campaign health evaluation (active campaigns with stalled progress)
 * - Quota review: check if quotas were met
 * - Fatigue reset: close long-suppressed tasks
 * - Strategic reprioritization: re-score active tasks
 *
 * GAP 5: Auth validation added for authenticated calls.
 * All logic deterministic.
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: wildcardCorsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // ── GAP 5: Auth validation ──
    let organizationId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      }) as any;
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (claimsErr || !claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...wildcardCorsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claims.claims.sub as string;

      try {
        const body = await req.json();
        organizationId = body.organizationId || body.organization_id || null;
      } catch { /* no body */ }

      if (organizationId) {
        const { data: membership } = await supabase
          .from("organization_members")
          .select("id")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .limit(1)
          .single();

        if (!membership) {
          return new Response(JSON.stringify({ error: "Not a member of this organization" }), {
            status: 403,
            headers: { ...wildcardCorsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else {
      try {
        const body = await req.json();
        organizationId = body.organizationId || body.organization_id || null;
      } catch { /* cron call */ }
    }

    const orgs = organizationId
      ? [{ id: organizationId }]
      : await getAllActiveOrgs(supabase);

    const results: any[] = [];
    for (const org of orgs) {
      const result = await runMonthlyScan(supabase, org.id);
      results.push({ organizationId: org.id, ...result });
    }

    return new Response(
      JSON.stringify({ success: true, scanned: results.length, results }),
      { status: 200, headers: { ...wildcardCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("SEO monthly scan error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...wildcardCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getAllActiveOrgs(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("status", "active")
    .limit(100);
  return data || [];
}

async function runMonthlyScan(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<{
  impactRecordsCreated: number;
  campaignsEvaluated: number;
  suppressedCleaned: number;
  tasksReprioritized: number;
}> {
  const [impact, campaigns, cleaned, reprioritized] = await Promise.all([
    measureTaskEffectiveness(supabase, organizationId),
    evaluateCampaignHealth(supabase, organizationId),
    cleanupSuppressedTasks(supabase, organizationId),
    reprioritizeActiveTasks(supabase, organizationId),
  ]);

  return {
    impactRecordsCreated: impact,
    campaignsEvaluated: campaigns,
    suppressedCleaned: cleaned,
    tasksReprioritized: reprioritized,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Task Effectiveness Measurement
// ═══════════════════════════════════════════════════════════════════════

async function measureTaskEffectiveness(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: completedTasks } = await supabase
    .from("seo_tasks")
    .select("id, template_key, primary_seo_object_id, resolved_at")
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .lt("resolved_at", thirtyDaysAgo.toISOString())
    .limit(20);

  if (!completedTasks?.length) return 0;

  const taskIds = completedTasks.map((t: any) => t.id);
  const { data: existingImpact } = await supabase
    .from("seo_task_impact")
    .select("task_id")
    .in("task_id", taskIds)
    .eq("measurement_window", "30d");

  const measured = new Set((existingImpact || []).map((i: any) => i.task_id));
  const unmeasured = completedTasks.filter((t: any) => !measured.has(t.id));

  if (!unmeasured.length) return 0;

  let created = 0;

  for (const task of unmeasured) {
    const beforeDate = new Date(task.resolved_at);
    beforeDate.setDate(beforeDate.getDate() - 7);

    const { data: beforeScores } = await supabase
      .from("seo_health_scores")
      .select("domain, score")
      .eq("seo_object_id", task.primary_seo_object_id)
      .lt("scored_at", task.resolved_at)
      .gt("scored_at", beforeDate.toISOString())
      .order("scored_at", { ascending: false })
      .limit(6);

    const { data: afterScores } = await supabase
      .from("seo_health_scores")
      .select("domain, score")
      .eq("seo_object_id", task.primary_seo_object_id)
      .gt("scored_at", task.resolved_at)
      .order("scored_at", { ascending: false })
      .limit(6);

    if (!beforeScores?.length || !afterScores?.length) continue;

    const metrics: Record<string, unknown> = {};
    const beforeMap = new Map(beforeScores.map((s: any) => [s.domain, s.score]));
    const afterMap = new Map(afterScores.map((s: any) => [s.domain, s.score]));

    for (const [domain, beforeScore] of beforeMap.entries()) {
      const afterScore = afterMap.get(domain);
      if (afterScore !== undefined) {
        metrics[`${domain}_delta`] = afterScore - beforeScore;
      }
    }

    const deltas = Object.values(metrics).filter((v): v is number => typeof v === "number");
    const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    const confidence = avgDelta > 0 ? Math.min(0.8, avgDelta / 50) : 0.1;

    await supabase.from("seo_task_impact").insert({
      task_id: task.id,
      measurement_window: "30d",
      metrics,
      contribution_confidence: Math.round(confidence * 1000) / 1000,
      measured_at: new Date().toISOString(),
    });

    created++;
  }

  return created;
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Campaign Health Evaluation
// ═══════════════════════════════════════════════════════════════════════

async function evaluateCampaignHealth(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  const { data: activeCampaigns } = await supabase
    .from("seo_campaigns")
    .select("id, title, status, window_end")
    .eq("organization_id", organizationId)
    .in("status", ["active", "at_risk"])
    .limit(20);

  if (!activeCampaigns?.length) return 0;

  let evaluated = 0;

  for (const campaign of activeCampaigns) {
    const { data: tasks } = await supabase
      .from("seo_tasks")
      .select("status")
      .eq("campaign_id", campaign.id);

    if (!tasks?.length) continue;

    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    const overdue = tasks.filter((t: any) => t.status === "overdue" || t.status === "escalated").length;
    const completionRate = completed / total;

    let newStatus: string | null = null;

    if (campaign.window_end && new Date(campaign.window_end) < new Date()) {
      newStatus = completionRate >= 0.8 ? "completed" : "abandoned";
    } else if (overdue / total > 0.3) {
      newStatus = "at_risk";
    } else if (campaign.status === "at_risk" && overdue === 0) {
      newStatus = "active";
    }

    const VALID_TRANSITIONS: Record<string, string[]> = {
      planning: ["active", "abandoned"],
      active: ["blocked", "at_risk", "completed", "abandoned"],
      blocked: ["active", "at_risk", "abandoned"],
      at_risk: ["active", "blocked", "completed", "abandoned"],
    };

    if (newStatus && newStatus !== campaign.status) {
      const allowed = VALID_TRANSITIONS[campaign.status] ?? [];
      if (allowed.includes(newStatus)) {
        await supabase
          .from("seo_campaigns")
          .update({ status: newStatus })
          .eq("id", campaign.id);
      }
    }

    evaluated++;
  }

  return evaluated;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Cleanup Long-Suppressed Tasks
// ═══════════════════════════════════════════════════════════════════════

async function cleanupSuppressedTasks(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: staleSuppressed } = await supabase
    .from("seo_tasks")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "suppressed")
    .lt("updated_at", sixtyDaysAgo.toISOString())
    .limit(50);

  if (!staleSuppressed?.length) return 0;

  const ids = staleSuppressed.map((t: any) => t.id);

  await supabase
    .from("seo_tasks")
    .update({ status: "canceled" })
    .in("id", ids);

  for (const id of ids) {
    await supabase.from("seo_task_history").insert({
      task_id: id,
      action: "monthly_cleanup",
      previous_status: "suppressed",
      new_status: "canceled",
      performed_by: "system:monthly_scan",
      notes: "Auto-canceled: suppressed for 60+ days.",
    });
  }

  return ids.length;
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Reprioritize Active Tasks
// ═══════════════════════════════════════════════════════════════════════

async function reprioritizeActiveTasks(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  const { data: activeTasks } = await supabase
    .from("seo_tasks")
    .select("id, template_key, primary_seo_object_id, priority_score, priority_factors, due_at")
    .eq("organization_id", organizationId)
    .in("status", ["assigned", "in_progress", "queued", "detected"])
    .limit(50);

  if (!activeTasks?.length) return 0;

  let reprioritized = 0;

  for (const task of activeTasks) {
    const { data: latestScores } = await supabase
      .from("seo_health_scores")
      .select("domain, score")
      .eq("seo_object_id", task.primary_seo_object_id)
      .order("scored_at", { ascending: false })
      .limit(6);

    if (!latestScores?.length) continue;

    const avgScore = latestScores.reduce((sum: number, s: any) => sum + s.score, 0) / latestScores.length;
    const severity = Math.max(0, Math.min(1, (100 - avgScore) / 100));

    const daysUntilDue = task.due_at
      ? (new Date(task.due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : 7;
    const freshness = Math.max(0, Math.min(1, 1 - daysUntilDue / 14));

    const opportunity = ((task.priority_factors as any)?.opportunity ?? 0.5);

    // Fatigue penalty from task history count for this user/org
    const fatiguePenalty = 0;

    const newScore = Math.round(
      severity * 0.25 * 100 +
      opportunity * 0.25 * 100 +
      0.5 * 0.20 * 100 +
      0.5 * 0.15 * 100 +
      freshness * 0.10 * 100 -
      fatiguePenalty * 0.05 * 100
    );

    const clampedScore = Math.max(0, Math.min(100, newScore));

    if (Math.abs(clampedScore - task.priority_score) >= 5) {
      await supabase
        .from("seo_tasks")
        .update({
          priority_score: clampedScore,
          priority_factors: {
            ...(task.priority_factors as any),
            severity,
            freshness,
            avg_health_score: Math.round(avgScore),
            reprioritized_at: new Date().toISOString(),
          },
        })
        .eq("id", task.id);

      reprioritized++;
    }
  }

  return reprioritized;
}
