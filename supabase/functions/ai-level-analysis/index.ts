import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Zura, a salon business intelligence advisor. You analyze stylist level configurations and provide structured, actionable feedback.

## Your Role
- Advisory only — recommend, never execute
- Protective tone — never shaming, always constructive
- Industry-aware — reference salon benchmarks

## Industry Benchmarks (US Salon Averages)
- Commission rates: Entry 30-35%, Mid 38-45%, Senior 45-55%, Master 50-60%
- Commission spread: Healthy minimum 15-20 percentage points from lowest to highest
- Commission increments: Should be consistent (3-5pp per level) — large jumps create resentment
- Revenue thresholds per level tier: Entry $3-5K/mo, Mid $6-10K/mo, Senior $10-15K/mo, Master $15-25K+/mo
- Retail attachment: 15-22% is typical; above 25% is aggressive
- Rebooking rate: 60-75% is healthy; below 50% is concerning
- Client retention: 70-85% is healthy
- Average ticket: varies widely by market, but should scale ~15-25% per level
- Tenure requirements: 90-180 days minimum per level is common
- Grace periods for retention: 30-60 days is standard; below 14 days is harsh; above 90 days is lenient

## Retention vs Promotion Relationship
- Retention thresholds should be ~60-75% of promotion thresholds
- If retention is too close to promotion, stylists feel constantly at risk
- If retention is too far below promotion, it provides no accountability

## Structural Checks
- Every level except the lowest should have promotion criteria
- Every level except the lowest should have retention criteria
- Missing criteria for mid-tier levels is a governance gap
- Evaluation windows should be consistent (30-90 days)
- Weight distribution should emphasize revenue-driving metrics

## Analysis Guidelines
- Compare adjacent levels for logical progression
- Flag any metrics that jump more than 50% between consecutive levels
- Identify missing criteria as gaps
- Note if commission rates don't scale with expectations
- Check if the number of levels is appropriate (3-6 is typical; more than 7 creates confusion)
- Validate that the lowest level has reasonable entry requirements (not too high)

Provide your analysis as structured data using the provided tool.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ) as any;

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { levels, promotionCriteria, retentionCriteria } = await req.json();

    if (!Array.isArray(levels) || levels.length === 0) {
      return new Response(
        JSON.stringify({ error: "No levels provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user prompt with configuration data
    const userPrompt = `Analyze this salon's stylist level configuration:

## Levels (${levels.length} total)
${levels.map((l: any, i: number) => `${i + 1}. "${l.label}" (slug: ${l.slug}) — Service Commission: ${l.serviceCommissionRate || 'not set'}%, Retail Commission: ${l.retailCommissionRate || 'not set'}%`).join("\n")}

## Promotion Criteria
${(promotionCriteria || []).length === 0 ? "None configured" : (promotionCriteria || []).map((c: any) => {
  const levelLabel = levels.find((l: any) => l.dbId === c.stylist_level_id)?.label || c.stylist_level_id;
  const metrics: string[] = [];
  if (c.revenue_enabled) metrics.push(`Revenue: $${c.revenue_threshold}/mo (weight: ${c.revenue_weight})`);
  if (c.retail_enabled) metrics.push(`Retail: ${c.retail_pct_threshold}% (weight: ${c.retail_weight})`);
  if (c.rebooking_enabled) metrics.push(`Rebooking: ${c.rebooking_pct_threshold}% (weight: ${c.rebooking_weight})`);
  if (c.avg_ticket_enabled) metrics.push(`Avg Ticket: $${c.avg_ticket_threshold} (weight: ${c.avg_ticket_weight})`);
  if (c.tenure_enabled) metrics.push(`Tenure: ${c.tenure_days} days`);
  if (c.retention_rate_enabled) metrics.push(`Client Retention: ${c.retention_rate_threshold}%`);
  if (c.new_clients_enabled) metrics.push(`New Clients: ${c.new_clients_threshold}/mo`);
  if (c.utilization_enabled) metrics.push(`Utilization: ${c.utilization_threshold}%`);
  if (c.revenue_per_hour_enabled) metrics.push(`Revenue/Hour: $${c.revenue_per_hour_threshold}`);
  return `### ${levelLabel}\nEval Window: ${c.evaluation_window_days} days\n${metrics.length > 0 ? metrics.join("\n") : "No metrics enabled"}`;
}).join("\n\n")}

## Retention Criteria ("Required to Stay")
${(retentionCriteria || []).length === 0 ? "None configured" : (retentionCriteria || []).map((r: any) => {
  const levelLabel = levels.find((l: any) => l.dbId === r.stylist_level_id)?.label || r.stylist_level_id;
  const metrics: string[] = [];
  if (r.revenue_enabled) metrics.push(`Min Revenue: $${r.revenue_minimum}/mo`);
  if (r.retail_enabled) metrics.push(`Min Retail: ${r.retail_pct_minimum}%`);
  if (r.rebooking_enabled) metrics.push(`Min Rebooking: ${r.rebooking_pct_minimum}%`);
  if (r.avg_ticket_enabled) metrics.push(`Min Avg Ticket: $${r.avg_ticket_minimum}`);
  if (r.retention_rate_enabled) metrics.push(`Min Client Retention: ${r.retention_rate_minimum}%`);
  return `### ${levelLabel}\nGrace Period: ${r.grace_period_days} days | Action: ${r.action_type}\nEval Window: ${r.evaluation_window_days} days\n${metrics.length > 0 ? metrics.join("\n") : "No metrics enabled"}`;
}).join("\n\n")}

Provide a thorough analysis with specific, actionable feedback.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                name: "provide_analysis",
                description:
                  "Return a structured analysis of the salon's level configuration",
                parameters: {
                  type: "object",
                  properties: {
                    overallRating: {
                      type: "string",
                      enum: ["well_structured", "needs_attention", "requires_review"],
                      description: "Overall assessment of the configuration",
                    },
                    overallSummary: {
                      type: "string",
                      description: "1-2 sentence summary of the overall assessment",
                    },
                    strengths: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          affectedLevels: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["title", "description"],
                        additionalProperties: false,
                      },
                      description: "What looks good about this configuration",
                    },
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          severity: {
                            type: "string",
                            enum: ["low", "medium", "high"],
                          },
                          affectedLevels: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["title", "description", "severity"],
                        additionalProperties: false,
                      },
                      description: "Specific improvements to consider",
                    },
                    considerations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          affectedLevels: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["title", "description"],
                        additionalProperties: false,
                      },
                      description: "General things to think about",
                    },
                  },
                  required: [
                    "overallRating",
                    "overallSummary",
                    "strengths",
                    "suggestions",
                    "considerations",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "provide_analysis" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to generate analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiResult));
      return new Response(
        JSON.stringify({ error: "AI did not return structured analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-level-analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
