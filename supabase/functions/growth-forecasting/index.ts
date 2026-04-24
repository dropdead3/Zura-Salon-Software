import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const GrowthForecastSchema = z.object({
  organizationId: z.string().uuid(),
  organization_id: z.string().uuid().optional(),
  locationId: z.string().optional(),
  granularity: z.enum(["quarterly", "monthly"]).optional().default("quarterly"),
  horizonMonths: z.number().int().min(1).max(36).optional().default(12),
});

interface QuarterData {
  quarter: string; // e.g. "Q1 2025"
  year: number;
  q: number; // 1-4
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  transactions: number;
  months: MonthData[];
}

interface MonthData {
  month: string; // "2025-01"
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  transactions: number;
  dayCount: number;
}

function getQuarterLabel(year: number, q: number): string {
  return `Q${q} ${year}`;
}

function getQuarterFromDate(date: string): { year: number; q: number } {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed
  const q = Math.floor(month / 3) + 1;
  return { year, q };
}

// Simple linear regression
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0 };

  const sumX = xs.reduce((a: any, b: any) => a + b, 0);
  const sumY = ys.reduce((a: any, b: any) => a + b, 0);
  const sumXY = xs.reduce((a: any, x: any, i: any) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a: any, x: any) => a + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  const ssRes = ys.reduce((a: any, y: any, i: any) => a + Math.pow(y - (slope * xs[i] + intercept), 2), 0);
  const ssTot = ys.reduce((a: any, y: any) => a + Math.pow(y - meanY, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// Calculate seasonal indices (average ratio of each quarter to overall trend)
function calculateSeasonalIndices(quarters: QuarterData[]): Record<number, number> {
  const indices: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
  const avgRevenue = quarters.reduce((s: any, q: any) => s + q.totalRevenue, 0) / quarters.length;

  if (avgRevenue === 0) return { 1: 1, 2: 1, 3: 1, 4: 1 };

  quarters.forEach((q: any) => {
    indices[q.q].push(q.totalRevenue / avgRevenue);
  });

  const result: Record<number, number> = {};
  for (let i = 1; i <= 4; i++) {
    const vals = indices[i];
    result[i] = vals.length > 0 ? vals.reduce((a: any, b: any) => a + b, 0) / vals.length : 1;
  }
  return result;
}

// Calculate monthly seasonal indices (average ratio of each calendar month 1-12 to overall average)
function calculateMonthlySeasonalIndicesFor(
  months: MonthData[],
  getValue: (m: MonthData) => number
): Record<number, number> {
  const indices: Record<number, number[]> = {};
  for (let i = 1; i <= 12; i++) indices[i] = [];

  const avg = months.reduce((s: any, m: any) => s + getValue(m), 0) / months.length;
  if (avg === 0) {
    const result: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) result[i] = 1;
    return result;
  }

  months.forEach((m: any) => {
    const calMonth = parseInt(m.month.split("-")[1]); // 1-12
    indices[calMonth].push(getValue(m) / avg);
  });

  const result: Record<number, number> = {};
  for (let i = 1; i <= 12; i++) {
    const vals = indices[i];
    result[i] = vals.length > 0 ? vals.reduce((a: any, b: any) => a + b, 0) / vals.length : 1;
  }
  return result;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Determine momentum from recent growth rates
function determineMomentum(growthRates: number[]): string {
  if (growthRates.length < 2) return "steady";
  const recent = growthRates.slice(-3);
  if (recent.length < 2) return "steady";

  const diffs = [];
  for (let i = 1; i < recent.length; i++) {
    diffs.push(recent[i] - recent[i - 1]);
  }
  const avgDiff = diffs.reduce((a: any, b: any) => a + b, 0) / diffs.length;

  if (avgDiff > 2) return "accelerating";
  if (avgDiff < -2) return "decelerating";
  return "steady";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr: any) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { user, supabaseAdmin } = authResult;

    const body = await validateBody(req, GrowthForecastSchema, getCorsHeaders(req));
    const { organizationId, locationId, granularity, horizonMonths } = body;
    // Verify org access
    try {
      const orgId = body.organizationId || body.organization_id;
      if (!orgId) {
        return authErrorResponse({ status: 400, message: "organizationId is required" }, getCorsHeaders(req));
      }
      await requireOrgMember(supabaseAdmin, user.id, orgId);
    } catch (orgErr: any) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Check cache first (only for quarterly — monthly is computed fresh, cached client-side)
    if (granularity !== 'monthly') {
      const { data: cached } = await supabase
        .from("growth_forecasts")
        .select("*")
        .eq("organization_id", organizationId)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(20);

      if (cached && cached.length > 0) {
        // Group cached data by scenario
        const scenarios: Record<string, any[]> = {};
        cached.forEach((row: any) => {
          if (!scenarios[row.scenario]) scenarios[row.scenario] = [];
          scenarios[row.scenario].push(row);
        });

        return new Response(
          JSON.stringify({ source: "cache", forecasts: cached, scenarios }),
          { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
    }

    // Pull all historical transaction items (POS-first)
    const allItems: any[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      let q = supabase
        .from("phorest_transaction_items")
        .select("transaction_date, total_amount, tax_amount, item_type, location_id")
        .order("transaction_date", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (locationId && locationId !== "all") {
        q = q.eq("location_id", locationId);
      }

      const { data: batch, error: batchErr } = await q;
      if (batchErr) {
        console.error("Error fetching transaction items:", batchErr);
        return new Response(JSON.stringify({ error: "Failed to fetch sales data" }), {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (!batch || batch.length === 0) break;
      allItems.push(...batch);
      if (batch.length < pageSize) break;
      page++;
    }

    const dailyData = allItems;

    if (!dailyData || dailyData.length === 0) {
      return new Response(
        JSON.stringify({
          source: "computed",
          forecasts: [],
          scenarios: {},
          actuals: [],
          insights: ["Not enough historical data to generate growth forecasts. Revenue data will be analyzed once available."],
          accuracy: { history: [], average: null },
          summary: {
            momentum: "steady",
            dataPoints: 0,
            quartersAvailable: 0,
          },
        }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Aggregate into months from transaction items
    const monthMap = new Map<string, MonthData>();
    dailyData.forEach((d: any) => {
      const monthKey = d.transaction_date.substring(0, 7); // "YYYY-MM"
      const rev = (Number(d.total_amount) || 0) + (Number(d.tax_amount) || 0);
      const isService = d.item_type === "service";
      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.totalRevenue += rev;
        existing.serviceRevenue += isService ? rev : 0;
        existing.productRevenue += isService ? 0 : rev;
        existing.transactions += 1;
        existing.dayCount += 1;
      } else {
        monthMap.set(monthKey, {
          month: monthKey,
          totalRevenue: rev,
          serviceRevenue: isService ? rev : 0,
          productRevenue: isService ? 0 : rev,
          transactions: 1,
          dayCount: 1,
        });
      }
    });

    // ── Monthly forecasting branch ──────────────────────────────────────
    if (granularity === "monthly") {
      const sortedMonths = Array.from(monthMap.values()).sort((a: any, b: any) => a.month.localeCompare(b.month));

      // Linear regression on monthly revenue
      const mxs = sortedMonths.map((_: any, i: any) => i);
      const revYs = sortedMonths.map((m: any) => m.totalRevenue);
      const revRegression = linearRegression(mxs, revYs);

      // Linear regression on monthly transactions (appointments)
      const txnYs = sortedMonths.map((m: any) => m.transactions);
      const txnRegression = linearRegression(mxs, txnYs);

      // Monthly seasonal indices for revenue and appointments
      const revSeasonalIdx = calculateMonthlySeasonalIndicesFor(sortedMonths, (m) => m.totalRevenue);
      const txnSeasonalIdx = calculateMonthlySeasonalIndicesFor(sortedMonths, (m) => m.transactions);

      // Monthly growth rates for momentum
      const monthlyGrowthRates: number[] = [];
      for (let i = 1; i < sortedMonths.length; i++) {
        const prev = sortedMonths[i - 1].totalRevenue;
        const curr = sortedMonths[i].totalRevenue;
        if (prev > 0) monthlyGrowthRates.push(((curr - prev) / prev) * 100);
      }
      const monthlyMomentum = determineMomentum(monthlyGrowthRates);

      // MoM growth (last month vs previous)
      const lastMonth = sortedMonths[sortedMonths.length - 1];
      const prevMonth = sortedMonths.length >= 2 ? sortedMonths[sortedMonths.length - 2] : null;
      const lastMoMGrowth =
        prevMonth && prevMonth.totalRevenue > 0
          ? ((lastMonth.totalRevenue - prevMonth.totalRevenue) / prevMonth.totalRevenue) * 100
          : null;

      // YoY growth (last month vs same month last year)
      const lastMonthCal = parseInt(lastMonth.month.split("-")[1]);
      const lastMonthYear = parseInt(lastMonth.month.split("-")[0]);
      const sameMonthLastYear = sortedMonths.find((m: any) => {
        const cal = parseInt(m.month.split("-")[1]);
        const yr = parseInt(m.month.split("-")[0]);
        return cal === lastMonthCal && yr === lastMonthYear - 1;
      });
      const monthlyYoyGrowth =
        sameMonthLastYear && sameMonthLastYear.totalRevenue > 0
          ? ((lastMonth.totalRevenue - sameMonthLastYear.totalRevenue) / sameMonthLastYear.totalRevenue) * 100
          : null;

      const now = new Date();
      const currentCalMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      const scenarioMultipliers: Record<string, number> = {
        conservative: 0.85,
        baseline: 1.0,
        optimistic: 1.15,
      };

      // Project forward horizonMonths months
      const monthlyProjections: any[] = [];
      for (let i = 1; i <= horizonMonths; i++) {
        let futureMonth = currentCalMonth + i;
        let futureYear = currentYear;
        while (futureMonth > 12) {
          futureMonth -= 12;
          futureYear++;
        }

        const revTrend = revRegression.slope * (sortedMonths.length + i - 1) + revRegression.intercept;
        const revSeasonal = revSeasonalIdx[futureMonth] || 1;
        const baseRevenue = Math.max(0, revTrend * revSeasonal);

        const txnTrend = txnRegression.slope * (sortedMonths.length + i - 1) + txnRegression.intercept;
        const txnSeasonal = txnSeasonalIdx[futureMonth] || 1;
        const baseAppointments = Math.max(0, txnTrend * txnSeasonal);

        const monthKey = `${futureYear}-${String(futureMonth).padStart(2, "0")}`;
        const label = `${MONTH_NAMES[futureMonth - 1]} ${futureYear}`;

        for (const [scenario, multiplier] of Object.entries(scenarioMultipliers)) {
          monthlyProjections.push({
            month: monthKey,
            period: label,
            revenue: Math.round(baseRevenue * multiplier * 100) / 100,
            appointments: Math.round(baseAppointments * multiplier),
            confidenceLower: Math.round(baseRevenue * multiplier * 0.85 * 100) / 100,
            confidenceUpper: Math.round(baseRevenue * multiplier * 1.15 * 100) / 100,
            appointmentsLower: Math.round(baseAppointments * multiplier * 0.85),
            appointmentsUpper: Math.round(baseAppointments * multiplier * 1.15),
            scenario,
            type: "projected",
          });
        }
      }

      // Build monthly actuals
      const monthlyActuals = sortedMonths.map((m: any) => ({
        period: `${MONTH_NAMES[parseInt(m.month.split("-")[1]) - 1]} ${m.month.split("-")[0]}`,
        month: m.month,
        revenue: m.totalRevenue,
        appointments: m.transactions,
        type: "actual" as const,
      }));

      // Build monthly scenarios grouped
      const monthlyScenarios: Record<string, any[]> = {};
      monthlyProjections.forEach((p: any) => {
        if (!monthlyScenarios[p.scenario]) monthlyScenarios[p.scenario] = [];
        monthlyScenarios[p.scenario].push({
          period: p.period,
          month: p.month,
          revenue: p.revenue,
          appointments: p.appointments,
          confidenceLower: p.confidenceLower,
          confidenceUpper: p.confidenceUpper,
          appointmentsLower: p.appointmentsLower,
          appointmentsUpper: p.appointmentsUpper,
          type: "projected" as const,
        });
      });

      // Calculate 3M/6M/12M summary totals from baseline
      const baselineMonthly = monthlyProjections.filter((p: any) => p.scenario === "baseline");
      const sum = (arr: any[], key: string) => arr.reduce((s: any, p: any) => s + (p[key] || 0), 0);

      const projectedRevenue3m = Math.round(sum(baselineMonthly.slice(0, Math.min(3, horizonMonths)), "revenue") * 100) / 100;
      const projectedRevenue6m = Math.round(sum(baselineMonthly.slice(0, Math.min(6, horizonMonths)), "revenue") * 100) / 100;
      const projectedRevenue12m = Math.round(sum(baselineMonthly.slice(0, Math.min(12, horizonMonths)), "revenue") * 100) / 100;
      const projectedAppointments3m = sum(baselineMonthly.slice(0, Math.min(3, horizonMonths)), "appointments");
      const projectedAppointments6m = sum(baselineMonthly.slice(0, Math.min(6, horizonMonths)), "appointments");
      const projectedAppointments12m = sum(baselineMonthly.slice(0, Math.min(12, horizonMonths)), "appointments");

      // Generate AI insights for monthly data
      let monthlyInsights: string[] = [];
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY && sortedMonths.length >= 3) {
          const recentMonths = sortedMonths.slice(-12);
          const context = `Historical monthly revenue & appointment data for a salon/beauty business (last ${recentMonths.length} months):
${recentMonths.map((m: any) => `${MONTH_NAMES[parseInt(m.month.split("-")[1]) - 1]} ${m.month.split("-")[0]}: Revenue $${m.totalRevenue.toLocaleString()}, Appointments ${m.transactions}`).join("\n")}

3-month projected revenue (baseline): $${projectedRevenue3m.toLocaleString()}
6-month projected revenue (baseline): $${projectedRevenue6m.toLocaleString()}
12-month projected revenue (baseline): $${projectedRevenue12m.toLocaleString()}
Revenue trend R²: ${revRegression.r2.toFixed(3)}
Momentum: ${monthlyMomentum}
Monthly seasonal indices (revenue): ${Object.entries(revSeasonalIdx).map(([m, idx]) => `${MONTH_NAMES[parseInt(m) - 1]}: ${(idx as number).toFixed(2)}`).join(", ")}`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a business analytics advisor for salon/beauty businesses. Given monthly revenue and appointment data with projections, provide 3-4 concise, actionable insights about growth trends, seasonality, appointment volume, and recommendations. Each insight should be 1-2 sentences. Return ONLY a JSON array of strings. No markdown.",
                },
                { role: "user", content: context },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            try {
              const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
              if (Array.isArray(parsed)) monthlyInsights = parsed;
            } catch {
              monthlyInsights = content
                .split("\n")
                .map((l: string) => l.replace(/^[-*•]\s*/, "").trim())
                .filter((l: string) => l.length > 10);
            }
          }
        }
      } catch (e: any) {
        console.error("Monthly AI insights error:", e);
      }

      // Fallback insights
      if (monthlyInsights.length === 0 && sortedMonths.length >= 2) {
        const momChange = lastMoMGrowth !== null ? lastMoMGrowth : 0;
        monthlyInsights = [
          `Revenue ${momChange >= 0 ? "grew" : "declined"} ${Math.abs(momChange).toFixed(1)}% month-over-month.`,
          `Revenue momentum is ${monthlyMomentum} based on recent monthly trends.`,
          `Projected baseline revenue over the next 3 months: $${projectedRevenue3m.toLocaleString()}.`,
        ];
      }

      return new Response(
        JSON.stringify({
          source: "computed",
          granularity: "monthly",
          monthlyActuals,
          monthlyScenarios,
          insights: monthlyInsights,
          summary: {
            momentum: monthlyMomentum,
            lastMoMGrowth,
            yoyGrowth: monthlyYoyGrowth,
            revenueSeasonalIndices: revSeasonalIdx,
            appointmentSeasonalIndices: txnSeasonalIdx,
            revenueTrendR2: revRegression.r2,
            appointmentTrendR2: txnRegression.r2,
            dataPoints: dailyData.length,
            monthsAvailable: sortedMonths.length,
            projectedRevenue3m,
            projectedRevenue6m,
            projectedRevenue12m,
            projectedAppointments3m,
            projectedAppointments6m,
            projectedAppointments12m,
          },
        }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ── Quarterly forecasting (existing logic) ─────────────────────────
    // Aggregate into quarters
    const quarterMap = new Map<string, QuarterData>();
    monthMap.forEach((m: any) => {
      const { year, q } = getQuarterFromDate(m.month + "-01");
      const label = getQuarterLabel(year, q);
      const existing = quarterMap.get(label);
      if (existing) {
        existing.totalRevenue += m.totalRevenue;
        existing.serviceRevenue += m.serviceRevenue;
        existing.productRevenue += m.productRevenue;
        existing.transactions += m.transactions;
        existing.months.push(m);
      } else {
        quarterMap.set(label, {
          quarter: label,
          year,
          q,
          totalRevenue: m.totalRevenue,
          serviceRevenue: m.serviceRevenue,
          productRevenue: m.productRevenue,
          transactions: m.transactions,
          months: [m],
        });
      }
    });

    const quarters = Array.from(quarterMap.values()).sort((a: any, b: any) => a.year * 10 + a.q - (b.year * 10 + b.q)
    );

    // Calculate growth rates
    const growthRates: number[] = [];
    for (let i = 1; i < quarters.length; i++) {
      const prev = quarters[i - 1].totalRevenue;
      const curr = quarters[i].totalRevenue;
      if (prev > 0) {
        growthRates.push(((curr - prev) / prev) * 100);
      }
    }

    // Linear regression on quarterly revenue
    const xs = quarters.map((_: any, i: any) => i);
    const ys = quarters.map((q: any) => q.totalRevenue);
    const regression = linearRegression(xs, ys);

    // Seasonal indices
    const seasonalIndices = calculateSeasonalIndices(quarters);

    // Momentum
    const momentum = determineMomentum(growthRates);

    // YoY growth
    const lastQuarter = quarters[quarters.length - 1];
    const sameQuarterLastYear = quarters.find((q: any) => q.q === lastQuarter?.q && q.year === (lastQuarter?.year || 0) - 1
    );
    const yoyGrowth =
      sameQuarterLastYear && sameQuarterLastYear.totalRevenue > 0
        ? ((lastQuarter.totalRevenue - sameQuarterLastYear.totalRevenue) / sameQuarterLastYear.totalRevenue) * 100
        : null;

    // Generate projections for next 4 quarters
    const now = new Date();
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();

    const projections: any[] = [];
    const scenarioMultipliers = {
      conservative: 0.85,
      baseline: 1.0,
      optimistic: 1.15,
    };

    for (let i = 1; i <= 4; i++) {
      let futureQ = currentQ + i;
      let futureYear = currentYear;
      while (futureQ > 4) {
        futureQ -= 4;
        futureYear += 1;
      }

      const trendValue = regression.slope * (quarters.length + i - 1) + regression.intercept;
      const seasonalAdj = seasonalIndices[futureQ] || 1;
      const baseProjection = Math.max(0, trendValue * seasonalAdj);

      for (const [scenario, multiplier] of Object.entries(scenarioMultipliers)) {
        const projected = baseProjection * multiplier;
        const qLabel = getQuarterLabel(futureYear, futureQ);
        const periodStart = `${futureYear}-${String((futureQ - 1) * 3 + 1).padStart(2, "0")}-01`;
        const endMonth = futureQ * 3;
        const periodEnd = `${futureYear}-${String(endMonth).padStart(2, "0")}-${endMonth === 2 ? "28" : ["04", "06", "09", "11"].includes(String(endMonth).padStart(2, "0")) ? "30" : "31"}`;

        const lastGrowthRate = growthRates.length > 0 ? growthRates[growthRates.length - 1] : 0;

        projections.push({
          organization_id: organizationId,
          location_id: locationId || null,
          forecast_type: "quarterly",
          period_label: qLabel,
          period_start: periodStart,
          period_end: periodEnd,
          scenario,
          projected_revenue: Math.round(projected * 100) / 100,
          projected_service_revenue: Math.round(projected * 0.7 * 100) / 100,
          projected_product_revenue: Math.round(projected * 0.3 * 100) / 100,
          growth_rate_qoq: lastGrowthRate * multiplier,
          growth_rate_yoy: yoyGrowth !== null ? yoyGrowth * multiplier : null,
          confidence_lower: Math.round(projected * 0.85 * 100) / 100,
          confidence_upper: Math.round(projected * 1.15 * 100) / 100,
          momentum,
          seasonality_index: seasonalAdj,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    // Generate AI insights
    let insights: string[] = [];
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY && quarters.length >= 2) {
        const context = `Historical quarterly revenue data for a salon/beauty business:
${quarters.map((q: any) => `${q.quarter}: $${q.totalRevenue.toLocaleString()} (services: $${q.serviceRevenue.toLocaleString()}, products: $${q.productRevenue.toLocaleString()})`).join("\n")}

QoQ growth rates: ${growthRates.map((r: any) => `${r.toFixed(1)}%`).join(", ")}
YoY growth: ${yoyGrowth !== null ? `${yoyGrowth.toFixed(1)}%` : "N/A"}
Momentum: ${momentum}
Seasonal indices: ${Object.entries(seasonalIndices).map(([q, idx]) => `Q${q}: ${idx.toFixed(2)}`).join(", ")}
Trend R²: ${regression.r2.toFixed(3)}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "You are a business analytics advisor for salon/beauty businesses. Given revenue data, provide 3-4 concise, actionable insights about growth trends, seasonality, and recommendations. Each insight should be 1-2 sentences. Return ONLY a JSON array of strings. No markdown.",
              },
              { role: "user", content: context },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          try {
            // Try parsing as JSON array
            const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
            if (Array.isArray(parsed)) {
              insights = parsed;
            }
          } catch {
            // If not valid JSON, split by newlines
            insights = content
              .split("\n")
              .map((l: string) => l.replace(/^[-*•]\s*/, "").trim())
              .filter((l: string) => l.length > 10);
          }
        }
      }
    } catch (e: any) {
      console.error("AI insights error:", e);
    }

    // Fallback insights if AI failed
    if (insights.length === 0 && quarters.length >= 2) {
      const lastQ = quarters[quarters.length - 1];
      const prevQ = quarters[quarters.length - 2];
      const qoqChange = prevQ.totalRevenue > 0 ? ((lastQ.totalRevenue - prevQ.totalRevenue) / prevQ.totalRevenue) * 100 : 0;

      insights = [
        `Revenue ${qoqChange >= 0 ? "grew" : "declined"} ${Math.abs(qoqChange).toFixed(1)}% last quarter (${lastQ.quarter}).`,
        `Revenue momentum is ${momentum} based on recent quarter trends.`,
        `${getQuarterLabel(currentYear, seasonalIndices[1] > seasonalIndices[3] ? 1 : 3)} tends to be your strongest quarter historically.`,
      ];
    }

    // Store projections with insights
    const projectionsWithInsights = projections.map((p: any) => ({
      ...p,
      insights: p.scenario === "baseline" ? insights : null,
    }));

    // Backfill accuracy on past forecasts where actuals are now available
    try {
      const { data: pastForecasts } = await supabase
        .from("growth_forecasts")
        .select("id, period_start, period_end, projected_revenue, scenario, actuals_revenue")
        .eq("organization_id", organizationId)
        .is("actuals_revenue", null)
        .lt("period_end", new Date().toISOString().split("T")[0]);

      if (pastForecasts && pastForecasts.length > 0) {
        for (const pf of pastForecasts) {
          // Sum actuals for that period from transaction items
          const periodItems: any[] = [];
          let pg = 0;
          while (true) {
            const { data: batch } = await supabase
              .from("phorest_transaction_items")
              .select("total_amount, tax_amount")
              .gte("transaction_date", pf.period_start)
              .lte("transaction_date", pf.period_end)
              .range(pg * 1000, (pg + 1) * 1000 - 1);
            if (!batch || batch.length === 0) break;
            periodItems.push(...batch);
            if (batch.length < 1000) break;
            pg++;
          }

          if (periodItems.length > 0) {
            const actualTotal = periodItems.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0) + (Number(r.tax_amount) || 0), 0);
            const projected = Number(pf.projected_revenue) || 1;
            const errorPct = Math.abs(actualTotal - projected) / projected * 100;
            const accuracy = Math.max(0, 100 - errorPct);

            await supabase
              .from("growth_forecasts")
              .update({ actuals_revenue: actualTotal, accuracy_pct: Math.round(accuracy * 100) / 100 })
              .eq("id", pf.id);
          }
        }
      }
    } catch (e: any) {
      console.error("Accuracy backfill error:", e);
    }

    // Build accuracy summary from all scored forecasts
    const { data: scoredForecasts } = await supabase
      .from("growth_forecasts")
      .select("period_label, scenario, projected_revenue, actuals_revenue, accuracy_pct")
      .eq("organization_id", organizationId)
      .eq("scenario", "baseline")
      .not("actuals_revenue", "is", null)
      .order("period_start", { ascending: true });

    const accuracyHistory = (scoredForecasts || []).map((f: any) => ({
      period: f.period_label,
      projected: Number(f.projected_revenue),
      actual: Number(f.actuals_revenue),
      accuracy: Number(f.accuracy_pct),
    }));

    const avgAccuracy = accuracyHistory.length > 0
      ? accuracyHistory.reduce((s: number, h: any) => s + h.accuracy, 0) / accuracyHistory.length
      : null;

    // Delete old expired forecasts and insert new ones
    await supabase
      .from("growth_forecasts")
      .delete()
      .eq("organization_id", organizationId)
      .lt("expires_at", new Date().toISOString())
      .is("actuals_revenue", null);

    if (projectionsWithInsights.length > 0) {
      const { error: insertError } = await supabase
        .from("growth_forecasts")
        .insert(projectionsWithInsights);

      if (insertError) {
        console.error("Error caching forecasts:", insertError);
      }
    }

    // Build actuals for the chart (past quarters)
    const actuals = quarters.map((q: any) => ({
      period: q.quarter,
      revenue: q.totalRevenue,
      serviceRevenue: q.serviceRevenue,
      productRevenue: q.productRevenue,
      type: "actual" as const,
    }));

    // Build response grouped by scenario
    const scenarios: Record<string, any[]> = {};
    projectionsWithInsights.forEach((p: any) => {
      if (!scenarios[p.scenario]) scenarios[p.scenario] = [];
      scenarios[p.scenario].push({
        period: p.period_label,
        revenue: p.projected_revenue,
        serviceRevenue: p.projected_service_revenue,
        productRevenue: p.projected_product_revenue,
        confidenceLower: p.confidence_lower,
        confidenceUpper: p.confidence_upper,
        type: "projected" as const,
      });
    });

    return new Response(
      JSON.stringify({
        source: "computed",
        actuals,
        scenarios,
        insights,
        accuracy: {
          history: accuracyHistory,
          average: avgAccuracy,
        },
        summary: {
          momentum,
          lastQoQGrowth: growthRates.length > 0 ? growthRates[growthRates.length - 1] : null,
          yoyGrowth,
          seasonalIndices,
          trendR2: regression.r2,
          dataPoints: dailyData.length,
          quartersAvailable: quarters.length,
          nextQuarterBaseline: projections.find((p: any) => p.scenario === "baseline")?.projected_revenue || 0,
          nextQuarterLabel: projections.find((p: any) => p.scenario === "baseline")?.period_label || "",
        },
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("growth-forecasting error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
