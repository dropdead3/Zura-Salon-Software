import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { AI_ASSISTANT_NAME_DEFAULT as AI_ASSISTANT_NAME } from "../_shared/brand.ts";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const CardAnalysisSchema = z.object({
  cardName: z.string().min(1).max(200),
  metricData: z.unknown().optional(),
  dateRange: z.string().max(50).optional(),
  locationName: z.string().max(200).optional(),
  organizationId: z.string().uuid(),
  organization_id: z.string().uuid().optional(),
});

const ROUTE_MAP = `
INTERNAL ROUTE REFERENCE — ONLY use these exact routes. NEVER invent or guess a route.
- Sales Analytics: /dashboard/admin/analytics?tab=sales
- Operations Analytics: /dashboard/admin/analytics?tab=operations
- Marketing Analytics: /dashboard/admin/analytics?tab=marketing
- Reports: /dashboard/admin/analytics?tab=reports
- Leaderboard: /dashboard/leaderboard
- Client Directory: /dashboard/clients
- Payroll Hub: /dashboard/admin/payroll
- Team Overview: /dashboard/admin/team
- Schedule: /dashboard/schedule
- Operations Hub: /dashboard/admin/management
- Phorest Connection: /dashboard/admin/phorest
- Day Rates: /dashboard/admin/day-rate-settings
- Settings: /dashboard/admin/settings
- Command Center: /dashboard
- My Stats: /dashboard/stats
- Inventory: /dashboard/inventory
- Renter Hub: /dashboard/admin/booth-renters
- Help Center: /dashboard/help
- Team Chat: /dashboard/team-chat
- Training: /dashboard/training
`;

function parseDateRange(dateRange?: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  switch (dateRange) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: yesterdayStr, to: yesterdayStr };
    case "7d":
    case "thisWeek": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    case "30d":
    case "thisMonth": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    case "lastMonth": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: d.toISOString().split("T")[0], to: e.toISOString().split("T")[0] };
    }
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { from: d.toISOString().split("T")[0], to: today };
    }
  }
}

async function fetchCardMetrics(
  supabase: ReturnType<typeof createClient>,
  cardName: string,
  dateRange: string | undefined,
  locationName: string | undefined
): Promise<Record<string, string | number>> {
  const { from, to } = parseDateRange(dateRange);
  const name = cardName.toLowerCase();

  // Resolve location_id from name if provided
  let locationId: string | undefined;
  if (locationName && locationName !== "All Locations") {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .ilike("name", locationName)
      .limit(1)
      .single();
    if (loc) locationId = loc.id;
  }

  try {
    // --- SALES OVERVIEW ---
    if (name.includes("sales overview") || name.includes("aggregate sales")) {
      let q = supabase
        .from("phorest_appointments")
        .select("total_price, service_name, status")
        .gte("appointment_date", from)
        .lte("appointment_date", to)
        .not("status", "eq", "cancelled");
      if (locationId) q = q.eq("location_id", locationId);
      const { data: appts } = await q;

      const totalRevenue = appts?.reduce((s, a) => s + (a.total_price || 0), 0) || 0;
      const serviceCount = appts?.length || 0;
      const avgTicket = serviceCount > 0 ? totalRevenue / serviceCount : 0;
      const completed = appts?.filter((a) => a.status === "completed").length || 0;

      return {
        "Total Revenue": `$${totalRevenue.toLocaleString()}`,
        "Total Appointments": serviceCount,
        "Completed": completed,
        "Average Ticket": `$${avgTicket.toFixed(2)}`,
        "Date Range": `${from} to ${to}`,
      };
    }

    // --- REVENUE TREND ---
    if (name.includes("revenue trend")) {
      let q = supabase
        .from("phorest_transaction_items")
        .select("transaction_date, total_amount, tax_amount")
        .gte("transaction_date", from)
        .lte("transaction_date", to)
        .order("transaction_date", { ascending: true });
      if (locationId) q = q.eq("location_id", locationId);
      const { data: trend } = await q;

      const dailyTotals: Record<string, number> = {};
      (trend || []).forEach((r: any) => {
        const d = r.transaction_date;
        if (!dailyTotals[d]) dailyTotals[d] = 0;
        dailyTotals[d] += (Number(r.total_amount) || 0) + (Number(r.tax_amount) || 0);
      });
      const total = Object.values(dailyTotals).reduce((s, v) => s + v, 0);
      const days = Object.keys(dailyTotals).length;
      const dailyAvg = days > 0 ? total / days : 0;

      return {
        "Total Revenue (Period)": `$${total.toLocaleString()}`,
        "Days with Data": days,
        "Daily Average": `$${dailyAvg.toFixed(2)}`,
        "Date Range": `${from} to ${to}`,
      };
    }

    // --- FORECASTING ---
    if (name.includes("forecast") || name.includes("week ahead")) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      let q = supabase
        .from("phorest_appointments")
        .select("total_price, appointment_date, status")
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .lte("appointment_date", futureDate.toISOString().split("T")[0])
        .not("status", "eq", "cancelled");
      if (locationId) q = q.eq("location_id", locationId);
      const { data: upcoming } = await q;

      const projectedRevenue = upcoming?.reduce((s, a) => s + (a.total_price || 0), 0) || 0;

      return {
        "Upcoming Appointments (7 days)": upcoming?.length || 0,
        "Projected Revenue": `$${projectedRevenue.toLocaleString()}`,
      };
    }

    // --- LOCATION COMPARISON ---
    if (name.includes("location comparison") || name.includes("location")) {
      const { data: locData } = await supabase
        .from("phorest_transaction_items")
        .select("location_id, total_amount, tax_amount")
        .gte("transaction_date", from)
        .lte("transaction_date", to);

      if (locData && locData.length > 0) {
        const byLoc: Record<string, number> = {};
        for (const r of locData) {
          byLoc[r.location_id || "unknown"] = (byLoc[r.location_id || "unknown"] || 0) + (Number(r.total_amount) || 0) + (Number(r.tax_amount) || 0);
        }
        const { data: locs } = await supabase.from("locations").select("id, name");
        const locNames = Object.fromEntries((locs || []).map((l) => [l.id, l.name]));
        const metrics: Record<string, string | number> = { "Date Range": `${from} to ${to}` };
        for (const [id, rev] of Object.entries(byLoc)) {
          metrics[locNames[id] || id] = `$${rev.toLocaleString()}`;
        }
        return metrics;
      }
      return { "Note": "No location revenue data found for this period" };
    }

    // --- PRODUCT CATEGORIES ---
    if (name.includes("product categor")) {
      let q = supabase
        .from("phorest_transaction_items")
        .select("category, total_price")
        .gte("transaction_date", from)
        .lte("transaction_date", to)
        .eq("item_type", "product");
      if (locationId) q = q.eq("location_id", locationId);
      const { data: items } = await q;

      if (items && items.length > 0) {
        const byCat: Record<string, number> = {};
        for (const i of items) {
          const cat = i.category || "Uncategorized";
          byCat[cat] = (byCat[cat] || 0) + (i.total_price || 0);
        }
        const metrics: Record<string, string | number> = { "Date Range": `${from} to ${to}` };
        for (const [cat, rev] of Object.entries(byCat)) {
          metrics[cat] = `$${rev.toLocaleString()}`;
        }
        return metrics;
      }
      return { "Note": "No product sales data found for this period" };
    }

    // --- SERVICE POPULARITY ---
    if (name.includes("service popularity") || name.includes("service")) {
      let q = supabase
        .from("phorest_appointments")
        .select("service_name")
        .gte("appointment_date", from)
        .lte("appointment_date", to)
        .not("status", "eq", "cancelled");
      if (locationId) q = q.eq("location_id", locationId);
      const { data: appts } = await q;

      if (appts && appts.length > 0) {
        const byService: Record<string, number> = {};
        for (const a of appts) {
          const svc = a.service_name || "Unknown";
          byService[svc] = (byService[svc] || 0) + 1;
        }
        const sorted = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const metrics: Record<string, string | number> = { "Date Range": `${from} to ${to}`, "Total Appointments": appts.length };
        for (const [svc, count] of sorted) {
          metrics[svc] = count;
        }
        return metrics;
      }
      return { "Note": "No service data found for this period" };
    }

    // --- CLIENT FUNNEL ---
    if (name.includes("client funnel") || name.includes("client")) {
      let q = supabase
        .from("phorest_appointments")
        .select("phorest_client_id, rebooked_at_checkout")
        .gte("appointment_date", from)
        .lte("appointment_date", to)
        .not("status", "eq", "cancelled");
      if (locationId) q = q.eq("location_id", locationId);
      const { data: appts } = await q;

      const uniqueClients = new Set(appts?.map((a) => a.phorest_client_id).filter(Boolean)).size;
      const rebooked = appts?.filter((a) => a.rebooked_at_checkout).length || 0;
      const rebookRate = appts && appts.length > 0 ? ((rebooked / appts.length) * 100).toFixed(1) : "0";

      return {
        "Unique Clients": uniqueClients,
        "Total Appointments": appts?.length || 0,
        "Rebooked at Checkout": rebooked,
        "Rebook Rate": `${rebookRate}%`,
        "Date Range": `${from} to ${to}`,
      };
    }

    // --- APPOINTMENTS SUMMARY ---
    if (name.includes("appointment")) {
      let q = supabase
        .from("phorest_appointments")
        .select("status")
        .gte("appointment_date", from)
        .lte("appointment_date", to);
      if (locationId) q = q.eq("location_id", locationId);
      const { data: appts } = await q;

      const total = appts?.length || 0;
      const completed = appts?.filter((a) => a.status === "completed").length || 0;
      const cancelled = appts?.filter((a) => a.status === "cancelled").length || 0;
      const noShow = appts?.filter((a) => a.status === "no_show").length || 0;

      return {
        "Total Appointments": total,
        "Completed": completed,
        "Cancelled": cancelled,
        "No-Shows": noShow,
        "No-Show Rate": total > 0 ? `${((noShow / total) * 100).toFixed(1)}%` : "0%",
        "Cancellation Rate": total > 0 ? `${((cancelled / total) * 100).toFixed(1)}%` : "0%",
        "Date Range": `${from} to ${to}`,
      };
    }

    // --- RETENTION METRICS ---
    if (name.includes("retention")) {
      const { data: clients, count } = await supabase
        .from("phorest_clients")
        .select("id", { count: "exact" });

      let q = supabase
        .from("phorest_appointments")
        .select("phorest_client_id")
        .gte("appointment_date", from)
        .lte("appointment_date", to)
        .not("status", "eq", "cancelled");
      if (locationId) q = q.eq("location_id", locationId);
      const { data: appts } = await q;

      const activeClients = new Set(appts?.map((a) => a.phorest_client_id).filter(Boolean)).size;
      const totalClients = count || 0;

      return {
        "Total Clients": totalClients,
        "Active Clients (Period)": activeClients,
        "Activity Rate": totalClients > 0 ? `${((activeClients / totalClients) * 100).toFixed(1)}%` : "0%",
        "Date Range": `${from} to ${to}`,
      };
    }

    // --- MARKETING ---
    if (name.includes("marketing") || name.includes("campaign") || name.includes("traffic") || name.includes("medium")) {
      const { data: analytics } = await supabase
        .from("marketing_analytics")
        .select("campaign_name, leads_generated, conversions, revenue_attributed, spend")
        .limit(20);

      if (analytics && analytics.length > 0) {
        const totalLeads = analytics.reduce((s, a) => s + (a.leads_generated || 0), 0);
        const totalConversions = analytics.reduce((s, a) => s + (a.conversions || 0), 0);
        const totalRevenue = analytics.reduce((s, a) => s + (a.revenue_attributed || 0), 0);
        const totalSpend = analytics.reduce((s, a) => s + (a.spend || 0), 0);

        return {
          "Total Leads": totalLeads,
          "Conversions": totalConversions,
          "Attributed Revenue": `$${totalRevenue.toLocaleString()}`,
          "Total Spend": `$${totalSpend.toLocaleString()}`,
          "Conversion Rate": totalLeads > 0 ? `${((totalConversions / totalLeads) * 100).toFixed(1)}%` : "0%",
        };
      }
      return { "Note": "No marketing data available" };
    }

    // --- CORRELATION ---
    if (name.includes("correlation")) {
      return { "Note": "Correlation analysis uses computed relationships between revenue, services, and products. Ask Zura for interpretation of the patterns shown." };
    }

    // --- CAPACITY / UTILIZATION ---
    if (name.includes("capacity") || name.includes("utilization") || name.includes("staff")) {
      let q = supabase
        .from("phorest_appointments")
        .select("staff_name, status, duration_minutes")
        .gte("appointment_date", from)
        .lte("appointment_date", to)
        .not("status", "eq", "cancelled");
      if (locationId) q = q.eq("location_id", locationId);
      const { data: appts } = await q;

      const totalMinutes = appts?.reduce((s, a) => s + (a.duration_minutes || 0), 0) || 0;
      const totalHours = (totalMinutes / 60).toFixed(1);
      const staffNames = new Set(appts?.map((a) => a.staff_name).filter(Boolean));

      return {
        "Total Booked Hours": totalHours,
        "Active Staff": staffNames.size,
        "Total Appointments": appts?.length || 0,
        "Date Range": `${from} to ${to}`,
      };
    }

    // --- PEAK HOURS ---
    if (name.includes("peak") || name.includes("heatmap")) {
      return { "Note": "Peak hours heatmap shows appointment density by day and hour. Ask Zura for staffing optimization suggestions." };
    }

    // --- COMMISSION ---
    if (name.includes("commission")) {
      return { "Note": "Commission data is calculated based on configured tier rates and stylist performance. Ask Zura for optimization insights." };
    }

    // --- GOALS ---
    if (name.includes("goal")) {
      return { "Note": "Goals are configured by the salon owner. Ask Zura how current performance compares to targets." };
    }

    // --- WEBSITE ANALYTICS ---
    if (name.includes("website")) {
      return { "Note": "Website analytics shows traffic and engagement data from your connected website." };
    }

    // --- FALLBACK ---
    let q = supabase
      .from("phorest_appointments")
      .select("total_price, status")
      .gte("appointment_date", from)
      .lte("appointment_date", to);
    if (locationId) q = q.eq("location_id", locationId);
    const { data: fallback } = await q;

    const totalRev = fallback?.reduce((s, a) => s + (a.total_price || 0), 0) || 0;

    return {
      "Recent Appointments": fallback?.length || 0,
      "Recent Revenue": `$${totalRev.toLocaleString()}`,
      "Date Range": `${from} to ${to}`,
    };
  } catch (err) {
    console.error("Error fetching card metrics:", err);
    return { "Note": "Unable to fetch live data for this card" };
  }
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
    } catch (authErr) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { user, supabaseAdmin } = authResult;

    const body = await validateBody(req, CardAnalysisSchema, getCorsHeaders(req));
    const { cardName, metricData, dateRange, locationName } = body;
    // Verify org access
    try {
      await requireOrgMember(supabaseAdmin, user.id, body.organizationId || body.organization_id);
    } catch (orgErr) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }


    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Determine metric data: use provided or fetch from DB
    let resolvedMetrics = metricData;
    const hasMetrics = metricData && Object.keys(metricData).length > 0;

    if (!hasMetrics) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey) as any;
        resolvedMetrics = await fetchCardMetrics(supabase, cardName, dateRange, locationName);
      }
    }

    const metricSummary = Object.entries(resolvedMetrics || {})
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const systemPrompt = `You are ${AI_ASSISTANT_NAME}, an AI analytics advisor for salon and beauty businesses. You explain metrics in plain, non-technical language suitable for salon owners, managers, and stylists.

When analyzing a card, you MUST:
1. Explain what this metric means in 1-2 sentences
2. Assess current performance (strong / average / needs attention)
3. Compare to typical salon industry benchmarks when applicable
4. Provide actionable recommendations in your markdown analysis

Keep the markdown analysis concise: 150-250 words max. Use markdown formatting (bold for emphasis, bullet points for recommendations).

IMPORTANT: After your markdown analysis, you MUST output a fenced JSON block with structured action items. This block must start with \`\`\`json:actions and end with \`\`\`. Each action item needs a title (short, verb-led), priority (high/medium/low), dueInDays (number), and details (explicit step-by-step instructions with numbered steps). Include 2-4 action items.

Example format:
\`\`\`json:actions
[
  { "title": "Review retail attachment rates", "priority": "high", "dueInDays": 3, "details": "1. Navigate to [Sales Analytics](/dashboard/admin/analytics?tab=sales)\\n2. Filter by last 30 days\\n3. Compare retail vs service revenue ratio\\n4. Identify top 3 stylists with lowest attachment rates\\n5. Schedule brief training on product recommendations" },
  { "title": "Audit no-show patterns", "priority": "medium", "dueInDays": 7, "details": "1. Go to [Client Directory](/dashboard/clients)\\n2. Sort by no-show count\\n3. Identify repeat offenders\\n4. Enable deposit requirements for those clients" }
]
\`\`\`

CRITICAL: If you include any internal links, you MUST only use routes from this reference. Never invent routes.
${ROUTE_MAP}

Salon industry context:
- Average ticket: $80-150 depending on services
- Healthy rebook rate: 60-80%
- No-show rate should be under 5%
- Retail attachment rate goal: 30%+ of service transactions
- Staff utilization target: 75-85%
- Client retention rate target: 60-70%`;

    const userMessage = `Analyze this analytics card:

**Card:** ${cardName}
${dateRange ? `**Date Range:** ${dateRange}` : ""}
${locationName ? `**Location:** ${locationName}` : ""}

**Current Metrics:**
${metricSummary || "No specific metric data provided"}

Provide a brief, insightful analysis.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }),
          { status: 402, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI analysis unavailable" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "Unable to generate analysis.";

    // Parse structured action items from the response
    let insightText = rawContent;
    let actionItems: Array<{ title: string; priority: string; dueInDays: number; details: string }> = [];

    const jsonMatch = rawContent.match(/```json:actions\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        actionItems = JSON.parse(jsonMatch[1]);
        // Remove the JSON block from the insight text
        insightText = rawContent.replace(/```json:actions\s*\n[\s\S]*?\n```/, '').trim();
      } catch (parseErr) {
        console.error("Failed to parse action items JSON:", parseErr);
        // Fall back to empty array, insight still displays
      }
    }

    return new Response(JSON.stringify({ insight: insightText, actionItems }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-card-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
