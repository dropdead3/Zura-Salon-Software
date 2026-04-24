import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * SEO Score Calculator
 *
 * Computes health scores per SEO object per domain, and
 * opportunity/risk scores per location-service pair.
 *
 * Called on-demand (manual trigger) or by scheduled scans.
 * All scoring is deterministic — no AI involved.
 */

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, supabaseAdmin } = await requireAuth(req);
    const body = await req.json();
    const organizationId = body.organizationId || body.organization_id;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await requireOrgMember(supabaseAdmin, user.id, organizationId);

    // ─── 1. Ensure SEO objects exist for this org ───
    await ensureSEOObjects(supabaseAdmin, organizationId);

    // ─── 2. Compute health scores per object per domain ───
    const scores = await computeHealthScores(supabaseAdmin, organizationId);

    // ─── 3. Compute opportunity/risk scores per location-service ───
    const oppRisk = await computeOpportunityRisk(supabaseAdmin, organizationId);

    return new Response(
      JSON.stringify({
        success: true,
        objectsScored: scores.length,
        opportunityRiskScored: oppRisk.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return authErrorResponse(err, corsHeaders);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// SEO Object Registration
// ═══════════════════════════════════════════════════════════════════════

async function ensureSEOObjects(
  supabase: any,
  organizationId: string
) {
  // Register locations as SEO objects
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, city, state")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (locations?.length) {
    const locationObjects = locations.map((loc: any) => ({
      organization_id: organizationId,
      location_id: loc.id,
      object_type: "location",
      object_key: loc.id,
      label: loc.name || `${loc.city}, ${loc.state}`,
      metadata: { city: loc.city, state: loc.state },
    }));

    await supabase
      .from("seo_objects")
      .upsert(locationObjects, { onConflict: "organization_id,object_type,object_key" });
  }

  // Register active services
  const { data: services } = await supabase
    .from("services")
    .select("id, name, category, location_id, price")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .eq("is_archived", false);

  if (services?.length) {
    const serviceObjects = services.map((svc: any) => ({
      organization_id: organizationId,
      location_id: svc.location_id,
      object_type: "service",
      object_key: svc.id,
      label: svc.name,
      metadata: { category: svc.category, price: svc.price },
    }));

    await supabase
      .from("seo_objects")
      .upsert(serviceObjects, { onConflict: "organization_id,object_type,object_key" });

    // Register location-service pairs
    const locationServicePairs = services
      .filter((svc: any) => svc.location_id)
      .map((svc: any) => ({
        organization_id: organizationId,
        location_id: svc.location_id,
        object_type: "location_service",
        object_key: `${svc.location_id}::${svc.id}`,
        label: `${svc.name} @ ${locations?.find((l: any) => l.id === svc.location_id)?.name || svc.location_id}`,
        metadata: { service_id: svc.id, service_name: svc.name, category: svc.category },
      }));

    if (locationServicePairs.length) {
      await supabase
        .from("seo_objects")
        .upsert(locationServicePairs, { onConflict: "organization_id,object_type,object_key" });
    }
  }

  // Register website pages
  const { data: pageVersions } = await supabase
    .from("website_page_versions")
    .select("page_id, snapshot, organization_id")
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("version_number", { ascending: false });

  if (pageVersions?.length) {
    // Deduplicate by page_id (take latest version)
    const seenPages = new Set<string>();
    const pageObjects: any[] = [];
    for (const pv of pageVersions) {
      if (seenPages.has(pv.page_id)) continue;
      seenPages.add(pv.page_id);
      const snap = pv.snapshot as any;
      pageObjects.push({
        organization_id: organizationId,
        object_type: "website_page",
        object_key: pv.page_id,
        label: snap?.title || snap?.slug || pv.page_id,
        metadata: { slug: snap?.slug, title: snap?.title },
      });
    }

    await supabase
      .from("seo_objects")
      .upsert(pageObjects, { onConflict: "organization_id,object_type,object_key" });
  }

  // Register employee profiles as stylist pages
  const { data: employees } = await supabase
    .from("employee_profiles")
    .select("user_id, first_name, last_name, location_id, role")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("role", ["stylist", "senior_stylist", "master_stylist", "junior_stylist"]);

  if (employees?.length) {
    const stylistObjects = employees.map((emp: any) => ({
      organization_id: organizationId,
      location_id: emp.location_id,
      object_type: "stylist_page",
      object_key: emp.user_id,
      label: `${emp.first_name} ${emp.last_name}`.trim(),
      metadata: { role: emp.role },
    }));

    await supabase
      .from("seo_objects")
      .upsert(stylistObjects, { onConflict: "organization_id,object_type,object_key" });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Health Score Computation
// ═══════════════════════════════════════════════════════════════════════

interface ScoreRow {
  organization_id: string;
  seo_object_id: string;
  domain: string;
  score: number;
  raw_signals: Record<string, unknown>;
  scored_at: string;
}

async function computeHealthScores(
  supabase: any,
  organizationId: string
): Promise<ScoreRow[]> {
  const { data: seoObjects } = await supabase
    .from("seo_objects")
    .select("id, object_type, object_key, location_id, metadata")
    .eq("organization_id", organizationId);

  if (!seoObjects?.length) return [];

  const now = new Date().toISOString();
  const scores: ScoreRow[] = [];

  // Domain applicability map
  const domainApplicability: Record<string, string[]> = {
    review: ["location", "location_service", "stylist_page", "review_stream"],
    page: ["website_page", "stylist_page", "location_service"],
    local_presence: ["location", "gbp_listing"],
    content: ["location_service", "stylist_page", "website_page"],
    competitive_gap: ["location", "location_service", "competitor"],
    conversion: ["website_page", "location_service", "location"],
  };

  // Fetch data needed for scoring
  const [appointmentsResult, pagesResult, servicesResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, service_name, staff_user_id, location_id, status, appointment_date, rebooked_at_checkout")
      .eq("organization_id", organizationId)
      .gte("appointment_date", thirtyDaysAgo())
      .eq("status", "completed"),
    supabase
      .from("website_page_versions")
      .select("page_id, snapshot, saved_at")
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("version_number", { ascending: false }),
    supabase
      .from("services")
      .select("id, name, description, price, category")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
  ]);

  const appointments = appointmentsResult.data || [];
  const pages = pagesResult.data || [];
  const services = servicesResult.data || [];

  // Deduplicate pages
  const latestPages = new Map<string, any>();
  for (const p of pages) {
    if (!latestPages.has(p.page_id)) latestPages.set(p.page_id, p);
  }

  for (const obj of seoObjects) {
    for (const [domain, applicableTypes] of Object.entries(domainApplicability)) {
      if (!applicableTypes.includes(obj.object_type)) continue;

      const { score, signals } = computeDomainScore(
        domain,
        obj,
        appointments,
        latestPages,
        services
      );

      scores.push({
        organization_id: organizationId,
        seo_object_id: obj.id,
        domain,
        score,
        raw_signals: signals,
        scored_at: now,
      });
    }
  }

  // Batch insert scores
  if (scores.length) {
    await supabase.from("seo_health_scores").insert(scores);
  }

  return scores;
}

function computeDomainScore(
  domain: string,
  obj: any,
  appointments: any[],
  pages: Map<string, any>,
  services: any[]
): { score: number; signals: Record<string, unknown> } {
  switch (domain) {
    case "review":
      return scoreReviewHealth(obj, appointments);
    case "page":
      return scorePageHealth(obj, pages);
    case "content":
      return scoreContentHealth(obj, pages, services);
    case "local_presence":
      return scoreLocalPresenceHealth(obj);
    case "competitive_gap":
      return scoreCompetitiveGapHealth(obj);
    case "conversion":
      return scoreConversionHealth(obj, appointments, pages);
    default:
      return { score: 50, signals: {} };
  }
}

// ─── Review Health ───
function scoreReviewHealth(obj: any, appointments: any[]): { score: number; signals: Record<string, unknown> } {
  // Count recent completed appointments as proxy for review opportunity
  let relevantAppointments = appointments;
  if (obj.object_type === "location") {
    relevantAppointments = appointments.filter((a: any) => a.location_id === obj.object_key);
  } else if (obj.object_type === "location_service") {
    const meta = obj.metadata || {};
    relevantAppointments = appointments.filter(
      (a: any) => a.location_id === obj.location_id && a.service_name === meta.service_name
    );
  } else if (obj.object_type === "stylist_page") {
    relevantAppointments = appointments.filter((a: any) => a.staff_user_id === obj.object_key);
  }

  const completedCount = relevantAppointments.length;
  // Score: more completed appointments = more review opportunity being met
  // This is a proxy until actual review data is connected
  const velocityScore = Math.min(100, completedCount * 5);

  // Rebook rate as engagement signal
  const rebooked = relevantAppointments.filter((a: any) => a.rebooked_at_checkout).length;
  const rebookRate = completedCount > 0 ? rebooked / completedCount : 0;
  const rebookScore = Math.round(rebookRate * 100);

  const score = Math.round(velocityScore * 0.6 + rebookScore * 0.4);

  return {
    score: Math.max(0, Math.min(100, score)),
    signals: {
      completed_appointments_30d: completedCount,
      rebook_rate: Math.round(rebookRate * 100) / 100,
      review_velocity_proxy: velocityScore,
    },
  };
}

// ─── Page Health ───
function scorePageHealth(obj: any, pages: Map<string, any>): { score: number; signals: Record<string, unknown> } {
  if (obj.object_type === "website_page") {
    const page = pages.get(obj.object_key);
    if (!page) return { score: 0, signals: { page_exists: false } };

    const snap = page.snapshot as any;
    const signals: Record<string, unknown> = { page_exists: true };
    let points = 0;
    let maxPoints = 0;

    // Meta title
    maxPoints += 15;
    const title = snap?.seo?.title || snap?.title || "";
    signals.has_meta_title = !!title;
    signals.meta_title_length = title.length;
    if (title && title.length >= 20 && title.length <= 60) points += 15;
    else if (title) points += 8;

    // Meta description
    maxPoints += 15;
    const desc = snap?.seo?.description || "";
    signals.has_meta_description = !!desc;
    signals.meta_description_length = desc.length;
    if (desc && desc.length >= 80 && desc.length <= 160) points += 15;
    else if (desc) points += 8;

    // Content sections
    maxPoints += 20;
    const sections = snap?.sections || [];
    signals.section_count = sections.length;
    if (sections.length >= 4) points += 20;
    else if (sections.length >= 2) points += 10;
    else if (sections.length >= 1) points += 5;

    // Freshness
    maxPoints += 15;
    const daysSinceSave = daysBetween(page.saved_at, new Date().toISOString());
    signals.days_since_update = daysSinceSave;
    if (daysSinceSave <= 30) points += 15;
    else if (daysSinceSave <= 90) points += 10;
    else if (daysSinceSave <= 180) points += 5;

    // Slug quality
    maxPoints += 10;
    const slug = snap?.slug || "";
    signals.has_slug = !!slug;
    if (slug && slug.length > 1 && !slug.includes("untitled")) points += 10;

    // Published status
    maxPoints += 10;
    signals.is_published = true;
    points += 10;

    // Enabled
    maxPoints += 15;
    const enabled = snap?.enabled !== false;
    signals.is_enabled = enabled;
    if (enabled) points += 15;

    const score = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;
    return { score, signals };
  }

  // Stylist/location-service pages get a baseline until full page audits exist
  return { score: 50, signals: { note: "Baseline score — detailed page audit pending" } };
}

// ─── Content Health ───
function scoreContentHealth(
  obj: any,
  pages: Map<string, any>,
  services: any[]
): { score: number; signals: Record<string, unknown> } {
  const signals: Record<string, unknown> = {};
  let points = 0;
  let maxPoints = 0;

  if (obj.object_type === "location_service") {
    const meta = obj.metadata || {};
    const service = services.find((s: any) => s.id === meta.service_id);

    maxPoints += 30;
    const descLen = (service?.description || "").length;
    signals.service_description_length = descLen;
    if (descLen >= 200) points += 30;
    else if (descLen >= 100) points += 15;
    else if (descLen > 0) points += 5;

    maxPoints += 20;
    signals.has_category = !!service?.category;
    if (service?.category) points += 20;

    maxPoints += 20;
    signals.has_price = !!service?.price;
    if (service?.price) points += 20;

    // Baseline for content depth
    maxPoints += 30;
    points += 15; // Partial credit until deeper audit
    signals.content_depth_note = "Partial — deep content audit pending";
  } else if (obj.object_type === "website_page") {
    const page = pages.get(obj.object_key);
    if (page) {
      const snap = page.snapshot as any;
      const sections = snap?.sections || [];

      maxPoints += 40;
      signals.section_count = sections.length;
      if (sections.length >= 5) points += 40;
      else if (sections.length >= 3) points += 25;
      else points += 10;

      maxPoints += 30;
      const freshness = daysBetween(page.saved_at, new Date().toISOString());
      signals.days_since_update = freshness;
      if (freshness <= 30) points += 30;
      else if (freshness <= 90) points += 15;

      maxPoints += 30;
      points += 15;
      signals.content_depth_note = "Partial — deep content audit pending";
    } else {
      return { score: 0, signals: { page_exists: false } };
    }
  } else {
    return { score: 50, signals: { note: "Baseline score" } };
  }

  return {
    score: maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 50,
    signals,
  };
}

// ─── Local Presence Health ───
function scoreLocalPresenceHealth(obj: any): { score: number; signals: Record<string, unknown> } {
  // Until GBP integration data is available, provide baseline with structure
  return {
    score: 40,
    signals: {
      note: "Baseline — GBP integration data not yet connected",
      gbp_claimed: null,
      gbp_hours_complete: null,
      gbp_photo_count: null,
      gbp_post_cadence_days: null,
    },
  };
}

// ─── Competitive Gap Health ───
function scoreCompetitiveGapHealth(obj: any): { score: number; signals: Record<string, unknown> } {
  // Baseline until competitor data sources are connected
  return {
    score: 50,
    signals: {
      note: "Baseline — competitor data not yet connected",
      competitor_review_velocity_gap: null,
      competitor_keyword_presence_gap: null,
    },
  };
}

// ─── Conversion Health ───
function scoreConversionHealth(
  obj: any,
  appointments: any[],
  pages: Map<string, any>
): { score: number; signals: Record<string, unknown> } {
  const signals: Record<string, unknown> = {};
  let points = 0;
  let maxPoints = 0;

  if (obj.object_type === "website_page") {
    const page = pages.get(obj.object_key);
    if (page) {
      const snap = page.snapshot as any;

      // Check for booking CTA in sections
      maxPoints += 40;
      const sections = snap?.sections || [];
      const hasCTA = sections.some((s: any) =>
        s.type === "cta" || s.type === "booking" ||
        JSON.stringify(s).toLowerCase().includes("book")
      );
      signals.has_booking_cta = hasCTA;
      if (hasCTA) points += 40;

      // Page enabled
      maxPoints += 30;
      const enabled = snap?.enabled !== false;
      signals.is_enabled = enabled;
      if (enabled) points += 30;

      // Freshness
      maxPoints += 30;
      const freshness = daysBetween(page.saved_at, new Date().toISOString());
      signals.days_since_update = freshness;
      if (freshness <= 30) points += 30;
      else if (freshness <= 90) points += 15;
    } else {
      return { score: 0, signals: { page_exists: false } };
    }
  } else if (obj.object_type === "location") {
    // Location-level conversion based on appointment volume
    const locAppts = appointments.filter((a: any) => a.location_id === obj.object_key);
    maxPoints += 50;
    signals.appointments_30d = locAppts.length;
    if (locAppts.length >= 100) points += 50;
    else if (locAppts.length >= 50) points += 30;
    else if (locAppts.length >= 20) points += 15;

    maxPoints += 50;
    const rebooked = locAppts.filter((a: any) => a.rebooked_at_checkout).length;
    const rebookRate = locAppts.length > 0 ? rebooked / locAppts.length : 0;
    signals.rebook_rate = Math.round(rebookRate * 100) / 100;
    points += Math.round(rebookRate * 50);
  } else {
    return { score: 50, signals: { note: "Baseline score" } };
  }

  return {
    score: maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 50,
    signals,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Opportunity / Risk Scores
// ═══════════════════════════════════════════════════════════════════════

async function computeOpportunityRisk(
  supabase: any,
  organizationId: string
): Promise<any[]> {
  // Get location-service objects
  const { data: locSvcObjects } = await supabase
    .from("seo_objects")
    .select("id, object_key, location_id, metadata")
    .eq("organization_id", organizationId)
    .eq("object_type", "location_service");

  if (!locSvcObjects?.length) return [];

  // Get latest health scores for these objects
  const objectIds = locSvcObjects.map((o: any) => o.id);
  const { data: healthScores } = await supabase
    .from("seo_health_scores")
    .select("seo_object_id, domain, score")
    .in("seo_object_id", objectIds)
    .order("scored_at", { ascending: false });

  // Aggregate scores per object
  const scoresByObject = new Map<string, Map<string, number>>();
  for (const hs of (healthScores || [])) {
    if (!scoresByObject.has(hs.seo_object_id)) {
      scoresByObject.set(hs.seo_object_id, new Map());
    }
    const objScores = scoresByObject.get(hs.seo_object_id)!;
    if (!objScores.has(hs.domain)) {
      objScores.set(hs.domain, hs.score);
    }
  }

  const now = new Date().toISOString();
  const rows: any[] = [];

  for (const obj of locSvcObjects) {
    const objScores = scoresByObject.get(obj.id);
    if (!objScores) continue;

    const meta = obj.metadata || {};
    const avgScore = objScores.size > 0
      ? [...objScores.values()].reduce((a, b) => a + b, 0) / objScores.size
      : 50;

    // Opportunity = inverse of score (low score = high opportunity)
    // weighted by service value
    const servicePrice = meta.price || 50;
    const priceWeight = Math.min(1, servicePrice / 200);
    const opportunityScore = Math.round(
      Math.max(0, Math.min(100, (100 - avgScore) * 0.7 + priceWeight * 30))
    );

    // Risk = how much could degrade if no action
    // Higher scores with declining trends = higher risk (but we don't have trends yet)
    // For now: risk correlates with low scores on critical domains
    const reviewScore = objScores.get("review") ?? 50;
    const contentScore = objScores.get("content") ?? 50;
    const pageScore = objScores.get("page") ?? 50;
    const riskScore = Math.round(
      Math.max(0, Math.min(100,
        (100 - reviewScore) * 0.4 +
        (100 - contentScore) * 0.3 +
        (100 - pageScore) * 0.3
      ))
    );

    rows.push({
      organization_id: organizationId,
      location_id: obj.location_id,
      service_id: meta.service_id || null,
      opportunity_score: opportunityScore,
      risk_score: riskScore,
      factors: {
        avg_health_score: Math.round(avgScore),
        service_price: servicePrice,
        review_score: reviewScore,
        content_score: contentScore,
        page_score: pageScore,
      },
      scored_at: now,
    });
  }

  if (rows.length) {
    await supabase.from("seo_opportunity_risk_scores").insert(rows);
  }

  return rows;
}

// ─── Helpers ───
function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function daysBetween(dateStr: string, nowStr: string): number {
  const d1 = new Date(dateStr);
  const d2 = new Date(nowStr);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}
