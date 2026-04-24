import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceSource {
  id: string;
  brand: string;
  source_type: string;
  api_endpoint: string | null;
  api_key_secret_name: string | null;
  auto_apply_threshold: number;
  max_auto_delta_pct: number;
}

interface FetchedPrice {
  product_name: string;
  brand: string;
  sku: string | null;
  wholesale_price: number;
  recommended_retail: number | null;
}

/**
 * Calculates a confidence score for matching a fetched price to an existing product.
 * 1.0 = exact SKU match
 * 0.7-0.9 = brand + fuzzy name match
 * 0.3-0.6 = name-only partial match
 */
function calculateConfidence(
  fetched: FetchedPrice,
  product: { name: string; brand: string | null; sku: string | null }
): number {
  // Exact SKU match
  if (fetched.sku && product.sku && fetched.sku.toLowerCase() === product.sku.toLowerCase()) {
    return 1.0;
  }

  const fetchedName = fetched.product_name.toLowerCase().trim();
  const productName = product.name.toLowerCase().trim();
  const brandMatch = fetched.brand.toLowerCase() === (product.brand || "").toLowerCase();

  // Exact name + brand match
  if (brandMatch && fetchedName === productName) return 0.95;

  // Brand match + name contains
  if (brandMatch && (fetchedName.includes(productName) || productName.includes(fetchedName))) {
    return 0.8;
  }

  // Name-only exact match
  if (fetchedName === productName) return 0.6;

  // Partial name match
  if (fetchedName.includes(productName) || productName.includes(fetchedName)) {
    return 0.4;
  }

  return 0;
}

/**
 * Fetches prices from a distributor API source.
 * Currently a skeleton that returns empty — real integrations will be added
 * per-source as distributor partnerships are established.
 */
async function fetchFromSource(source: PriceSource): Promise<FetchedPrice[]> {
  if (!source.api_endpoint) {
    console.log(`Source ${source.brand} has no API endpoint configured — skipping`);
    return [];
  }

  try {
    // Build headers — if an API key secret is configured, resolve it
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (source.api_key_secret_name) {
      const apiKey = Deno.env.get(source.api_key_secret_name);
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else {
        console.warn(`Secret ${source.api_key_secret_name} not found for source ${source.brand}`);
        return [];
      }
    }

    const response = await fetch(source.api_endpoint, { headers });
    if (!response.ok) {
      console.error(`API call failed for ${source.brand}: ${response.status}`);
      await response.text();
      return [];
    }

    const data = await response.json();

    // Expected API response format:
    // { products: [{ name, sku, wholesale_price, recommended_retail }] }
    if (!data.products || !Array.isArray(data.products)) {
      console.warn(`Unexpected response format from ${source.brand}`);
      return [];
    }

    return data.products.map((p: any) => ({
      product_name: p.name || p.product_name || "",
      brand: source.brand,
      sku: p.sku || null,
      wholesale_price: Number(p.wholesale_price || p.cost_price || 0),
      recommended_retail: p.recommended_retail ? Number(p.recommended_retail) : null,
    }));
  } catch (err) {
    console.error(`Error fetching from ${source.brand}:`, err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Optional: filter to a specific source
    let sourceFilter: string | null = null;
    try {
      const body = await req.json();
      sourceFilter = body.source_id || null;
    } catch {
      // No body — run all sources
    }

    // Fetch active sources
    let sourcesQuery = supabase
      .from("wholesale_price_sources")
      .select("*")
      .eq("is_active", true);

    if (sourceFilter) {
      sourcesQuery = sourcesQuery.eq("id", sourceFilter);
    }

    const { data: sources, error: srcErr } = await sourcesQuery;
    if (srcErr) throw srcErr;

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active sources to poll", queued: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalQueued = 0;

    for (const source of sources as PriceSource[]) {
      const prices = await fetchFromSource(source);
      if (prices.length === 0) continue;

      // Fetch existing products for matching
      const { data: existingProducts } = await supabase
        .from("products")
        .select("id, name, brand, sku, cost_price, cost_per_gram")
        .or(`brand.ilike.%${source.brand}%`);

      const queueEntries = [];

      for (const fetched of prices) {
        let bestMatch: { id: string; cost_price: number | null; cost_per_gram: number | null } | null = null;
        let bestConfidence = 0;

        for (const product of existingProducts || []) {
          const confidence = calculateConfidence(fetched, product);
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestMatch = product;
          }
        }

        // Calculate price delta if we have a previous price
        const previousPrice = bestMatch?.cost_price || bestMatch?.cost_per_gram || null;
        let priceDeltaPct: number | null = null;
        if (previousPrice && previousPrice > 0) {
          priceDeltaPct = ((fetched.wholesale_price - previousPrice) / previousPrice) * 100;
        }

        // Determine if auto-apply (high confidence + small delta)
        const shouldAutoApply =
          bestConfidence >= source.auto_apply_threshold &&
          priceDeltaPct !== null &&
          Math.abs(priceDeltaPct) <= source.max_auto_delta_pct;

        queueEntries.push({
          product_id: bestMatch?.id || null,
          product_name: fetched.product_name,
          brand: fetched.brand,
          sku: fetched.sku,
          source_id: source.id,
          wholesale_price: fetched.wholesale_price,
          recommended_retail: fetched.recommended_retail,
          confidence_score: bestConfidence,
          previous_price: previousPrice,
          price_delta_pct: priceDeltaPct,
          // Per governance: never auto-apply. Flag as "pending" with a note.
          status: "pending" as const,
          notes: shouldAutoApply
            ? "Recommended for auto-apply (high confidence, small delta)"
            : bestConfidence < 0.5
              ? "Low confidence match — manual review required"
              : priceDeltaPct !== null && Math.abs(priceDeltaPct) > 15
                ? `Large price swing (${priceDeltaPct?.toFixed(1)}%) — requires review`
                : null,
        });
      }

      if (queueEntries.length > 0) {
        const { error: insertErr } = await supabase
          .from("wholesale_price_queue")
          .insert(queueEntries);

        if (insertErr) {
          console.error(`Error inserting queue entries for ${source.brand}:`, insertErr);
        } else {
          totalQueued += queueEntries.length;
        }
      }

      // Update last_polled_at
      await supabase
        .from("wholesale_price_sources")
        .update({ last_polled_at: new Date().toISOString() })
        .eq("id", source.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sources_polled: sources.length,
        queued: totalQueued,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in wholesale-price-sync:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
