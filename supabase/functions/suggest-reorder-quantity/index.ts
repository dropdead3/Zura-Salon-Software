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

    const { product_id, organization_id } = await req.json();
    if (!product_id || !organization_id) {
      return new Response(JSON.stringify({ error: "product_id and organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch product details
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("name, sku, quantity_on_hand, reorder_level, cost_price")
      .eq("id", product_id)
      .single();

    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch supplier lead time if available
    const { data: supplier } = await supabase
      .from("product_suppliers")
      .select("lead_time_days, supplier_name")
      .eq("product_id", product_id)
      .limit(1)
      .maybeSingle();

    const leadTimeDays = supplier?.lead_time_days ?? 7;

    // Fetch last 90 days of sales for this product from phorest_transaction_items
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateFrom = ninetyDaysAgo.toISOString().slice(0, 10);

    const { data: txItems } = await supabase
      .from("phorest_transaction_items")
      .select("quantity, transaction_date, total_amount")
      .eq("item_type", "product")
      .gte("transaction_date", dateFrom)
      .or(`item_name.ilike.%${product.name}%${product.sku ? `,item_name.ilike.%${product.sku}%` : ""}`);

    // Calculate sales velocity
    const totalSold = (txItems || []).reduce((sum: any, item: any) => sum + (item.quantity || 1), 0);
    const daysInPeriod = Math.max(1, Math.ceil((Date.now() - ninetyDaysAgo.getTime()) / 86400000));
    const avgDailySales = totalSold / daysInPeriod;

    // Weekly breakdown for trend
    const weeklyMap: Record<number, number> = {};
    for (const item of txItems || []) {
      const d = new Date(item.transaction_date);
      const weekNum = Math.floor((Date.now() - d.getTime()) / (7 * 86400000));
      weeklyMap[weekNum] = (weeklyMap[weekNum] || 0) + (item.quantity || 1);
    }

    const weeks = Object.keys(weeklyMap).map(Number).sort((a: any, b: any) => a - b);
    let trend = "stable";
    if (weeks.length >= 4) {
      const recentAvg = (weeklyMap[0] || 0 + (weeklyMap[1] || 0)) / 2;
      const olderAvg = (weeklyMap[weeks[weeks.length - 1]] || 0 + (weeklyMap[weeks[weeks.length - 2]] || 0)) / 2;
      if (recentAvg > olderAvg * 1.2) trend = "increasing";
      else if (recentAvg < olderAvg * 0.8) trend = "decreasing";
    }

    // Send to AI for structured suggestion
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: simple calculation without AI
      const coverageDays = leadTimeDays + 14; // lead time + 2 weeks buffer
      const suggested = Math.max(1, Math.ceil(avgDailySales * coverageDays) - (product.quantity_on_hand || 0));
      return new Response(JSON.stringify({
        suggested_quantity: suggested,
        reasoning: `Based on ${totalSold} units sold in 90 days (${avgDailySales.toFixed(1)}/day), with ${leadTimeDays}-day lead time and 2-week buffer.`,
        confidence: totalSold > 10 ? "high" : totalSold > 3 ? "medium" : "low",
        sales_velocity: avgDailySales,
        trend,
        total_sold_90d: totalSold,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Analyze this product inventory data and suggest a reorder quantity.

Product: ${product.name}
Current stock: ${product.quantity_on_hand ?? 0}
Minimum stock level: ${product.reorder_level ?? "not set"}
Cost per unit: ${product.cost_price ?? "unknown"}
Supplier lead time: ${leadTimeDays} days
Total units sold in last 90 days: ${totalSold}
Average daily sales: ${avgDailySales.toFixed(2)}
Sales trend: ${trend}
Weekly sales breakdown (week 0 = current): ${JSON.stringify(weeklyMap)}

Consider: lead time coverage, safety stock, trend direction, and cost efficiency of ordering.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an inventory management analyst. Provide precise reorder recommendations." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_reorder",
            description: "Return a reorder quantity suggestion with reasoning.",
            parameters: {
              type: "object",
              properties: {
                suggested_quantity: { type: "number", description: "Number of units to reorder" },
                reasoning: { type: "string", description: "Brief explanation (1-2 sentences)" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["suggested_quantity", "reasoning", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_reorder" } },
      }),
    });

    if (!aiResponse.ok) {
      // Fallback calculation
      const coverageDays = leadTimeDays + 14;
      const suggested = Math.max(1, Math.ceil(avgDailySales * coverageDays) - (product.quantity_on_hand || 0));
      return new Response(JSON.stringify({
        suggested_quantity: suggested,
        reasoning: `Based on ${totalSold} units sold in 90 days (${avgDailySales.toFixed(1)}/day).`,
        confidence: totalSold > 10 ? "high" : totalSold > 3 ? "medium" : "low",
        sales_velocity: avgDailySales,
        trend,
        total_sold_90d: totalSold,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let suggestion;
    if (toolCall?.function?.arguments) {
      suggestion = JSON.parse(toolCall.function.arguments);
    } else {
      const coverageDays = leadTimeDays + 14;
      suggestion = {
        suggested_quantity: Math.max(1, Math.ceil(avgDailySales * coverageDays) - (product.quantity_on_hand || 0)),
        reasoning: `Based on ${totalSold} units sold in 90 days.`,
        confidence: totalSold > 10 ? "high" : "medium",
      };
    }

    return new Response(JSON.stringify({
      ...suggestion,
      sales_velocity: avgDailySales,
      trend,
      total_sold_90d: totalSold,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
