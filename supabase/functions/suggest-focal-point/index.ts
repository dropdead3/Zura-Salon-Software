/**
 * suggest-focal-point — given a public image URL, asks Lovable AI (vision) to
 * identify the most important subject and returns focal coordinates as
 * percentages (0..100) suitable for CSS `object-position`.
 *
 * Used by the Hero background editor to auto-suggest a focal anchor on image
 * upload. Manual drags from the operator always win — this only seeds the
 * initial value.
 *
 * Returns: { x: number, y: number, reason: string } where x/y are 0..100.
 * On any failure (rate limit, invalid image, parse error) returns a structured
 * error and the caller falls back to 50/50.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You analyze hero/banner images and identify the most important subject (face, product, focal element). Return CSS object-position percentages so the subject stays visible when the image is cropped to varying aspect ratios.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Identify the focal subject in this image. Return x (horizontal %) and y (vertical %) where 0,0 is top-left and 100,100 is bottom-right. For portraits, anchor on the face. For products, anchor on the product. Default to 50,50 only if no clear subject.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_focal_point",
              description: "Return the focal point coordinates for the image",
              parameters: {
                type: "object",
                properties: {
                  x: { type: "number", description: "Horizontal % (0-100)" },
                  y: { type: "number", description: "Vertical % (0-100)" },
                  reason: { type: "string", description: "Brief description of what was anchored" },
                },
                required: ["x", "y", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_focal_point" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("[suggest-focal-point] gateway error", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No focal point detected" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const x = Math.max(0, Math.min(100, Math.round(Number(parsed.x) || 50)));
    const y = Math.max(0, Math.min(100, Math.round(Number(parsed.y) || 50)));
    const reason = typeof parsed.reason === "string" ? parsed.reason : "";

    return new Response(JSON.stringify({ x, y, reason }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[suggest-focal-point] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
