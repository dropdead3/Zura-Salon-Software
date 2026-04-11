import { createClient } from "@supabase/supabase-js";
import { wildcardCorsHeaders } from "../_shared/cors.ts";

/**
 * SEO Daily Scan
 *
 * Lightweight daily checks:
 * - Overdue task escalation (with in-app notifications)
 * - Post-appointment review candidate identification (deficit-targeted)
 * - Photo freshness check
 * - GBP posting gap detection
 * - Review response task generation
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── GAP 5: Auth validation ──
    let organizationId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      // Authenticated call — validate org membership
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
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
        // Verify membership
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
      // Cron / unauthenticated call — process specified org or all
      try {
        const body = await req.json();
        organizationId = body.organizationId || body.organization_id || null;
      } catch { /* no body = cron */ }
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
): Promise<{ escalated: number; tasksGenerated: number; revenueSnapshots: number }> {
  let escalated = 0;
  let tasksGenerated = 0;
  let revenueSnapshots = 0;

  // ─── 1. Escalate overdue tasks ───
  escalated = await escalateOverdueTasks(supabase, organizationId);

  // ─── 2. Detect review opportunities from recent appointments ───
  const reviewTasks = await detectReviewOpportunities(supabase, organizationId);
  tasksGenerated += reviewTasks;

  // ─── 3. Detect photo freshness issues ───
  const photoTasks = await detectPhotoFreshnessIssues(supabase, organizationId);
  tasksGenerated += photoTasks;

  // ─── 4. GAP 8: GBP posting gap detection ───
  const gbpTasks = await detectGBPPostingGaps(supabase, organizationId);
  tasksGenerated += gbpTasks;

  // ─── 5. GAP 9: Review response task generation ───
  const responseTasks = await detectUnrespondedReviews(supabase, organizationId);
  tasksGenerated += responseTasks;

  // ─── 6. Revenue attribution snapshot ───
  revenueSnapshots = await computeRevenueSnapshot(supabase, organizationId);

  return { escalated, tasksGenerated, revenueSnapshots };
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Overdue Task Escalation (GAP 2: with notifications)
// ═══════════════════════════════════════════════════════════════════════

async function escalateOverdueTasks(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  const now = new Date();

  const { data: overdueTasks } = await supabase
    .from("seo_tasks")
    .select("id, status, due_at, escalation_level, template_key, assigned_to, assigned_role")
    .eq("organization_id", organizationId)
    .in("status", ["assigned", "in_progress", "awaiting_verification"])
    .lt("due_at", now.toISOString())
    .limit(50);

  if (!overdueTasks?.length) return 0;

  let escalated = 0;

  for (const task of overdueTasks) {
    const newLevel = (task.escalation_level ?? 0) + 1;
    const newStatus = newLevel >= 3 ? "escalated" : "overdue";

    await supabase
      .from("seo_tasks")
      .update({
        status: newStatus,
        escalation_level: newLevel,
      })
      .eq("id", task.id);

    await supabase.from("seo_task_history").insert({
      task_id: task.id,
      action: "auto_escalation",
      previous_status: task.status,
      new_status: newStatus,
      notes: `Auto-escalated: due date was ${task.due_at}. Escalation level: ${newLevel}`,
    });

    // GAP 2: Send in-app notification based on escalation level
    const taskTitle = task.template_key?.replace(/_/g, " ") ?? "SEO task";

    if (newLevel === 1 && task.assigned_to) {
      // Level 1: notify assignee
      await supabase.from("notifications").insert({
        user_id: task.assigned_to,
        type: "seo_escalation",
        title: "SEO task overdue",
        message: `Your ${taskTitle} task is past due. Please complete it as soon as possible.`,
        metadata: { task_id: task.id, escalation_level: 1 },
      });
    } else if (newLevel === 2) {
      // Level 2: notify fallback manager (find org managers)
      const { data: managers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .in("role", ["manager", "admin", "owner"])
        .limit(3);

      for (const mgr of managers || []) {
        await supabase.from("notifications").insert({
          user_id: mgr.user_id,
          type: "seo_escalation",
          title: "SEO task escalated",
          message: `A ${taskTitle} task has been overdue for 3+ days and needs manager attention.`,
          metadata: { task_id: task.id, escalation_level: 2 },
        });
      }
    } else if (newLevel >= 3) {
      // Level 3: notify owner
      const { data: owners } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .limit(2);

      for (const owner of owners || []) {
        await supabase.from("notifications").insert({
          user_id: owner.user_id,
          type: "seo_escalation",
          title: "SEO task critically overdue",
          message: `A high-priority ${taskTitle} task is blocking growth. Immediate action required.`,
          metadata: { task_id: task.id, escalation_level: 3, blocked_growth: true },
        });
      }
    }

    escalated++;
  }

  return escalated;
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Review Opportunity Detection (GAP 7: deficit-targeted)
// ═══════════════════════════════════════════════════════════════════════

async function detectReviewOpportunities(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(yesterday);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, service_name, staff_user_id, location_id, client_name, client_id, clients!client_id(id, communication_preference)")
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .gte("appointment_date", dayBefore.toISOString().split("T")[0])
    .lte("appointment_date", yesterday.toISOString().split("T")[0])
    .limit(50);

  // M5: Filter out clients who have opted out
  const eligibleAppointments = (appointments || []).filter((appt: any) => {
    const pref = appt.clients?.communication_preference;
    return pref !== 'none' && pref !== 'opted_out';
  });

  if (!eligibleAppointments?.length) return 0;

  const { data: template } = await supabase
    .from("seo_task_templates")
    .select("template_key")
    .eq("template_key", "review_request")
    .eq("is_active", true)
    .single();

  if (!template) return 0;

  let generated = 0;

  // Group by location-service
  const locationServicePairs = new Map<string, any>();
  for (const appt of eligibleAppointments) {
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

  // GAP 7: Fetch review health scores for deficit targeting
  const { data: reviewScores } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, score, seo_objects!inner(id, object_type, object_key)")
    .eq("organization_id", organizationId)
    .eq("domain", "review")
    .order("scored_at", { ascending: false })
    .limit(100);

  // Build a map of seo_object_id → review health score
  const reviewScoreMap = new Map<string, number>();
  for (const rs of reviewScores || []) {
    if (!reviewScoreMap.has(rs.seo_object_id)) {
      reviewScoreMap.set(rs.seo_object_id, rs.score);
    }
  }

  // Sort pairs by deficit (lowest review health first)
  const sortedPairs = [...locationServicePairs.entries()].sort(([keyA, _a], [keyB, _b]) => {
    // We'll compute score after matching objects; for now keep insertion order
    return 0;
  });

  for (const [key, data] of sortedPairs) {
    const { data: seoObj } = await supabase
      .from("seo_objects")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("object_type", "location_service")
      .like("object_key", `${data.locationId}::%`)
      .limit(1)
      .single();

    if (!seoObj) continue;

    // GAP 7: Prioritize low-review-health objects
    const reviewHealth = reviewScoreMap.get(seoObj.id) ?? 50;
    // Skip healthy objects when we already have enough tasks
    if (generated >= 3 && reviewHealth > 60) continue;

    // Suppression: max open per object
    const { data: openTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_key", "review_request")
      .eq("primary_seo_object_id", seoObj.id)
      .in("status", ["detected", "queued", "assigned", "in_progress"])
      .limit(3);

    if ((openTasks?.length || 0) >= 3) continue;

    // Cooldown check
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

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 2);

    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 7);

    // GAP 7: Boost priority for deficit areas
    const priorityScore = reviewHealth < 30 ? 75 : reviewHealth < 50 ? 65 : 55;

    const { data: newTask } = await supabase.from("seo_tasks").insert({
      organization_id: organizationId,
      location_id: data.locationId,
      template_key: "review_request",
      primary_seo_object_id: seoObj.id,
      status: "detected",
      priority_score: priorityScore,
      priority_factors: {
        severity: reviewHealth < 30 ? 0.8 : 0.6,
        opportunity: 0.7,
        review_health: reviewHealth,
        source: "daily_scan_review_opportunity",
      },
      due_at: dueAt.toISOString(),
      cooldown_until: cooldownUntil.toISOString(),
      ai_generated_content: {
        title: `Request review for ${data.serviceName}`,
        explanation: `${data.appointments.length} appointment(s) completed yesterday — review health is ${reviewHealth}/100.`,
      },
    }).select("id").single();

    if (newTask?.id) {
      await supabase.from("seo_task_history").insert({
        task_id: newTask.id,
        action: "auto_generated",
        performed_by: "system:daily_scan",
        new_status: "detected",
        notes: `Generated by daily scan: ${data.appointments.length} review candidates for ${data.serviceName} (review health: ${reviewHealth})`,
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

    const { data: newTask } = await supabase.from("seo_tasks").insert({
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
    }).select("id").single();

    if (newTask?.id) {
      await supabase.from("seo_task_history").insert({
        task_id: newTask.id,
        action: "auto_generated",
        performed_by: "system:daily_scan",
        new_status: "detected",
        notes: "Auto-detected: photo freshness deficit",
      });
    }

    generated++;
  }

  return generated;
}

// ═══════════════════════════════════════════════════════════════════════
// 4. GAP 8: GBP Posting Gap Detection
// ═══════════════════════════════════════════════════════════════════════

async function detectGBPPostingGaps(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  // Find location/GBP objects with low local_presence health
  const { data: lowPresence } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, score, raw_signals, seo_objects!inner(id, object_type, label, location_id)")
    .eq("organization_id", organizationId)
    .eq("domain", "local_presence")
    .lt("score", 50)
    .order("score", { ascending: true })
    .limit(10);

  if (!lowPresence?.length) return 0;

  const { data: template } = await supabase
    .from("seo_task_templates")
    .select("template_key")
    .eq("template_key", "gbp_post")
    .eq("is_active", true)
    .single();

  if (!template) return 0;

  let generated = 0;
  const seen = new Set<string>();

  for (const item of lowPresence) {
    if (seen.has(item.seo_object_id)) continue;
    seen.add(item.seo_object_id);

    const seoObj = (item as any).seo_objects;
    if (!seoObj) continue;

    const signals = item.raw_signals as any || {};
    // Only generate if posting cadence is stale
    if (signals.gbp_post_cadence_days !== undefined && signals.gbp_post_cadence_days < 14) continue;

    // Suppression
    const { data: openTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_key", "gbp_post")
      .eq("primary_seo_object_id", seoObj.id)
      .in("status", ["detected", "queued", "assigned", "in_progress"])
      .limit(1);

    if (openTasks?.length) continue;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 5);

    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 14);

    const { data: newTask } = await supabase.from("seo_tasks").insert({
      organization_id: organizationId,
      location_id: seoObj.location_id,
      template_key: "gbp_post",
      primary_seo_object_id: seoObj.id,
      status: "detected",
      priority_score: 55,
      priority_factors: {
        severity: 0.6,
        local_presence_score: item.score,
        source: "daily_scan_gbp_posting_gap",
      },
      due_at: dueAt.toISOString(),
      cooldown_until: cooldownUntil.toISOString(),
      ai_generated_content: {
        title: `Publish GBP post for ${seoObj.label}`,
        explanation: `Local presence health is ${item.score}/100 — no recent Google Business posts detected.`,
      },
    }).select("id").single();

    if (newTask?.id) {
      await supabase.from("seo_task_history").insert({
        task_id: newTask.id,
        action: "auto_generated",
        performed_by: "system:daily_scan",
        new_status: "detected",
        notes: "Auto-detected: GBP posting gap",
      });
    }

    generated++;
    if (generated >= 3) break;
  }

  return generated;
}

// ═══════════════════════════════════════════════════════════════════════
// 5. GAP 9: Review Response Task Generation
// ═══════════════════════════════════════════════════════════════════════

async function detectUnrespondedReviews(
  supabase: ReturnType<typeof createClient>,
  organizationId: string
): Promise<number> {
  // Check for review health scores indicating low response rates
  const { data: lowReviewScores } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, score, raw_signals, seo_objects!inner(id, object_type, label, location_id)")
    .eq("organization_id", organizationId)
    .eq("domain", "review")
    .lt("score", 40)
    .order("score", { ascending: true })
    .limit(5);

  if (!lowReviewScores?.length) return 0;

  const { data: template } = await supabase
    .from("seo_task_templates")
    .select("template_key")
    .eq("template_key", "review_response")
    .eq("is_active", true)
    .single();

  if (!template) return 0;

  let generated = 0;
  const seen = new Set<string>();

  for (const item of lowReviewScores) {
    if (seen.has(item.seo_object_id)) continue;
    seen.add(item.seo_object_id);

    const seoObj = (item as any).seo_objects;
    if (!seoObj) continue;

    const signals = item.raw_signals as any || {};
    // Only if review_response_rate is low
    if (signals.review_response_rate !== undefined && signals.review_response_rate > 0.7) continue;

    // Suppression
    const { data: openTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_key", "review_response")
      .eq("primary_seo_object_id", seoObj.id)
      .in("status", ["detected", "queued", "assigned", "in_progress"])
      .limit(1);

    if (openTasks?.length) continue;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 3);

    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 14);

    const { data: newTask } = await supabase.from("seo_tasks").insert({
      organization_id: organizationId,
      location_id: seoObj.location_id,
      template_key: "review_response",
      primary_seo_object_id: seoObj.id,
      status: "detected",
      priority_score: 60,
      priority_factors: {
        severity: 0.7,
        review_score: item.score,
        source: "daily_scan_review_response",
      },
      due_at: dueAt.toISOString(),
      cooldown_until: cooldownUntil.toISOString(),
      ai_generated_content: {
        title: `Respond to reviews for ${seoObj.label}`,
        explanation: `Review health is ${item.score}/100 — unresponded reviews may be hurting visibility.`,
      },
    }).select("id").single();

    if (newTask?.id) {
      await supabase.from("seo_task_history").insert({
        task_id: newTask.id,
        action: "auto_generated",
        performed_by: "system:daily_scan",
        new_status: "detected",
        notes: "Auto-detected: unresponded reviews",
      });
    }

    generated++;
    if (generated >= 3) break;
  }

  return generated;
}
