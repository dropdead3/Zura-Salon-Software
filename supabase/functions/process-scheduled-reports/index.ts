import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScheduledReport {
  id: string;
  organization_id: string;
  template_id: string | null;
  report_type: string | null;
  name: string;
  schedule_type: string;
  schedule_config: {
    dayOfWeek?: number;
    dayOfMonth?: number;
    timeUtc?: string;
    timezone?: string;
  };
  recipients: { email: string; userId?: string }[];
  format: string;
  filters: Record<string, any>;
  next_run_at: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  config: {
    metrics: { id: string; aggregation: string; label?: string }[];
    dimensions: { id: string; groupBy?: string }[];
    filters: { field: string; operator: string; value: any }[];
    visualization: string;
    dateRange: string;
    customDateRange?: { from: string; to: string };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    console.log("[Scheduled Reports] Starting processing run");

    // Fetch due reports
    const now = new Date().toISOString();
    const { data: dueReports, error: fetchError } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", now);

    if (fetchError) {
      throw new Error(`Failed to fetch due reports: ${fetchError.message}`);
    }

    console.log(`[Scheduled Reports] Found ${dueReports?.length || 0} due reports`);

    const results = [];

    for (const report of (dueReports || []) as ScheduledReport[]) {
      console.log(`[Scheduled Reports] Processing: ${report.name} (${report.id})`);

      // Create run record
      const { data: runRecord, error: runError } = await supabase
        .from("scheduled_report_runs")
        .insert({
          scheduled_report_id: report.id,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) {
        console.error(`[Scheduled Reports] Failed to create run record: ${runError.message}`);
        continue;
      }

      try {
        // Fetch template if exists
        let template: ReportTemplate | null = null;
        if (report.template_id) {
          const { data: templateData } = await supabase
            .from("custom_report_templates")
            .select("*")
            .eq("id", report.template_id)
            .single();
          template = templateData;
        }

        // Generate report data based on template or report_type
        const reportData = await generateReportData(supabase, report, template);

        // For now, store the data as JSON (future: generate PDF/CSV and upload to storage)
        const fileUrl = `reports/${report.organization_id}/${report.id}/${runRecord.id}.json`;

        // Update run record as completed
        await supabase
          .from("scheduled_report_runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            file_url: fileUrl,
            recipient_count: report.recipients.length,
          })
          .eq("id", runRecord.id);

        // Calculate next run time
        const nextRunAt = calculateNextRunTime(report);
        await supabase
          .from("scheduled_reports")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRunAt,
          })
          .eq("id", report.id);

        results.push({
          reportId: report.id,
          name: report.name,
          status: "completed",
          nextRunAt,
        });

        console.log(`[Scheduled Reports] Completed: ${report.name}`);

        // TODO: Send email notifications to recipients
        // This would call the existing send-email edge function

      } catch (processError: any) {
        console.error(`[Scheduled Reports] Error processing ${report.name}: ${processError.message}`);

        await supabase
          .from("scheduled_report_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: processError.message,
          })
          .eq("id", runRecord.id);

        results.push({
          reportId: report.id,
          name: report.name,
          status: "failed",
          error: processError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("[Scheduled Reports] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function generateReportData(
  supabase: any,
  report: ScheduledReport,
  template: ReportTemplate | null
): Promise<any> {
  // Determine date range
  const today = new Date();
  let dateFrom: string;
  let dateTo: string = today.toISOString().split("T")[0];

  if (report.schedule_type === "daily") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    dateFrom = yesterday.toISOString().split("T")[0];
    dateTo = yesterday.toISOString().split("T")[0];
  } else if (report.schedule_type === "weekly") {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    dateFrom = lastWeek.toISOString().split("T")[0];
  } else if (report.schedule_type === "monthly" || report.schedule_type === "first_of_month") {
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    dateFrom = lastMonth.toISOString().split("T")[0];
  } else {
    const last30 = new Date(today);
    last30.setDate(last30.getDate() - 30);
    dateFrom = last30.toISOString().split("T")[0];
  }

  // Build query based on template config or report_type
  if (template) {
    const metrics = template.config.metrics || [];
    const dimensions = template.config.dimensions || [];

    // Fetch transaction items and aggregate to daily shape
    const txnItems: any[] = [];
    let txnPg = 0;
    while (true) {
      let q = supabase
        .from("phorest_transaction_items")
        .select("transaction_date, total_amount, tax_amount, item_type, location_id")
        .eq("organization_id", report.organization_id)
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo)
        .range(txnPg * 1000, (txnPg + 1) * 1000 - 1);
      if (report.filters?.locationId) {
        q = q.eq("location_id", report.filters.locationId);
      }
      const { data: batch, error: batchErr } = await q;
      if (batchErr) throw batchErr;
      if (!batch || batch.length === 0) break;
      txnItems.push(...batch);
      if (batch.length < 1000) break;
      txnPg++;
    }

    // Aggregate to daily summary shape for aggregateData compatibility
    const dailyMap: Record<string, any> = {};
    for (const item of txnItems) {
      const d = item.transaction_date;
      if (!dailyMap[d]) dailyMap[d] = { summary_date: d, total_revenue: 0, service_revenue: 0, product_revenue: 0, total_transactions: 0, location_id: item.location_id };
      const rev = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
      dailyMap[d].total_revenue += rev;
      if (item.item_type === "service") dailyMap[d].service_revenue += rev;
      else dailyMap[d].product_revenue += rev;
      dailyMap[d].total_transactions += 1;
    }
    const data = Object.values(dailyMap);

    // Aggregate based on metrics
    const aggregated = aggregateData(data, metrics, dimensions);
    return {
      dateRange: { from: dateFrom, to: dateTo },
      template: template.name,
      data: aggregated,
      generatedAt: new Date().toISOString(),
    };
  }

  // Fallback for built-in report types — same transaction-items approach
  const fallbackItems: any[] = [];
  let fbPg = 0;
  while (true) {
    const { data: batch, error: batchErr } = await supabase
      .from("phorest_transaction_items")
      .select("transaction_date, total_amount, tax_amount, item_type, location_id")
      .eq("organization_id", report.organization_id)
      .gte("transaction_date", dateFrom)
      .lte("transaction_date", dateTo)
      .range(fbPg * 1000, (fbPg + 1) * 1000 - 1);
    if (batchErr) throw batchErr;
    if (!batch || batch.length === 0) break;
    fallbackItems.push(...batch);
    if (batch.length < 1000) break;
    fbPg++;
  }

  const fbDailyMap: Record<string, any> = {};
  for (const item of fallbackItems) {
    const d = item.transaction_date;
    if (!fbDailyMap[d]) fbDailyMap[d] = { summary_date: d, total_revenue: 0, service_revenue: 0, product_revenue: 0, total_transactions: 0 };
    const rev = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
    fbDailyMap[d].total_revenue += rev;
    if (item.item_type === "service") fbDailyMap[d].service_revenue += rev;
    else fbDailyMap[d].product_revenue += rev;
    fbDailyMap[d].total_transactions += 1;
  }

  return {
    dateRange: { from: dateFrom, to: dateTo },
    reportType: report.report_type,
    data: Object.values(fbDailyMap),
    generatedAt: new Date().toISOString(),
  };
}

function aggregateData(
  data: any[],
  metrics: { id: string; aggregation: string }[],
  dimensions: { id: string; groupBy?: string }[]
): any {
  if (!data.length) return { rows: [], totals: {} };

  // Calculate totals
  const totals: Record<string, number> = {};
  
  for (const metric of metrics) {
    const values = data.map((d) => {
      const fieldMap: Record<string, string> = {
        total_revenue: "total_revenue",
        service_revenue: "service_revenue",
        product_revenue: "product_revenue",
        appointment_count: "total_transactions",
      };
      return Number(d[fieldMap[metric.id] || metric.id]) || 0;
    });

    switch (metric.aggregation) {
      case "sum":
        totals[metric.id] = values.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        totals[metric.id] = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "count":
        totals[metric.id] = values.length;
        break;
      case "min":
        totals[metric.id] = Math.min(...values);
        break;
      case "max":
        totals[metric.id] = Math.max(...values);
        break;
    }
  }

  return {
    rows: data,
    totals,
    rowCount: data.length,
  };
}

function calculateNextRunTime(report: ScheduledReport): string {
  const now = new Date();
  const next = new Date(now);

  switch (report.schedule_type) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
    case "first_of_month":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      break;
    case "last_of_month":
      next.setMonth(next.getMonth() + 2);
      next.setDate(0); // Last day of previous month
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  // Set time if specified
  if (report.schedule_config?.timeUtc) {
    const [hours, minutes] = report.schedule_config.timeUtc.split(":");
    next.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
  } else {
    next.setUTCHours(9, 0, 0, 0); // Default to 9 AM UTC
  }

  return next.toISOString();
}
