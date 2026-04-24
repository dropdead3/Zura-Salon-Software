import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { z } from "../_shared/validation.ts";

const RequestSchema = z.object({
  organizationId: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────
interface DataProfile {
  hasPOS: boolean;
  hasPayroll: boolean;
  hasInventory: boolean;
  hasAccounting: boolean;
}

interface MetricResult {
  name: string;
  value: number;
  benchmark: number;
  score: number;
  impact: "positive" | "neutral" | "negative";
}

interface CategoryResult {
  category: string;
  score: number;
  available: boolean;
  metrics: MetricResult[];
  topDrag: string;
  topStrength: string;
  leverRecommendation: string;
}

interface WeightConfig {
  category: string;
  base_weight: number;
  is_active: boolean;
  requires_data_source: string | null;
}

// ─── Scoring helpers ─────────────────────────────────────────────────
/** Linear score mapping: value at `low` → 0, value at `high` → 100 */
function linearScore(value: number, low: number, high: number): number {
  if (high === low) return value >= high ? 100 : 0;
  return Math.round(Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100)));
}

/** Inverse linear: value at `low` → 100, value at `high` → 0 */
function inverseScore(value: number, low: number, high: number): number {
  return linearScore(value, high, low);
}

function classifyImpact(score: number): "positive" | "neutral" | "negative" {
  if (score >= 70) return "positive";
  if (score >= 40) return "neutral";
  return "negative";
}

function riskLevel(score: number): "elite" | "strong" | "at_risk" | "critical" {
  if (score >= 85) return "elite";
  if (score >= 70) return "strong";
  if (score >= 50) return "at_risk";
  return "critical";
}

// Map new risk levels to existing DB enum values for backward compat
function dbRiskLevel(score: number): "healthy" | "at_risk" | "critical" {
  if (score >= 70) return "healthy";
  if (score >= 50) return "at_risk";
  return "critical";
}

// ─── Category calculators ────────────────────────────────────────────

async function calcRevenue(
  supabase: any,
  orgId: string,
  locationId: string | null,
  sevenDaysAgo: string,
  fourteenDaysAgo: string,
  today: string,
  ninetyDaysAgo: string,
): Promise<CategoryResult> {
  const buildQ = (from: string, to: string) => {
    let q = supabase
      .from("v_all_transaction_items")
      .select("total_amount, tax_amount, staff_user_id")
      .eq("organization_id", orgId)
      .eq("is_demo", false)
      .gte("transaction_date", from)
      .lte("transaction_date", to);
    if (locationId) q = q.eq("location_id", locationId);
    return q;
  };

  const [currentRes, prevRes, baseline90Res] = await Promise.all([
    buildQ(sevenDaysAgo, today),
    buildQ(fourteenDaysAgo, sevenDaysAgo),
    buildQ(ninetyDaysAgo, today),
  ]);

  const current = currentRes.data || [];
  const previous = prevRes.data || [];
  const baseline90 = baseline90Res.data || [];

  const sumRev = (rows: any[]) => rows.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0) + (Number(r.tax_amount) || 0), 0);
  const currentRev = sumRev(current);
  const prevRev = sumRev(previous);
  const revGrowth = prevRev > 0 ? (currentRev - prevRev) / prevRev : 0;

  // Completed appointments for avg ticket
  let apptQ = supabase
    .from("v_all_appointments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .eq("is_demo", false)
    .gte("appointment_date", sevenDaysAgo)
    .lte("appointment_date", today);
  if (locationId) apptQ = apptQ.eq("location_id", locationId);
  const { count: completedCount } = await apptQ;

  const avgTicket = (completedCount || 0) > 0 ? currentRev / (completedCount || 1) : 0;

  // 90d avg ticket as benchmark
  let appt90Q = supabase
    .from("v_all_appointments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .eq("is_demo", false)
    .gte("appointment_date", ninetyDaysAgo)
    .lte("appointment_date", today);
  if (locationId) appt90Q = appt90Q.eq("location_id", locationId);
  const { count: completed90 } = await appt90Q;
  const rev90 = sumRev(baseline90);
  const avgTicket90 = (completed90 || 0) > 0 ? rev90 / (completed90 || 1) : avgTicket || 120;

  // Revenue per stylist
  const uniqueStylists = new Set(current.map((r: any) => r.staff_user_id).filter(Boolean));
  const revPerStylist = uniqueStylists.size > 0 ? currentRev / uniqueStylists.size : 0;

  const metrics: MetricResult[] = [
    {
      name: "Revenue Growth (WoW)",
      value: Math.round(revGrowth * 1000) / 10,
      benchmark: 5,
      score: linearScore(revGrowth, -0.2, 0.1),
      impact: classifyImpact(linearScore(revGrowth, -0.2, 0.1)),
    },
    {
      name: "Avg Ticket",
      value: Math.round(avgTicket * 100) / 100,
      benchmark: Math.round(avgTicket90 * 100) / 100,
      score: avgTicket90 > 0 ? linearScore(avgTicket / avgTicket90, 0.7, 1.1) : 50,
      impact: classifyImpact(avgTicket90 > 0 ? linearScore(avgTicket / avgTicket90, 0.7, 1.1) : 50),
    },
    {
      name: "Revenue Per Stylist",
      value: Math.round(revPerStylist),
      benchmark: 3000,
      score: linearScore(revPerStylist, 500, 5000),
      impact: classifyImpact(linearScore(revPerStylist, 500, 5000)),
    },
  ];

  const validMetrics = metrics.filter((m) => m.value > 0 || m.benchmark > 0);
  const categoryScore = validMetrics.length > 0
    ? Math.round(validMetrics.reduce((s, m) => s + m.score, 0) / validMetrics.length)
    : 50;

  const sorted = [...metrics].sort((a, b) => a.score - b.score);

  return {
    category: "revenue",
    score: categoryScore,
    available: current.length > 0 || previous.length > 0,
    metrics,
    topDrag: sorted[0]?.score < 50 ? `${sorted[0].name} underperforming at ${sorted[0].value}` : "No major drags",
    topStrength: sorted[sorted.length - 1]?.score >= 70 ? `${sorted[sorted.length - 1].name} strong at ${sorted[sorted.length - 1].value}` : "Building data",
    leverRecommendation: sorted[0]?.score < 50 ? `Focus on improving ${sorted[0].name.toLowerCase()} to recover ${Math.round((50 - sorted[0].score) / 5)} points` : "Maintain current trajectory",
  };
}

async function calcClient(
  supabase: any,
  orgId: string,
  locationId: string | null,
  sevenDaysAgo: string,
  today: string,
  ninetyDaysAgo: string,
): Promise<CategoryResult> {
  // New clients in last 7d
  let newQ = supabase
    .from("v_all_clients")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", sevenDaysAgo);
  if (locationId) newQ = newQ.eq("location_id", locationId);
  const { count: newClients7d } = await newQ;

  // Total appointments in 7d
  let apptQ = supabase
    .from("v_all_appointments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_demo", false)
    .gte("appointment_date", sevenDaysAgo)
    .lte("appointment_date", today);
  if (locationId) apptQ = apptQ.eq("location_id", locationId);
  const { count: totalAppts7d } = await apptQ;

  // Active clients (visited in 90d)
  let active90Q = supabase
    .from("v_all_clients")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("last_visit_date", ninetyDaysAgo);
  if (locationId) active90Q = active90Q.eq("location_id", locationId);
  const { count: activeClients90 } = await active90Q;

  const newClientRate = (totalAppts7d || 0) > 0 ? (newClients7d || 0) / (totalAppts7d || 1) : 0;

  const metrics: MetricResult[] = [
    {
      name: "New Client Rate",
      value: Math.round(newClientRate * 1000) / 10,
      benchmark: 15,
      score: linearScore(newClientRate, 0, 0.25),
      impact: classifyImpact(linearScore(newClientRate, 0, 0.25)),
    },
    {
      name: "Active Clients (90d)",
      value: activeClients90 || 0,
      benchmark: 200,
      score: linearScore(activeClients90 || 0, 10, 300),
      impact: classifyImpact(linearScore(activeClients90 || 0, 10, 300)),
    },
  ];

  const categoryScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);
  const sorted = [...metrics].sort((a, b) => a.score - b.score);

  return {
    category: "client",
    score: categoryScore,
    available: (totalAppts7d || 0) > 0 || (activeClients90 || 0) > 0,
    metrics,
    topDrag: sorted[0]?.score < 50 ? `${sorted[0].name} at ${sorted[0].value}` : "No major drags",
    topStrength: sorted[sorted.length - 1]?.score >= 70 ? `${sorted[sorted.length - 1].name} healthy at ${sorted[sorted.length - 1].value}` : "Building data",
    leverRecommendation: newClientRate < 0.1 ? "Increase new client acquisition through referral programs or marketing" : "Maintain acquisition channels",
  };
}

async function calcRetention(
  supabase: any,
  orgId: string,
  locationId: string | null,
  sevenDaysAgo: string,
  today: string,
  ninetyDaysAgo: string,
): Promise<CategoryResult> {
  // Rebooking rate from last 7d completed
  let rebookQ = supabase
    .from("v_all_appointments")
    .select("rebooked_at_checkout, status")
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .eq("is_demo", false)
    .gte("appointment_date", sevenDaysAgo)
    .lte("appointment_date", today)
    .limit(1000);
  if (locationId) rebookQ = rebookQ.eq("location_id", locationId);
  const { data: rebookData } = await rebookQ;

  const completedAppts = rebookData?.length || 0;
  const rebooked = rebookData?.filter((r: any) => r.rebooked_at_checkout).length || 0;
  const rebookRate = completedAppts > 0 ? rebooked / completedAppts : 0;

  // Client retention: clients with visit in last 90d who also visited in prior 90d
  // Simplified: use at-risk percentage from client segments if available
  let retainedQ = supabase
    .from("v_all_clients")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("last_visit_date", ninetyDaysAgo)
    .gte("visit_count", 2);
  if (locationId) retainedQ = retainedQ.eq("location_id", locationId);
  const { count: retainedClients } = await retainedQ;

  let totalActiveQ = supabase
    .from("v_all_clients")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("last_visit_date", ninetyDaysAgo);
  if (locationId) totalActiveQ = totalActiveQ.eq("location_id", locationId);
  const { count: totalActive } = await totalActiveQ;

  const retentionRate = (totalActive || 0) > 0 ? (retainedClients || 0) / (totalActive || 1) : 0;

  const metrics: MetricResult[] = [
    {
      name: "Rebooking Rate",
      value: Math.round(rebookRate * 1000) / 10,
      benchmark: 70,
      score: linearScore(rebookRate, 0, 0.8),
      impact: classifyImpact(linearScore(rebookRate, 0, 0.8)),
    },
    {
      name: "Client Retention (90d)",
      value: Math.round(retentionRate * 1000) / 10,
      benchmark: 65,
      score: linearScore(retentionRate, 0.2, 0.75),
      impact: classifyImpact(linearScore(retentionRate, 0.2, 0.75)),
    },
  ];

  const categoryScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);
  const sorted = [...metrics].sort((a, b) => a.score - b.score);

  return {
    category: "retention",
    score: categoryScore,
    available: completedAppts > 0,
    metrics,
    topDrag: sorted[0]?.score < 50 ? `${sorted[0].name} at ${sorted[0].value}%` : "No major drags",
    topStrength: sorted[sorted.length - 1]?.score >= 70 ? `${sorted[sorted.length - 1].name} strong at ${sorted[sorted.length - 1].value}%` : "Building data",
    leverRecommendation: rebookRate < 0.5 ? "Focus on checkout rebooking to recover retention points" : "Maintain rebooking discipline",
  };
}

async function calcUtilization(
  supabase: any,
  orgId: string,
  locationId: string | null,
  sevenDaysAgo: string,
  today: string,
): Promise<CategoryResult> {
  // Booked appointments in last 7d
  let bookedQ = supabase
    .from("v_all_appointments")
    .select("duration_minutes, status")
    .eq("organization_id", orgId)
    .eq("is_demo", false)
    .in("status", ["completed", "confirmed", "checked_in", "booked"])
    .gte("appointment_date", sevenDaysAgo)
    .lte("appointment_date", today)
    .limit(1000);
  if (locationId) bookedQ = bookedQ.eq("location_id", locationId);
  const { data: bookedAppts } = await bookedQ;

  const bookedMinutes = (bookedAppts || []).reduce((s: number, a: any) => s + (Number(a.duration_minutes) || 60), 0);
  const bookedHours = bookedMinutes / 60;

  // Active stylists count
  let staffQ = supabase
    .from("employee_profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .eq("is_approved", true);
  if (locationId) staffQ = staffQ.eq("location_id", locationId);
  const { count: activeStaff } = await staffQ;

  // Available hours estimate: staff × 7 days × 8 hours
  const availableHours = (activeStaff || 1) * 7 * 8;
  const utilRate = availableHours > 0 ? bookedHours / availableHours : 0;

  const avgDailyBookings = (bookedAppts?.length || 0) / 7;

  const metrics: MetricResult[] = [
    {
      name: "Utilization Rate",
      value: Math.round(utilRate * 1000) / 10,
      benchmark: 75,
      score: linearScore(utilRate, 0.3, 0.85),
      impact: classifyImpact(linearScore(utilRate, 0.3, 0.85)),
    },
    {
      name: "Avg Daily Bookings",
      value: Math.round(avgDailyBookings * 10) / 10,
      benchmark: 20,
      score: linearScore(avgDailyBookings, 2, 30),
      impact: classifyImpact(linearScore(avgDailyBookings, 2, 30)),
    },
  ];

  const categoryScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);
  const sorted = [...metrics].sort((a, b) => a.score - b.score);

  return {
    category: "utilization",
    score: categoryScore,
    available: (bookedAppts?.length || 0) > 0,
    metrics,
    topDrag: sorted[0]?.score < 50 ? `${sorted[0].name} at ${sorted[0].value}%` : "No major drags",
    topStrength: sorted[sorted.length - 1]?.score >= 70 ? `${sorted[sorted.length - 1].name} at ${sorted[sorted.length - 1].value}%` : "Building data",
    leverRecommendation: utilRate < 0.5 ? "Fill gaps with marketing or walk-in availability" : "Maintain booking density",
  };
}

async function calcTeamPerformance(
  supabase: any,
  orgId: string,
  locationId: string | null,
  sevenDaysAgo: string,
  today: string,
): Promise<CategoryResult> {
  // Revenue per stylist from transaction items
  let txQ = supabase
    .from("v_all_transaction_items")
    .select("total_amount, tax_amount, staff_user_id")
    .eq("organization_id", orgId)
    .eq("is_demo", false)
    .gte("transaction_date", sevenDaysAgo)
    .lte("transaction_date", today)
    .limit(1000);
  if (locationId) txQ = txQ.eq("location_id", locationId);
  const { data: txItems } = await txQ;

  // Group by stylist
  const byStaff = new Map<string, number>();
  for (const item of txItems || []) {
    if (!item.staff_user_id) continue;
    const rev = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
    byStaff.set(item.staff_user_id, (byStaff.get(item.staff_user_id) || 0) + rev);
  }

  const values = Array.from(byStaff.values());
  const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const stddev = values.length > 1
    ? Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length)
    : 0;
  const variance = mean > 0 ? 1 - stddev / mean : 0;

  const metrics: MetricResult[] = [
    {
      name: "Staff Revenue Variance",
      value: Math.round(Math.max(0, variance) * 100),
      benchmark: 70,
      score: linearScore(Math.max(0, variance), 0, 0.8),
      impact: classifyImpact(linearScore(Math.max(0, variance), 0, 0.8)),
    },
    {
      name: "Active Stylists",
      value: values.length,
      benchmark: 5,
      score: values.length > 0 ? Math.min(100, values.length * 20) : 0,
      impact: classifyImpact(values.length > 0 ? Math.min(100, values.length * 20) : 0),
    },
  ];

  const categoryScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);
  const sorted = [...metrics].sort((a, b) => a.score - b.score);

  return {
    category: "team_performance",
    score: categoryScore,
    available: values.length > 0,
    metrics,
    topDrag: sorted[0]?.score < 50 ? `${sorted[0].name} needs attention` : "No major drags",
    topStrength: sorted[sorted.length - 1]?.score >= 70 ? `${sorted[sorted.length - 1].name} performing well` : "Building data",
    leverRecommendation: variance < 0.5 ? "Address revenue disparity through coaching or scheduling optimization" : "Team is balanced",
  };
}

async function calcOperational(
  supabase: any,
  orgId: string,
  locationId: string | null,
  sevenDaysAgo: string,
  today: string,
): Promise<CategoryResult> {
  // No-show + cancellation rates
  let allApptQ = supabase
    .from("v_all_appointments")
    .select("status")
    .eq("organization_id", orgId)
    .eq("is_demo", false)
    .gte("appointment_date", sevenDaysAgo)
    .lte("appointment_date", today)
    .limit(1000);
  if (locationId) allApptQ = allApptQ.eq("location_id", locationId);
  const { data: allAppts } = await allApptQ;

  const total = allAppts?.length || 0;
  const noShows = allAppts?.filter((a: any) => a.status === "no_show").length || 0;
  const cancelled = allAppts?.filter((a: any) => a.status === "cancelled").length || 0;

  const noShowRate = total > 0 ? noShows / total : 0;
  const cancelRate = total > 0 ? cancelled / total : 0;

  // Sync health
  const { data: syncLogs } = await supabase
    .from("phorest_sync_log")
    .select("status, completed_at")
    .eq("organization_id", orgId)
    .order("completed_at", { ascending: false })
    .limit(20);

  const successfulSyncs = syncLogs?.filter((s: any) => s.status === "completed").length || 0;
  const totalSyncs = syncLogs?.length || 1;
  const syncRate = successfulSyncs / totalSyncs;

  const metrics: MetricResult[] = [
    {
      name: "No-Show Rate",
      value: Math.round(noShowRate * 1000) / 10,
      benchmark: 5,
      score: inverseScore(noShowRate, 0, 0.15),
      impact: classifyImpact(inverseScore(noShowRate, 0, 0.15)),
    },
    {
      name: "Cancellation Rate",
      value: Math.round(cancelRate * 1000) / 10,
      benchmark: 10,
      score: inverseScore(cancelRate, 0, 0.25),
      impact: classifyImpact(inverseScore(cancelRate, 0, 0.25)),
    },
    {
      name: "Data Sync Health",
      value: Math.round(syncRate * 100),
      benchmark: 95,
      score: linearScore(syncRate, 0.5, 1),
      impact: classifyImpact(linearScore(syncRate, 0.5, 1)),
    },
  ];

  const categoryScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);
  const sorted = [...metrics].sort((a, b) => a.score - b.score);

  return {
    category: "operational_consistency",
    score: categoryScore,
    available: total > 0,
    metrics,
    topDrag: sorted[0]?.score < 50 ? `${sorted[0].name} at ${sorted[0].value}%` : "No major drags",
    topStrength: sorted[sorted.length - 1]?.score >= 70 ? `${sorted[sorted.length - 1].name} at ${sorted[sorted.length - 1].value}%` : "Building data",
    leverRecommendation: noShowRate > 0.05 ? "Implement deposit or confirmation system to reduce no-shows" : "Operational consistency is solid",
  };
}

async function calcInventory(
  supabase: any,
  orgId: string,
  locationId: string | null,
): Promise<CategoryResult> {
  // Get latest backroom analytics snapshot
  let snapQ = supabase
    .from("backroom_analytics_snapshots")
    .select("waste_pct, reweigh_compliance_pct, total_product_cost, total_service_revenue")
    .eq("organization_id", orgId)
    .order("snapshot_date", { ascending: false })
    .limit(1);
  if (locationId) snapQ = snapQ.eq("location_id", locationId);
  const { data: snapshots } = await snapQ;

  const snap = snapshots?.[0];
  if (!snap) {
    return {
      category: "inventory_cost",
      score: 0,
      available: false,
      metrics: [],
      topDrag: "No inventory data",
      topStrength: "N/A",
      leverRecommendation: "Connect inventory tracking to unlock this category",
    };
  }

  const wastePct = Number(snap.waste_pct) || 0;
  const reweighCompliance = Number(snap.reweigh_compliance_pct) || 0;

  const metrics: MetricResult[] = [
    {
      name: "Waste %",
      value: Math.round(wastePct * 10) / 10,
      benchmark: 5,
      score: inverseScore(wastePct, 0, 15),
      impact: classifyImpact(inverseScore(wastePct, 0, 15)),
    },
    {
      name: "Reweigh Compliance",
      value: Math.round(reweighCompliance),
      benchmark: 90,
      score: linearScore(reweighCompliance, 40, 100),
      impact: classifyImpact(linearScore(reweighCompliance, 40, 100)),
    },
  ];

  const categoryScore = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);

  return {
    category: "inventory_cost",
    score: categoryScore,
    available: true,
    metrics,
    topDrag: wastePct > 8 ? `Waste at ${wastePct}% exceeds benchmark` : "No major drags",
    topStrength: reweighCompliance > 80 ? `Reweigh compliance strong at ${reweighCompliance}%` : "Building compliance",
    leverRecommendation: wastePct > 8 ? "Focus on reducing color waste through better measurement" : "Maintain inventory discipline",
  };
}

// ─── Main handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { user, supabaseAdmin } = authResult;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    let targetOrgId: string | null = null;
    try {
      const raw = await req.json();
      const parsed = RequestSchema.safeParse(raw);
      if (parsed.success) {
        const body = parsed.data;
        if (body.organizationId || body.organization_id) {
          try {
            await requireOrgMember(supabaseAdmin, user.id, (body.organizationId || body.organization_id)!);
          } catch (orgErr) {
            return authErrorResponse(orgErr, getCorsHeaders(req));
          }
        }
        targetOrgId = body.organizationId || body.organization_id || null;
      }
    } catch {
      // No body
    }

    // Fetch weights
    const { data: weights } = await supabase.from("health_score_weights").select("*").eq("is_active", true);
    const weightMap = new Map<string, WeightConfig>();
    for (const w of weights || []) {
      weightMap.set(w.category, w);
    }

    // Fetch organizations
    let orgsQuery = supabase.from("organizations").select("id, name, status").eq("status", "active");
    if (targetOrgId) orgsQuery = orgsQuery.eq("id", targetOrgId);
    const { data: organizations, error: orgsError } = await orgsQuery;
    if (orgsError) throw new Error(`Failed to fetch organizations: ${orgsError.message}`);

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

    const results: any[] = [];

    for (const org of organizations || []) {
      try {
        // Build data profile
        const [locRes, payrollRes, inventoryRes] = await Promise.all([
          supabase.from("locations").select("id, phorest_branch_id").eq("organization_id", org.id),
          supabase.from("payroll_connections").select("connection_status").eq("organization_id", org.id).eq("connection_status", "connected").maybeSingle(),
          supabase.from("backroom_analytics_snapshots").select("id").eq("organization_id", org.id).limit(1),
        ]);

        const locations = locRes.data || [];
        const dataProfile: DataProfile = {
          hasPOS: locations.some((l: any) => l.phorest_branch_id),
          hasPayroll: !!payrollRes.data,
          hasInventory: (inventoryRes.data?.length || 0) > 0,
          hasAccounting: false, // Future phase
        };

        // Calculate per-location scores
        const locationScores: any[] = [];
        for (const loc of locations) {
          const categories = await Promise.all([
            calcRevenue(supabase, org.id, loc.id, sevenDaysAgo, fourteenDaysAgo, today, ninetyDaysAgo),
            calcClient(supabase, org.id, loc.id, sevenDaysAgo, today, ninetyDaysAgo),
            calcRetention(supabase, org.id, loc.id, sevenDaysAgo, today, ninetyDaysAgo),
            calcUtilization(supabase, org.id, loc.id, sevenDaysAgo, today),
            calcTeamPerformance(supabase, org.id, loc.id, sevenDaysAgo, today),
            calcOperational(supabase, org.id, loc.id, sevenDaysAgo, today),
            dataProfile.hasInventory ? calcInventory(supabase, org.id, loc.id) : Promise.resolve({ category: "inventory_cost", score: 0, available: false, metrics: [], topDrag: "", topStrength: "", leverRecommendation: "" }),
          ]);

          // Filter available categories, normalize weights
          const available = categories.filter((c) => c.available);
          let totalWeight = 0;
          const weighted: { cat: CategoryResult; weight: number }[] = [];

          for (const cat of available) {
            const w = weightMap.get(cat.category);
            if (!w) continue;
            if (w.requires_data_source && !(dataProfile as any)[w.requires_data_source]) continue;
            totalWeight += w.base_weight;
            weighted.push({ cat, weight: w.base_weight });
          }

          // Normalize
          const locScore = totalWeight > 0
            ? Math.round(weighted.reduce((s, w) => s + w.cat.score * (w.weight / totalWeight), 0))
            : 0;

          const breakdown: Record<string, any> = {};
          for (const cat of categories) {
            breakdown[cat.category] = {
              score: cat.score,
              available: cat.available,
              metrics: cat.metrics,
              topDrag: cat.topDrag,
              topStrength: cat.topStrength,
              leverRecommendation: cat.leverRecommendation,
            };
          }

          locationScores.push({
            location_id: loc.id,
            score: locScore,
            breakdown,
          });

          // Upsert location score
          await supabase.from("location_health_scores").upsert(
            {
              location_id: loc.id,
              organization_id: org.id,
              score: locScore,
              risk_level: dbRiskLevel(locScore),
              score_breakdown: breakdown,
              trends: {},
              recommendations: [],
              data_profile: dataProfile,
              score_date: today,
              calculated_at: new Date().toISOString(),
            },
            { onConflict: "location_id,score_date" },
          );
        }

        // Org-level: calculate directly (not just averaging locations)
        const orgCategories = await Promise.all([
          calcRevenue(supabase, org.id, null, sevenDaysAgo, fourteenDaysAgo, today, ninetyDaysAgo),
          calcClient(supabase, org.id, null, sevenDaysAgo, today, ninetyDaysAgo),
          calcRetention(supabase, org.id, null, sevenDaysAgo, today, ninetyDaysAgo),
          calcUtilization(supabase, org.id, null, sevenDaysAgo, today),
          calcTeamPerformance(supabase, org.id, null, sevenDaysAgo, today),
          calcOperational(supabase, org.id, null, sevenDaysAgo, today),
          dataProfile.hasInventory ? calcInventory(supabase, org.id, null) : Promise.resolve({ category: "inventory_cost", score: 0, available: false, metrics: [], topDrag: "", topStrength: "", leverRecommendation: "" }),
        ]);

        const orgAvailable = orgCategories.filter((c) => c.available);
        let orgTotalWeight = 0;
        const orgWeighted: { cat: CategoryResult; weight: number }[] = [];

        for (const cat of orgAvailable) {
          const w = weightMap.get(cat.category);
          if (!w) continue;
          if (w.requires_data_source && !(dataProfile as any)[w.requires_data_source]) continue;
          orgTotalWeight += w.base_weight;
          orgWeighted.push({ cat, weight: w.base_weight });
        }

        const orgScore = orgTotalWeight > 0
          ? Math.round(orgWeighted.reduce((s, w) => s + w.cat.score * (w.weight / orgTotalWeight), 0))
          : 0;

        const orgBreakdown: Record<string, any> = {};
        for (const cat of orgCategories) {
          orgBreakdown[cat.category] = {
            score: cat.score,
            available: cat.available,
            metrics: cat.metrics,
            topDrag: cat.topDrag,
            topStrength: cat.topStrength,
            leverRecommendation: cat.leverRecommendation,
          };
        }

        // Recommendations
        const recommendations: string[] = [];
        for (const cat of orgCategories) {
          if (cat.available && cat.score < 50) {
            recommendations.push(cat.leverRecommendation);
          }
        }

        // Historical trends
        const { data: historicalScores } = await supabase
          .from("organization_health_scores")
          .select("score, score_date")
          .eq("organization_id", org.id)
          .order("score_date", { ascending: false })
          .limit(30);

        const score7dAgo = historicalScores?.find(
          (s: any) => new Date(s.score_date).getTime() <= Date.now() - 7 * 86400000,
        )?.score || null;
        const score30dAgo = historicalScores?.find(
          (s: any) => new Date(s.score_date).getTime() <= Date.now() - 30 * 86400000,
        )?.score || null;

        let trend: "improving" | "stable" | "declining" = "stable";
        if (score7dAgo !== null) {
          const diff = orgScore - Number(score7dAgo);
          if (diff >= 5) trend = "improving";
          else if (diff <= -5) trend = "declining";
        }

        const trends = { score_7d_ago: score7dAgo ? Number(score7dAgo) : null, score_30d_ago: score30dAgo ? Number(score30dAgo) : null, trend };

        // Upsert org score
        await supabase.from("organization_health_scores").upsert(
          {
            organization_id: org.id,
            score: orgScore,
            risk_level: dbRiskLevel(orgScore),
            score_breakdown: orgBreakdown,
            trends,
            recommendations,
            data_profile: dataProfile,
            score_date: today,
            calculated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,score_date" },
        );

        results.push({
          organization_id: org.id,
          organization_name: org.name,
          score: orgScore,
          risk_level: riskLevel(orgScore),
          location_count: locationScores.length,
        });
      } catch (orgError) {
        console.error(`Error processing org ${org.id}:`, orgError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, scores: results }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Health score calculation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
