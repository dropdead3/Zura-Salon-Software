import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { sendEmail } from "../_shared/email-sender.ts";
import { PLATFORM_NAME } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: verify caller is platform user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getUser(token);
    if (claimsErr || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify platform user
    const { data: platformRole } = await supabase
      .from("platform_roles")
      .select("id")
      .eq("user_id", claims.user.id)
      .limit(1)
      .maybeSingle();

    if (!platformRole) {
      return new Response(JSON.stringify({ error: "Forbidden: platform access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id } = await req.json();
    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    // Get org details (including cooldown timestamp)
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, stripe_customer_id, last_setup_link_sent_at")
      .eq("id", organization_id)
      .single();

    if (orgErr || !org) throw new Error("Organization not found");

    // Cooldown check
    if (org.last_setup_link_sent_at) {
      const lastSent = new Date(org.last_setup_link_sent_at).getTime();
      const now = Date.now();
      if (now - lastSent < COOLDOWN_MS) {
        return new Response(
          JSON.stringify({
            error: "Setup link was sent recently. Please wait before sending again.",
            cooldown: true,
            last_sent_at: org.last_setup_link_sent_at,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Find org's primary owner email
    const { data: ownerAdmin } = await supabase
      .from("organization_admins")
      .select("user_id, role")
      .eq("organization_id", organization_id)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (!ownerAdmin) throw new Error("No owner found for this organization");

    const { data: ownerAuth, error: ownerErr } = await supabase.auth.admin.getUserById(ownerAdmin.user_id);
    if (ownerErr || !ownerAuth?.user?.email) throw new Error("Could not retrieve owner email");

    const ownerEmail = ownerAuth.user.email;

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ownerEmail,
        name: org.name,
        metadata: { organization_id: org.id },
      });
      customerId = customer.id;

      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", organization_id);
    }

    // Create Stripe Checkout Session in setup mode
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: `https://getzura.com/payment-setup-success?org=${organization_id}`,
      cancel_url: `https://getzura.com/payment-setup-cancelled?org=${organization_id}`,
    });

    // Send email with the setup link
    const emailResult = await sendEmail({
      to: [ownerEmail],
      subject: `${PLATFORM_NAME}: Add a Payment Method for ${org.name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="font-size: 20px; font-weight: 500; color: #1a1a2e; margin-bottom: 16px;">
            Payment Method Required
          </h2>
          <p style="font-size: 15px; color: #4a4a68; line-height: 1.6; margin-bottom: 24px;">
            Your organization <strong>${org.name}</strong> needs a payment method on file to continue using ${PLATFORM_NAME} services. Please click the link below to securely add a card — no charges will be made at this time.
          </p>
          <a href="${session.url}" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 500;">
            Add Payment Method
          </a>
          <p style="font-size: 13px; color: #8a8aa3; margin-top: 32px; line-height: 1.5;">
            This link will expire in 24 hours. If you have questions, please reach out to your ${PLATFORM_NAME} team.
          </p>
        </div>
      `,
    });

    // Update cooldown timestamp
    await supabase
      .from("organizations")
      .update({ last_setup_link_sent_at: new Date().toISOString() })
      .eq("id", organization_id);

    console.log(`[send-payment-setup-link] Sent setup link to ${ownerEmail} for org ${org.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        email: ownerEmail,
        emailSent: emailResult.success,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-payment-setup-link] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
