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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey) as any;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { forceRefresh = false, locationId = null } = body;

    // Resolve org
    const { data: empRow } = await supabase
      .from("employee_profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: adminRow } = await supabase
      .from("organization_admins")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const orgId = empRow?.organization_id ?? adminRow?.organization_id;
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "No organization found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cacheKey = locationId ? `supply:${locationId}` : "supply:all";

    // Check cache (15 min TTL) unless force refresh
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("ai_business_insights")
        .select("*")
        .eq("organization_id", orgId)
        .eq("location_id", cacheKey)
        .order("generated_at", { ascending: false })
        .limit(1);
      if (cached?.[0]) {
        const age =
          Date.now() - new Date(cached[0].generated_at).getTime();
        if (age < 15 * 60 * 1000) {
          return new Response(JSON.stringify({ insights: cached[0].insights }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // ── Gather data ──────────────────────────────────────

    // 1. Inventory risk projections
    let riskQuery = supabase
      .from("inventory_risk_projections")
      .select(
        "product_id, current_on_hand, avg_daily_usage, projected_depletion_date, stockout_risk_level, recommended_order_qty"
      )
      .eq("organization_id", orgId);
    if (locationId) riskQuery = riskQuery.eq("location_id", locationId);
    const { data: riskRows } = await riskQuery;

    // 2. Products with cost/quantity
    const { data: products } = await supabase
      .from("products")
      .select("id, name, brand, cost_price, retail_price, quantity_on_hand, container_size")
      .eq("organization_id", orgId)
      .eq("is_active", true);

    // 3. Recent cost history (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const { data: costHistory } = await supabase
      .from("product_cost_history")
      .select("product_id, cost_price, recorded_at, supplier_name")
      .eq("organization_id", orgId)
      .gte("recorded_at", sixMonthsAgo.toISOString())
      .order("recorded_at", { ascending: true });

    // 4. Waste data from analytics snapshots (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    let wasteQuery = supabase
      .from("backroom_analytics_snapshots")
      .select(
        "snapshot_date, total_waste_qty, waste_pct, total_product_cost, total_service_revenue, ghost_loss_cost, staff_metrics"
      )
      .eq("organization_id", orgId)
      .gte("snapshot_date", ninetyDaysAgo.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: false });
    if (locationId) wasteQuery = wasteQuery.eq("location_id", locationId);
    const { data: wasteSnapshots } = await wasteQuery;

    // Build product name map
    const productMap = new Map(
      (products ?? []).map((p: any) => [p.id, p])
    );

    // ── Compute KPI summaries ────────────────────────────

    // Waste KPI: annualize from 90-day data
    const totalWasteCost90d = (wasteSnapshots ?? []).reduce(
      (sum: number, s: any) => sum + (s.ghost_loss_cost ?? 0),
      0
    );
    const annualizedWasteCost = Math.round((totalWasteCost90d / 90) * 365);

    // Reorder KPI
    const highRiskProducts = (riskRows ?? []).filter(
      (r: any) =>
        r.stockout_risk_level === "high" || r.stockout_risk_level === "critical"
    );

    // Usage variance: from staff_metrics in snapshots
    const latestSnapshot = (wasteSnapshots ?? [])[0];

    // Price increases
    const priceIncreases: any[] = [];
    const productCostMap = new Map<string, number[]>();
    for (const entry of costHistory ?? []) {
      const arr = productCostMap.get(entry.product_id) ?? [];
      arr.push(entry.cost_price);
      productCostMap.set(entry.product_id, arr);
    }
    for (const [pid, costs] of productCostMap) {
      if (costs.length >= 2) {
        const oldest = costs[0];
        const newest = costs[costs.length - 1];
        const pctChange = ((newest - oldest) / oldest) * 100;
        if (pctChange > 10) {
          const prod = productMap.get(pid);
          priceIncreases.push({
            product_id: pid,
            product_name: prod?.name ?? "Unknown",
            brand: prod?.brand,
            old_price: oldest,
            new_price: newest,
            pct_increase: Math.round(pctChange),
          });
        }
      }
    }

    // ── Build context for AI ─────────────────────────────
    const contextSummary = {
      annual_waste_cost: annualizedWasteCost,
      waste_snapshots_count: (wasteSnapshots ?? []).length,
      latest_waste_pct: latestSnapshot?.waste_pct ?? null,
      total_product_cost_90d: (wasteSnapshots ?? []).reduce(
        (s: number, w: any) => s + (w.total_product_cost ?? 0),
        0
      ),
      reorder_risk_products: highRiskProducts.map((r: any) => ({
        product_name: productMap.get(r.product_id)?.name ?? "Unknown",
        brand: productMap.get(r.product_id)?.brand,
        on_hand: r.current_on_hand,
        daily_usage: r.avg_daily_usage,
        depletion_date: r.projected_depletion_date,
        risk: r.stockout_risk_level,
        recommended_qty: r.recommended_order_qty,
      })),
      price_increases: priceIncreases.slice(0, 10),
      total_active_products: (products ?? []).length,
      total_inventory_value: (products ?? []).reduce(
        (s: number, p: any) =>
          s + (p.cost_price ?? 0) * (p.quantity_on_hand ?? 0),
        0
      ),
    };

    // ── AI Generation ────────────────────────────────────
    if (!lovableKey) {
      // Return raw KPIs without AI
      const fallbackInsights = {
        kpis: {
          annual_waste_cost: annualizedWasteCost,
          products_at_risk: highRiskProducts.length,
          price_increases_count: priceIncreases.length,
          total_inventory_value: contextSummary.total_inventory_value,
        },
        insights: [],
        generated_at: new Date().toISOString(),
      };
      return new Response(JSON.stringify({ insights: fallbackInsights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are Zura Supply Intelligence, an AI analyst for salon supply chain optimization.
You analyze inventory, waste, margin, and usage data to generate actionable supply chain insights.

Respond ONLY by calling the supply_insights tool with structured data.

Rules:
- Each insight must include estimated_annual_impact as a dollar amount
- Severity: critical (needs action today), warning (needs action this week), info (optimization opportunity)
- Categories: inventory, waste, margin, usage, price
- Be specific: mention product names, brands, and exact quantities
- Focus on the highest-impact insights first
- Maximum 8 insights`;

    const userPrompt = `Analyze this salon's supply chain data and generate actionable insights:

${JSON.stringify(contextSummary, null, 2)}

Generate insights covering:
1. INVENTORY: Any products at risk of stockout
2. WASTE: Annual waste cost and top contributors
3. MARGIN: Opportunities to improve profit per service
4. USAGE: Variance between staff members
5. PRICE: Significant cost increases from suppliers`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "supply_insights",
                description:
                  "Return supply intelligence KPIs and actionable insights.",
                parameters: {
                  type: "object",
                  properties: {
                    summary_line: {
                      type: "string",
                      description:
                        "One-sentence executive summary of supply health",
                    },
                    overall_health: {
                      type: "string",
                      enum: ["healthy", "attention_needed", "critical"],
                    },
                    kpis: {
                      type: "object",
                      properties: {
                        annual_waste_cost: { type: "number" },
                        products_at_risk: { type: "number" },
                        margin_opportunity_per_service: { type: "number" },
                        usage_variance_pct: { type: "number" },
                      },
                      required: [
                        "annual_waste_cost",
                        "products_at_risk",
                        "margin_opportunity_per_service",
                        "usage_variance_pct",
                      ],
                    },
                    insights: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: {
                            type: "string",
                            enum: [
                              "inventory",
                              "waste",
                              "margin",
                              "usage",
                              "price",
                            ],
                          },
                          severity: {
                            type: "string",
                            enum: ["critical", "warning", "info"],
                          },
                          title: { type: "string" },
                          description: { type: "string" },
                          estimated_annual_impact: { type: "number" },
                          product_id: {
                            type: "string",
                            description: "Product ID if applicable",
                          },
                          suggested_action: { type: "string" },
                        },
                        required: [
                          "category",
                          "severity",
                          "title",
                          "description",
                          "estimated_annual_impact",
                          "suggested_action",
                        ],
                      },
                    },
                  },
                  required: [
                    "summary_line",
                    "overall_health",
                    "kpis",
                    "insights",
                  ],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "supply_insights" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      // Return fallback KPIs
      const fallback = {
        kpis: {
          annual_waste_cost: annualizedWasteCost,
          products_at_risk: highRiskProducts.length,
          margin_opportunity_per_service: 0,
          usage_variance_pct: 0,
        },
        insights: [],
        summary_line: "AI analysis unavailable. Showing raw metrics.",
        overall_health: "attention_needed",
        generated_at: new Date().toISOString(),
      };
      return new Response(JSON.stringify({ insights: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let parsedInsights: any;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      parsedInsights = JSON.parse(toolCall.function.arguments);
    } catch {
      parsedInsights = {
        summary_line: "Analysis complete.",
        overall_health: "attention_needed",
        kpis: {
          annual_waste_cost: annualizedWasteCost,
          products_at_risk: highRiskProducts.length,
          margin_opportunity_per_service: 0,
          usage_variance_pct: 0,
        },
        insights: [],
      };
    }

    parsedInsights.generated_at = new Date().toISOString();

    // Cache result
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await supabase.from("ai_business_insights").insert({
      organization_id: orgId,
      location_id: cacheKey,
      insights: parsedInsights,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    return new Response(JSON.stringify({ insights: parsedInsights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("supply-intelligence error:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
