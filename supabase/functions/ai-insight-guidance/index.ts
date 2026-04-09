import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROUTE_MAP = `
INTERNAL ROUTE REFERENCE — ONLY use these exact routes for markdown links. NEVER invent or guess a route that is not listed here.

- Sales Analytics: /dashboard/admin/analytics?tab=sales
- Operations Analytics: /dashboard/admin/analytics?tab=operations
- Marketing Analytics: /dashboard/admin/analytics?tab=marketing
- Reports: /dashboard/admin/analytics?tab=reports
- Leaderboard: /dashboard/leaderboard
- Payroll Hub: /dashboard/admin/payroll
- Client Directory: /dashboard/clients
- Team Overview: /dashboard/admin/team
- Schedule: /dashboard/schedule
- Inventory: /dashboard/inventory
- Operations Hub: /dashboard/admin/management
- Settings: /dashboard/admin/settings
- Phorest Connection: /dashboard/admin/phorest
- Day Rates: /dashboard/admin/day-rate-settings
- My Stats: /dashboard/stats
- My Pay: /dashboard/my-pay
- Command Center: /dashboard
- Renter Hub: /dashboard/admin/booth-renters
- Help Center: /dashboard/help
- Team Chat: /dashboard/team-chat
- Training: /dashboard/training
`;

const SYSTEM_PROMPT = `You are an expert salon business consultant. Given a specific business insight or action item from an AI analytics dashboard, provide practical, step-by-step guidance on how to address it.

Guidelines:
- Be specific and actionable — give concrete steps the salon owner/manager can take TODAY
- Keep it to 2-3 short paragraphs
- Reference salon-specific strategies (rebooking rates, retail attachment, stylist utilization, etc.)
- If it involves numbers/metrics, suggest specific targets or benchmarks
- Use a warm, encouraging but professional tone
- Format with markdown (bold key actions, use bullet points for steps)
- IMPORTANT: When referencing platform features, pages, or reports, embed markdown hyperlinks using the route reference below so users can navigate directly. For example: "Head to your [Sales Analytics](/dashboard/admin/analytics?tab=sales) to review daily trends" or "Check your [Leaderboard](/dashboard/leaderboard) for team rankings."
- Only link to routes that are contextually relevant — don't force links where they don't fit naturally.
- CRITICAL: You must ONLY use routes from the INTERNAL ROUTE REFERENCE below. Do NOT invent, guess, or fabricate any route. If no route in the list matches what you want to link to, do NOT create a link — just mention the feature by name without a hyperlink.
- CRITICAL: At the very end of your response, you MUST include a structured action block in this EXACT format (3-5 items). This block is machine-parsed — do not deviate from this format:

---ACTIONS---
1. [Action Title]: [Brief description of what to do]
2. [Action Title]: [Brief description of what to do]
3. [Action Title]: [Brief description of what to do]
---END---

${ROUTE_MAP}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, title, description, category, priority } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userPrompt = "";
    if (type === "insight") {
      userPrompt = `Business Insight (${category || "general"}):\nTitle: ${title}\nDetails: ${description}\n\nHow should I address this insight? What specific steps should I take?`;
    } else {
      userPrompt = `Action Item (Priority: ${priority || "medium"}):\n${title || description}\n\nWhat exactly should I do to accomplish this? Give me a clear plan.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        max_tokens: 8192,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const guidance = result.choices?.[0]?.message?.content || "Unable to generate guidance at this time.";

    return new Response(
      JSON.stringify({ guidance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("AI insight guidance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
