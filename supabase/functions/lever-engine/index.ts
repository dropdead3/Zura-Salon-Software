import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { AI_ASSISTANT_NAME_DEFAULT as AI_ASSISTANT_NAME } from "../_shared/brand.ts";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const LeverEngineSchema = z.object({
  organization_id: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { user, supabaseAdmin } = authResult;

    const body = await validateBody(req, LeverEngineSchema, getCorsHeaders(req));
    const { organization_id } = body;
    // Verify org access
    try {
      await requireOrgMember(supabaseAdmin, user.id, body.organization_id);
    } catch (orgErr) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    ) as any;

    // 1. Check for fresh recommendation (< 1 hour old)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("lever_recommendations")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .eq("is_primary", true)
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ recommendation: existing, cached: true }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 2. Fetch KPI definitions + recent readings
    const { data: kpiDefs } = await supabase
      .from("kpi_definitions")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("is_active", true);

    if (!kpiDefs || kpiDefs.length === 0) {
      return new Response(
        JSON.stringify({ recommendation: null, reason: "no_kpis_defined" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Get readings from last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: readings } = await supabase
      .from("kpi_readings")
      .select("*")
      .eq("organization_id", organization_id)
      .gte("reading_date", ninetyDaysAgo)
      .order("reading_date", { ascending: false });

    // 2b. Fetch add-on margin data
    const { data: addons } = await supabase
      .from("service_addons")
      .select("name, price, cost")
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .not("cost", "is", null)
      .gt("price", 0);

    let addonMarginAvgPct: number | null = null;
    if (addons && addons.length > 0) {
      const margins = addons.map((a: any) => ((a.price - a.cost) / a.price) * 100);
      addonMarginAvgPct = margins.reduce((s: number, m: number) => s + m, 0) / margins.length;
    }

    // 3. Calculate deviation scores per lever category
    const leverCandidates = calculateLeverCandidates(kpiDefs, readings || []);

    // Inject add-on margin signal as a lever candidate if below 40%
    if (addonMarginAvgPct !== null && addonMarginAvgPct < 40) {
      leverCandidates.push({
        lever_type: "pricing",
        score: 0.5,
        deviation: (40 - addonMarginAvgPct) / 100,
        dataCompleteness: 1,
        estimatedImpact: Math.round((40 - addonMarginAvgPct) * 200),
        drivers: [`Add-on avg margin is ${addonMarginAvgPct.toFixed(0)}%, consider reviewing cost/pricing`],
        evidence: { addon_margin_avg_pct: addonMarginAvgPct, addon_count: addons!.length },
        relatedKpis: [],
      });
    }

    // Inject addon_margin_avg_pct into all candidates' evidence
    if (addonMarginAvgPct !== null) {
      for (const c of leverCandidates) {
        (c.evidence as Record<string, unknown>).addon_margin_avg_pct = addonMarginAvgPct;
      }
    }

    // 2c. Per-stylist add-on quality signal
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: addonEvents } = await supabase
      .from("booking_addon_events")
      .select("staff_user_id, addon_price, addon_cost")
      .eq("organization_id", organization_id)
      .gte("created_at", thirtyDaysAgo);

    if (addonEvents && addonEvents.length > 0) {
      // Group by stylist and compute avg margin
      const byStaff = new Map<string, { count: number; marginSum: number; marginCount: number }>();
      for (const e of addonEvents as any[]) {
        const entry = byStaff.get(e.staff_user_id) || { count: 0, marginSum: 0, marginCount: 0 };
        entry.count++;
        if (e.addon_cost != null && e.addon_price > 0) {
          entry.marginSum += ((e.addon_price - e.addon_cost) / e.addon_price) * 100;
          entry.marginCount++;
        }
        byStaff.set(e.staff_user_id, entry);
      }

      // Flag stylists with 3+ add-ons but avg margin below 35%
      const lowMarginUpsellers: { staff_user_id: string; count: number; avg_margin: number }[] = [];
      for (const [staffId, data] of byStaff) {
        if (data.count >= 3 && data.marginCount > 0) {
          const avgMargin = data.marginSum / data.marginCount;
          if (avgMargin < 35) {
            lowMarginUpsellers.push({ staff_user_id: staffId, count: data.count, avg_margin: Math.round(avgMargin) });
          }
        }
      }

      if (lowMarginUpsellers.length > 0) {
        leverCandidates.push({
          lever_type: "service_mix",
          score: 0.45,
          deviation: 0.3,
          dataCompleteness: 1,
          estimatedImpact: lowMarginUpsellers.length * 300,
          drivers: lowMarginUpsellers.map((s: any) =>
            `Stylist (${s.staff_user_id.slice(0, 8)}) sold ${s.count} add-ons at avg ${s.avg_margin}% margin — coach toward higher-margin add-ons`
          ),
          evidence: { stylist_addon_quality: lowMarginUpsellers },
          relatedKpis: [],
        });
      }
    }

    // 4. If no candidate exceeds minimum threshold, return silence
    const MIN_SCORE = 0.3;
    const topCandidates = leverCandidates
      .filter((c: any) => c.score >= MIN_SCORE)
      .sort((a: any, b: any) => b.score - a.score);

    if (topCandidates.length === 0) {
      // Deactivate old active recommendations
      await supabase
        .from("lever_recommendations")
        .update({ is_active: false })
        .eq("organization_id", organization_id)
        .eq("is_active", true);

      return new Response(
        JSON.stringify({ recommendation: null, reason: "within_thresholds" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // 5. Generate natural-language summary via Lovable AI
    const primary = topCandidates[0];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let aiSummary: {
      title: string;
      summary: string;
      what_to_do: string;
      why_now: string[];
    } | null = null;

    if (LOVABLE_API_KEY) {
      aiSummary = await generateAISummary(primary, LOVABLE_API_KEY);
    }

    // Fallback if AI unavailable
    if (!aiSummary) {
      aiSummary = {
        title: `${primary.lever_type.replace(/_/g, " ")} Opportunity`,
        summary: `${primary.lever_type.replace(/_/g, " ")} shows a ${(primary.deviation * 100).toFixed(0)}% deviation from target.`,
        what_to_do: `Review and adjust ${primary.lever_type.replace(/_/g, " ")} parameters to close the gap.`,
        why_now: primary.drivers.slice(0, 3),
      };
    }

    // 6. Determine confidence
    const confidence =
      primary.dataCompleteness > 0.7 && primary.score > 0.6
        ? "high"
        : primary.dataCompleteness > 0.4 && primary.score > 0.4
          ? "medium"
          : "low";

    // 7. Deactivate old active recommendations
    await supabase
      .from("lever_recommendations")
      .update({ is_active: false })
      .eq("organization_id", organization_id)
      .eq("is_active", true);

    // 8. Store new recommendation
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodStart.getDay() + 1); // Monday
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 6); // Sunday
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: newRec, error: insertError } = await supabase
      .from("lever_recommendations")
      .insert({
        organization_id,
        lever_type: primary.lever_type,
        title: aiSummary.title,
        summary: aiSummary.summary,
        what_to_do: aiSummary.what_to_do,
        why_now: aiSummary.why_now,
        estimated_monthly_impact: primary.estimatedImpact,
        confidence,
        is_primary: true,
        is_active: true,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        evidence: primary.evidence,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ recommendation: newRec, cached: false }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("lever-engine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// ── Lever candidate calculation ──

interface KpiDef {
  id: string;
  metric_key: string;
  display_name: string;
  target_value: number;
  warning_threshold: number;
  critical_threshold: number;
  unit: string;
  cadence: string;
}

interface KpiReading {
  kpi_definition_id: string;
  value: number;
  reading_date: string;
}

interface LeverCandidate {
  lever_type: string;
  score: number;
  deviation: number;
  dataCompleteness: number;
  estimatedImpact: number;
  drivers: string[];
  evidence: Record<string, unknown>;
  relatedKpis: { key: string; name: string; current: number; target: number; unit: string }[];
}

const METRIC_TO_LEVER: Record<string, string> = {
  revenue_per_chair: "pricing",
  avg_ticket: "pricing",
  utilization_rate: "utilization",
  client_retention: "retention",
  labor_cost_pct: "commission_alignment",
  margin_rate: "pricing",
  rebook_rate: "retention",
  new_client_conversion: "retention",
};

function calculateLeverCandidates(
  defs: KpiDef[],
  readings: KpiReading[]
): LeverCandidate[] {
  // Group readings by definition
  const readingsByDef = new Map<string, KpiReading[]>();
  for (const r of readings) {
    const arr = readingsByDef.get(r.kpi_definition_id) || [];
    arr.push(r);
    readingsByDef.set(r.kpi_definition_id, arr);
  }

  // Calculate per-KPI deviations
  const kpiDeviations: {
    def: KpiDef;
    currentAvg: number;
    deviation: number;
    trend: number;
    dataPoints: number;
  }[] = [];

  for (const def of defs) {
    const defReadings = readingsByDef.get(def.id) || [];
    if (defReadings.length === 0) continue;

    // Recent average (last 2 weeks)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const recentReadings = defReadings.filter((r: any) => r.reading_date >= twoWeeksAgo);
    const olderReadings = defReadings.filter((r: any) => r.reading_date < twoWeeksAgo);

    const recentAvg =
      recentReadings.length > 0
        ? recentReadings.reduce((s: any, r: any) => s + r.value, 0) / recentReadings.length
        : defReadings[0].value;

    const olderAvg =
      olderReadings.length > 0
        ? olderReadings.reduce((s: any, r: any) => s + r.value, 0) / olderReadings.length
        : recentAvg;

    const deviation =
      def.target_value !== 0
        ? (recentAvg - def.target_value) / Math.abs(def.target_value)
        : 0;

    const trend = olderAvg !== 0 ? (recentAvg - olderAvg) / Math.abs(olderAvg) : 0;

    kpiDeviations.push({
      def,
      currentAvg: recentAvg,
      deviation,
      trend,
      dataPoints: defReadings.length,
    });
  }

  // Group by lever type
  const leverGroups = new Map<
    string,
    typeof kpiDeviations
  >();

  for (const kd of kpiDeviations) {
    const lever = METRIC_TO_LEVER[kd.def.metric_key] || "service_mix";
    const arr = leverGroups.get(lever) || [];
    arr.push(kd);
    leverGroups.set(lever, arr);
  }

  // Score each lever
  const candidates: LeverCandidate[] = [];

  for (const [leverType, kpis] of leverGroups) {
    const avgDeviation =
      kpis.reduce((s: any, k: any) => s + Math.abs(k.deviation), 0) / kpis.length;
    const avgTrend =
      kpis.reduce((s: any, k: any) => s + k.trend, 0) / kpis.length;
    const maxDataPoints = Math.max(...kpis.map((k: any) => k.dataPoints));
    const dataCompleteness = Math.min(maxDataPoints / 30, 1); // 30 readings = full

    // Weighted score
    const impactWeight = 0.5;
    const urgencyWeight = 0.3;
    const confidenceWeight = 0.2;

    const score =
      impactWeight * Math.min(avgDeviation * 2, 1) +
      urgencyWeight * Math.min(Math.abs(avgTrend) * 5, 1) +
      confidenceWeight * dataCompleteness;

    // Estimate monthly impact (rough heuristic)
    const estimatedImpact = Math.round(avgDeviation * 5000); // Placeholder

    // Build drivers
    const drivers: string[] = [];
    for (const kd of kpis) {
      const dir = kd.deviation < 0 ? "below" : "above";
      drivers.push(
        `${kd.def.display_name} is ${Math.abs(kd.deviation * 100).toFixed(0)}% ${dir} target (${kd.currentAvg.toFixed(1)} vs ${kd.def.target_value}${kd.def.unit === "$" ? "" : kd.def.unit})`
      );
    }
    if (avgTrend < -0.05) {
      drivers.push(`Trending downward ${(Math.abs(avgTrend) * 100).toFixed(0)}% over last 2 weeks`);
    }

    candidates.push({
      lever_type: leverType,
      score,
      deviation: avgDeviation,
      dataCompleteness,
      estimatedImpact: Math.abs(estimatedImpact),
      drivers,
      evidence: {
        kpi_deviations: kpis.map((k: any) => ({
          metric: k.def.metric_key,
          current: k.currentAvg,
          target: k.def.target_value,
          deviation_pct: (k.deviation * 100).toFixed(1),
          trend_pct: (k.trend * 100).toFixed(1),
          data_points: k.dataPoints,
        })),
      },
      relatedKpis: kpis.map((k: any) => ({
        key: k.def.metric_key,
        name: k.def.display_name,
        current: k.currentAvg,
        target: k.def.target_value,
        unit: k.def.unit,
      })),
    });
  }

  return candidates;
}

// ── AI Summary Generation ──

async function generateAISummary(
  candidate: LeverCandidate,
  apiKey: string
): Promise<{
  title: string;
  summary: string;
  what_to_do: string;
  why_now: string[];
} | null> {
  try {
    const prompt = `You are ${AI_ASSISTANT_NAME}, an operations intelligence engine for salon and medspa businesses. Generate a concise executive lever recommendation.

Lever type: ${candidate.lever_type}
Deviation score: ${(candidate.score * 100).toFixed(0)}%
Related KPIs:
${candidate.relatedKpis.map((k: any) => `- ${k.name}: current ${k.current.toFixed(1)}${k.unit}, target ${k.target}${k.unit}`).join("\n")}
Drivers:
${candidate.drivers.map((d: any) => `- ${d}`).join("\n")}

Respond with a JSON object containing:
- title: A concise lever name (e.g. "Adjust Color Service Pricing")
- summary: One sentence describing the opportunity
- what_to_do: One clear, actionable sentence 
- why_now: Exactly 3 short bullet-point strings explaining urgency

Be specific to salon/medspa operations. Use advisory tone, no shame language.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: `You are ${AI_ASSISTANT_NAME}, a calm and confident operations advisor. Return valid JSON only.` },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "format_recommendation",
                description: "Format the lever recommendation",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    summary: { type: "string" },
                    what_to_do: { type: "string" },
                    why_now: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 3,
                      maxItems: 3,
                    },
                  },
                  required: ["title", "summary", "what_to_do", "why_now"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "format_recommendation" } },
        }),
      }
    );

    if (!response.ok) {
      console.error("AI gateway error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }

    return null;
  } catch (e) {
    console.error("AI summary generation failed:", e);
    return null;
  }
}
