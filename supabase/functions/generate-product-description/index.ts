import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, brand, url, category } = await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: "productName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If URL provided, try to fetch page content
    let pageContext = "";
    if (url) {
      try {
        const pageResp = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ProductBot/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        if (pageResp.ok) {
          const html = await pageResp.text();
          // Strip HTML tags and extract text content
          const textContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 4000);
          pageContext = textContent;
        }
      } catch (e: any) {
        console.log("Failed to fetch URL, proceeding without page content:", e.message);
      }
    }

    const systemPrompt = `You are a retail product copywriter for professional salons and beauty businesses. Write concise, compelling product descriptions that highlight key benefits for salon clients.

Rules:
- Write 2-3 sentences max
- Focus on benefits, not just features
- Use professional but approachable tone
- Mention key ingredients or technology if relevant
- End with who the product is ideal for
- Do NOT include the product name or brand at the start — the user already sees those
- Do NOT use marketing fluff like "revolutionary" or "game-changing"`;

    let userPrompt = `Write a retail product description for: "${productName}"`;
    if (brand) userPrompt += ` by ${brand}`;
    if (category) userPrompt += ` (category: ${category})`;
    if (pageContext) {
      userPrompt += `\n\nHere is content from the manufacturer's website about this product:\n${pageContext}`;
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to generate description" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const description = aiData.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ description }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-product-description error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
