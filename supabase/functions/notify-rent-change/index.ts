import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail, formatEmailDate, formatEmailCurrency } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRentChangeRequest {
  contract_id: string;
  current_rent: number;
  new_rent: number;
  effective_date: string;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { contract_id, current_rent, new_rent, effective_date, reason }: NotifyRentChangeRequest = await req.json();

    if (!contract_id || current_rent === undefined || new_rent === undefined || !effective_date) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: contract, error: contractError } = await supabase
      .from("booth_rental_contracts")
      .select(`id, organization_id, booth_renter_id, booth_renter_profiles!inner(user_id, business_name, billing_email)`)
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      return new Response(
        JSON.stringify({ error: "Contract not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: employee } = await supabase
      .from("employee_profiles")
      .select("full_name, display_name, email")
      .eq("user_id", contract.booth_renter_profiles.user_id)
      .single();

    const renterName = employee?.display_name || employee?.full_name || "Booth Renter";
    const renterEmail = contract.booth_renter_profiles.billing_email || employee?.email;

    if (!renterEmail) {
      return new Response(
        JSON.stringify({ success: false, message: "No email address for renter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveDateFormatted = formatEmailDate(new Date(effective_date));
    const rentDifference = new_rent - current_rent;
    const isIncrease = rentDifference > 0;
    const percentChange = current_rent > 0 
      ? ((Math.abs(rentDifference) / current_rent) * 100).toFixed(1) : "0";

    const emailResult = await sendOrgEmail(supabase, contract.organization_id, {
      to: [renterEmail],
      subject: `Upcoming Rent ${isIncrease ? 'Increase' : 'Change'} - Effective ${effectiveDateFormatted}`,
      html: `
        <h2>Rent ${isIncrease ? 'Increase' : 'Change'} Notice</h2>
        <p>Hi ${renterName},</p>
        <p>This is to notify you that your booth rental rate will be ${isIncrease ? 'increasing' : 'changing'} effective <strong>${effectiveDateFormatted}</strong>.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Current Rent:</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatEmailCurrency(current_rent)}/month</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">New Rent:</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${isIncrease ? '#c53030' : '#2f855a'};">${formatEmailCurrency(new_rent)}/month</td></tr>
            <tr style="border-top: 1px solid #ddd;"><td style="padding: 8px 0; color: #666;">Change:</td><td style="padding: 8px 0; text-align: right;">${isIncrease ? '+' : '-'}${formatEmailCurrency(Math.abs(rentDifference))} (${percentChange}%)</td></tr>
          </table>
        </div>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Your first payment at the new rate will be due based on your regular billing schedule after the effective date.</p>
        <p>If you have any questions, please contact salon management.</p>
      `,
    });

    return new Response(
      JSON.stringify({ success: emailResult.success, message: emailResult.success ? "Notification sent" : "Failed to send", email_sent_to: renterEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending rent change notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
