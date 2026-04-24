import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch locations for this org
    const { data: locations, error: locErr } = await supabase
      .from("locations")
      .select("id, name, city")
      .eq("organization_id", organization_id)
      .eq("is_active", true);

    if (locErr) throw locErr;
    if (!locations?.length) {
      return new Response(
        JSON.stringify({ success: true, scores: [], message: "No active locations" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch latest health scores per location (simplified — uses metric_benchmarks if available)
    const { data: healthScores } = await supabase
      .from("metric_benchmarks")
      .select("*")
      .eq("organization_id", organization_id);

    // Fetch SEO task completion rates
    const { data: seoTasks } = await supabase
      .from("seo_tasks")
      .select("status, seo_object_id")
      .eq("organization_id", organization_id);

    const totalTasks = seoTasks?.length ?? 0;
    const completedTasks = seoTasks?.filter((t: any) => t.status === "completed").length ?? 0;
    const executionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;

    // Compute SPI per location using available data
    const scores = [];
    const SPI_WEIGHTS = {
      revenueEfficiency: 0.25,
      growthVelocity: 0.20,
      conversionStrength: 0.15,
      pricingPower: 0.15,
      operationalStability: 0.15,
      executionQuality: 0.10,
    };

    for (const loc of locations) {
      // Use health engine benchmarks if available, otherwise default to 50
      const locationBenchmarks = healthScores?.filter((b: any) => b.location_id === loc.id) ?? [];
      
      const getScore = (metricKey: string, fallback = 50) => {
        const bench = locationBenchmarks.find((b: any) => b.metric_key === metricKey);
        return bench ? Math.min(100, Math.max(0, Number(bench.current_value) || fallback)) : fallback;
      };

      const revenueEfficiency = getScore("revenue_health", 50);
      const growthVelocity = getScore("growth_velocity", 50);
      const conversionStrength = getScore("conversion_rate", 50);
      const pricingPower = getScore("pricing_power", 50);
      const operationalStability = getScore("operational_stability", 50);
      const executionQuality = Math.min(100, executionRate);

      const spiScore = Math.round(
        revenueEfficiency * SPI_WEIGHTS.revenueEfficiency +
        growthVelocity * SPI_WEIGHTS.growthVelocity +
        conversionStrength * SPI_WEIGHTS.conversionStrength +
        pricingPower * SPI_WEIGHTS.pricingPower +
        operationalStability * SPI_WEIGHTS.operationalStability +
        executionQuality * SPI_WEIGHTS.executionQuality
      );

      // Risk level
      let riskLevel = "moderate";
      if (spiScore >= 75) riskLevel = "low";
      else if (spiScore < 40) riskLevel = "high";

      const spiRow = {
        organization_id,
        location_id: loc.id,
        spi_score: spiScore,
        revenue_efficiency: revenueEfficiency,
        growth_velocity: growthVelocity,
        conversion_strength: conversionStrength,
        pricing_power: pricingPower,
        operational_stability: operationalStability,
        execution_quality: executionQuality,
        risk_level: riskLevel,
        factors: {
          locationName: loc.name,
          city: loc.city,
          taskCompletionRate: Math.round(executionRate),
          benchmarkCount: locationBenchmarks.length,
        },
        scored_at: new Date().toISOString(),
      };

      // Upsert — delete old scores for this location first, then insert
      await supabase
        .from("salon_performance_index")
        .delete()
        .eq("organization_id", organization_id)
        .eq("location_id", loc.id);

      const { error: insertErr } = await supabase
        .from("salon_performance_index")
        .insert(spiRow);

      if (insertErr) {
        console.error(`SPI insert error for ${loc.id}:`, insertErr);
      }

      scores.push(spiRow);
    }

    return new Response(
      JSON.stringify({ success: true, scores }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SPI calculation error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
