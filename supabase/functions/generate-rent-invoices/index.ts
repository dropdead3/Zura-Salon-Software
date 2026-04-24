import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

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
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay();

    const { data: contracts, error: contractsError } = await supabase
      .from("booth_rental_contracts")
      .select(`
        id, booth_renter_id, organization_id, rent_amount, rent_frequency,
        due_day_of_month, due_day_of_week, start_date, end_date,
        booth_renter_profiles!inner(user_id, billing_email, business_name)
      `)
      .eq("status", "active");

    if (contractsError) throw contractsError;

    const invoicesCreated = [];

    for (const contract of contracts || []) {
      let shouldCreateInvoice = false;
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;
      let dueDate: Date | null = null;

      if (contract.rent_frequency === "monthly") {
        if (dayOfMonth === (contract.due_day_of_month || 1)) {
          shouldCreateInvoice = true;
          periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
          periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          dueDate = new Date(today.getFullYear(), today.getMonth(), contract.due_day_of_month || 1);
        }
      } else if (contract.rent_frequency === "weekly") {
        if (dayOfWeek === (contract.due_day_of_week || 1)) {
          shouldCreateInvoice = true;
          periodStart = new Date(today);
          periodStart.setDate(today.getDate() - 6);
          periodEnd = new Date(today);
          dueDate = new Date(today);
        }
      }

      if (!shouldCreateInvoice || !periodStart || !periodEnd || !dueDate) continue;

      const { data: existingInvoice } = await supabase
        .from("rent_payments")
        .select("id")
        .eq("contract_id", contract.id)
        .eq("period_start", periodStart.toISOString().split("T")[0])
        .maybeSingle();

      if (existingInvoice) continue;

      // Check for scheduled rent changes
      const { data: rentChange } = await supabase
        .from("scheduled_rent_changes")
        .select("new_rent_amount, id")
        .eq("contract_id", contract.id)
        .eq("applied", false)
        .lte("effective_date", today.toISOString().split("T")[0])
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      let rentAmount = contract.rent_amount;
      if (rentChange) {
        rentAmount = rentChange.new_rent_amount;
        await supabase.from("scheduled_rent_changes")
          .update({ applied: true, applied_at: new Date().toISOString() })
          .eq("id", rentChange.id);
        await supabase.from("booth_rental_contracts")
          .update({ rent_amount: rentAmount })
          .eq("id", contract.id);
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("rent_payments")
        .insert({
          organization_id: contract.organization_id,
          contract_id: contract.id,
          booth_renter_id: contract.booth_renter_id,
          amount: rentAmount,
          period_start: periodStart.toISOString().split("T")[0],
          period_end: periodEnd.toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          status: "pending",
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Failed to create invoice for contract ${contract.id}:`, invoiceError);
        continue;
      }

      invoicesCreated.push({ contract_id: contract.id, invoice_id: invoice.id, amount: rentAmount });

      // Send email notification to renter
      const renterEmail = contract.booth_renter_profiles?.billing_email;
      if (renterEmail) {
        const periodStartDate = periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const periodEndDate = periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const dueDateFormatted = dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const monthName = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        await sendOrgEmail(supabase, contract.organization_id, {
          to: [renterEmail],
          subject: `New Rent Invoice: ${monthName}`,
          html: `
            <h2>Rent Invoice Created</h2>
            <p>A new rent invoice has been created for your booth rental:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="padding: 8px 0;"><strong>Amount:</strong> $${rentAmount.toFixed(2)}</li>
                <li style="padding: 8px 0;"><strong>Period:</strong> ${periodStartDate} - ${periodEndDate}</li>
                <li style="padding: 8px 0;"><strong>Due Date:</strong> ${dueDateFormatted}</li>
              </ul>
            </div>
            <p>Please log in to your dashboard to view and pay this invoice.</p>
          `,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, invoices_created: invoicesCreated.length, details: invoicesCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating rent invoices:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
