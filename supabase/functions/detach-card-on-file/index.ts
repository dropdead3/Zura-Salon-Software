import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { card_id, organization_id } = await req.json();
    if (!card_id || !organization_id) {
      return new Response(JSON.stringify({ error: "card_id and organization_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the card record
    const { data: card, error: cardError } = await supabase
      .from("client_cards_on_file")
      .select("stripe_payment_method_id, organization_id")
      .eq("id", card_id)
      .eq("organization_id", organization_id)
      .single();

    if (cardError || !card) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the org's Stripe connected account (canonical source)
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id")
      .eq("id", organization_id)
      .single();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Detach the payment method from Stripe
    if (card.stripe_payment_method_id) {
      try {
        await stripe.paymentMethods.detach(
          card.stripe_payment_method_id,
          undefined,
          org?.stripe_connect_account_id ? { stripeAccount: org.stripe_connect_account_id } : undefined
        );
      } catch (stripeError: any) {
        // If the PM is already detached or doesn't exist, proceed with DB deletion
        if (stripeError?.code !== "resource_missing") {
          console.error("Stripe detach error:", stripeError);
          return new Response(JSON.stringify({ error: "Failed to detach card from payment processor" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Delete the card record from the database
    const { error: deleteError } = await supabase
      .from("client_cards_on_file")
      .delete()
      .eq("id", card_id)
      .eq("organization_id", organization_id);

    if (deleteError) {
      console.error("DB delete error:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to remove card record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
