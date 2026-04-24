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

    // Parse request body for optional date range
    const body = await req.json().catch(() => ({}));
    const {
      period_start,
      period_end,
      organization_id,
      booth_renter_id,
    } = body;

    // Default to previous month if not specified
    const today = new Date();
    const defaultPeriodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const defaultPeriodEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const periodStartDate = period_start || defaultPeriodStart.toISOString().split("T")[0];
    const periodEndDate = period_end || defaultPeriodEnd.toISOString().split("T")[0];

    // Get active contracts with retail commission enabled
    let contractsQuery = supabase
      .from("booth_rental_contracts")
      .select(`
        id,
        organization_id,
        booth_renter_id,
        retail_commission_enabled,
        retail_commission_rate,
        booth_renter_profiles!inner(user_id, business_name)
      `)
      .eq("status", "active")
      .eq("retail_commission_enabled", true);

    if (organization_id) {
      contractsQuery = contractsQuery.eq("organization_id", organization_id);
    }
    if (booth_renter_id) {
      contractsQuery = contractsQuery.eq("booth_renter_id", booth_renter_id);
    }

    const { data: contracts, error: contractsError } = await contractsQuery;

    if (contractsError) throw contractsError;

    const statementsCreated = [];

    for (const contract of contracts || []) {
      // Check if statement already exists for this period
      const { data: existingStatement } = await supabase
        .from("renter_commission_statements")
        .select("id")
        .eq("booth_renter_id", contract.booth_renter_id)
        .eq("period_start", periodStartDate)
        .eq("period_end", periodEndDate)
        .maybeSingle();

      if (existingStatement) continue;

      // Get renter's user_id for aggregating sales
      const renterId = contract.booth_renter_id;
      const userId = (contract.booth_renter_profiles as any).user_id;

      // Aggregate retail product sales for this renter during the period
      // This assumes sales are tracked in a transactions or sales table
      // For now, we'll use phorest_transactions if available, or a placeholder
      const { data: sales } = await supabase
        .from("phorest_transactions")
        .select("total_amount, product_total")
        .eq("staff_user_id", userId)
        .gte("transaction_date", periodStartDate)
        .lte("transaction_date", periodEndDate)
        .eq("transaction_type", "sale");

      const totalRetailSales = (sales || []).reduce(
        (sum: number, sale: any) => sum + (sale.product_total || 0),
        0
      );

      const totalServiceRevenue = (sales || []).reduce(
        (sum: number, sale: any) => sum + (sale.total_amount - (sale.product_total || 0)),
        0
      );

      const commissionRate = contract.retail_commission_rate || 0;
      const totalCommission = totalRetailSales * commissionRate;
      const netPayout = totalCommission; // No deductions for now

      // Create the commission statement
      const { data: statement, error: statementError } = await supabase
        .from("renter_commission_statements")
        .insert({
          organization_id: contract.organization_id,
          booth_renter_id: renterId,
          period_start: periodStartDate,
          period_end: periodEndDate,
          total_retail_sales: totalRetailSales,
          total_service_revenue: totalServiceRevenue,
          commission_rate: commissionRate,
          total_commission: totalCommission,
          net_payout: netPayout,
          status: "pending",
          line_items: sales || [],
        })
        .select()
        .single();

      if (statementError) {
        console.error(`Failed to create statement for renter ${renterId}:`, statementError);
        continue;
      }

      statementsCreated.push({
        statement_id: statement.id,
        booth_renter_id: renterId,
        total_retail_sales: totalRetailSales,
        total_commission: totalCommission,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        period_start: periodStartDate,
        period_end: periodEndDate,
        statements_created: statementsCreated.length,
        details: statementsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error calculating commissions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
