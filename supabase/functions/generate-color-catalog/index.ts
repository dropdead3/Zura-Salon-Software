import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProductEntry {
  name: string;
  category: string;
  product_line: string;
  default_unit: string;
  default_depletion: string;
  size_options: string[];
  swatch_hex?: string;
}

interface VerificationResult {
  verified: boolean;
  warnings: string[];
  confidence: "high" | "medium" | "low";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, is_professional, verify_url } = await req.json();

    if (!brand || typeof brand !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "brand is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const professional = is_professional !== false;

    const swatchInstruction = professional
      ? ""
      : `\n- For consumer/direct-to-consumer brands, include the known hex color for each shade in swatch_hex (e.g. "#E10600" for Arctic Fox Wrath). These brands have well-known specific colors. If you are unsure of the exact hex, omit swatch_hex for that product.`;

    const systemPrompt = `You are a world-class expert on professional and consumer hair color product lines sold in the United States.
Your task is to generate a COMPLETE, ACCURATE product catalog for a specific brand.

RULES:
- Include EVERY shade/product in the brand's current US lineup
- For color lines: include every single shade number and name (e.g. "Majirel 5.0 Light Brown")
- For developers: include all volumes (10, 20, 30, 40 vol) and sizes
- For lighteners/bleach: include all powder and cream lighteners
- For toners: include all toner shades
- For bond builders, treatments, additives: include all relevant products
- Use the EXACT product names as they appear on packaging/marketing
- Do NOT invent products. Only include products that actually exist.
- Do NOT include discontinued products unless they are still widely available.
- Categories must be one of: color, lightener, developer, toner, bond builder, treatment, additive
- product_line should be the sub-line within the brand (e.g. "Majirel", "Dia Light" for L'Oréal)
- default_unit: "g" for color/lightener, "ml" for developer/toner/treatment
- default_depletion: "weighed" for color/lightener, "per_service" for developer/toner
- size_options: array of common sizes like ["60g"], ["1000ml", "500ml"], etc.${swatchInstruction}`;

    const userPrompt = `Generate the complete product catalog for: "${brand}"
This is a ${professional ? "professional salon" : "consumer/direct-to-consumer"} brand.
Return EVERY shade and product. Be thorough and accurate.`;

    console.log(`Generating catalog for brand: ${brand} (professional: ${professional})`);

    // Build tool schema — include swatch_hex for consumer brands
    const productProperties: Record<string, any> = {
      name: { type: "string", description: "Full product name including shade number if applicable" },
      category: { type: "string", enum: ["color", "lightener", "developer", "toner", "bond builder", "treatment", "additive"] },
      product_line: { type: "string", description: "Sub-line within the brand (e.g. Majirel, Dia Light)" },
      default_unit: { type: "string", enum: ["g", "ml", "oz"] },
      default_depletion: { type: "string", enum: ["weighed", "per_service", "manual", "per_pump"] },
      size_options: { type: "array", items: { type: "string" } },
    };
    const requiredFields = ["name", "category", "product_line", "default_unit", "default_depletion", "size_options"];

    if (!professional) {
      productProperties.swatch_hex = {
        type: "string",
        description: "Known hex color for this shade (e.g. #E10600). Only include if you are confident of the exact color.",
      };
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_product_catalog",
              description: "Submit the complete product catalog for the brand",
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: productProperties,
                      required: requiredFields,
                      additionalProperties: false,
                    },
                  },
                },
                required: ["products"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_product_catalog" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted, please add funds" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `AI error: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ success: false, error: "AI did not return structured data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let products: ProductEntry[];
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      products = parsed.products;
    } catch (e: any) {
      console.error("Failed to parse AI response:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "AI returned empty product list" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI generated ${products.length} products for ${brand}`);

    // --- Firecrawl Verification Step ---
    let verification: VerificationResult | null = null;

    if (verify_url && typeof verify_url === "string") {
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (FIRECRAWL_API_KEY) {
        try {
          console.log(`Verifying against: ${verify_url}`);
          const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: verify_url,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });

          if (scrapeResp.ok) {
            const scrapeData = await scrapeResp.json();
            const scrapedMarkdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";

            if (scrapedMarkdown && scrapedMarkdown.length > 100) {
              // Use AI to cross-check
              const verifyResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                      content: `You are a hair color product verification expert. Compare an AI-generated product list against scraped website content. Flag any products that appear invented or missing. Be concise.`,
                    },
                    {
                      role: "user",
                      content: `Brand: ${brand}
AI generated ${products.length} products. Product names include: ${products.slice(0, 30).map((p: any) => p.name).join(", ")}${products.length > 30 ? ` ... and ${products.length - 30} more` : ""}

Website content:
${scrapedMarkdown.slice(0, 8000)}

Analyze: Are the AI-generated products accurate? Flag any that seem invented or any popular products that are missing.`,
                    },
                  ],
                  tools: [
                    {
                      type: "function",
                      function: {
                        name: "submit_verification",
                        description: "Submit the verification result",
                        parameters: {
                          type: "object",
                          properties: {
                            verified: { type: "boolean", description: "true if the product list appears accurate overall" },
                            warnings: { type: "array", items: { type: "string" }, description: "List of specific issues found" },
                            confidence: { type: "string", enum: ["high", "medium", "low"] },
                          },
                          required: ["verified", "warnings", "confidence"],
                          additionalProperties: false,
                        },
                      },
                    },
                  ],
                  tool_choice: { type: "function", function: { name: "submit_verification" } },
                }),
              });

              if (verifyResp.ok) {
                const verifyData = await verifyResp.json();
                const verifyCall = verifyData.choices?.[0]?.message?.tool_calls?.[0];
                if (verifyCall?.function?.arguments) {
                  try {
                    verification = JSON.parse(verifyCall.function.arguments);
                    console.log(`Verification result: verified=${verification!.verified}, confidence=${verification!.confidence}, warnings=${verification!.warnings.length}`);
                  } catch {
                    console.error("Failed to parse verification response");
                  }
                }
              }
            } else {
              console.log("Scraped content too short for verification");
            }
          } else {
            console.error(`Firecrawl scrape failed: ${scrapeResp.status}`);
          }
        } catch (verifyError: any) {
          console.error("Verification error:", verifyError);
        }
      } else {
        console.log("FIRECRAWL_API_KEY not available, skipping verification");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        brand,
        is_professional: professional,
        product_count: products.length,
        products,
        verification,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating catalog:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
