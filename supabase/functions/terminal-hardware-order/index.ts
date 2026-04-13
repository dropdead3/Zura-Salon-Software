import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Terminal Hardware Order Edge Function
 *
 * Actions:
 *   - get_skus: Fetch live S710 hardware SKU pricing from Stripe
 *   - create_checkout: Create a Stripe Checkout session for terminal purchase
 *   - verify_payment: Verify a checkout session and record the order
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Payment system not configured" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action } = body;

    // ---- get_skus: Fetch live terminal hardware pricing ----
    if (action === "get_skus") {
      const country = body.country || "US";

      // Stable Stripe-hosted CDN images for S710 product line
      const FALLBACK_IMAGES: Record<string, string> = {
        s710_reader: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s710.png",
        s710_hub: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s700_hub.png",
        s710_dock: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s700_dock.png",
        s710_case: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s700_case.png",
      };

      try {
        // Try the Hardware SKUs API (preview/beta)
        const skuResponse = await fetch(
          `https://api.stripe.com/v1/terminal/hardware_skus?country=${country}&limit=100`,
          {
            headers: {
              "Authorization": `Bearer ${stripeKey}`,
              "Stripe-Version": "2025-04-30.basil;terminal_hardware_ordering_beta=v2",
            },
          },
        );

        if (skuResponse.ok) {
          const skuData = await skuResponse.json();
          const allSkus = skuData.data || [];

          // Classify SKUs into readers vs accessories
          const ACCESSORY_KEYWORDS = ["hub", "dock", "case", "cover", "cable", "mount"];
          const isAccessory = (name: string) =>
            ACCESSORY_KEYWORDS.some((kw) => name.toLowerCase().includes(kw));

          const s710Skus: Record<string, unknown>[] = [];
          const accessorySkus: Record<string, unknown>[] = [];

          for (const sku of allSkus) {
            const productName = String(
              (sku as Record<string, { name?: string }>).hardware_product?.name || sku.product || ""
            );
            const isS7xx = productName.toLowerCase().includes("s710") || productName.toLowerCase().includes("s700");
            if (!isS7xx) continue;

            if (isAccessory(productName)) {
              accessorySkus.push(sku);
            } else {
              s710Skus.push(sku);
            }
          }

          // Extract image_url from hardware_product.images when available
          const enrichSku = (sku: Record<string, unknown>) => {
            const hp = sku.hardware_product as Record<string, unknown> | undefined;
            const images = (hp?.images as string[]) || [];
            const skuId = String(sku.id || "");
            // Guess fallback key from product name
            const productName = String(hp?.name || sku.product || "").toLowerCase();
            let fallbackKey = "s710_reader";
            if (productName.includes("hub")) fallbackKey = "s710_hub";
            else if (productName.includes("dock")) fallbackKey = "s710_dock";
            else if (productName.includes("case") || productName.includes("cover")) fallbackKey = "s710_case";
            return {
              ...sku,
              image_url: images[0] || FALLBACK_IMAGES[skuId] || FALLBACK_IMAGES[fallbackKey],
            };
          };

          // Also fetch shipping methods
          const shippingResponse = await fetch(
            `https://api.stripe.com/v1/terminal/hardware_shipping_methods?country=${country}&limit=20`,
            {
              headers: {
                "Authorization": `Bearer ${stripeKey}`,
                "Stripe-Version": "2025-04-30.basil;terminal_hardware_ordering_beta=v2",
              },
            },
          );
          const shippingData = shippingResponse.ok ? await shippingResponse.json() : { data: [] };

          // Build accessories from API data, or use fallbacks if none found
          const apiAccessories = accessorySkus.map(enrichSku).map((a) => ({
            id: a.id,
            product: (a.hardware_product as Record<string, unknown>)?.name || a.product || "Accessory",
            amount: a.amount || 0,
            currency: a.currency || "usd",
            image_url: a.image_url,
          }));

          const finalAccessories = apiAccessories.length > 0 ? apiAccessories : [
            { id: "s710_hub", product: "S700/S710 Hub", amount: 3900, currency: "usd", image_url: FALLBACK_IMAGES.s710_hub },
            { id: "s710_dock", product: "S700/S710 Dock", amount: 4900, currency: "usd", image_url: FALLBACK_IMAGES.s710_dock },
            { id: "s710_case", product: "S700/S710 Case", amount: 1900, currency: "usd", image_url: FALLBACK_IMAGES.s710_case },
          ];

          return jsonResponse({
            source: "stripe_api",
            skus: allSkus.map(enrichSku),
            s710_skus: s710Skus.map(enrichSku),
            accessories: finalAccessories,
            shipping_methods: shippingData.data || [],
          });
        }

        // If API returns 400/403 (no preview access), fall back to known pricing
        console.log(`Hardware SKUs API returned ${skuResponse.status}, using fallback pricing`);
      } catch (e) {
        console.warn("Hardware SKUs API call failed, using fallback:", e);
      }

      // Fallback: Return known Stripe pricing for S710
      // These are Stripe's published prices as of April 2025
      return jsonResponse({
        source: "fallback",
        skus: [
          {
            id: "s710_reader",
            product: "Stripe Reader S710",
            amount: 29900,
            currency: "usd",
            status: "available",
            description: "Android-based smart reader with cellular connectivity. Countertop and handheld use.",
            image_url: FALLBACK_IMAGES.s710_reader,
          },
        ],
        accessories: [
          { id: "s710_hub", product: "S700/S710 Hub", amount: 3900, currency: "usd", image_url: FALLBACK_IMAGES.s710_hub },
          { id: "s710_dock", product: "S700/S710 Dock", amount: 4900, currency: "usd", image_url: FALLBACK_IMAGES.s710_dock },
          { id: "s710_case", product: "S700/S710 Case", amount: 1900, currency: "usd", image_url: FALLBACK_IMAGES.s710_case },
        ],
        shipping_methods: [],
        pricing_note: "Prices shown are Stripe's published rates. Zura applies zero markup.",
      });
    }

    // ---- create_checkout: Create Checkout for terminal purchase ----
    if (action === "create_checkout") {
      const { organization_id, location_id, quantity, items } = body;

      if (!organization_id) {
        return jsonResponse({ error: "organization_id is required" }, 400);
      }

      // Verify org membership
      const { data: membership } = await supabase
        .from("organization_admins")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        const { data: ep } = await supabase
          .from("employee_profiles")
          .select("is_super_admin")
          .eq("user_id", user.id)
          .eq("organization_id", organization_id)
          .maybeSingle();

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const hasRole = roles?.some((r: { role: string }) =>
          ["admin", "manager", "super_admin"].includes(r.role)
        );

        if (!ep?.is_super_admin && !hasRole) {
          return jsonResponse({ error: "Admin or manager role required" }, 403);
        }
      }

      // Validate location belongs to org
      if (location_id) {
        const { data: locCheck } = await supabase
          .from("locations")
          .select("id")
          .eq("id", location_id)
          .eq("organization_id", organization_id)
          .maybeSingle();

        if (!locCheck) {
          return jsonResponse({ error: "Location does not belong to this organization" }, 400);
        }
      }

      // Get org name for checkout description
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", organization_id)
        .single();

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

      // Build line items - support multiple items (reader + accessories)
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      const parsedItems = items || [{ name: "Stripe Reader S710", amount: 29900, quantity: quantity || 1 }];

      for (const item of parsedItems) {
        const qty = Math.min(Math.max(Math.round(item.quantity || 1), 1), 10);
        const unitAmount = Math.round(item.amount || 29900);

        if (unitAmount < 100 || unitAmount > 100000) {
          return jsonResponse({ error: `Invalid price for ${item.name}` }, 400);
        }

        lineItems.push({
          price_data: {
            currency: item.currency || "usd",
            product_data: {
              name: item.name || "Zura Pay Reader S710",
              description: item.description || "Terminal reader with cellular connectivity",
              metadata: {
                hardware_type: "terminal_reader",
                sku_id: item.sku_id || "s710_reader",
              },
            },
            unit_amount: unitAmount,
          },
          quantity: qty,
        });
      }

      const origin = req.headers.get("origin") || "https://getzura.com";

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer_email: user.email || undefined,
        metadata: {
          organization_id,
          location_id: location_id || "",
          order_type: "terminal_hardware",
          ordered_by: user.id,
        },
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "GB", "IE", "AU", "NZ"],
        },
        success_url: `${origin}/org/${org?.name ? encodeURIComponent(org.name.toLowerCase().replace(/\s+/g, '-')) : 'dashboard'}/settings?tab=terminals&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/org/${org?.name ? encodeURIComponent(org.name.toLowerCase().replace(/\s+/g, '-')) : 'dashboard'}/settings?tab=terminals&checkout=canceled`,
      });

      return jsonResponse({
        url: session.url,
        session_id: session.id,
      });
    }

    // ---- verify_payment: Verify completed checkout and record order ----
    if (action === "verify_payment") {
      const { session_id, organization_id } = body;

      if (!session_id || !organization_id) {
        return jsonResponse({ error: "session_id and organization_id are required" }, 400);
      }

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["line_items"],
      });

      if (session.payment_status !== "paid") {
        return jsonResponse({ error: "Payment not completed", payment_status: session.payment_status }, 400);
      }

      // Verify this session belongs to this org
      if (session.metadata?.organization_id !== organization_id) {
        return jsonResponse({ error: "Session does not belong to this organization" }, 403);
      }

      // Check if already recorded
      const { data: existing } = await supabase
        .from("hardware_orders")
        .select("id")
        .eq("stripe_checkout_session_id", session_id)
        .maybeSingle();

      if (existing) {
        return jsonResponse({ data: existing, already_recorded: true });
      }

      // Record the order
      const totalQuantity = (session.line_items?.data || []).reduce(
        (sum: number, item: { quantity?: number | null }) => sum + (item?.quantity || 0), 0
      );
      const totalAmount = session.amount_total || 0;
      const unitPrice = totalQuantity > 0 ? Math.round(totalAmount / totalQuantity) : totalAmount;

      const shippingAddress = session.shipping_details?.address
        ? {
            name: session.shipping_details.name,
            line1: session.shipping_details.address.line1,
            line2: session.shipping_details.address.line2,
            city: session.shipping_details.address.city,
            state: session.shipping_details.address.state,
            postal_code: session.shipping_details.address.postal_code,
            country: session.shipping_details.address.country,
          }
        : null;

      const { data: order, error: insertError } = await supabase
        .from("hardware_orders")
        .insert({
          organization_id,
          item_type: "s710_reader",
          quantity: totalQuantity,
          unit_price_cents: unitPrice,
          stripe_checkout_session_id: session_id,
          fulfillment_status: "pending",
          shipping_address: shippingAddress,
          notes: `Ordered by ${user.email}. Location: ${session.metadata?.location_id || "not specified"}.`,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to record order:", insertError);
        return jsonResponse({ error: "Payment succeeded but order recording failed. Contact support." }, 500);
      }

      return jsonResponse({ data: order });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
