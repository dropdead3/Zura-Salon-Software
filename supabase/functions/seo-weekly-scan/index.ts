import { createClient } from "@supabase/supabase-js";
import { wildcardCorsHeaders } from "../_shared/cors.ts";

/**
 * SEO Weekly Scan
 *
 * Deeper analysis on a weekly cadence:
 * - Page completeness / freshness audit
 * - Content gap detection (missing service pages, thin content)
 * - Metadata quality checks
 * - Internal linking gaps
 * - Conversion weakness detection
 * - Competitor gap detection
 *
 * GAP 5: Auth validation added for authenticated calls.
 * Deterministic task generation — AI only for titles/explanations.
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
      const result = await runWeeklyScan(supabase, org.id);
      results.push({ organizationId: org.id, ...result });
    }

    return new Response(
      JSON.stringify({ success: true, scanned: results.length, results }),
      { status: 200, headers: { ...wildcardCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("SEO weekly scan error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...wildcardCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getAllActiveOrgs(supabase: any) {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("status", "active")
    .limit(100);
  return data || [];
}

async function runWeeklyScan(
  supabase: any,
  organizationId: string
): Promise<{ tasksGenerated: number }> {
  let tasksGenerated = 0;

  tasksGenerated += await detectPageIssues(supabase, organizationId);
  tasksGenerated += await detectContentGaps(supabase, organizationId);
  tasksGenerated += await detectConversionWeakness(supabase, organizationId);
  tasksGenerated += await detectCompetitorGaps(supabase, organizationId);

  return { tasksGenerated };
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Page Issues Detection
// ═══════════════════════════════════════════════════════════════════════

async function detectPageIssues(
  supabase: any,
  organizationId: string
): Promise<number> {
  const { data: lowPageScores } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, score, raw_signals, seo_objects!inner(id, object_type, object_key, label)")
    .eq("organization_id", organizationId)
    .eq("domain", "page")
    .lt("score", 50)
    .order("scored_at", { ascending: false })
    .limit(20);

  if (!lowPageScores?.length) return 0;

  const seen = new Set<string>();
  const unique = lowPageScores.filter((s: any) => {
    if (seen.has(s.seo_object_id)) return false;
    seen.add(s.seo_object_id);
    return true;
  });

  let generated = 0;

  for (const item of unique) {
    const signals = item.raw_signals as any || {};
    const seoObj = (item as any).seo_objects;
    if (!seoObj) continue;

    let templateKey: string;
    let title: string;
    let explanation: string;

    if (!signals.has_meta_title || !signals.has_meta_description) {
      templateKey = "metadata_fix";
      const missing = [];
      if (!signals.has_meta_title) missing.push("title");
      if (!signals.has_meta_description) missing.push("description");
      title = `Fix metadata on ${seoObj.label}`;
      explanation = `Missing: ${missing.join(", ")}. Page health score: ${item.score}/100.`;
    } else if ((signals.section_count || 0) < 2) {
      templateKey = "page_completion";
      title = `Complete page: ${seoObj.label}`;
      explanation = `Only ${signals.section_count || 0} section(s). Page health score: ${item.score}/100.`;
    } else {
      templateKey = "service_page_update";
      title = `Improve ${seoObj.label} page`;
      explanation = `Page health score is ${item.score}/100. Multiple signals need improvement.`;
    }

    const { data: openTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_key", templateKey)
      .eq("primary_seo_object_id", seoObj.id)
      .in("status", ["detected", "queued", "assigned", "in_progress"])
      .limit(1);

    if (openTasks?.length) continue;

    const dueDays = templateKey === "metadata_fix" ? 5 : templateKey === "page_completion" ? 14 : 7;
    const cooldownDays = templateKey === "metadata_fix" ? 30 : 60;
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + dueDays);
    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + cooldownDays);

    const { data: insertedTask } = await supabase.from("seo_tasks").insert({
      organization_id: organizationId,
      location_id: seoObj.location_id ?? null,
      template_key: templateKey,
      primary_seo_object_id: seoObj.id,
      status: "detected",
      priority_score: item.score < 30 ? 75 : 55,
      priority_factors: {
        severity: item.score < 30 ? 0.8 : 0.6,
        page_score: item.score,
        source: "weekly_scan_page_issues",
      },
      due_at: dueAt.toISOString(),
      cooldown_until: cooldownUntil.toISOString(),
      ai_generated_content: { title, explanation },
    }).select("id").single();

    if (insertedTask) {
      await supabase.from("seo_task_history").insert({
        task_id: insertedTask.id,
        action: "created",
        previous_status: null,
        new_status: "detected",
        performed_by: "system:weekly_scan",
        notes: `Auto-detected page issue: ${templateKey}`,
      });
    }

    generated++;
  }

  return generated;
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Content Gap Detection
// ═══════════════════════════════════════════════════════════════════════

async function detectContentGaps(
  supabase: any,
  organizationId: string
): Promise<number> {
  const { data: services } = await supabase
    .from("services")
    .select("id, name, location_id, price, category")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("price", { ascending: false })
    .limit(50);

  if (!services?.length) return 0;

  const { data: pageObjects } = await supabase
    .from("seo_objects")
    .select("object_key, label, metadata")
    .eq("organization_id", organizationId)
    .eq("object_type", "website_page");

  const existingPageLabels = new Set(
    (pageObjects || []).map((p: any) => (p.label || "").toLowerCase())
  );

  const { data: lowContentScores } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, score, raw_signals, seo_objects!inner(id, object_type, object_key, label, location_id, metadata)")
    .eq("organization_id", organizationId)
    .eq("domain", "content")
    .lt("score", 40)
    .order("score", { ascending: true })
    .limit(15);

  let generated = 0;

  for (const svc of services) {
    if (!svc.price || svc.price < 50) continue;
    const nameNorm = svc.name.toLowerCase();
    const hasPage = existingPageLabels.has(nameNorm) ||
      [...existingPageLabels].some((l) => l.includes(nameNorm) || nameNorm.includes(l));

    if (hasPage) continue;

    const { data: seoObj } = await supabase
      .from("seo_objects")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("object_type", "service")
      .eq("object_key", svc.id)
      .single();

    if (!seoObj) continue;

    const { data: openTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_key", "local_landing_page_creation")
      .eq("primary_seo_object_id", seoObj.id)
      .in("status", ["detected", "queued", "assigned", "in_progress"])
      .limit(1);

    if (openTasks?.length) continue;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 21);
    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 90);

    const { data: insertedTask } = await supabase.from("seo_tasks").insert({
      organization_id: organizationId,
      location_id: svc.location_id,
      template_key: "local_landing_page_creation",
      primary_seo_object_id: seoObj.id,
      status: "detected",
      priority_score: 70,
      priority_factors: {
        severity: 0.8,
        opportunity: 0.8,
        service_price: svc.price,
        source: "weekly_scan_content_gap",
      },
      due_at: dueAt.toISOString(),
      cooldown_until: cooldownUntil.toISOString(),
      ai_generated_content: {
        title: `Create page for ${svc.name}`,
        explanation: `High-value service ($${svc.price}) has no dedicated page — significant SEO opportunity.`,
      },
    }).select("id").single();

    if (insertedTask) {
      await supabase.from("seo_task_history").insert({
        task_id: insertedTask.id,
        action: "created",
        previous_status: null,
        new_status: "detected",
        performed_by: "system:weekly_scan",
        notes: `Auto-detected content gap: ${svc.name}`,
      });
    }

    generated++;
    if (generated >= 5) break;
  }

  if (lowContentScores?.length) {
    for (const item of lowContentScores) {
      const seoObj = (item as any).seo_objects;
      if (!seoObj || generated >= 10) break;

      const templateKey = item.score < 20 ? "service_description_rewrite" : "content_refresh";

      const { data: openTasks } = await supabase
        .from("seo_tasks")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("template_key", templateKey)
        .eq("primary_seo_object_id", seoObj.id)
        .in("status", ["detected", "queued", "assigned", "in_progress"])
        .limit(1);

      if (openTasks?.length) continue;

      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + (templateKey === "service_description_rewrite" ? 10 : 14));
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + 60);

      const { data: insertedTask } = await supabase.from("seo_tasks").insert({
        organization_id: organizationId,
        location_id: seoObj.location_id,
        template_key: templateKey,
        primary_seo_object_id: seoObj.id,
        status: "detected",
        priority_score: item.score < 20 ? 70 : 55,
        priority_factors: {
          severity: item.score < 20 ? 0.8 : 0.6,
          content_score: item.score,
          source: "weekly_scan_content_refresh",
        },
        due_at: dueAt.toISOString(),
        cooldown_until: cooldownUntil.toISOString(),
        ai_generated_content: {
          title: templateKey === "service_description_rewrite"
            ? `Rewrite description for ${seoObj.label}`
            : `Refresh content for ${seoObj.label}`,
          explanation: `Content health score is ${item.score}/100.`,
        },
      }).select("id").single();

      if (insertedTask) {
        await supabase.from("seo_task_history").insert({
          task_id: insertedTask.id,
          action: "created",
          previous_status: null,
          new_status: "detected",
          performed_by: "system:weekly_scan",
          notes: `Auto-detected: content ${templateKey === "service_description_rewrite" ? "rewrite" : "refresh"} needed`,
        });
      }

      generated++;
    }
  }

  return generated;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Conversion Weakness Detection
// ═══════════════════════════════════════════════════════════════════════

async function detectConversionWeakness(
  supabase: any,
  organizationId: string
): Promise<number> {
  const { data: lowConversion } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, score, raw_signals, seo_objects!inner(id, object_type, object_key, label)")
    .eq("organization_id", organizationId)
    .eq("domain", "conversion")
    .lt("score", 40)
    .order("score", { ascending: true })
    .limit(5);

  if (!lowConversion?.length) return 0;

  let generated = 0;
  const seen = new Set<string>();

  for (const item of lowConversion) {
    if (seen.has(item.seo_object_id)) continue;
    seen.add(item.seo_object_id);

    const seoObj = (item as any).seo_objects;
    if (!seoObj) continue;

    const signals = item.raw_signals as any || {};

    if (signals.has_booking_cta === false) {
      const { data: openTasks } = await supabase
        .from("seo_tasks")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("template_key", "booking_cta_optimization")
        .eq("primary_seo_object_id", seoObj.id)
        .in("status", ["detected", "queued", "assigned", "in_progress"])
        .limit(1);

      if (openTasks?.length) continue;

      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 7);
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + 30);

      const { data: insertedTask } = await supabase.from("seo_tasks").insert({
        organization_id: organizationId,
        location_id: seoObj.location_id ?? null,
        template_key: "booking_cta_optimization",
        primary_seo_object_id: seoObj.id,
        status: "detected",
        priority_score: 65,
        priority_factors: {
          severity: 0.7,
          conversion_score: item.score,
          source: "weekly_scan_conversion_weakness",
        },
        due_at: dueAt.toISOString(),
        cooldown_until: cooldownUntil.toISOString(),
        ai_generated_content: {
          title: `Add booking CTA to ${seoObj.label}`,
          explanation: `Conversion health is ${item.score}/100 — no booking call-to-action detected.`,
        },
      }).select("id").single();

      if (insertedTask) {
        await supabase.from("seo_task_history").insert({
          task_id: insertedTask.id,
          action: "created",
          previous_status: null,
          new_status: "detected",
          performed_by: "system:weekly_scan",
          notes: "Auto-detected: missing booking CTA",
        });
      }

      generated++;
    }
  }

  return generated;
}

// ═══════════════════════════════════════════════════════════════════════
// 4. Competitor Gap Detection
// ═══════════════════════════════════════════════════════════════════════

async function detectCompetitorGaps(
  supabase: any,
  organizationId: string
): Promise<number> {
  const { data: gapScores } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, score, raw_signals, seo_objects!inner(id, object_type, label, location_id)")
    .eq("organization_id", organizationId)
    .eq("domain", "competitive_gap")
    .lt("score", 40)
    .order("score", { ascending: true })
    .limit(10);

  if (!gapScores?.length) return 0;

  let generated = 0;

  for (const item of gapScores) {
    const seoObj = (item as any).seo_objects;
    if (!seoObj) continue;

    const { data: openTasks } = await supabase
      .from("seo_tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("template_key", "competitor_gap_response")
      .eq("primary_seo_object_id", seoObj.id)
      .in("status", ["detected", "queued", "assigned", "in_progress"])
      .limit(1);

    if (openTasks?.length) continue;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 14);

    const cooldownUntil = new Date();
    cooldownUntil.setDate(cooldownUntil.getDate() + 30);

    const signals = item.raw_signals as any;
    const gapDescription = signals?.gap_summary ?? "Competitive gap detected";

    const { data: insertedTask } = await supabase.from("seo_tasks").insert({
      organization_id: organizationId,
      location_id: seoObj.location_id,
      template_key: "competitor_gap_response",
      primary_seo_object_id: seoObj.id,
      status: "detected",
      priority_score: 70,
      priority_factors: {
        severity: 0.8,
        competitive_gap_score: item.score,
        source: "weekly_scan_competitor_gap",
      },
      due_at: dueAt.toISOString(),
      cooldown_until: cooldownUntil.toISOString(),
      ai_generated_content: {
        title: `Competitor gap: ${seoObj.label}`,
        explanation: `Competitive gap health is ${item.score}/100 — ${gapDescription}.`,
      },
    }).select("id").single();

    if (insertedTask) {
      await supabase.from("seo_task_history").insert({
        task_id: insertedTask.id,
        action: "created",
        previous_status: null,
        new_status: "detected",
        performed_by: "system:weekly_scan",
        notes: "Auto-detected: competitor gap",
      });
    }

    generated++;
  }

  return generated;
}
