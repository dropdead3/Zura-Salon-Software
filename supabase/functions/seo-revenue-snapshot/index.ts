import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch all location_service SEO objects for this org
    const { data: seoObjects, error: objErr } = await supabase
      .from("seo_objects")
      .select("id, object_type, object_key, location_id, label, metadata")
      .eq("organization_id", organization_id);

    if (objErr) throw objErr;

    // 2. Compute 30d period
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);
    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    // 3. Fetch transaction_items for the org in the 30d window
    const { data: txItems, error: txErr } = await supabase
      .from("transaction_items")
      .select("location_id, item_category, total_amount, tax_amount")
      .eq("organization_id", organization_id)
      .eq("item_type", "service")
      .gte("transaction_date", periodStartStr)
      .lte("transaction_date", periodEndStr);

    if (txErr) throw txErr;

    // 4. Aggregate revenue by location_id + item_category
    const revenueMap: Record<string, { revenue: number; count: number }> = {};
    for (const tx of txItems || []) {
      const key = `${tx.location_id}::${(tx.item_category || "").toLowerCase()}`;
      if (!revenueMap[key]) revenueMap[key] = { revenue: 0, count: 0 };
      revenueMap[key].revenue += Number(tx.total_amount || 0);
      revenueMap[key].count += 1;
    }

    // 5. Map SEO objects to revenue using object_key patterns
    const upserts: any[] = [];
    for (const obj of seoObjects || []) {
      let matchKey: string | null = null;

      if (obj.object_type === "location_service" && obj.object_key) {
        // Pattern: location_service:{location_id}:{service_category}
        const parts = obj.object_key.split(":");
        if (parts.length >= 3) {
          matchKey = `${parts[1]}::${parts.slice(2).join(":").toLowerCase()}`;
        }
      } else if (obj.object_type === "location" && obj.location_id) {
        // Aggregate all services at this location
        const locationPrefix = `${obj.location_id}::`;
        let totalRev = 0;
        let totalCount = 0;
        for (const [k, v] of Object.entries(revenueMap)) {
          if (k.startsWith(locationPrefix)) {
            totalRev += v.revenue;
            totalCount += v.count;
          }
        }
        if (totalCount > 0) {
          upserts.push({
            seo_object_id: obj.id,
            organization_id,
            period_start: periodStartStr,
            period_end: periodEndStr,
            total_revenue: Math.round(totalRev * 100) / 100,
            transaction_count: totalCount,
            computed_at: new Date().toISOString(),
          });
        }
        continue;
      }

      if (matchKey && revenueMap[matchKey]) {
        const rev = revenueMap[matchKey];
        upserts.push({
          seo_object_id: obj.id,
          organization_id,
          period_start: periodStartStr,
          period_end: periodEndStr,
          total_revenue: Math.round(rev.revenue * 100) / 100,
          transaction_count: rev.count,
          computed_at: new Date().toISOString(),
        });
      }
    }

    // 6. Upsert snapshots
    if (upserts.length > 0) {
      const { error: upsertErr } = await supabase
        .from("seo_object_revenue")
        .upsert(upserts, {
          onConflict: "seo_object_id,period_start,period_end",
        });
      if (upsertErr) throw upsertErr;
    }

    return new Response(
      JSON.stringify({ success: true, snapshots_written: upserts.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("seo-revenue-snapshot error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
