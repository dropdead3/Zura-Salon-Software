

# Platform Infrastructure Monitoring Dashboard (Revised)

## Feasibility Confirmation

All required tables and infrastructure exist. One adjustment: raw SQL queries (`pg_stat_activity`, `storage.objects`) cannot run from edge functions via the JS client. We use **security definer RPC functions** instead.

## Technical Design

### 1. Database Migration

**New table** — `infrastructure_metrics` for time-series snapshots:

```sql
CREATE TABLE public.infrastructure_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,        -- 'db_connections' | 'edge_function_perf' | 'storage_usage'
  metric_key text NOT NULL,          -- 'pool_utilization', 'cold_start_rate', 'bucket:chat-attachments'
  value numeric NOT NULL,
  unit text,                         -- '%', 'ms', 'MB', 'count'
  threshold_warning numeric,
  threshold_critical numeric,
  status text DEFAULT 'normal',      -- 'normal' | 'warning' | 'critical'
  metadata jsonb DEFAULT '{}',
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_infra_metrics_type_recorded 
  ON infrastructure_metrics(metric_type, recorded_at DESC);

-- RLS: platform users only
ALTER TABLE infrastructure_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform users can read"
  ON infrastructure_metrics FOR SELECT
  USING (public.is_platform_user(auth.uid()));
```

**Two RPC functions** (security definer, bypasses RLS safely):

```sql
-- 1. Connection pool stats
CREATE FUNCTION public.get_db_connection_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'active', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'idle', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
    'total', (SELECT count(*) FROM pg_stat_activity),
    'max', current_setting('max_connections')::int
  );
$$;

-- 2. Storage bucket stats
CREATE FUNCTION public.get_storage_bucket_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(bucket_stats), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'bucket_id', bucket_id,
      'file_count', count(*),
      'total_bytes', COALESCE(sum((metadata->>'size')::bigint), 0)
    ) as bucket_stats
    FROM storage.objects
    GROUP BY bucket_id
  ) sub;
$$;
```

### 2. Edge Function — `monitor-infrastructure`

Collects three metric categories every 15 minutes (scheduled via pg_cron):

- **DB Connections**: Calls `get_db_connection_stats()` RPC. Calculates utilization %. Warning at 70%, critical at 85%.
- **Edge Function Cold Starts**: Queries `edge_function_logs` for functions where `duration_ms > 3000` after >5min idle gap. Reports cold start rate per function.
- **Storage Usage**: Calls `get_storage_bucket_stats()` RPC. Reports per-bucket file count and total MB.

Writes snapshots to `infrastructure_metrics`. Creates `platform_notifications` via existing `createNotification` helper with 2-hour cooldown when thresholds breach.

### 3. Frontend Hook — `useInfrastructureMetrics`

Queries `infrastructure_metrics` for latest snapshot per `metric_type` + 24h history for sparklines. Refresh: 5 minutes. Platform users only.

### 4. UI — Infrastructure Section in SystemHealth.tsx

Three cards added below existing service health section:

| Card | Data Source | Visual |
|------|------------|--------|
| **Connection Pool** | `db_connections` metrics | Utilization gauge + 24h sparkline |
| **Edge Function Performance** | `edge_function_perf` metrics | Table: function name, avg ms, cold starts, status badge |
| **Storage Usage** | `storage_usage` metrics | Per-bucket bars with file count + MB |

Each card shows status badge (normal/warning/critical) from latest metric.

### 5. Scheduled Job

pg_cron entry to invoke `monitor-infrastructure` every 15 minutes.

## Files Changed

| File | Change |
|------|--------|
| Migration (new) | `infrastructure_metrics` table + 2 RPC functions + indexes + RLS |
| `supabase/functions/monitor-infrastructure/index.ts` (new) | Metric collection edge function |
| `src/hooks/useInfrastructureMetrics.ts` (new) | Frontend data hook |
| `src/pages/dashboard/platform/SystemHealth.tsx` | Add 3 infrastructure cards |

## What Won't Work Without This Fix

The original plan assumed raw SQL from edge functions — that would have silently failed. The RPC approach is the correct pattern and is already used elsewhere in this codebase (e.g., `get_unread_counts`).

