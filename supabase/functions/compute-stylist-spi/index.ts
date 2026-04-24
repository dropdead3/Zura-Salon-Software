import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Use anon client for auth validation (not service-role)
  const anonClient = createClient(supabaseUrl, anonKey) as any;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;

  try {
    // Validate caller with anon client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const organizationId = body.organization_id;
    const targetUserId = body.user_id;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify caller is org admin
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: userId,
      _org_id: organizationId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only organization admins can compute SPI" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Fetch stylists
    let staffQuery = supabase
      .from("employee_profiles")
      .select("user_id, location_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .eq("is_approved", true);

    if (targetUserId) {
      staffQuery = staffQuery.eq("user_id", targetUserId);
    }

    const { data: staff, error: staffErr } = await staffQuery;
    if (staffErr) throw staffErr;

    const now = new Date();
    const periodEnd = now.toISOString().split("T")[0];
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];

    const results: any[] = [];

    for (const member of (staff ?? [])) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("total_price, status, rebooked_at_checkout")
        .eq("staff_user_id", member.user_id)
        .eq("organization_id", organizationId)
        .gte("appointment_date", periodStart)
        .lte("appointment_date", periodEnd);

      const totalRevenue = (appts ?? []).reduce((s: any, a: any) => s + (Number(a.total_price) || 0), 0);
      const totalAppts = (appts ?? []).length;
      const completedAppts = (appts ?? []).filter((a: any) => a.status === "completed").length;
      const rebookedAppts = (appts ?? []).filter((a: any) => a.rebooked_at_checkout === true).length;

      const revenueScore = Math.min(100, Math.round((totalRevenue / 10000) * 100));
      const retentionScore = totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 50;
      const rebookingScore = completedAppts > 0 ? Math.round((rebookedAppts / completedAppts) * 100) : 50;
      const executionScore = 70; // placeholder
      const growthScore = 60; // placeholder
      const reviewScore = 70; // placeholder

      const spiScore = Math.round(
        revenueScore * 0.25 +
        retentionScore * 0.20 +
        rebookingScore * 0.15 +
        executionScore * 0.15 +
        growthScore * 0.15 +
        reviewScore * 0.10,
      );

      const tier = spiScore >= 85 ? "elite" : spiScore >= 70 ? "high" : spiScore >= 50 ? "growth" : "underperforming";

      const { error: upsertErr } = await supabase
        .from("stylist_spi_scores")
        .insert({
          organization_id: organizationId,
          user_id: member.user_id,
          location_id: member.location_id,
          spi_score: spiScore,
          revenue_score: revenueScore,
          retention_score: retentionScore,
          rebooking_score: rebookingScore,
          execution_score: executionScore,
          growth_score: growthScore,
          review_score: reviewScore,
          tier,
          period_start: periodStart,
          period_end: periodEnd,
        });

      if (upsertErr) {
        console.error(`SPI upsert error for ${member.user_id}:`, upsertErr);
        continue;
      }

      // Fetch SPI history for ORS
      const { data: spiHistory } = await supabase
        .from("stylist_spi_scores")
        .select("spi_score")
        .eq("user_id", member.user_id)
        .eq("organization_id", organizationId)
        .order("scored_at", { ascending: false })
        .limit(12);

      const scores = (spiHistory ?? []).map((s: any) => Number(s.spi_score));
      const spiAvg = scores.length > 0 ? scores.reduce((a: any, b: any) => a + b, 0) / scores.length : spiScore;

      let consistency = 50;
      if (scores.length >= 2) {
        const mean = spiAvg;
        const variance = scores.reduce((sum: any, v: any) => sum + (v - mean) ** 2, 0) / scores.length;
        const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
        consistency = Math.max(0, Math.min(100, Math.round((1 - cv * 2) * 100)));
      }
      if (scores.length < 6) consistency = Math.round(consistency * 0.7);

      const leadershipScore = 60;
      const demandStability = 70;

      const orsScore = Math.round(
        spiAvg * 0.40 + consistency * 0.25 + leadershipScore * 0.20 + demandStability * 0.15,
      );

      let careerStage = "stylist";
      if (spiAvg >= 85 && orsScore >= 85) careerStage = "owner";
      else if (spiAvg >= 80 && orsScore >= 70 && consistency >= 70) careerStage = "operator";
      else if (spiAvg >= 80 && leadershipScore >= 60) careerStage = "lead";
      else if (spiAvg >= 70) careerStage = "high_performer";

      const { data: existingORS } = await supabase
        .from("stylist_ors_scores")
        .select("career_stage")
        .eq("user_id", member.user_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      const previousStage = existingORS?.career_stage;

      await supabase
        .from("stylist_ors_scores")
        .upsert(
          {
            organization_id: organizationId,
            user_id: member.user_id,
            ors_score: orsScore,
            spi_average: Math.round(spiAvg),
            consistency_score: consistency,
            leadership_score: leadershipScore,
            demand_stability: demandStability,
            career_stage: careerStage,
            financing_eligible: spiAvg >= 70,
            ownership_eligible: orsScore >= 85,
          },
          { onConflict: "organization_id,user_id" },
        );

      if (previousStage && previousStage !== careerStage) {
        const stageOrder: Record<string, number> = {
          stylist: 1, high_performer: 2, lead: 3, operator: 4, owner: 5,
        };
        if ((stageOrder[careerStage] ?? 0) > (stageOrder[previousStage] ?? 0)) {
          await supabase.from("stylist_career_milestones").insert({
            organization_id: organizationId,
            user_id: member.user_id,
            milestone_type: "stage_promotion",
            from_stage: previousStage,
            to_stage: careerStage,
            spi_at_milestone: spiScore,
            ors_at_milestone: orsScore,
          });
        }
      }

      results.push({ user_id: member.user_id, spi: spiScore, ors: orsScore, stage: careerStage });
    }

    return new Response(JSON.stringify({ computed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
