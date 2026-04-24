import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_COHORT = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const now = new Date();
    const currentEnd = now.toISOString().split("T")[0];
    const currentStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const previousStart = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // ── 1. Demand Shift: booking velocity by service category × city ──
    const { data: currentBookings } = await supabase
      .from("phorest_appointments")
      .select("service_category, location_id, organization_id")
      .gte("appointment_date", currentStart)
      .lte("appointment_date", currentEnd)
      .not("service_category", "is", null);

    const { data: previousBookings } = await supabase
      .from("phorest_appointments")
      .select("service_category, location_id, organization_id")
      .gte("appointment_date", previousStart)
      .lt("appointment_date", currentStart)
      .not("service_category", "is", null);

    // Get location cities for geographic bucketing
    const { data: locations } = await supabase
      .from("locations")
      .select("id, city, organization_id");

    const locationCityMap = new Map<string, string>();
    for (const loc of locations || []) {
      if (loc.city) locationCityMap.set(loc.id, loc.city);
    }

    // Aggregate bookings by category × city
    type AggKey = string;
    const aggregate = (
      bookings: any[],
    ): Map<AggKey, { count: number; orgIds: Set<string> }> => {
      const map = new Map<AggKey, { count: number; orgIds: Set<string> }>();
      for (const b of bookings) {
        const city = locationCityMap.get(b.location_id) || "unknown";
        const key = `${b.service_category}::${city}`;
        const entry = map.get(key) || { count: 0, orgIds: new Set<string>() };
        entry.count++;
        entry.orgIds.add(b.organization_id);
        map.set(key, entry);
      }
      return map;
    };

    const currentAgg = aggregate(currentBookings || []);
    const previousAgg = aggregate(previousBookings || []);

    const signals: any[] = [];

    for (const [key, curr] of currentAgg) {
      if (curr.orgIds.size < MIN_COHORT) continue;
      const [category, city] = key.split("::");
      const prev = previousAgg.get(key);
      const prevCount = prev?.count || 0;
      const deltaPct = prevCount > 0 ? ((curr.count - prevCount) / prevCount) * 100 : curr.count > 0 ? 100 : 0;

      let direction = "stable";
      if (deltaPct >= 15) direction = "rising";
      else if (deltaPct <= -15) direction = "declining";

      if (direction === "stable") continue;

      let confidence = "low";
      if (curr.orgIds.size >= 20) confidence = "high";
      else if (curr.orgIds.size >= 10) confidence = "medium";

      signals.push({
        signal_type: "demand_shift",
        category,
        city: city === "unknown" ? null : city,
        metric_key: "booking_velocity",
        current_value: curr.count,
        previous_value: prevCount,
        delta_pct: Math.round(deltaPct * 10) / 10,
        direction,
        cohort_size: curr.orgIds.size,
        confidence,
        period_start: currentStart,
        period_end: currentEnd,
        expires_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // ── 2. Task Effectiveness: network-wide by template key ──
    const { data: completedTasks } = await supabase
      .from("seo_tasks")
      .select("template_key, organization_id, status, created_at, completed_at")
      .eq("status", "completed")
      .gte("completed_at", previousStart);

    if (completedTasks && completedTasks.length > 0) {
      const byTemplate = new Map<string, { total: number; orgIds: Set<string> }>();
      for (const t of completedTasks) {
        const entry = byTemplate.get(t.template_key) || { total: 0, orgIds: new Set<string>() };
        entry.total++;
        entry.orgIds.add(t.organization_id);
        byTemplate.set(t.template_key, entry);
      }

      for (const [templateKey, data] of byTemplate) {
        if (data.orgIds.size < MIN_COHORT) continue;
        signals.push({
          signal_type: "effectiveness_pattern",
          category: templateKey,
          city: null,
          metric_key: "completion_rate",
          current_value: data.total,
          previous_value: 0,
          delta_pct: 0,
          direction: "stable",
          cohort_size: data.orgIds.size,
          confidence: data.orgIds.size >= 20 ? "high" : data.orgIds.size >= 10 ? "medium" : "low",
          period_start: previousStart,
          period_end: currentEnd,
          expires_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    // ── 3. Upsert signals ──
    // Delete expired signals first
    await supabase
      .from("industry_trend_signals")
      .delete()
      .lt("expires_at", now.toISOString());

    if (signals.length > 0) {
      const { error: signalError } = await supabase
        .from("industry_trend_signals")
        .insert(signals);

      if (signalError) {
        console.error("Error inserting signals:", signalError);
      }
    }

    // ── 4. Compute benchmarks: health scores percentile bands ──
    const { data: healthScores } = await supabase
      .from("seo_health_scores")
      .select("domain, score, organization_id, seo_object_id")
      .gte("scored_at", currentStart);

    if (healthScores && healthScores.length > 0) {
      const byDomain = new Map<string, { scores: number[]; orgIds: Set<string> }>();
      for (const hs of healthScores) {
        const entry = byDomain.get(hs.domain) || { scores: [], orgIds: new Set<string>() };
        entry.scores.push(hs.score);
        entry.orgIds.add(hs.organization_id);
        byDomain.set(hs.domain, entry);
      }

      const benchmarkRows: any[] = [];
      for (const [domain, data] of byDomain) {
        if (data.orgIds.size < MIN_COHORT) continue;
        const sorted = [...data.scores].sort((a: any, b: any) => a - b);
        const pct = (p: number) => {
          const idx = (p / 100) * (sorted.length - 1);
          const lo = Math.floor(idx);
          const hi = Math.ceil(idx);
          return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
        };

        benchmarkRows.push({
          category: domain,
          city: null,
          metric_key: "health_score",
          p25: Math.round(pct(25) * 100) / 100,
          p50: Math.round(pct(50) * 100) / 100,
          p75: Math.round(pct(75) * 100) / 100,
          p90: Math.round(pct(90) * 100) / 100,
          cohort_size: data.orgIds.size,
          period: `${currentStart}_${currentEnd}`,
        });
      }

      if (benchmarkRows.length > 0) {
        const { error: benchError } = await supabase
          .from("industry_benchmarks")
          .insert(benchmarkRows);

        if (benchError) {
          console.error("Error inserting benchmarks:", benchError);
        }
      }
    }

    // ── 5. Generate AI insight text for top signals ──
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableApiKey && signals.length > 0) {
      const topSignals = signals
        .filter((s: any) => s.confidence !== "low")
        .slice(0, 5);

      if (topSignals.length > 0) {
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content:
                    "You generate short, actionable one-line insights for salon industry trends. Each insight should be clear and specific. Output valid JSON array of objects with keys: index (number), insight (string). No markdown.",
                },
                {
                  role: "user",
                  content: `Generate one-line insights for these signals:\n${JSON.stringify(topSignals.map((s: any, i: number) => ({ index: i, signal_type: s.signal_type, category: s.category, city: s.city, delta_pct: s.delta_pct, direction: s.direction })))}`,
                },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content;
            if (content) {
              try {
                const insights = JSON.parse(content);
                for (const item of insights) {
                  if (topSignals[item.index]) {
                    topSignals[item.index].insight_text = item.insight;
                  }
                }
                // Update signals with insight text
                for (const s of topSignals) {
                  if (s.insight_text) {
                    await supabase
                      .from("industry_trend_signals")
                      .update({ insight_text: s.insight_text })
                      .eq("signal_type", s.signal_type)
                      .eq("category", s.category)
                      .eq("period_start", s.period_start)
                      .eq("period_end", s.period_end);
                  }
                }
              } catch {
                console.log("Could not parse AI insights, skipping");
              }
            }
          }
        } catch (aiErr) {
          console.log("AI insight generation failed, signals saved without text:", aiErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_created: signals.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Industry aggregator error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
