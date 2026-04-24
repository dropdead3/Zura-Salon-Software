import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

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

// ---- Zod Schemas ----

const GetSkusSchema = z.object({
  action: z.literal("get_skus"),
  country: z.string().length(2).default("US"),
});

const CheckoutItemSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().int().min(100).max(100000),
  quantity: z.number().int().min(1).max(10),
  currency: z.string().length(3).default("usd"),
  description: z.string().max(500).optional(),
  sku_id: z.string().max(100).optional(),
});

const CreateCheckoutSchema = z.object({
  action: z.literal("create_checkout"),
  organization_id: z.string().uuid(),
  location_id: z.string().uuid().optional(),
  items: z.array(CheckoutItemSchema).min(1).max(20).optional(),
  quantity: z.number().int().min(1).max(10).optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

const VerifyPaymentSchema = z.object({
  action: z.literal("verify_payment"),
  session_id: z.string().min(1),
  organization_id: z.string().uuid(),
});

const ActionSchema = z.discriminatedUnion("action", [
  GetSkusSchema,
  CreateCheckoutSchema,
  VerifyPaymentSchema,
]);

/**
 * Terminal Hardware Order Edge Function
 *
 * Actions:
 *   - get_skus: Fetch live S710 hardware SKU pricing
 *   - create_checkout: Create a Checkout session for terminal purchase
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
    const supabase = createClient(supabaseUrl, serviceKey) as any;

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

    const rawBody = await req.json();

    // Validate input with Zod
    const parsed = ActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const body = parsed.data;

    // ---- get_skus: Fetch live terminal hardware pricing ----
    if (body.action === "get_skus") {
      const country = body.country;

      // Stable CDN images for S700/S710 product line
      const FALLBACK_IMAGES: Record<string, string> = {
        s700_reader: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s700.png",
        s710_reader: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s710.png",
        s710_hub: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s700_hub.png",
        s710_dock: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s700_dock.png",
        s710_case: "https://b.stripecdn.com/terminal-ui-resources/img/hardware_skus/verifone/s700_case.png",
      };

      try {
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

          const ACCESSORY_KEYWORDS = ["hub", "dock", "case", "cover", "cable", "mount"];
          const isAccessory = (name: string) =>
            ACCESSORY_KEYWORDS.some((kw: any) => name.toLowerCase().includes(kw));

          const s700Skus: Record<string, unknown>[] = [];
          const s710Skus: Record<string, unknown>[] = [];
          const accessorySkus: Record<string, unknown>[] = [];

          for (const sku of allSkus) {
            const productName = String(
              (sku as Record<string, { name?: string }>).hardware_product?.name || sku.product || ""
            );
            const lowerName = productName.toLowerCase();
            const isS7xx = lowerName.includes("s710") || lowerName.includes("s700");
            if (!isS7xx) continue;

            if (isAccessory(productName)) {
              accessorySkus.push(sku);
            } else if (lowerName.includes("s710")) {
              s710Skus.push(sku);
            } else {
              // S700 or generic reader (e.g. "BBPOS WisePOS E") defaults to S700
              s700Skus.push(sku);
            }
          }

          const enrichSku = (sku: Record<string, unknown>) => {
            const hp = sku.hardware_product as Record<string, unknown> | undefined;
            const images = (hp?.images as string[]) || [];
            const skuId = String(sku.id || "");
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

          const ACCESSORY_DESCRIPTIONS: Record<string, string> = {
            hub: "Ethernet connectivity adapter. Provides a hardwired network connection for maximum reliability.",
            dock: "Countertop charging stand. Keeps your reader powered and upright at the checkout station.",
            case: "Protective silicone sleeve for handheld use. Adds grip and drop protection for tableside payments.",
          };

          const getAccessoryDescription = (name: string): string | undefined => {
            const lower = name.toLowerCase();
            if (lower.includes("hub")) return ACCESSORY_DESCRIPTIONS.hub;
            if (lower.includes("dock")) return ACCESSORY_DESCRIPTIONS.dock;
            if (lower.includes("case") || lower.includes("cover")) return ACCESSORY_DESCRIPTIONS.case;
            return undefined;
          };

          const apiAccessories = accessorySkus.map(enrichSku).map((a: any) => {
            const productName = String((a.hardware_product as Record<string, unknown>)?.name || a.product || "Accessory");
            return {
              id: a.id,
              product: productName,
              amount: a.amount || 0,
              currency: a.currency || "usd",
              image_url: a.image_url,
              description: getAccessoryDescription(productName),
            };
          });

          const finalAccessories = apiAccessories.length > 0 ? apiAccessories : [
            { id: "s710_hub", product: "S700/S710 Hub", amount: 3900, currency: "usd", image_url: FALLBACK_IMAGES.s710_hub, description: ACCESSORY_DESCRIPTIONS.hub },
            { id: "s710_dock", product: "S700/S710 Dock", amount: 4900, currency: "usd", image_url: FALLBACK_IMAGES.s710_dock, description: ACCESSORY_DESCRIPTIONS.dock },
            { id: "s710_case", product: "S700/S710 Case", amount: 1900, currency: "usd", image_url: FALLBACK_IMAGES.s710_case, description: ACCESSORY_DESCRIPTIONS.case },
          ];

          return jsonResponse({
            source: "stripe_api",
            skus: allSkus.map(enrichSku),
            s700_skus: s700Skus.map(enrichSku),
            s710_skus: s710Skus.map(enrichSku),
            accessories: finalAccessories,
            shipping_methods: shippingData.data || [],
          });
        }

        console.log(`Hardware SKUs API returned ${skuResponse.status}, using fallback pricing`);
      } catch (e: any) {
        console.warn("Hardware SKUs API call failed, using fallback:", e);
      }

      // Fallback: Return known pricing with distinct S700 / S710 entries
      const s700Fallback = {
        id: "s700_reader",
        product: "Point Of Sale Reader S700",
        amount: 29900,
        currency: "usd",
        status: "available",
        description: "Android-based smart reader with WiFi. Countertop and handheld use.",
        image_url: FALLBACK_IMAGES.s700_reader,
      };
      const s710Fallback = {
        id: "s710_reader",
        product: "Point Of Sale Reader S710",
        amount: 29900,
        currency: "usd",
        status: "available",
        description: "Android-based smart reader with WiFi + cellular failover. Countertop and handheld use.",
        image_url: FALLBACK_IMAGES.s710_reader,
      };
      return jsonResponse({
        source: "fallback",
        skus: [s700Fallback, s710Fallback],
        s700_skus: [s700Fallback],
        s710_skus: [s710Fallback],
        accessories: [
          { id: "s710_hub", product: "S700/S710 Hub", amount: 3900, currency: "usd", image_url: FALLBACK_IMAGES.s710_hub, description: "Ethernet connectivity adapter. Provides a hardwired network connection for maximum reliability." },
          { id: "s710_dock", product: "S700/S710 Dock", amount: 4900, currency: "usd", image_url: FALLBACK_IMAGES.s710_dock, description: "Countertop charging stand. Keeps your reader powered and upright at the checkout station." },
          { id: "s710_case", product: "S700/S710 Case", amount: 1900, currency: "usd", image_url: FALLBACK_IMAGES.s710_case, description: "Protective silicone sleeve for handheld use. Adds grip and drop protection for tableside payments." },
        ],
        shipping_methods: [],
        pricing_note: "Prices shown are published rates. Zura applies zero markup.",
      });
    }

    // ---- create_checkout: Create Checkout for terminal purchase ----
    if (body.action === "create_checkout") {
      const { organization_id, location_id, quantity: bodyQuantity, items, success_url, cancel_url } = body;

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

      // Build line items
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      const parsedItems = items || [{ name: "Point Of Sale Reader S700/S710", amount: 29900, quantity: bodyQuantity || 1, currency: "usd" }];

      for (const item of parsedItems) {
        lineItems.push({
          price_data: {
            currency: item.currency,
            product_data: {
              name: item.name,
              description: item.description || "Terminal reader with cellular connectivity",
              metadata: {
                hardware_type: "terminal_reader",
                sku_id: item.sku_id || "s710_reader",
              },
            },
            unit_amount: item.amount,
          },
          quantity: item.quantity,
        });
      }

      const origin = req.headers.get("origin") || "https://getzura.com";

      // Accept success/cancel URLs from the client (which knows the correct org-scoped path)
      const fallbackPath = `/dashboard/admin/settings`;
      const successUrl = success_url
        ? `${success_url}${success_url.includes('?') ? '&' : '?'}checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : `${origin}${fallbackPath}?tab=terminals&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = cancel_url || `${origin}${fallbackPath}?tab=terminals&checkout=canceled`;

      // Generate idempotency key from org + user + 5-min time bucket
      const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000));
      const idempotencyKey = `hw_checkout_${organization_id}_${user.id}_${timeBucket}`;

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
        success_url: successUrl,
        cancel_url: cancelUrl,
      }, { idempotencyKey });

      return jsonResponse({
        url: session.url,
        session_id: session.id,
      });
    }

    // ---- verify_payment: Verify completed checkout and record order ----
    if (body.action === "verify_payment") {
      const { session_id, organization_id } = body;

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

      // Sync: update the most recent pending terminal_hardware_requests row to "approved"
      const { error: syncErr, count: syncCount } = await supabase
        .from("terminal_hardware_requests")
        .update({ status: "approved", updated_at: new Date().toISOString() }, { count: "exact" })
        .eq("organization_id", organization_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (syncErr) {
        console.warn("Failed to sync terminal_hardware_requests status:", syncErr);
      } else if (syncCount === 0) {
        console.warn("No pending terminal_hardware_requests found to sync for org:", organization_id);
      }

      return jsonResponse({ data: order });
    }

    return jsonResponse({ error: `Unknown action: ${body.action}` }, 400);
  } catch (error: any) {
    console.error("Error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
