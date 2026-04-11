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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch enabled rules with supplier info
    const { data: rules, error: rulesErr } = await supabase
      .from("auto_replenishment_rules")
      .select("*, supplier_preferences(supplier_name)")
      .eq("organization_id", organization_id)
      .eq("enabled", true);

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ success: true, events_created: 0, message: "No active rules" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch inventory projections for relevant products
    const productIds = rules.map((r: any) => r.product_id).filter(Boolean);
    const { data: projections } = await supabase
      .from("inventory_projections")
      .select("*")
      .eq("organization_id", organization_id)
      .in("product_id", productIds);

    // Fetch risk projections for daily usage
    const { data: riskProjections } = await supabase
      .from("inventory_risk_projections")
      .select("*")
      .eq("organization_id", organization_id)
      .in("product_id", productIds);

    let eventsCreated = 0;

    for (const rule of rules) {
      const proj = (projections || []).find(
        (p: any) =>
          p.product_id === rule.product_id &&
          (rule.location_id ? p.location_id === rule.location_id : true)
      );
      const risk = (riskProjections || []).find(
        (r: any) => r.product_id === rule.product_id
      );

      if (!proj) continue;

      const onHand = proj.on_hand || 0;
      const avgDaily = risk?.avg_daily_usage || 0;
      const daysOfStock = avgDaily > 0 ? onHand / avgDaily : 999;

      let triggered = false;
      let reason = "";

      switch (rule.threshold_type) {
        case "days_of_stock":
          triggered = daysOfStock <= rule.threshold_value;
          reason = `${Math.round(daysOfStock)} days of stock (threshold: ${rule.threshold_value})`;
          break;
        case "fixed_quantity":
          triggered = onHand <= rule.threshold_value;
          reason = `${onHand} units on hand (threshold: ${rule.threshold_value})`;
          break;
        case "forecast_driven":
          triggered = daysOfStock <= 14; // 2-week horizon
          reason = `Forecast: ${Math.round(daysOfStock)} days remaining`;
          break;
      }

      if (!triggered) continue;

      // Check for existing suggested event to avoid duplicates
      const { data: existing } = await supabase
        .from("auto_replenishment_events")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("product_id", rule.product_id)
        .eq("status", "suggested")
        .limit(1);

      if (existing && existing.length > 0) continue;

      const recommendedQty = Math.max(
        Math.ceil(avgDaily * 28), // 4-week supply
        risk?.recommended_order_qty || 0
      );

      const supplierName =
        (rule as any).supplier_preferences?.supplier_name || "Unknown";

      const { error: insertErr } = await supabase
        .from("auto_replenishment_events")
        .insert({
          organization_id,
          product_id: rule.product_id,
          location_id: rule.location_id,
          trigger_reason: reason,
          recommended_qty: recommendedQty,
          supplier_name: supplierName,
          status: "suggested",
        });

      if (!insertErr) eventsCreated++;
    }

    return new Response(
      JSON.stringify({ success: true, events_created: eventsCreated }),
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
