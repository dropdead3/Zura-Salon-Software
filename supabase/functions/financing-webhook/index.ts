import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_FINANCING_WEBHOOK_SECRET") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      console.warn("[financing-webhook] No webhook secret. Accepting unverified payload.");
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata;

      if (meta?.type === "zura_capital" && meta?.is_production === "true" && meta?.opportunity_id) {
        // Production path: update capital_funding_projects
        await supabase
          .from("capital_funding_projects")
          .update({
            status: "active",
            repayment_status: "active",
            activation_status: "pending",
          })
          .eq("provider_offer_id", session.id);

        // Update opportunity status to funded
        await supabase
          .from("capital_funding_opportunities")
          .update({
            status: "funded",
            funded_at: new Date().toISOString(),
          })
          .eq("id", meta.opportunity_id);

        // Log funded event
        if (meta.organization_id) {
          await supabase.from("capital_event_log").insert({
            organization_id: meta.organization_id,
            user_id: meta.user_id || null,
            opportunity_id: meta.opportunity_id,
            funding_opportunity_id: meta.opportunity_id,
            event_type: "funding_approved",
            surface_area: "capital_queue",
            metadata_json: { stripe_session_id: session.id, amount_cents: session.amount_total },
          });
        }
      } else if (meta?.type === "expansion_financing" && meta?.opportunity_id) {
        // Legacy path
        await supabase
          .from("financed_projects")
          .update({
            status: "active",
            funded_at: new Date().toISOString(),
          })
          .eq("stripe_checkout_session_id", session.id);

        if (meta.organization_id) {
          await supabase.from("capital_event_log").insert({
            organization_id: meta.organization_id,
            user_id: meta.user_id || null,
            opportunity_id: meta.opportunity_id,
            event_type: "funded",
            surface_area: "capital_queue",
            metadata_json: { stripe_session_id: session.id, amount: session.amount_total },
          });
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata;

      if (meta?.type === "zura_capital" && meta?.is_production === "true") {
        await supabase
          .from("capital_funding_projects")
          .update({ status: "closed" })
          .eq("provider_offer_id", session.id);

        if (meta.opportunity_id) {
          await supabase
            .from("capital_funding_opportunities")
            .update({ status: "canceled" })
            .eq("id", meta.opportunity_id);
        }
      } else if (meta?.type === "expansion_financing") {
        await supabase
          .from("financed_projects")
          .update({ status: "cancelled" })
          .eq("stripe_checkout_session_id", session.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
