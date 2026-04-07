import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const THRESHOLDS = {
  db_pool: { warning: 70, critical: 85 },
  cold_start_rate: { warning: 15, critical: 30 }, // percentage
  storage_mb: { warning: 5000, critical: 10000 }, // total MB across all buckets
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const metrics: Array<{
      metric_type: string;
      metric_key: string;
      value: number;
      unit: string;
      threshold_warning: number | null;
      threshold_critical: number | null;
      status: string;
      metadata: Record<string, unknown>;
    }> = [];

    // ── 1. DB Connection Pool ─────────────────────────────────────────
    try {
      const { data: connStats, error: connErr } = await supabase.rpc(
        "get_db_connection_stats"
      );
      if (!connErr && connStats) {
        const active = connStats.active ?? 0;
        const total = connStats.total ?? 0;
        const max = connStats.max ?? 100;
        const utilization = max > 0 ? (total / max) * 100 : 0;

        const status =
          utilization >= THRESHOLDS.db_pool.critical
            ? "critical"
            : utilization >= THRESHOLDS.db_pool.warning
            ? "warning"
            : "normal";

        metrics.push({
          metric_type: "db_connections",
          metric_key: "pool_utilization",
          value: Math.round(utilization * 10) / 10,
          unit: "%",
          threshold_warning: THRESHOLDS.db_pool.warning,
          threshold_critical: THRESHOLDS.db_pool.critical,
          status,
          metadata: {
            active,
            idle: connStats.idle ?? 0,
            total,
            max,
          },
        });

        // Alert if threshold breached
        if (status !== "normal") {
          await createNotification(
            supabase,
            {
              type: `infrastructure_db_pool_${status}`,
              severity: status === "critical" ? "critical" : "warning",
              title: `DB Connection Pool ${status === "critical" ? "Critical" : "Warning"}`,
              message: `Connection pool at ${Math.round(utilization)}% utilization (${total}/${max} connections). ${active} active queries.`,
              metadata: { active, total, max, utilization: Math.round(utilization) },
            },
            { cooldownMinutes: 120 }
          );
        }
      }
    } catch (e) {
      console.error("[monitor] DB connection stats error:", e);
    }

    // ── 2. Edge Function Performance ──────────────────────────────────
    try {
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: recentLogs } = await supabase
        .from("edge_function_logs")
        .select("function_name, duration_ms, started_at, status")
        .gte("started_at", fifteenMinAgo)
        .order("started_at", { ascending: false })
        .limit(500);

      if (recentLogs && recentLogs.length > 0) {
        // Group by function
        const byFunction: Record<
          string,
          { durations: number[]; coldStarts: number; total: number; errors: number }
        > = {};

        for (const log of recentLogs) {
          const fn = log.function_name;
          if (!byFunction[fn]) {
            byFunction[fn] = { durations: [], coldStarts: 0, total: 0, errors: 0 };
          }
          byFunction[fn].total++;
          if (log.duration_ms != null) {
            byFunction[fn].durations.push(log.duration_ms);
            if (log.duration_ms > 3000) {
              byFunction[fn].coldStarts++;
            }
          }
          if (log.status === "error" || log.status === "timeout") {
            byFunction[fn].errors++;
          }
        }

        let totalColdStarts = 0;
        let totalInvocations = 0;

        for (const [fnName, data] of Object.entries(byFunction)) {
          const avgMs =
            data.durations.length > 0
              ? Math.round(
                  data.durations.reduce((a, b) => a + b, 0) / data.durations.length
                )
              : 0;

          totalColdStarts += data.coldStarts;
          totalInvocations += data.total;

          metrics.push({
            metric_type: "edge_function_perf",
            metric_key: `function:${fnName}`,
            value: avgMs,
            unit: "ms",
            threshold_warning: 2000,
            threshold_critical: 5000,
            status:
              avgMs >= 5000 ? "critical" : avgMs >= 2000 ? "warning" : "normal",
            metadata: {
              function_name: fnName,
              invocations: data.total,
              cold_starts: data.coldStarts,
              errors: data.errors,
              avg_ms: avgMs,
              p95_ms:
                data.durations.length > 0
                  ? data.durations.sort((a, b) => a - b)[
                      Math.floor(data.durations.length * 0.95)
                    ]
                  : 0,
            },
          });
        }

        // Overall cold start rate
        const coldStartRate =
          totalInvocations > 0
            ? (totalColdStarts / totalInvocations) * 100
            : 0;

        const csStatus =
          coldStartRate >= THRESHOLDS.cold_start_rate.critical
            ? "critical"
            : coldStartRate >= THRESHOLDS.cold_start_rate.warning
            ? "warning"
            : "normal";

        metrics.push({
          metric_type: "edge_function_perf",
          metric_key: "cold_start_rate",
          value: Math.round(coldStartRate * 10) / 10,
          unit: "%",
          threshold_warning: THRESHOLDS.cold_start_rate.warning,
          threshold_critical: THRESHOLDS.cold_start_rate.critical,
          status: csStatus,
          metadata: {
            total_cold_starts: totalColdStarts,
            total_invocations: totalInvocations,
          },
        });

        if (csStatus !== "normal") {
          await createNotification(
            supabase,
            {
              type: "infrastructure_cold_start_warning",
              severity: "warning",
              title: "Edge Function Cold Start Rate Elevated",
              message: `${Math.round(coldStartRate)}% of function invocations are cold starts (>${THRESHOLDS.cold_start_rate.warning}% threshold).`,
              metadata: { cold_start_rate: Math.round(coldStartRate), total_invocations: totalInvocations },
            },
            { cooldownMinutes: 120 }
          );
        }
      }
    } catch (e) {
      console.error("[monitor] Edge function perf error:", e);
    }

    // ── 3. Storage Usage ──────────────────────────────────────────────
    try {
      const { data: bucketStats, error: storageErr } = await supabase.rpc(
        "get_storage_bucket_stats"
      );
      if (!storageErr && bucketStats) {
        let totalBytes = 0;
        const buckets = Array.isArray(bucketStats) ? bucketStats : [];

        for (const bucket of buckets) {
          const sizeMB = Math.round((bucket.total_bytes || 0) / (1024 * 1024) * 10) / 10;
          totalBytes += bucket.total_bytes || 0;

          metrics.push({
            metric_type: "storage_usage",
            metric_key: `bucket:${bucket.bucket_id}`,
            value: sizeMB,
            unit: "MB",
            threshold_warning: null,
            threshold_critical: null,
            status: "normal",
            metadata: {
              bucket_id: bucket.bucket_id,
              file_count: bucket.file_count || 0,
              total_bytes: bucket.total_bytes || 0,
            },
          });
        }

        const totalMB = Math.round(totalBytes / (1024 * 1024) * 10) / 10;
        const storageStatus =
          totalMB >= THRESHOLDS.storage_mb.critical
            ? "critical"
            : totalMB >= THRESHOLDS.storage_mb.warning
            ? "warning"
            : "normal";

        metrics.push({
          metric_type: "storage_usage",
          metric_key: "total",
          value: totalMB,
          unit: "MB",
          threshold_warning: THRESHOLDS.storage_mb.warning,
          threshold_critical: THRESHOLDS.storage_mb.critical,
          status: storageStatus,
          metadata: {
            bucket_count: buckets.length,
            total_bytes: totalBytes,
          },
        });

        if (storageStatus !== "normal") {
          await createNotification(
            supabase,
            {
              type: "infrastructure_storage_warning",
              severity: storageStatus === "critical" ? "critical" : "warning",
              title: `Storage Usage ${storageStatus === "critical" ? "Critical" : "Warning"}`,
              message: `Total storage at ${totalMB} MB across ${buckets.length} buckets.`,
              metadata: { total_mb: totalMB, bucket_count: buckets.length },
            },
            { cooldownMinutes: 120 }
          );
        }
      }
    } catch (e) {
      console.error("[monitor] Storage stats error:", e);
    }

    // ── Write all metrics ─────────────────────────────────────────────
    if (metrics.length > 0) {
      const { error: insertErr } = await supabase
        .from("infrastructure_metrics")
        .insert(metrics);

      if (insertErr) {
        console.error("[monitor] Failed to insert metrics:", insertErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        metrics_collected: metrics.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[monitor] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
