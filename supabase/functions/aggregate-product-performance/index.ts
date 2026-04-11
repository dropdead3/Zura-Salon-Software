import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabase = createClient(supabaseUrl, serviceKey);

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is org admin
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: userId,
      _org_id: organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only organization admins can trigger aggregation" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const periodStart = thirtyDaysAgo.toISOString().split("T")[0];
    const periodEnd = new Date().toISOString().split("T")[0];

    // Fetch completed mix sessions from the trailing 30 days
    const { data: sessions, error: sessionsErr } = await supabase
      .from("mix_session_projections")
      .select("mix_session_id, organization_id, running_dispensed_weight, running_estimated_cost")
      .eq("organization_id", organization_id)
      .eq("current_status", "completed")
      .gte("last_event_at", thirtyDaysAgo.toISOString());

    if (sessionsErr) throw sessionsErr;
    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, records_upserted: 0, message: "No completed sessions" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionIds = sessions.map((s: any) => s.mix_session_id);

    // Fetch bowl line items for these sessions
    const { data: bowlLines } = await supabase
      .from("mix_bowl_lines")
      .select("product_id, dispensed_quantity, dispensed_cost_snapshot, mix_bowl_id")
      .in(
        "mix_bowl_id",
        (
          await supabase
            .from("mix_bowls")
            .select("id")
            .in("mix_session_id", sessionIds)
        ).data?.map((b: any) => b.id) || []
      );

    if (!bowlLines || bowlLines.length === 0) {
      return new Response(
        JSON.stringify({ success: true, records_upserted: 0, message: "No bowl lines found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate by product
    const aggregates: Record<
      string,
      {
        product_id: string;
        total_uses: number;
        total_qty: number;
        total_cost: number;
      }
    > = {};

    for (const line of bowlLines) {
      const pid = line.product_id;
      if (!pid) continue;
      if (!aggregates[pid]) {
        aggregates[pid] = { product_id: pid, total_uses: 0, total_qty: 0, total_cost: 0 };
      }
      aggregates[pid].total_uses++;
      aggregates[pid].total_qty += Number(line.dispensed_quantity || 0);
      aggregates[pid].total_cost +=
        Number(line.dispensed_quantity || 0) * Number(line.dispensed_cost_snapshot || 0);
    }

    let upserted = 0;

    for (const agg of Object.values(aggregates)) {
      const avgQty = agg.total_uses > 0 ? agg.total_qty / agg.total_uses : 0;
      const avgCost = agg.total_uses > 0 ? agg.total_cost / agg.total_uses : 0;

      // Use composite unique constraint for proper upsert
      const { error: upsertErr } = await supabase
        .from("product_service_performance")
        .upsert(
          {
            organization_id,
            product_id: agg.product_id,
            service_name: "Chemical Service",
            total_uses: agg.total_uses,
            avg_quantity_per_use: Math.round(avgQty * 100) / 100,
            avg_product_cost: Math.round(avgCost * 100) / 100,
            avg_service_revenue: 0,
            margin_pct: 0,
            last_used_at: new Date().toISOString(),
            period_start: periodStart,
            period_end: periodEnd,
          },
          { onConflict: "organization_id,product_id,service_name,period_start,period_end" }
        );

      if (!upsertErr) upserted++;
    }

    return new Response(
      JSON.stringify({ success: true, records_upserted: upserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
