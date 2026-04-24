import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";

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

    // Get all organizations with late fee config
    const { data: configs, error: configError } = await supabase
      .from("rent_late_fee_config")
      .select("*");

    if (configError) throw configError;

    const results = [];

    for (const config of configs || []) {
      // Find overdue payments for this organization
      const gracePeriodDate = new Date(today);
      gracePeriodDate.setDate(gracePeriodDate.getDate() - config.grace_period_days);

      const { data: overduePayments, error: paymentsError } = await supabase
        .from("rent_payments")
        .select(`
          id,
          contract_id,
          booth_renter_id,
          amount,
          due_date,
          late_fee_applied,
          late_fee_amount,
          status
        `)
        .eq("organization_id", config.organization_id)
        .eq("status", "pending")
        .lt("due_date", gracePeriodDate.toISOString().split("T")[0])
        .eq("late_fee_applied", false);

      if (paymentsError) {
        console.error(`Error fetching overdue payments for org ${config.organization_id}:`, paymentsError);
        continue;
      }

      for (const payment of overduePayments || []) {
        // Calculate late fee
        let lateFee = 0;
        const dueDate = new Date(payment.due_date);
        const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const effectiveDaysLate = daysLate - config.grace_period_days;

        switch (config.late_fee_type) {
          case "flat":
            lateFee = config.late_fee_amount || 0;
            break;
          case "percentage":
            lateFee = payment.amount * (config.late_fee_percentage || 0);
            break;
          case "daily":
            lateFee = (config.daily_fee_amount || 0) * effectiveDaysLate;
            break;
        }

        // Apply max cap
        if (config.max_late_fee && lateFee > config.max_late_fee) {
          lateFee = config.max_late_fee;
        }

        if (config.auto_apply && lateFee > 0) {
          // Apply the late fee
          const { error: updateError } = await supabase
            .from("rent_payments")
            .update({
              status: "overdue",
              late_fee_applied: true,
              late_fee_amount: lateFee,
              late_fee_applied_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

          if (updateError) {
            console.error(`Failed to apply late fee to payment ${payment.id}:`, updateError);
            continue;
          }

          results.push({
            payment_id: payment.id,
            booth_renter_id: payment.booth_renter_id,
            original_amount: payment.amount,
            late_fee: lateFee,
            days_late: daysLate,
          });

          // Create notification for admin (deduplicated)
          await createNotification(supabase, {
            type: "rent_overdue",
            severity: "warning",
            title: "Rent Payment Overdue",
            message: `A rent payment of $${payment.amount} is ${daysLate} days overdue. Late fee of $${lateFee.toFixed(2)} has been applied.`,
            metadata: {
              organization_id: payment.organization_id,
              payment_id: payment.id,
              booth_renter_id: payment.booth_renter_id,
              late_fee: lateFee,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        late_fees_applied: results.length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking late payments:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
