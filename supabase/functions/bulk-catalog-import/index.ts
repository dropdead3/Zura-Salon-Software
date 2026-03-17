import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BrandRequest {
  brand: string;
  is_professional: boolean;
  verify_url?: string;
}

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
    const { brands, dry_run } = (await req.json()) as { brands: BrandRequest[]; dry_run?: boolean };

    if (!Array.isArray(brands) || brands.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "brands array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing products for dedup
    const { data: existingProducts } = await supabase
      .from("supply_library_products")
      .select("brand, name")
      .eq("is_active", true);

    const existingSet = new Set(
      (existingProducts || []).map((p: { brand: string; name: string }) => `${p.brand}::${p.name}`.toLowerCase())
    );

    console.log(`Existing products in DB: ${existingSet.size}`);

    const results: {
      brand: string;
      status: "success" | "error" | "skipped";
      products_generated?: number;
      products_inserted?: number;
      products_skipped?: number;
      products?: ProductEntry[];
      verification?: VerificationResult | null;
      error?: string;
    }[] = [];

    // Process brands sequentially to respect rate limits
    for (const brandReq of brands) {
      const { brand, is_professional, verify_url } = brandReq;

      try {
        console.log(`Processing brand: ${brand}`);

        // Call generate-color-catalog with optional verify_url
        const genResponse = await fetch(`${supabaseUrl}/functions/v1/generate-color-catalog`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ brand, is_professional, verify_url }),
        });

        if (!genResponse.ok) {
          const errText = await genResponse.text();
          console.error(`Failed to generate for ${brand}:`, errText);
          results.push({ brand, status: "error", error: `Generation failed: ${genResponse.status}` });
          if (genResponse.status === 429) {
            console.log("Rate limited, waiting 30s...");
            await new Promise((r) => setTimeout(r, 30000));
          }
          continue;
        }

        const genData = await genResponse.json();
        if (!genData.success || !genData.products) {
          results.push({ brand, status: "error", error: genData.error || "No products returned" });
          continue;
        }

        const products: ProductEntry[] = genData.products;
        const verification: VerificationResult | null = genData.verification || null;
        console.log(`Generated ${products.length} products for ${brand}`);

        // Filter out duplicates
        const newProducts = products.filter((p) => !existingSet.has(`${brand}::${p.name}`.toLowerCase()));
        const skippedCount = products.length - newProducts.length;

        if (dry_run) {
          // Return full products for review
          results.push({
            brand,
            status: "success",
            products_generated: products.length,
            products_inserted: 0,
            products_skipped: skippedCount,
            products: newProducts,
            verification,
          });
          continue;
        }

        if (newProducts.length === 0) {
          results.push({
            brand,
            status: "skipped",
            products_generated: products.length,
            products_inserted: 0,
            products_skipped: skippedCount,
            verification,
          });
          continue;
        }

        // Batch insert in chunks of 100
        const CHUNK_SIZE = 100;
        let insertedCount = 0;

        for (let i = 0; i < newProducts.length; i += CHUNK_SIZE) {
          const chunk = newProducts.slice(i, i + CHUNK_SIZE).map((p) => ({
            brand,
            name: p.name,
            category: p.category,
            product_line: p.product_line,
            default_unit: p.default_unit,
            default_depletion: p.default_depletion,
            size_options: p.size_options,
            is_active: true,
            is_professional: is_professional,
            // Include swatch_color from AI-generated swatch_hex for consumer brands
            ...(p.swatch_hex ? { swatch_color: p.swatch_hex } : {}),
          }));

          const { error: insertError, data: inserted } = await supabase
            .from("supply_library_products")
            .insert(chunk)
            .select("id");

          if (insertError) {
            console.error(`Insert error for ${brand} chunk ${i}:`, insertError);
          } else {
            insertedCount += (inserted || []).length;
            chunk.forEach((p) => existingSet.add(`${brand}::${p.name}`.toLowerCase()));
          }
        }

        results.push({
          brand,
          status: "success",
          products_generated: products.length,
          products_inserted: insertedCount,
          products_skipped: skippedCount,
          verification,
        });

        console.log(`${brand}: inserted ${insertedCount}, skipped ${skippedCount}`);
        await new Promise((r) => setTimeout(r, 2000));
      } catch (brandError) {
        console.error(`Error processing ${brand}:`, brandError);
        results.push({
          brand,
          status: "error",
          error: brandError instanceof Error ? brandError.message : "Unknown error",
        });
      }
    }

    const totalInserted = results.reduce((s, r) => s + (r.products_inserted || 0), 0);
    const totalGenerated = results.reduce((s, r) => s + (r.products_generated || 0), 0);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: !!dry_run,
        summary: {
          brands_processed: results.length,
          total_generated: totalGenerated,
          total_inserted: totalInserted,
          brands_succeeded: results.filter((r) => r.status === "success").length,
          brands_failed: results.filter((r) => r.status === "error").length,
          brands_skipped: results.filter((r) => r.status === "skipped").length,
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Bulk import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
