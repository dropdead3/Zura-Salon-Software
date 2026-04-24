import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Get all pending payments due today or within autopay window
    const results = {
      processed: [] as any[],
      failed: [] as any[],
      skipped: [] as any[],
    };

    // Get renters with autopay enabled
    const { data: paymentMethods, error: methodsError } = await supabase
      .from("renter_payment_methods")
      .select(`
        id,
        booth_renter_id,
        stripe_payment_method_id,
        stripe_customer_id,
        autopay_enabled,
        autopay_days_before_due,
        card_brand,
        card_last4
      `)
      .eq("autopay_enabled", true)
      .eq("is_default", true);

    if (methodsError) throw methodsError;

    for (const method of paymentMethods || []) {
      // Calculate the target due date based on days_before setting
      const targetDueDate = new Date(today);
      targetDueDate.setDate(targetDueDate.getDate() + method.autopay_days_before_due);
      const targetDueDateStr = targetDueDate.toISOString().split("T")[0];

      // Find pending payments due on target date for this renter
      const { data: pendingPayments, error: paymentsError } = await supabase
        .from("rent_payments")
        .select(`
          id,
          organization_id,
          contract_id,
          amount,
          late_fee_amount,
          due_date,
          status
        `)
        .eq("booth_renter_id", method.booth_renter_id)
        .eq("status", "pending")
        .eq("due_date", targetDueDateStr);

      if (paymentsError) {
        console.error(`Error fetching payments for renter ${method.booth_renter_id}:`, paymentsError);
        continue;
      }

      for (const payment of pendingPayments || []) {
        const totalAmount = payment.amount + (payment.late_fee_amount || 0);

        // TODO: Process payment through Stripe
        // For now, we'll simulate the payment process
        // In production, you would:
        // 1. Create a PaymentIntent with the customer and payment method
        // 2. Confirm the payment
        // 3. Handle success/failure

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        
        if (!stripeSecretKey) {
          results.skipped.push({
            payment_id: payment.id,
            reason: "Stripe not configured",
          });
          continue;
        }

        try {
          // Create payment intent
          const paymentIntent = await fetch("https://api.stripe.com/v1/payment_intents", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              amount: Math.round(totalAmount * 100).toString(), // Stripe uses cents
              currency: "usd",
              customer: method.stripe_customer_id,
              payment_method: method.stripe_payment_method_id,
              confirm: "true",
              off_session: "true",
              description: `Rent payment for period ending ${payment.due_date}`,
            }),
          });

          const intentResult = await paymentIntent.json();

          if (intentResult.status === "succeeded") {
            // Update payment record
            await supabase
              .from("rent_payments")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                payment_method: "autopay",
                stripe_payment_intent_id: intentResult.id,
              })
              .eq("id", payment.id);

            results.processed.push({
              payment_id: payment.id,
              amount: totalAmount,
              stripe_payment_intent_id: intentResult.id,
            });
          } else {
            results.failed.push({
              payment_id: payment.id,
              amount: totalAmount,
              error: intentResult.error?.message || "Payment failed",
            });

            // Create notification for failed payment
            await supabase.from("platform_notifications").insert({
              type: "autopay_failed",
              severity: "error",
              title: "Autopay Failed",
              message: `Autopay for $${totalAmount.toFixed(2)} failed: ${intentResult.error?.message || "Unknown error"}`,
              metadata: {
                payment_id: payment.id,
                booth_renter_id: method.booth_renter_id,
                error: intentResult.error,
              },
            });
          }
        } catch (stripeError: any) {
          results.failed.push({
            payment_id: payment.id,
            amount: totalAmount,
            error: stripeError.message,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.processed.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing autopay:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
