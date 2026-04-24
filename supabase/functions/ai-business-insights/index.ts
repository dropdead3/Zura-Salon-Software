import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { AI_ASSISTANT_NAME_DEFAULT as AI_ASSISTANT_NAME } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_HOURS = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!) as any;
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { forceRefresh, locationId } = await req.json().catch(() => ({}));

    // Get user's organization
    const { data: profile } = await supabase
      .from("employee_profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;

    // Check cache unless force refresh
    if (!forceRefresh) {
      let cacheQuery = supabase
        .from("ai_business_insights")
        .select("*")
        .eq("organization_id", orgId)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1);

      if (locationId) {
        cacheQuery = cacheQuery.eq("location_id", locationId);
      } else {
        cacheQuery = cacheQuery.is("location_id", null);
      }

      const { data: cached } = await cacheQuery;
      if (cached && cached.length > 0) {
        return new Response(JSON.stringify(cached[0]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Gather data from multiple sources in parallel
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86400000).toISOString().split("T")[0];
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

    const [
      salesRes,
      appointmentsRes,
      forecastsRes,
      anomaliesRes,
      suggestionsRes,
      staffRes,
      featureCatalogRes,
      orgFeaturesRes,
      payrollRes,
      phorestLocationsRes,
      highTicketRes,
      transactionItemsRes,
      // New: client retention cohorts
      atRiskClientsRes,
      lapsedClientsRes,
      newClientsRes,
      // New: staff performance breakdown (last 30 days)
      staffAppointmentsRes,
      // New: org info for multi-location
      orgInfoRes,
    ] = await Promise.all([
      // Recent sales (last 14 days) from transaction items
      supabase
        .from("phorest_transaction_items")
        .select("transaction_date, total_amount, tax_amount, item_type")
        .gte("transaction_date", twoWeeksAgo)
        .lte("transaction_date", today)
        .order("transaction_date", { ascending: false })
        .limit(1000),

      // Recent appointments (last 7 days + next 7 days)
      supabase
        .from("appointments")
        .select("appointment_date, status, staff_user_id, duration_minutes, total_price, rebooked_at_checkout, start_time, end_time")
        .gte("appointment_date", weekAgo)
        .lte("appointment_date", nextWeek)
        .limit(500),

      // Revenue forecasts (next 7 days)
      supabase
        .from("revenue_forecasts")
        .select("forecast_date, predicted_revenue, confidence_level, actual_revenue, forecast_type")
        .eq("organization_id", orgId)
        .gte("forecast_date", today)
        .lte("forecast_date", nextWeek)
        .limit(14),

      // Active anomalies (unacknowledged)
      supabase
        .from("detected_anomalies")
        .select("anomaly_type, severity, metric_value, expected_value, deviation_percent, detected_at, context")
        .eq("organization_id", orgId)
        .eq("is_acknowledged", false)
        .order("detected_at", { ascending: false })
        .limit(10),

      // Pending scheduling suggestions
      supabase
        .from("scheduling_suggestions")
        .select("suggestion_type, suggested_date, suggested_time, confidence_score, staff_user_id, context")
        .eq("organization_id", orgId)
        .is("was_accepted", null)
        .gte("suggested_date", today)
        .limit(10),

      // Active staff count
      supabase
        .from("employee_profiles")
        .select("user_id, display_name, is_active")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .limit(50),

      // Feature catalog (non-core features)
      supabase
        .from("feature_catalog")
        .select("feature_key, name, description, is_core, default_enabled")
        .eq("is_core", false),

      // Org feature overrides
      supabase
        .from("organization_features")
        .select("feature_key, is_enabled")
        .eq("organization_id", orgId),

      // Payroll connections
      supabase
        .from("payroll_connections")
        .select("provider, connection_status")
        .eq("organization_id", orgId)
        .maybeSingle(),

      // Phorest-connected locations
      supabase
        .from("locations")
        .select("id, phorest_branch_id, name")
        .eq("organization_id", orgId)
        .not("phorest_branch_id", "is", null),

      // High-ticket appointments (last 30 days)
      supabase
        .from("appointments")
        .select("total_price, status")
        .gte("appointment_date", thirtyDaysAgo)
        .lte("appointment_date", today)
        .in("status", ["completed", "checked_in", "in_progress"])
        .limit(1000),

      // Transaction items breakdown (last 30 days)
      supabase
        .from("phorest_transaction_items")
        .select("item_name, item_type, total_amount, transaction_id, quantity")
        .gte("transaction_date", thirtyDaysAgo)
        .lte("transaction_date", today)
        .limit(2000),

      // CLIENT RETENTION: At-risk (45-90 days since last visit)
      supabase
        .from("phorest_clients")
        .select("id, total_spend, last_visit_date", { count: "exact", head: false })
        .eq("is_duplicate", false)
        .gte("last_visit_date", ninetyDaysAgo)
        .lt("last_visit_date", fortyFiveDaysAgo)
        .limit(1000),

      // CLIENT RETENTION: Lapsed (90+ days)
      supabase
        .from("phorest_clients")
        .select("id, total_spend", { count: "exact", head: false })
        .eq("is_duplicate", false)
        .lt("last_visit_date", ninetyDaysAgo)
        .limit(1000),

      // CLIENT RETENTION: New clients (last 30 days)
      supabase
        .from("phorest_clients")
        .select("id", { count: "exact", head: true })
        .eq("is_duplicate", false)
        .gte("first_visit", thirtyDaysAgo),

      // STAFF PERFORMANCE: appointments by staff (last 30 days)
      supabase
        .from("phorest_appointments")
        .select("phorest_staff_id, total_price, status, rebooked_at_checkout")
        .gte("appointment_date", thirtyDaysAgo)
        .lte("appointment_date", today)
        .not("phorest_staff_id", "is", null)
        .limit(3000),

      // Org info for multi-location flag
      supabase
        .from("organizations")
        .select("is_multi_location")
        .eq("id", orgId)
        .single(),
    ]);

    // Build data summary for the AI
    const salesData = salesRes.data || [];
    const appointments = appointmentsRes.data || [];
    const forecasts = forecastsRes.data || [];
    const anomalies = anomaliesRes.data || [];
    const suggestions = suggestionsRes.data || [];
    const staff = staffRes.data || [];
    const featureCatalog = featureCatalogRes.data || [];
    const orgFeatures = orgFeaturesRes.data || [];
    const payrollConnection = payrollRes.data;
    const phorestLocations = phorestLocationsRes.data || [];
    const highTicketAppts = highTicketRes.data || [];
    const transactionItems = (transactionItemsRes.data || []) as any[];

    // Build adoption gaps
    const orgFeatureMap = new Map((orgFeatures as any[]).map((f: any) => [f.feature_key, f.is_enabled]));
    const unusedFeatures = (featureCatalog as any[]).filter((f: any) => {
      const override = orgFeatureMap.get(f.feature_key);
      if (override === false) return true; // explicitly disabled
      if (override === undefined && !f.default_enabled) return true; // not enabled by default and no override
      return false;
    });

    const unusedIntegrations: string[] = [];
    if (!payrollConnection || payrollConnection.connection_status !== 'connected') {
      unusedIntegrations.push('Payroll (Gusto or QuickBooks) - Automate payroll, tax filing, and direct deposits');
    }
    if (phorestLocations.length === 0) {
      unusedIntegrations.push('Phorest POS - Sync appointments, clients, and sales data automatically');
    }

    const adoptionContext = `
UNUSED FEATURES & INTEGRATIONS:
${unusedFeatures.length > 0 ? unusedFeatures.map((f: any) => `  - ${f.name} (key: feature:${f.feature_key}): ${f.description}`).join("\n") : "All available features are enabled."}
${unusedIntegrations.length > 0 ? `\nUnconnected Integrations:\n${unusedIntegrations.map((i: any) => `  - ${i}`).join("\n")}` : "\nAll key integrations are connected."}
`;

    // Pre-compute key metrics
    const pastAppointments = appointments.filter((a: any) => a.appointment_date <= today);
    const futureAppointments = appointments.filter((a: any) => a.appointment_date > today);
    const cancelledCount = pastAppointments.filter((a: any) => a.status === "cancelled").length;
    const noShowCount = pastAppointments.filter((a: any) => a.status === "no_show").length;
    const completedCount = pastAppointments.filter((a: any) => a.status === "completed").length;
    const totalPast = pastAppointments.length;
    const rebookedCount = pastAppointments.filter((a: any) => a.rebooked_at_checkout).length;

    // Sales aggregates derived inline from transaction_items rows.
    // (Previously this read from `daily_sales_summary` which used different
    // column names — `summary_date`, `total_revenue`, etc. After the pivot to
    // `phorest_transaction_items` as the canonical sales source, those refs
    // were broken. We now compute the same aggregates from the line items.)
    interface DailyAgg { revenue: number; transactionIds: Set<string> }
    const dailyAggs = new Map<string, DailyAgg>();
    for (const row of salesData as Array<any>) {
      const date = row.transaction_date as string;
      if (!date) continue;
      const agg = dailyAggs.get(date) ?? { revenue: 0, transactionIds: new Set<string>() };
      agg.revenue += (Number(row.total_amount) || 0) + (Number(row.tax_amount) || 0);
      if (row.transaction_id) agg.transactionIds.add(String(row.transaction_id));
      dailyAggs.set(date, agg);
    }
    const dailySales = Array.from(dailyAggs.entries())
      .map(([date, agg]) => ({
        summary_date: date,
        total_revenue: agg.revenue,
        total_transactions: agg.transactionIds.size,
        average_ticket: agg.transactionIds.size > 0 ? agg.revenue / agg.transactionIds.size : 0,
      }))
      .sort((a: any, b: any) => b.summary_date.localeCompare(a.summary_date));

    const thisWeekSales = dailySales.filter((s: any) => s.summary_date >= weekAgo);
    const lastWeekSales = dailySales.filter((s: any) => s.summary_date < weekAgo);
    const thisWeekRevenue = thisWeekSales.reduce((sum: any, s: any) => sum + s.total_revenue, 0);
    const lastWeekRevenue = lastWeekSales.reduce((sum: any, s: any) => sum + s.total_revenue, 0);

    // High-ticket & retail metrics (last 30 days)
    const totalCompleted30d = highTicketAppts.length;
    const highTicketCount = highTicketAppts.filter((a: any) => (a.total_price || 0) >= 500).length;
    const highTicketPct = totalCompleted30d > 0 ? ((highTicketCount / totalCompleted30d) * 100).toFixed(1) : "0";
    const totalApptRevenue30d = highTicketAppts.reduce((sum: number, a: any) => sum + (a.total_price || 0), 0);
    const avgTicket30d = totalCompleted30d > 0 ? (totalApptRevenue30d / totalCompleted30d).toFixed(0) : "0";

    // Extension & color correction detection
    const extensionPatterns = /\b(extension|install|tape.?in|hand.?tied|weft|sew.?in|i.?tip|k.?tip|fusion|nbr|great\s?lengths|bellami|hair\s?dreams)\b/i;
    const colorCorrectionPatterns = /\b(color\s?correct|corrective\s?color|colour\s?correct)\b/i;

    let productRevenue30d = 0;
    let serviceRevenue30d = 0;
    let extensionCount = 0;
    let extensionRevenue = 0;
    let colorCorrectionCount = 0;
    let colorCorrectionRevenue = 0;
    const serviceTransactionIds = new Set<string>();
    const productTransactionIds = new Set<string>();

    for (const item of transactionItems) {
      const amount = Number(item.total_amount) || 0;
      if (item.item_type === 'product') {
        productRevenue30d += amount;
        if (item.transaction_id) productTransactionIds.add(item.transaction_id);
      } else {
        serviceRevenue30d += amount;
        if (item.transaction_id) serviceTransactionIds.add(item.transaction_id);
        // Check for extension services
        if (extensionPatterns.test(item.item_name || '')) {
          extensionCount++;
          extensionRevenue += amount;
        }
        // Check for color correction services
        if (colorCorrectionPatterns.test(item.item_name || '')) {
          colorCorrectionCount++;
          colorCorrectionRevenue += amount;
        }
      }
    }

    // Product attachment rate: % of service transactions that also include a product
    let attachmentRate = 0;
    if (serviceTransactionIds.size > 0) {
      let withProduct = 0;
      for (const txId of serviceTransactionIds) {
        if (productTransactionIds.has(txId)) withProduct++;
      }
      attachmentRate = (withProduct / serviceTransactionIds.size) * 100;
    }
    const totalItemRevenue = productRevenue30d + serviceRevenue30d;
    const productPct = totalItemRevenue > 0 ? ((productRevenue30d / totalItemRevenue) * 100).toFixed(1) : "0";

    // ─── CLIENT RETENTION COHORTS ───
    const atRiskClients = atRiskClientsRes.data || [];
    const lapsedClients = lapsedClientsRes.data || [];
    const newClientCount = newClientsRes.count ?? 0;
    const atRiskCount = atRiskClients.length;
    const lapsedCount = lapsedClients.length;
    const atRiskAvgSpend = atRiskCount > 0 ? atRiskClients.reduce((s: number, c: any) => s + (Number(c.total_spend) || 0), 0) / atRiskCount : 0;
    const lapsedTotalSpend = lapsedClients.reduce((s: number, c: any) => s + (Number(c.total_spend) || 0), 0);

    // ─── STAFF PERFORMANCE BREAKDOWN ───
    const staffAppts = (staffAppointmentsRes.data || []) as any[];
    const staffMetrics: Record<string, { name: string; completed: number; revenue: number; rebooked: number }> = {};
    // Build staff name lookup from employee_profiles
    const staffNameMap = new Map((staff as any[]).map((s: any) => [s.user_id, s.display_name || 'Unknown']));

    // Get phorest staff mapping for joining
    const { data: staffMappings } = await supabase
      .from("phorest_staff_mapping")
      .select("phorest_staff_id, user_id")
      .eq("is_active", true);
    const phorestToUser = new Map<string, string>((staffMappings || []).map((m: any) => [m.phorest_staff_id, m.user_id] as [string, string]));

    for (const apt of staffAppts) {
      const userId = phorestToUser.get(apt.phorest_staff_id);
      if (!userId) continue;
      if (!staffMetrics[userId]) {
        staffMetrics[userId] = { name: staffNameMap.get(userId) || 'Unknown', completed: 0, revenue: 0, rebooked: 0 };
      }
      if (apt.status === 'completed') {
        staffMetrics[userId].completed++;
        staffMetrics[userId].revenue += Number(apt.total_price) || 0;
        if (apt.rebooked_at_checkout) staffMetrics[userId].rebooked++;
      }
    }
    const staffList = Object.values(staffMetrics).filter((s: any) => s.completed > 0);
    staffList.sort((a: any, b: any) => b.revenue - a.revenue);
    const top3Staff = staffList.slice(0, 3);
    const bottom3Staff = staffList.length > 3 ? staffList.slice(-3).reverse() : [];
    const teamAvgRebook = staffList.length > 0
      ? staffList.reduce((s: any, st: any) => s + (st.completed > 0 ? st.rebooked / st.completed : 0), 0) / staffList.length * 100
      : 0;

    // ─── DAY-OF-WEEK PATTERNS ───
    const dowCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const pastCompletedAppts = pastAppointments.filter((a: any) => a.status === 'completed');
    for (const apt of pastCompletedAppts) {
      const dow = new Date(apt.appointment_date + 'T12:00:00').getDay();
      dowCounts[dow]++;
    }
    const weeksInRange = Math.max(1, Math.ceil((new Date(today).getTime() - new Date(weekAgo).getTime()) / (7 * 86400000)));

    // ─── WEEK-OVER-WEEK DELTAS ───
    const thisWeekAppts = appointments.filter((a: any) => a.appointment_date >= weekAgo && a.appointment_date <= today);
    const lastWeekAppts = appointments.filter((a: any) => a.appointment_date >= twoWeeksAgo && a.appointment_date < weekAgo);

    const wowMetrics = (appts: any[]) => {
      const total = appts.length;
      const cancelled = appts.filter((a: any) => a.status === 'cancelled').length;
      const noShow = appts.filter((a: any) => a.status === 'no_show').length;
      const completed = appts.filter((a: any) => a.status === 'completed').length;
      const rebooked = appts.filter((a: any) => a.rebooked_at_checkout).length;
      return {
        total,
        cancelRate: total > 0 ? (cancelled / total * 100) : 0,
        noShowRate: total > 0 ? (noShow / total * 100) : 0,
        rebookRate: completed > 0 ? (rebooked / completed * 100) : 0,
      };
    };
    const thisWeekMetrics = wowMetrics(thisWeekAppts);
    const lastWeekMetrics = wowMetrics(lastWeekAppts);

    // ─── LOCATION COMPARISON (multi-location only) ───
    const isMultiLocation = orgInfoRes.data?.is_multi_location === true;
    const locations = phorestLocationsRes.data || [];
    let locationComparisonContext = '';

    if (isMultiLocation && locations.length > 1 && !locationId) {
      // Fetch per-location appointment summary for last 30 days
      const { data: locationAppts } = await supabase
        .from("phorest_appointments")
        .select("location_id, total_price, status, rebooked_at_checkout")
        .gte("appointment_date", thirtyDaysAgo)
        .lte("appointment_date", today)
        .limit(5000);

      if (locationAppts && locationAppts.length > 0) {
        const locMap: Record<string, { name: string; completed: number; revenue: number; rebooked: number; cancelled: number; total: number }> = {};
        const locNameMap = new Map((locations as any[]).map((l: any) => [l.id, l.name || l.id]));

        for (const apt of locationAppts as any[]) {
          const lid = apt.location_id;
          if (!lid) continue;
          if (!locMap[lid]) locMap[lid] = { name: locNameMap.get(lid) || lid, completed: 0, revenue: 0, rebooked: 0, cancelled: 0, total: 0 };
          locMap[lid].total++;
          if (apt.status === 'completed') {
            locMap[lid].completed++;
            locMap[lid].revenue += Number(apt.total_price) || 0;
            if (apt.rebooked_at_checkout) locMap[lid].rebooked++;
          }
          if (apt.status === 'cancelled') locMap[lid].cancelled++;
        }

        locationComparisonContext = `\nCROSS-LOCATION COMPARISON (Last 30 days):\n` +
          Object.values(locMap).map((l: any) =>
            `  ${l.name}: ${l.completed} completed, $${l.revenue.toFixed(0)} revenue, ` +
            `rebook ${l.completed > 0 ? (l.rebooked / l.completed * 100).toFixed(1) : '0'}%, ` +
            `cancel ${l.total > 0 ? (l.cancelled / l.total * 100).toFixed(1) : '0'}%`
          ).join('\n');
      }
    }

    const dataContext = `
BUSINESS DATA SNAPSHOT (as of ${today}):

REVENUE (Last 14 days):
- This week total: $${thisWeekRevenue.toFixed(0)}
- Last week total: $${lastWeekRevenue.toFixed(0)}
- Week-over-week change: ${lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100).toFixed(1) : "N/A"}%
- Daily sales entries: ${dailySales.length}
${dailySales.slice(0, 7).map((s: any) => `  ${s.summary_date}: $${s.total_revenue.toFixed(0)} (${s.total_transactions} transactions, avg ticket $${s.average_ticket.toFixed(0)})`).join("\n")}

APPOINTMENTS (Last 7 + Next 7 days):
- Total past week: ${totalPast}
- Completed: ${completedCount}
- Cancelled: ${cancelledCount} (${totalPast > 0 ? ((cancelledCount / totalPast) * 100).toFixed(1) : 0}%)
- No-shows: ${noShowCount} (${totalPast > 0 ? ((noShowCount / totalPast) * 100).toFixed(1) : 0}%)
- Rebooked at checkout: ${rebookedCount} (${completedCount > 0 ? ((rebookedCount / completedCount) * 100).toFixed(1) : 0}%)
- Upcoming next 7 days: ${futureAppointments.length}

WEEK-OVER-WEEK DELTAS:
- Appointments: ${thisWeekMetrics.total} vs ${lastWeekMetrics.total} (${lastWeekMetrics.total > 0 ? ((thisWeekMetrics.total - lastWeekMetrics.total) / lastWeekMetrics.total * 100).toFixed(1) : 'N/A'}%)
- Cancel rate: ${thisWeekMetrics.cancelRate.toFixed(1)}% vs ${lastWeekMetrics.cancelRate.toFixed(1)}% last week
- No-show rate: ${thisWeekMetrics.noShowRate.toFixed(1)}% vs ${lastWeekMetrics.noShowRate.toFixed(1)}% last week
- Rebook rate: ${thisWeekMetrics.rebookRate.toFixed(1)}% vs ${lastWeekMetrics.rebookRate.toFixed(1)}% last week

STAFF:
- Active team members: ${staff.length}

STAFF PERFORMANCE BREAKDOWN (Last 30 days):
- Team average rebook rate: ${teamAvgRebook.toFixed(1)}%
${top3Staff.length > 0 ? `Top performers:\n${top3Staff.map((s: any) => `  ${s.name}: ${s.completed} completed, $${s.revenue.toFixed(0)} revenue, ${s.completed > 0 ? (s.rebooked / s.completed * 100).toFixed(1) : '0'}% rebook`).join('\n')}` : 'Insufficient staff data for rankings.'}
${bottom3Staff.length > 0 ? `\nNeeds attention:\n${bottom3Staff.map((s: any) => `  ${s.name}: ${s.completed} completed, $${s.revenue.toFixed(0)} revenue, ${s.completed > 0 ? (s.rebooked / s.completed * 100).toFixed(1) : '0'}% rebook`).join('\n')}` : ''}

CLIENT RETENTION HEALTH:
- At-risk clients (45-90 days since last visit): ${atRiskCount} (avg lifetime spend: $${atRiskAvgSpend.toFixed(0)})
- Lapsed clients (90+ days): ${lapsedCount} (total historical spend: $${lapsedTotalSpend.toFixed(0)})
- New clients (last 30 days): ${newClientCount}
${atRiskCount > 0 ? `- Estimated at-risk revenue: ~$${(atRiskCount * atRiskAvgSpend * 0.3).toFixed(0)}/mo if lost` : ''}

DAY-OF-WEEK PATTERNS (Last week):
${Object.entries(dowCounts).map(([dow, count]) => `  ${dowNames[Number(dow)]}: ${count} appointments (avg ${(count / weeksInRange).toFixed(1)}/week)`).join('\n')}

REVENUE FORECASTS (Next 7 days):
${forecasts.length > 0 ? forecasts.map((f: any) => `  ${f.forecast_date}: $${f.predicted_revenue} (${f.confidence_level} confidence)${f.actual_revenue ? ` | Actual: $${f.actual_revenue}` : ""}`).join("\n") : "No forecasts available"}

ACTIVE ANOMALIES (Unacknowledged):
${anomalies.length > 0 ? anomalies.map((a: any) => `  ${a.anomaly_type} (${a.severity}): value=${a.metric_value}, expected=${a.expected_value}, deviation=${a.deviation_percent}%`).join("\n") : "No active anomalies"}

SCHEDULING SUGGESTIONS (Pending):
${suggestions.length > 0 ? suggestions.map((s: any) => `  ${s.suggestion_type}: ${s.suggested_date} at ${s.suggested_time} (confidence: ${s.confidence_score})`).join("\n") : "No pending suggestions"}

HIGH-TICKET & RETAIL ANALYSIS (Last 30 days):
- Total completed appointments: ${totalCompleted30d}
- High-ticket appointments ($500+): ${highTicketCount} (${highTicketPct}%)
- Extension services: ${extensionCount} appointments, $${extensionRevenue.toFixed(0)} revenue
- Color correction services: ${colorCorrectionCount} appointments, $${colorCorrectionRevenue.toFixed(0)} revenue
- Product/retail revenue: $${productRevenue30d.toFixed(0)} (${productPct}% of total transaction item revenue)
- Service revenue (from transaction items): $${serviceRevenue30d.toFixed(0)}
- Product attachment rate: ${attachmentRate.toFixed(1)}% of service transactions included retail
- Average ticket (from appointments): $${avgTicket30d}
${locationComparisonContext}
`;

    // Call Lovable AI with tool calling for structured output
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `You are ${AI_ASSISTANT_NAME}, a salon business intelligence analyst with deep expertise in salon revenue optimization. You are the AI brain behind the salon's analytics dashboard. When users interact with you, they may address you as "${AI_ASSISTANT_NAME}". Analyze the provided business data and generate actionable insights for salon owners. Be specific with numbers and percentages. Focus on what matters most RIGHT NOW. Be concise but insightful. If data is limited or zeros, acknowledge it and suggest what to look for as data accumulates. Do NOT fabricate data that isn't in the snapshot.

INTERNAL ROUTE REFERENCE — When writing insight descriptions or action items, embed markdown hyperlinks to relevant platform pages so users can navigate directly. Use these routes:
- Sales Analytics: /dashboard/admin/analytics?tab=sales
- Operations Analytics: /dashboard/admin/analytics?tab=operations
- Marketing Analytics: /dashboard/admin/analytics?tab=marketing
- Reports: /dashboard/admin/analytics?tab=reports
- Leaderboard: /dashboard/admin/leaderboard
- Payroll Hub: /dashboard/admin/payroll
- Client Directory: /dashboard/admin/clients
- Team Overview: /dashboard/admin/team
- Schedule: /dashboard/schedule
- Inventory: /dashboard/admin/inventory
- My Stats: /dashboard/my-stats
- My Pay: /dashboard/my-pay
- Command Center: /dashboard

Example usage in descriptions: "Your rebooking rate dropped — review trends in [Sales Analytics](/dashboard/admin/analytics?tab=sales)" or "Check [Team Overview](/dashboard/admin/team) for utilization gaps."
Only link when contextually relevant; don't force links.

CRITICAL REVENUE GROWTH EXPERTISE:
You understand that the #1 lever for salon profitability is increasing average ticket spend. The three pillars are:
1. **Extensions & High-Value Hair Services**: Extension installations (tape-in, hand-tied, weft, sew-in, i-tip, k-tip, fusion, NBR), extension maintenance, and hair retail/extension packages are the single highest revenue-per-appointment services in the salon industry. A single extension appointment typically generates $500-$2,000+. If extension revenue is absent or very low, this is THE major growth opportunity to flag — recommend the salon consider adding or expanding extension services, training staff, or partnering with extension brands.
2. **Color Correction**: Color correction is a premium, high-margin service category ($300-$800+ per appointment). Low volume here may indicate an opportunity to market corrective services or upskill stylists.
3. **Retail/Product Sales**: Industry benchmark for retail attachment rate is 30%+. If the product attachment rate is below 30%, this is a significant missed revenue opportunity. Recommend specific retail sales strategies (prescriptive selling, checkout prompts, product education).

THRESHOLDS TO FLAG:
- If high-ticket appointments ($500+) are under 15% of total completed appointments, recommend service menu expansion, pricing strategies, or extension/color correction service additions.
- If product attachment rate is below 30%, flag this as a priority and suggest retail training, checkout product recommendations, or incentive programs.
- If extension services show zero or minimal revenue, proactively recommend this as the single biggest growth opportunity available.

Additionally, review the UNUSED FEATURES & INTEGRATIONS section. Based on the business data patterns, identify 2-4 of the most impactful unused features or integrations that would benefit this business. For each, explain WHY it would help based on the specific data you see, and HOW to get started. Use the suggestionKey format "feature:<key>" for features and "integration:<name>" for integrations.

Also generate 3-5 specific, actionable checkbox-style tasks (suggestedTasks) the owner can complete based on the data patterns. These should be concrete and completable (e.g., "Review and reach out to 5 clients who haven't visited in 60+ days") rather than vague recommendations. Assign a priority and optionally a number of days from now when it should be due.

ENRICHMENT RULES FOR EVERY INSIGHT:
- estimatedImpact: For every insight, estimate the weekly or monthly dollar impact using actual numbers from the data snapshot. Frame as loss ('~$X/wk lost') or opportunity ('~$X/mo opportunity'). Set to null only if the data truly cannot support a reasonable estimate.
- trendDirection: Set by comparing this week vs last week for the relevant metric. Use "improving", "declining", or "stable". Null only if insufficient historical data.
- comparisonContext: Cite industry benchmarks or the salon's own historical average. Key benchmarks: rebooking rate 65%, retail attachment 30%, no-show rate <5%, cancellation <10%, average ticket varies by market. Format: "Industry avg: X% · You: Y%" or "Last week: $X · This week: $Y".
- actByDate: Set for insights where delay worsens the problem (cancellation spikes, no-show patterns, capacity gaps, revenue drops). Use 'Today', 'Within 3 days', 'This week', or 'This month'. Null for informational insights without time pressure.
- effortLevel: Tag "quick_win" for actions completable in one session (<30 min), "strategic" for multi-week initiatives requiring planning or training. Null if ambiguous.
- staffMentions: When specific staff members are underperforming or excelling on the relevant metric, include their display_name (max 3). Cross-reference staff data with appointments. Null if insight is org-wide without staff-specific relevance.`,
          },
          {
            role: "user",
            content: `Analyze this salon business data and provide insights:\n\n${dataContext}\n\n${adoptionContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "deliver_business_insights",
              description: "Return structured business insights for a salon dashboard.",
              parameters: {
                type: "object",
                properties: {
                  summaryLine: {
                    type: "string",
                    description: "One-sentence executive summary of overall business health.",
                  },
                  overallSentiment: {
                    type: "string",
                    enum: ["positive", "neutral", "concerning"],
                    description: "Overall business health sentiment.",
                  },
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: [
                            "revenue_pulse",
                            "cash_flow",
                            "capacity",
                            "staffing",
                            "client_health",
                            "anomaly",
                          ],
                        },
                        title: { type: "string", description: "Short title (5-8 words)" },
                        description: {
                          type: "string",
                          description: "Insight details (1-2 sentences, include specific numbers)",
                        },
                        severity: {
                          type: "string",
                          enum: ["info", "warning", "critical"],
                        },
                        estimatedImpact: {
                          type: ["string", "null"],
                          description: "Dollar impact estimate, e.g. '~$2,246/wk lost' or '~$800/mo opportunity'. Null if not quantifiable.",
                        },
                        trendDirection: {
                          type: ["string", "null"],
                          enum: ["improving", "declining", "stable", null],
                          description: "Trend based on week-over-week or period comparison.",
                        },
                        comparisonContext: {
                          type: ["string", "null"],
                          description: "Benchmark comparison, e.g. 'Industry avg: 30% · You: 17%'. Null if no benchmark applies.",
                        },
                        actByDate: {
                          type: ["string", "null"],
                          description: "Urgency framing: 'Today', 'Within 3 days', 'This week', or 'This month'. Null if not time-sensitive.",
                        },
                        effortLevel: {
                          type: ["string", "null"],
                          enum: ["quick_win", "strategic", null],
                          description: "quick_win = completable in <30 min, strategic = multi-week initiative.",
                        },
                        staffMentions: {
                          type: ["array", "null"],
                          items: { type: "string" },
                          description: "Display names of up to 3 staff members relevant to this insight. Null if not staff-specific.",
                        },
                      },
                      required: ["category", "title", "description", "severity"],
                      additionalProperties: false,
                    },
                  },
                  actionItems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: {
                          type: "string",
                          description: "Specific action the owner can take today",
                        },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                      },
                      required: ["action", "priority"],
                      additionalProperties: false,
                    },
                  },
                  featureSuggestions: {
                    type: "array",
                    description: "2-4 suggestions for unused features/integrations that would benefit this business.",
                    items: {
                      type: "object",
                      properties: {
                        suggestionKey: {
                          type: "string",
                          description: "Unique key like 'feature:loyalty_program' or 'integration:payroll'",
                        },
                        featureName: {
                          type: "string",
                          description: "Display name of the feature or integration",
                        },
                        whyItHelps: {
                          type: "string",
                          description: "1-2 sentences on business value based on the data patterns",
                        },
                        howToStart: {
                          type: "string",
                          description: "Brief getting-started guidance",
                        },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                      },
                      required: ["suggestionKey", "featureName", "whyItHelps", "howToStart", "priority"],
                      additionalProperties: false,
                    },
                  },
                  suggestedTasks: {
                    type: "array",
                    description: "3-5 specific, actionable checkbox-style tasks the owner can complete based on data patterns.",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description: "Clear, actionable task title that is concrete and completable",
                        },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                        dueInDays: {
                          type: ["number", "null"],
                          description: "Suggested number of days from now for due date, or null if no specific deadline",
                        },
                      },
                      required: ["title", "priority", "dueInDays"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summaryLine", "overallSentiment", "insights", "actionItems", "featureSuggestions", "suggestedTasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "deliver_business_insights" },
        },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate insights" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let insights;

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        insights = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error("No tool call in response");
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI insights" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Pre-computed dollar impacts for deterministic scoring ───
    const avgTicketNum = Number(avgTicket30d) || 0;
    const rebookRate = completedCount > 0 ? rebookedCount / completedCount : 0;
    const rebookingGap = completedCount > 0 ? Math.round((0.65 - rebookRate) * completedCount * avgTicketNum * 0.25) : 0; // weekly est
    const retailGap = attachmentRate < 30 ? Math.round((0.30 - attachmentRate / 100) * serviceTransactionIds.size * 15) : 0; // avg retail $15
    const cancellationLoss = Math.round(cancelledCount * avgTicketNum);

    const preComputedImpacts: Record<string, { numeric: number; type: string }> = {
      revenue_pulse: { numeric: Math.max(rebookingGap, 0), type: rebookingGap > 0 ? 'at_risk' : 'opportunity' },
      client_health: { numeric: Math.max(rebookingGap, 0), type: 'at_risk' },
      cash_flow: { numeric: cancellationLoss, type: 'at_risk' },
      capacity: { numeric: Math.round((staff.length * 8 - (completedCount / 7)) * avgTicketNum * 0.3), type: 'inefficiency' },
      staffing: { numeric: Math.round((staff.length * 8 - (completedCount / 7)) * avgTicketNum * 0.2), type: 'inefficiency' },
      anomaly: { numeric: 0, type: 'at_risk' },
    };

    // ─── Deterministic priority scoring (post-AI) ───
    const timeSensitivityWeight: Record<string, number> = {
      'Today': 1.0,
      'Within 3 days': 0.85,
      'This week': 0.7,
      'This month': 0.4,
    };

    const severityToUrgency: Record<string, number> = { critical: 90, warning: 60, info: 30 };
    const effortToScore: Record<string, number> = { quick_win: 2, strategic: 4 };

    // Find max impact for normalization
    const allImpacts = (insights.insights || []).map((ins: any) => {
      const preComputed = preComputedImpacts[ins.category];
      return preComputed?.numeric || 0;
    });
    const maxImpact = Math.max(...allImpacts, 1);

    // Enrich each insight with deterministic scores
    insights.insights = (insights.insights || []).map((ins: any) => {
      const preComputed = preComputedImpacts[ins.category] || { numeric: 0, type: 'opportunity' };
      const impactNumeric = preComputed.numeric;
      const normalizedImpact = (impactNumeric / maxImpact) * 100;
      const urgency = severityToUrgency[ins.severity] || 30;
      const confidence = ins.trendDirection ? 70 : 50; // higher if we have trend data
      const effort = effortToScore[ins.effortLevel] || 3;
      const timeSens = timeSensitivityWeight[ins.actByDate] || 0.4;

      const priorityScore = Math.round(
        (normalizedImpact * 0.45) +
        (urgency * 0.25) +
        (confidence * 0.15) +
        ((6 - effort) * 20 * 0.10) + // scale effort inverse to 0-100
        (timeSens * 100 * 0.05)
      );

      return {
        ...ins,
        impactEstimateNumeric: impactNumeric,
        impactType: preComputed.type,
        priorityScore: Math.min(100, Math.max(0, priorityScore)),
      };
    });

    // Sort insights by priority score descending
    insights.insights.sort((a: any, b: any) => (b.priorityScore || 0) - (a.priorityScore || 0));

    // Cache the result (upsert)
    const expiresAt = new Date(Date.now() + CACHE_HOURS * 3600000).toISOString();
    const now = new Date().toISOString();

    // Delete old entry then insert (simpler than complex upsert with coalesce index)
    await supabase
      .from("ai_business_insights")
      .delete()
      .eq("organization_id", orgId)
      .is("location_id", locationId || null);

    const { data: saved, error: saveError } = await supabase
      .from("ai_business_insights")
      .insert({
        organization_id: orgId,
        location_id: locationId || null,
        insights,
        generated_at: now,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to cache insights:", saveError);
    }

    return new Response(
      JSON.stringify(saved || { insights, generated_at: now, expires_at: expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-business-insights error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
