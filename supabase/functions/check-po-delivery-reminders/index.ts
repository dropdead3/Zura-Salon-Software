import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

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
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Find sent POs that are overdue and haven't had a follow-up in 3+ days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: overduePOs, error } = await supabase
      .from("purchase_orders")
      .select("id, organization_id, supplier_name, supplier_email, quantity, total_cost, expected_delivery_date, po_number, product_id, delivery_followup_sent_at")
      .eq("status", "sent")
      .is("received_at", null)
      .not("supplier_email", "is", null)
      .lte("expected_delivery_date", now);

    if (error) throw error;

    // Filter: only send if no follow-up or last follow-up > 3 days ago
    const eligiblePOs = (overduePOs || []).filter((po: any) => {
      if (!po.delivery_followup_sent_at) return true;
      return po.delivery_followup_sent_at < threeDaysAgo;
    });

    console.log(`[delivery-reminders] Found ${eligiblePOs.length} overdue POs to follow up`);

    let sent = 0;
    const errors: string[] = [];

    // Group by org for branding
    const byOrg = new Map<string, typeof eligiblePOs>();
    for (const po of eligiblePOs) {
      const list = byOrg.get(po.organization_id) || [];
      list.push(po);
      byOrg.set(po.organization_id, list);
    }

    for (const [orgId, orgPOs] of byOrg) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();
      const orgName = org?.name || "Our Organization";

      // Fetch product names
      const productIds = orgPOs.map((po: any) => po.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);
      const productMap = new Map((products || []).map((p: any) => [p.id, p.name]));

      // Group by supplier email
      const bySupplier = new Map<string, typeof orgPOs>();
      for (const po of orgPOs) {
        const list = bySupplier.get(po.supplier_email!) || [];
        list.push(po);
        bySupplier.set(po.supplier_email!, list);
      }

      for (const [email, supplierPOs] of bySupplier) {
        const supplierName = supplierPOs[0].supplier_name || "Supplier";

        const productList = supplierPOs.map((po: any) => {
          const name = productMap.get(po.product_id) || "Product";
          const poNum = po.po_number || po.id.slice(0, 8).toUpperCase();
          return `<li>${name} (${poNum}) — Expected: ${new Date(po.expected_delivery_date).toLocaleDateString()}</li>`;
        }).join("");

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Delivery Follow-Up</h2>
            <p>Dear ${supplierName},</p>
            <p>We're following up on the following order(s) which are past their expected delivery date:</p>
            <ul>${productList}</ul>
            <p>Could you please provide an updated delivery estimate?</p>
            <p>Thank you,<br/>${orgName}</p>
          </div>
        `;

        const result = await sendOrgEmail(supabase, orgId, {
          to: [email],
          subject: `Delivery Follow-Up: ${supplierPOs.length} overdue order(s)`,
          html,
        });

        if (result.success) {
          sent += supplierPOs.length;
          // Update follow-up timestamp
          const ids = supplierPOs.map((po: any) => po.id);
          await supabase
            .from("purchase_orders")
            .update({ delivery_followup_sent_at: new Date().toISOString() })
            .in("id", ids);
        } else {
          errors.push(`Failed to email ${email}: ${result.error}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sent,
      total_overdue: eligiblePOs.length,
      errors,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
