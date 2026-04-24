import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIELD_PROMPTS: Record<string, string> = {
  hero_headline: "Generate a 3-5 word salon headline. Confident and aspirational, not clever or punny. Examples: 'Your Best Hair Awaits', 'Where Color Comes Alive'. Max 30 characters.",
  hero_subheadline: "Write a 1-sentence salon subheadline (max 60 chars). Supportive, not redundant with the headline. Describes the experience or promise.",
  brand_statement: "Write a 1-2 sentence salon brand statement (50-150 chars). Establishes identity and differentiator. Speak to the ideal client.",
  service_description: "Write a 1-sentence service description for a salon (max 120 chars). Focus on the benefit/transformation, not just what it is.",
  cta_button: "Generate a 2-4 word CTA button label for a salon website. Action-oriented, inviting. Examples: 'Book Now', 'Start Your Journey'. Max 25 characters.",
  eyebrow: "Generate a short eyebrow label (2-4 words, max 30 chars) for a salon section. Subtle, category-like. Examples: 'Hair • Color • Artistry', 'Our Craft'.",
  faq_answer: "Write a helpful, warm FAQ answer for a salon (2-3 sentences, max 200 chars). Professional but approachable.",
  rotating_words: "Generate a JSON array of 4-6 single words that could rotate in a salon headline. Each word should be evocative and aspirational. Return ONLY a JSON array like [\"word1\",\"word2\",\"word3\",\"word4\"].",
  meta_description: "Write a 150-160 character meta description for a salon webpage. Include location if mentioned. Optimized for local SEO with a call to action.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  luxe: "Tone: elevated luxury. Use refined, sophisticated language. Think high-end spa meets fashion editorial.",
  warm: "Tone: warm and welcoming. Friendly, inclusive, approachable. Like talking to a trusted friend.",
  edgy: "Tone: bold and edgy. Modern, confident, unapologetic. Stand out from traditional salons.",
  minimal: "Tone: clean and minimal. Few words, maximum impact. Understated elegance.",
  playful: "Tone: fun and playful. Energetic, youthful, personality-driven. Don't be afraid of wit.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fieldType, context, tone, salonName, currentValue } = await req.json();

    if (!fieldType || !FIELD_PROMPTS[fieldType]) {
      return new Response(
        JSON.stringify({ error: `Invalid fieldType: ${fieldType}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert salon website copywriter. You write short-form, high-converting copy for salon and beauty industry websites.

${TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.warm}

Rules:
- Never use exclamation marks excessively
- No generic filler phrases like "Welcome to our salon"
- Every word must earn its place
- Respect character limits strictly
- Output must be immediately usable — no quotes, no explanations`;

    const userPrompt = `${FIELD_PROMPTS[fieldType]}

${salonName ? `Salon name: ${salonName}` : ""}
${context ? `Salon context: ${context}` : ""}
${currentValue ? `Current text to improve: "${currentValue}"` : ""}

Generate 3 options.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_suggestions",
              description: "Return the generated copy suggestions",
              parameters: {
                type: "object",
                properties: {
                  suggestion: { type: "string", description: "The primary/best suggestion" },
                  alternatives: {
                    type: "array",
                    items: { type: "string" },
                    description: "2 alternative suggestions",
                  },
                },
                required: ["suggestion", "alternatives"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_suggestions" } },
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
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      // Fallback: parse from content
      const content = data.choices?.[0]?.message?.content || "";
      return new Response(
        JSON.stringify({ suggestion: content, alternatives: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("ai-content-writer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
