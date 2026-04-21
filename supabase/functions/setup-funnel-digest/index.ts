// Wave 12 — setup-funnel-digest
// Weekly job: compares this week's setup completion rate to the trailing
// 4-week average. When the drop exceeds 20pp, posts a deduplicated platform
// notification. Looks only at orgs created in the last 90 days.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const now = Date.now();
    const windowStart = new Date(now - 90 * DAY_MS).toISOString();

    // Pull commit log + step events for the 90d window
    const [{ data: commits }, { data: events }] = await Promise.all([
      admin
        .from("org_setup_commit_log")
        .select("organization_id, status, attempted_at")
        .gte("attempted_at", windowStart)
        .limit(20000),
      admin
        .from("org_setup_step_events")
        .select("organization_id, occurred_at, event")
        .gte("occurred_at", windowStart)
        .limit(20000),
    ]);

    // Build per-week buckets: 5 weeks (current + 4 trailing).
    // Bucket index 0 = oldest, 4 = current week.
    const weeklyStarted = [0, 0, 0, 0, 0];
    const weeklyCompleted = [0, 0, 0, 0, 0];
    const startedSeen: Set<string>[] = [
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      new Set(),
    ];
    const completedSeen: Set<string>[] = [
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      new Set(),
    ];

    function bucketOf(tsMs: number): number | null {
      const ageMs = now - tsMs;
      if (ageMs < 0) return null;
      const weeksAgo = Math.floor(ageMs / WEEK_MS);
      if (weeksAgo > 4) return null;
      return 4 - weeksAgo;
    }

    for (const e of (events ?? []) as Array<{
      organization_id: string;
      occurred_at: string;
      event: string;
    }>) {
      if (e.event !== "viewed") continue;
      const idx = bucketOf(new Date(e.occurred_at).getTime());
      if (idx === null) continue;
      if (!startedSeen[idx].has(e.organization_id)) {
        startedSeen[idx].add(e.organization_id);
        weeklyStarted[idx] += 1;
      }
    }
    for (const c of (commits ?? []) as Array<{
      organization_id: string;
      status: string;
      attempted_at: string;
    }>) {
      if (c.status !== "completed") continue;
      const idx = bucketOf(new Date(c.attempted_at).getTime());
      if (idx === null) continue;
      if (!completedSeen[idx].has(c.organization_id)) {
        completedSeen[idx].add(c.organization_id);
        weeklyCompleted[idx] += 1;
      }
    }

    const rate = (started: number, completed: number) =>
      started > 0 ? (completed / started) * 100 : 0;

    const currentRate = rate(weeklyStarted[4], weeklyCompleted[4]);
    const trailingRates = [0, 1, 2, 3].map((i) =>
      rate(weeklyStarted[i], weeklyCompleted[i]),
    );
    const trailingAvg =
      trailingRates.reduce((a, b) => a + b, 0) / trailingRates.length;
    const deltaPp = currentRate - trailingAvg;

    // Only alert when the current week has enough signal to compare
    const enoughSignal = weeklyStarted[4] >= 3;

    if (!enoughSignal) {
      return json({
        ran: true,
        alerted: false,
        reason: "insufficient signal in current week",
        currentRate,
        trailingAvg,
        deltaPp,
      });
    }

    if (deltaPp >= -20) {
      return json({
        ran: true,
        alerted: false,
        reason: "delta within tolerance",
        currentRate,
        trailingAvg,
        deltaPp,
      });
    }

    const result = await createNotification(
      admin,
      {
        type: "setup_funnel_regression",
        severity: "warning",
        title: "Setup completion rate dropped",
        message: `This week ${currentRate.toFixed(1)}% vs trailing 4-week avg ${trailingAvg.toFixed(1)}% (${deltaPp.toFixed(1)}pp).`,
        metadata: {
          current_rate: Number(currentRate.toFixed(2)),
          trailing_avg: Number(trailingAvg.toFixed(2)),
          delta_pp: Number(deltaPp.toFixed(2)),
          weekly_started: weeklyStarted,
          weekly_completed: weeklyCompleted,
        },
      },
      { cooldownMinutes: 7 * 24 * 60 }, // 7-day suppression window
    );

    return json({
      ran: true,
      alerted: result.inserted,
      reason: result.reason,
      currentRate,
      trailingAvg,
      deltaPp,
    });
  } catch (err) {
    console.error("[setup-funnel-digest] error:", err);
    return json({ error: (err as Error).message }, 500);
  }

  function json(b: unknown, status = 200) {
    return new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
