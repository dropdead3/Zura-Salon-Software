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
  default_unit?: string;
  default_depletion?: string;
  size_options?: string[];
  swatch_hex?: string;
}

interface BrandProductPayload {
  brand: string;
  is_professional: boolean;
  products: ProductEntry[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand_products } = (await req.json()) as { brand_products: BrandProductPayload[] };

    if (!Array.isArray(brand_products) || brand_products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "brand_products array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

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
      products_inserted?: number;
      products_skipped?: number;
      error?: string;
    }[] = [];

    for (const { brand, is_professional, products } of brand_products) {
      try {
        // Filter out duplicates
        const newProducts = products.filter((p: any) => !existingSet.has(`${brand}::${p.name}`.toLowerCase())
        );
        const skippedCount = products.length - newProducts.length;

        if (newProducts.length === 0) {
          results.push({ brand, status: "skipped", products_inserted: 0, products_skipped: skippedCount });
          continue;
        }

        // Batch insert in chunks of 100
        const CHUNK_SIZE = 100;
        let insertedCount = 0;

        for (let i = 0; i < newProducts.length; i += CHUNK_SIZE) {
          const chunk = newProducts.slice(i, i + CHUNK_SIZE).map((p: any) => ({
            brand,
            name: p.name,
            category: p.category,
            product_line: p.product_line,
            default_unit: p.default_unit || (["color", "lightener"].includes(p.category) ? "g" : "ml"),
            default_depletion: p.default_depletion || (["color", "lightener"].includes(p.category) ? "weighed" : "per_service"),
            size_options: p.size_options || [],
            is_active: true,
            is_professional,
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
            chunk.forEach((p: any) => existingSet.add(`${brand}::${p.name}`.toLowerCase()));
          }
        }

        results.push({
          brand,
          status: "success",
          products_inserted: insertedCount,
          products_skipped: skippedCount,
        });

        console.log(`${brand}: inserted ${insertedCount}, skipped ${skippedCount}`);
      } catch (brandError: any) {
        console.error(`Error inserting ${brand}:`, brandError);
        results.push({
          brand,
          status: "error",
          error: brandError instanceof Error ? brandError.message : "Unknown error",
        });
      }
    }

    const totalInserted = results.reduce((s: any, r: any) => s + (r.products_inserted || 0), 0);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          brands_processed: results.length,
          total_inserted: totalInserted,
          brands_succeeded: results.filter((r: any) => r.status === "success").length,
          brands_failed: results.filter((r: any) => r.status === "error").length,
          brands_skipped: results.filter((r: any) => r.status === "skipped").length,
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
