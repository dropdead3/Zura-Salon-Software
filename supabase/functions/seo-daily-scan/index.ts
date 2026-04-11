import { createClient } from "@supabase/supabase-js";
import { wildcardCorsHeaders } from "../_shared/cors.ts";

/**
 * SEO Daily Scan
 *
 * Lightweight daily checks:
 * - Overdue task escalation
 * - Post-appointment review candidate identification
 * - Photo freshness check
 * - Task generation via deterministic template matching
 *
 * Called by pg_cron daily or manually via admin trigger.
 * All logic is deterministic — AI is only used for generating task titles/explanations.
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: wildcardCorsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Accept either auth-based or cron-based calls
    let organizationId: string | null = null;
    try {
      const body = await req.json();
      organizationId = body.organizationId || body.organization_id || null;
    } catch {
      // No body = cron call, process all orgs
    }

    const orgs = organizationId
      ? [{ id: organizationId }]
      : await getAllActiveOrgs(supabase);

    const results: any[] = [];

    for (const org of orgs) {
      const result = await runDailyScan(supabase, org.id);
      results.push({ organizationId: org.id, ...result });
    }

    return new Response(
      JSON.stringify({ success: true, scanned: results.length, results }),
      { status: 200, headers: { ...wildcardCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("SEO daily scan error:", err);
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

async function runDailyScan(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<{ escalated: number; tasksGenerated: number }> {
  let escalated = 0;
  let tasksGenerated = 0;

  // ─── 1. Escalate overdue tasks ───
  escalated = await escalateOverdueTasks(supabase, organizationId);

  // ─── 2. Detect review opportunities from recent appointments ───
  const reviewTasks = await detectReviewOpportunities(supabase, organizationId);
  tasksGenerated += reviewTasks;

  // ─── 3. Detect photo freshness issues ───
  const photoTasks = await detectPhotoFreshnessIssues(supabase, organizationId);
  tasksGenerated += photoTasks;

  return { escalated, tasksGenerated };
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Overdue Task Escalation
// ═══════════════════════════════════════════════════════════════════════

async function escalateOverdueTasks(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  const now = new Date();

  // Find assigned/in_progress tasks past due_at
  const { data: overdueTasks } = await supabase
    .from("seo_tasks")
    .select("id, status, due_at, escalation_level, template_key")
    .eq("organization_id", organizationId)
    .in("status", ["assigned", "in_progress", "awaiting_verification"])
    .lt("due_at", now.toISOString())
    .limit(50);

  if (!overdueTasks?.length) return 0;

  let escalated = 0;

  for (const task of overdueTasks) {
    const newStatus = task.escalation_level >= 2 ? "escalated" : "overdue";

    await supabase
      .from("seo_tasks")
      .update({
        status: newStatus,
        escalation_level: task.escalation_level + 1,
      })
      .eq("id", task.id);

    await supabase.from("seo_task_history").insert({
      task_id: task.id,
      action: "auto_escalation",
      previous_status: task.status,
      new_status: newStatus,
      notes: `Auto-escalated: due date was ${task.due_at}. Escalation level: ${task.escalation_level + 1}`,
    });

    escalated++;
  }

  return escalated;
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Review Opportunity Detection
// ═══════════════════════════════════════════════════════════════════════

async function detectReviewOpportunities(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  // Find completed appointments from yesterday that are good review candidates
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(yesterday);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, service_name, staff_user_id, location_id, client_name")
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .gte("appointment_date", dayBefore.toISOString().split("T")[0])
    .lte("appointment_date", yesterday.toISOString().split("T")[0])
    .limit(50);

  if (!appointments?.length) return 0;

  // Check if review_request template exists
  const { data: template } = await supabase
    .from("seo_task_templates")
    .select("template_key")
    .eq("template_key", "review_request")
    .eq("is_active", true)
    .single();

  if (!template) return 0;

  let generated = 0;

  // Group by location-service for task generation
  const locationServicePairs = new Map<string, any>();
  for (const appt of appointments) {
    if (!appt.location_id || !appt.service_name) continue;
    const key = `${appt.location_id}::${appt.service_name}`;
    if (!locationServicePairs.has(key)) {
      locationServicePairs.set(key, {
        locationId: appt.location_id,
        serviceName: appt.service_name,
        appointments: [],
      });
    }
    locationServicePairs.get(key).appointments.push(appt);
  }

  for (const [key, data] of locationServicePairs.entries()) {
    // Find matching SEO object
    const { data: seoObj } = await supabase
      .from("seo_objects")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("object_type", "location_service")
      .like("object_key", `${data.locationId}::%`)
      .limit(1)
      .single();

    if (!seoObj) continue;

    // Check suppression: any open review_request for this object?
    const { data: openTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_key", "review_request")
      .eq("primary_seo_object_id", seoObj.id)
      .in("status", ["detected", "queued", "assigned", "in_progress"])
      .limit(3);

    if ((openTasks?.length || 0) >= 3) continue; // Max open per object

    // Check cooldown
    const { data: recentCompleted } = await supabase
      .from("seo_tasks")
      .select("cooldown_until")
      .eq("organization_id", organizationId)
      .eq("template_key", "review_request")
      .eq("primary_seo_object_id", seoObj.id)
      .eq("status", "completed")
      .gt("cooldown_until", new Date().toISOString())
      .limit(1);

    if (recentCompleted?.length) continue;

    // Generate task
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 2); // 2-day default for review requests

    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 7); // 7-day cooldown

    const { data: newTask } = await supabase.from("seo_tasks").insert({
      organization_id: organizationId,
      location_id: data.locationId,
      template_key: "review_request",
      primary_seo_object_id: seoObj.id,
      status: "detected",
      priority_score: 60,
      priority_factors: {
        severity: 0.6,
        opportunity: 0.7,
        source: "daily_scan_review_opportunity",
      },
      due_at: dueAt.toISOString(),
      cooldown_until: cooldownUntil.toISOString(),
      ai_generated_content: {
        title: `Request review for ${data.serviceName}`,
        explanation: `${data.appointments.length} appointment(s) completed yesterday — good candidates for review requests.`,
      },
    }).select("id").single();

    if (newTask?.id) {
      await supabase.from("seo_task_history").insert({
        task_id: newTask.id,
        action: "auto_generated",
        performed_by: "system:daily_scan",
        new_status: "detected",
        notes: `Generated by daily scan: ${data.appointments.length} review candidates for ${data.serviceName}`,
      });
    }

    generated++;
  }

  return generated;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Photo Freshness Detection
// ═══════════════════════════════════════════════════════════════════════

async function detectPhotoFreshnessIssues(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  // Check for location-service objects with low content scores
  const { data: lowContentScores } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, score, raw_signals, seo_objects!inner(id, object_type, object_key, location_id, label)")
    .eq("organization_id", organizationId)
    .eq("domain", "content")
    .lt("score", 40)
    .order("score", { ascending: true })
    .limit(10);

  if (!lowContentScores?.length) return 0;

  const { data: template } = await supabase
    .from("seo_task_templates")
    .select("template_key")
    .eq("template_key", "photo_upload")
    .eq("is_active", true)
    .single();

  if (!template) return 0;

  let generated = 0;

  for (const item of lowContentScores) {
    const seoObj = (item as any).seo_objects;
    if (!seoObj) continue;

    // Suppression check
    const { data: openTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_key", "photo_upload")
      .eq("primary_seo_object_id", seoObj.id)
      .in("status", ["detected", "queued", "assigned", "in_progress"])
      .limit(1);

    if (openTasks?.length) continue;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 7);

    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 30);

    await supabase.from("seo_tasks").insert({
      organization_id: organizationId,
      location_id: seoObj.location_id,
      template_key: "photo_upload",
      primary_seo_object_id: seoObj.id,
      status: "detected",
      priority_score: 55,
      priority_factors: {
        severity: 0.6,
        content_score: item.score,
        source: "daily_scan_photo_freshness",
      },
      due_at: dueAt.toISOString(),
      cooldown_until: cooldownUntil.toISOString(),
      ai_generated_content: {
        title: `Upload photos for ${seoObj.label}`,
        explanation: `Content health score is ${item.score}/100 — fresh photos would improve visibility.`,
      },
    });

    generated++;
  }

  return generated;
}
