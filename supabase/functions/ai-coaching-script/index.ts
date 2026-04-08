import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KpiSnapshotSchema = z.object({
  metric: z.string(),
  current: z.number(),
  target: z.number(),
  gap: z.number(),
  unit: z.string(),
  trajectory: z.enum(["improving", "declining", "flat"]),
  daysToTarget: z.number().nullable(),
});

const BodySchema = z.object({
  stylistName: z.string().min(1).max(255),
  currentLevel: z.string().min(1).max(100),
  nextLevel: z.string().max(100).nullable(),
  kpiSnapshot: z.array(KpiSnapshotSchema).min(1).max(20),
  goalDaysRemaining: z.number().int().positive().nullable().optional(),
});

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Validate input
    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { stylistName, currentLevel, nextLevel, kpiSnapshot, goalDaysRemaining } = parsed.data;

    // Identify strengths and weaknesses
    const met = kpiSnapshot.filter((k) => k.gap <= 0);
    const unmet = kpiSnapshot.filter((k) => k.gap > 0);
    const declining = unmet.filter((k) => k.trajectory === "declining");

    const strengthsList = met.map((k) => k.metric).join(", ") || "None yet";
    const weakList = unmet.map((k) => `${k.metric} (gap: ${k.gap.toFixed(1)} ${k.unit}, ${k.trajectory})`).join("; ");

    const goalContext = goalDaysRemaining
      ? `\n- Goal timeline: ${goalDaysRemaining} days to level up`
      : "";

    const systemPrompt = `You are a salon performance coach for a platform called Zura. Your tone is calm, structured, advisory, and protective — never shaming. You help stylists understand exactly what to do to level up.

Context:
- Stylist: ${stylistName}
- Current level: ${currentLevel}
- Next level: ${nextLevel || "Top level (maintenance)"}
- Strengths (metrics already met): ${strengthsList}
- Gaps: ${weakList || "None — all met"}
- Declining metrics: ${declining.length > 0 ? declining.map((k) => k.metric).join(", ") : "None"}${goalContext}

Generate a structured coaching plan.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a coaching plan for this stylist. Focus on the top 3 highest-impact gaps.${goalDaysRemaining ? ` The stylist has set a ${goalDaysRemaining}-day goal — tailor urgency and daily actions accordingly.` : ""}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_coaching_plan",
              description: "Return a structured coaching plan with summary, actions, and strengths.",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "2-3 sentence coaching summary. Advisory tone, no shame language.",
                  },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short action title (e.g., 'Request walk-in routing')" },
                        script: {
                          type: "string",
                          description: "A specific, actionable script or step-by-step instruction the stylist can follow. Include exact words to say if applicable.",
                        },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        kpi: { type: "string", description: "Which KPI this action targets" },
                      },
                      required: ["title", "script", "priority", "kpi"],
                      additionalProperties: false,
                    },
                    description: "3 specific action items ranked by impact",
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "1-2 sentence acknowledgments of what the stylist is doing well",
                  },
                },
                required: ["summary", "actions", "strengths"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_coaching_plan" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const coaching = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(coaching), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-coaching-script error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
