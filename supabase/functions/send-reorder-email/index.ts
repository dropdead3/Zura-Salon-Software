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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { purchase_order_id } = await req.json();
    if (!purchase_order_id) {
      return new Response(JSON.stringify({ error: "purchase_order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch purchase order
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", purchase_order_id)
      .single();

    if (poErr || !po) {
      return new Response(JSON.stringify({ error: "Purchase order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!po.supplier_email) {
      return new Response(JSON.stringify({ error: "No supplier email configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch product details
    const { data: product } = await supabase
      .from("products")
      .select("name, sku, barcode")
      .eq("id", po.product_id)
      .single();

    // Fetch organization details for the email
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", po.organization_id)
      .single();

    const productName = product?.name || "Product";
    const sku = product?.sku ? ` (SKU: ${product.sku})` : "";
    const orgName = org?.name || "Our Organization";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 24px;">Purchase Order Request</h2>
        
        <p>Dear ${po.supplier_name || "Supplier"},</p>
        
        <p>We would like to place the following order:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;">
            <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Product</th>
            <th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Quantity</th>
            ${po.unit_cost ? '<th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Unit Cost</th>' : ""}
            ${po.total_cost ? '<th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Total</th>' : ""}
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${productName}${sku}</td>
            <td style="text-align: right; padding: 10px; border: 1px solid #ddd;">${po.quantity}</td>
            ${po.unit_cost ? `<td style="text-align: right; padding: 10px; border: 1px solid #ddd;">$${Number(po.unit_cost).toFixed(2)}</td>` : ""}
            ${po.total_cost ? `<td style="text-align: right; padding: 10px; border: 1px solid #ddd;">$${Number(po.total_cost).toFixed(2)}</td>` : ""}
          </tr>
        </table>

        ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ""}
        ${po.expected_delivery_date ? `<p><strong>Requested delivery by:</strong> ${po.expected_delivery_date}</p>` : ""}
        
        <p>Please confirm receipt of this order and provide an estimated delivery date.</p>
        
        <p>Thank you,<br/>${orgName}</p>
      </div>
    `;

    // Send email via org email infrastructure
    const emailResult = await sendOrgEmail(supabase, po.organization_id, {
      to: [po.supplier_email],
      subject: `Purchase Order: ${po.quantity}x ${productName}${sku}`,
      html: emailHtml,
    }, { emailType: "transactional" });

    if (!emailResult.success) {
      return new Response(JSON.stringify({ error: emailResult.error || "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update PO status to sent
    await supabase
      .from("purchase_orders")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", purchase_order_id);

    return new Response(JSON.stringify({ success: true, messageId: emailResult.messageId }), {
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
