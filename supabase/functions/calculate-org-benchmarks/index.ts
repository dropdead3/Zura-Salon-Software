import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface BenchmarkMetric {
  metric_key: string;
  label: string;
  inverse?: boolean; // Lower is better (e.g., no-show rate)
}

const BENCHMARK_METRICS: BenchmarkMetric[] = [
  { metric_key: "revenue_per_location", label: "Revenue per Location" },
  { metric_key: "appointments_per_staff", label: "Appointments per Staff" },
  { metric_key: "rebooking_rate", label: "Rebooking Rate" },
  { metric_key: "average_ticket", label: "Average Ticket" },
  { metric_key: "no_show_rate", label: "No-Show Rate", inverse: true },
  { metric_key: "login_frequency", label: "Staff Login Frequency" },
  { metric_key: "chat_activity", label: "Team Chat Activity" },
];

interface OrgMetrics {
  organization_id: string;
  organization_name: string;
  metrics: Record<string, number>;
}

Deno.serve(async (req) => {
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
    const { supabaseAdmin } = authResult;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Get date ranges
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() - periodEnd.getDay()); // Last Sunday
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7); // Previous Sunday

    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    // Fetch all active organizations
    const { data: organizations, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("status", "active");

    if (orgsError) {
      throw new Error(`Failed to fetch organizations: ${orgsError.message}`);
    }

    const orgMetrics: OrgMetrics[] = [];

    for (const org of organizations || []) {
      try {
        const metrics: Record<string, number> = {};

        // 1. Revenue per location (from transaction items)
        const txnItems: any[] = [];
        let txnPg = 0;
        while (true) {
          const { data: batch } = await supabase
            .from("phorest_transaction_items")
            .select("total_amount, tax_amount")
            .eq("organization_id", org.id)
            .gte("transaction_date", periodStartStr)
            .lte("transaction_date", periodEndStr)
            .range(txnPg * 1000, (txnPg + 1) * 1000 - 1);
          if (!batch || batch.length === 0) break;
          txnItems.push(...batch);
          if (batch.length < 1000) break;
          txnPg++;
        }

        const { count: locationCount } = await supabase
          .from("locations")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .eq("is_active", true);

        const totalRevenue = txnItems.reduce((sum: any, s: any) => sum + (Number(s.total_amount) || 0) + (Number(s.tax_amount) || 0), 0);
        metrics.revenue_per_location = locationCount && locationCount > 0
          ? totalRevenue / locationCount
          : 0;

        // 2. Appointments per staff
        const { count: appointmentCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("appointment_date", periodStartStr)
          .lte("appointment_date", periodEndStr)
          .neq("status", "cancelled");

        const { count: staffCount } = await supabase
          .from("employee_profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .eq("is_active", true);

        metrics.appointments_per_staff = staffCount && staffCount > 0
          ? (appointmentCount || 0) / staffCount
          : 0;

        // 3. Rebooking rate (simplified - using rebooked_at_checkout)
        const { count: completedAppts } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("appointment_date", periodStartStr)
          .lte("appointment_date", periodEndStr)
          .eq("status", "completed");

        const { count: rebookedAppts } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("appointment_date", periodStartStr)
          .lte("appointment_date", periodEndStr)
          .eq("rebooked_at_checkout", true);

        metrics.rebooking_rate = completedAppts && completedAppts > 0
          ? ((rebookedAppts || 0) / completedAppts) * 100
          : 0;

        // 4. Average ticket
        metrics.average_ticket = appointmentCount && appointmentCount > 0
          ? totalRevenue / appointmentCount
          : 0;

        // 5. No-show rate
        const { count: noShowCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("appointment_date", periodStartStr)
          .lte("appointment_date", periodEndStr)
          .eq("status", "no_show");

        const { count: totalScheduled } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("appointment_date", periodStartStr)
          .lte("appointment_date", periodEndStr);

        metrics.no_show_rate = totalScheduled && totalScheduled > 0
          ? ((noShowCount || 0) / totalScheduled) * 100
          : 0;

        // 6. Login frequency (logins per staff per week)
        const { count: loginCount } = await supabase
          .from("platform_audit_log")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .eq("action", "login")
          .gte("created_at", periodStartStr)
          .lte("created_at", periodEndStr);

        metrics.login_frequency = staffCount && staffCount > 0
          ? (loginCount || 0) / staffCount
          : 0;

        // 7. Chat activity (messages per active user per week)
        const { count: chatCount } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .gte("created_at", periodStartStr)
          .lte("created_at", periodEndStr);

        const { count: activeStaff } = await supabase
          .from("platform_audit_log")
          .select("user_id", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("created_at", periodStartStr);

        metrics.chat_activity = activeStaff && activeStaff > 0
          ? (chatCount || 0) / activeStaff
          : 0;

        orgMetrics.push({
          organization_id: org.id,
          organization_name: org.name,
          metrics,
        });
      } catch (orgError: any) {
        console.error(`Error processing org ${org.id}:`, orgError);
      }
    }

    // Calculate percentiles for each metric
    const benchmarkRecords: Array<{
      organization_id: string;
      metric_key: string;
      value: number;
      percentile: number;
      period_type: string;
      period_start: string;
      period_end: string;
      comparison_group: string;
    }> = [];

    for (const metric of BENCHMARK_METRICS) {
      const values = orgMetrics
        .map((om: any) => ({
          org_id: om.organization_id,
          value: om.metrics[metric.metric_key] || 0,
        }))
        .sort((a: any, b: any) => metric.inverse ? a.value - b.value : b.value - a.value);

      values.forEach((v: any, index: any) => {
        const percentile = Math.round(((values.length - index) / values.length) * 100);

        benchmarkRecords.push({
          organization_id: v.org_id,
          metric_key: metric.metric_key,
          value: v.value,
          percentile,
          period_type: "weekly",
          period_start: periodStartStr,
          period_end: periodEndStr,
          comparison_group: "all",
        });
      });
    }

    // Upsert benchmarks
    if (benchmarkRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from("organization_benchmarks")
        .upsert(benchmarkRecords, {
          onConflict: "organization_id,metric_key,period_start,comparison_group",
        });

      if (upsertError) {
        console.error("Benchmark upsert error:", upsertError);
      }
    }

    // Calculate platform averages
    const platformAverages: Record<string, number> = {};
    for (const metric of BENCHMARK_METRICS) {
      const values = orgMetrics.map((om: any) => om.metrics[metric.metric_key] || 0);
      platformAverages[metric.metric_key] = values.length > 0
        ? values.reduce((a: any, b: any) => a + b, 0) / values.length
        : 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: orgMetrics.length,
        period: { start: periodStartStr, end: periodEndStr },
        platform_averages: platformAverages,
        top_performers: BENCHMARK_METRICS.map((m: any) => {
          const sorted = orgMetrics
            .sort((a: any, b: any) => 
              m.inverse 
                ? (a.metrics[m.metric_key] || 0) - (b.metrics[m.metric_key] || 0)
                : (b.metrics[m.metric_key] || 0) - (a.metrics[m.metric_key] || 0)
            )
            .slice(0, 3);
          return {
            metric: m.label,
            leaders: sorted.map((s: any) => ({
              name: s.organization_name,
              value: s.metrics[m.metric_key] || 0,
            })),
          };
        }),
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Benchmark calculation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
