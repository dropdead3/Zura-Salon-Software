import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Zura, a salon business intelligence advisor specializing in commission economics and margin optimization.

## Your Role
- Advisory only — recommend specific commission rates that balance profitability with competitiveness
- Protective tone — never shaming, always constructive
- Industry-aware — reference salon benchmarks

## Industry Benchmarks (US Salon Averages)
- Commission rates: Entry 30-35%, Mid 38-45%, Senior 45-55%, Master 50-60%
- Healthy salon net margin: 10-20% after all costs
- Product cost as % of revenue: 8-12% is typical
- Monthly overhead per stylist: $2,500-$6,000 depending on market
- Revenue per stylist/month: Entry $3-5K, Mid $6-10K, Senior $10-15K, Master $15-25K+

## Margin Math Context
- Variable cost rate = service_commission + retail_commission + product_cost_pct
- Breakeven revenue = (overhead + hourly_wage_cost) / (1 - variable_cost_rate)
- Target revenue = (overhead + hourly_wage_cost) / (1 - variable_cost_rate - target_margin_pct)
- Margin at revenue = (revenue - revenue * variable_cost_rate - overhead - hourly_wage_cost) / revenue
- hourly_wage_cost = hourly_wage × hours_per_month (only for levels with hourly wages enabled)

## Optimization Guidelines
- Never recommend rates below 28% (uncompetitive, talent flight risk)
- Never recommend rates above 60% (unsustainable margins)
- Maintain minimum 3pp spread between adjacent levels
- Consider stylist count — levels with many stylists have outsized margin impact
- If actual revenue is strong, rates can be slightly higher (reinvest in talent)
- If actual revenue is weak, lowering rates may not help — flag revenue as the real issue
- Retail commission should be lower than service commission (typically 8-15%)
- If a level is already at target margin, recommend keeping current rates

## Confidence Levels
- high: Strong revenue data, clear margin math, obvious optimization path
- medium: Some data gaps or borderline cases
- low: Very little revenue data or conflicting signals

Provide your recommendations using the provided tool. Be specific with rationale — owners need to justify changes to their teams.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { levels, assumptions, revenueByLevel } = body;

    if (!levels || !assumptions) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: levels, assumptions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the user prompt with all data
    const userPrompt = `Analyze these commission levels and recommend optimal rates to hit the owner's target margin.

## Current Assumptions
- Monthly overhead per stylist: $${assumptions.overhead_per_stylist}
- Product cost %: ${(assumptions.product_cost_pct * 100).toFixed(1)}%
- Target margin %: ${(assumptions.target_margin_pct * 100).toFixed(1)}%
- Hours per month (for hourly wage modeling): ${assumptions.hours_per_month ?? 160}

## Current Levels
${levels.map((l: any, i: number) => {
  const rev = revenueByLevel?.find((r: any) => r.level_id === l.id);
  const hourlyInfo = l.hourly_wage_enabled && l.hourly_wage
    ? `\n   - Hourly wage: $${l.hourly_wage}/hr (enabled) → fixed cost: $${(l.hourly_wage * (assumptions.hours_per_month ?? 160)).toLocaleString()}/mo`
    : '\n   - Hourly wage: Not enabled';
  return `${i + 1}. ${l.label} (slug: ${l.slug})
   - Service commission: ${((l.service_commission_rate || 0) * 100).toFixed(1)}%
   - Retail commission: ${((l.retail_commission_rate || 0) * 100).toFixed(1)}%${hourlyInfo}
   - Stylists at this level: ${rev?.stylist_count ?? 0}
   - Avg monthly revenue/stylist: $${rev?.avg_monthly_revenue ? Math.round(rev.avg_monthly_revenue).toLocaleString() : 'No data'}`;
}).join('\n')}

Recommend optimal service and retail commission rates for each level to hit the ${(assumptions.target_margin_pct * 100).toFixed(0)}% target margin. Consider actual revenue performance, hourly wage fixed costs where applicable, and industry benchmarks.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "commission_recommendations",
              description: "Return commission rate recommendations for each level",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        level_slug: { type: "string", description: "The slug of the level" },
                        current_service_rate: { type: "number", description: "Current service commission rate as decimal (e.g. 0.40)" },
                        recommended_service_rate: { type: "number", description: "Recommended service commission rate as decimal" },
                        current_retail_rate: { type: "number", description: "Current retail commission rate as decimal" },
                        recommended_retail_rate: { type: "number", description: "Recommended retail commission rate as decimal" },
                        rationale: { type: "string", description: "Brief explanation of why this rate is recommended" },
                        projected_margin_at_current_revenue: { type: "number", description: "Projected margin % as decimal at current avg revenue with recommended rates" },
                      },
                      required: ["level_slug", "current_service_rate", "recommended_service_rate", "current_retail_rate", "recommended_retail_rate", "rationale", "projected_margin_at_current_revenue"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Overall summary of the recommendations (2-3 sentences)" },
                  confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level in the recommendations" },
                },
                required: ["recommendations", "summary", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "commission_recommendations" } },
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      const errorText = await response.text();
      console.error("AI gateway error:", statusCode, errorText);

      if (statusCode === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (statusCode === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiResult));
      return new Response(
        JSON.stringify({ error: "AI did not return structured recommendations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recommendations = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(recommendations),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
