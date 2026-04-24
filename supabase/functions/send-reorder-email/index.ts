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

    const body = await req.json();
    const { purchase_order_id, purchase_order_ids, attachments, is_followup } = body;

    // attachments: Record<supplierEmail, { filename, content (base64) }[]>
    const pdfAttachments: Record<string, { filename: string; content: string }[]> = attachments || {};

    // Support single or batch mode
    const poIds: string[] = purchase_order_ids
      ? purchase_order_ids
      : purchase_order_id
        ? [purchase_order_id]
        : [];

    if (poIds.length === 0) {
      return new Response(JSON.stringify({ error: "purchase_order_id or purchase_order_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all purchase orders
    const { data: purchaseOrders, error: poErr } = await supabase
      .from("purchase_orders")
      .select("*")
      .in("id", poIds);

    if (poErr || !purchaseOrders?.length) {
      return new Response(JSON.stringify({ error: "Purchase order(s) not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group POs by supplier email for consolidated emails
    const bySupplier = new Map<string, typeof purchaseOrders>();
    for (const po of purchaseOrders) {
      if (!po.supplier_email) continue;
      const list = bySupplier.get(po.supplier_email) || [];
      list.push(po);
      bySupplier.set(po.supplier_email, list);
    }

    const noEmailPOs = purchaseOrders.filter((po: any) => !po.supplier_email);
    if (noEmailPOs.length > 0 && bySupplier.size === 0) {
      return new Response(JSON.stringify({ error: "No supplier email configured on any PO" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org info (all POs should be same org)
    const orgId = purchaseOrders[0].organization_id;
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    const orgName = org?.name || "Our Organization";

    const results: { supplier: string; success: boolean; messageId?: string; error?: string }[] = [];

    for (const [supplierEmail, supplierPOs] of bySupplier) {
      // Fetch product details for all POs in this group
      const productIds = supplierPOs.map((po: any) => po.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name, sku, barcode")
        .in("id", productIds);

      const productMap = new Map((products || []).map((p: any) => [p.id, p]));
      const supplierName = supplierPOs[0].supplier_name || "Supplier";

      // Build multi-row product table
      const productRows = supplierPOs.map((po: any) => {
        const prod = productMap.get(po.product_id);
        const name = prod?.name || "Product";
        const sku = prod?.sku ? ` (SKU: ${prod.sku})` : "";
        return `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${name}${sku}</td>
            <td style="text-align: right; padding: 10px; border: 1px solid #ddd;">${po.quantity}</td>
            ${po.unit_cost != null ? `<td style="text-align: right; padding: 10px; border: 1px solid #ddd;">$${Number(po.unit_cost).toFixed(2)}</td>` : ""}
            ${po.total_cost != null ? `<td style="text-align: right; padding: 10px; border: 1px solid #ddd;">$${Number(po.total_cost).toFixed(2)}</td>` : ""}
          </tr>`;
      }).join("");

      const hasUnitCost = supplierPOs.some((po: any) => po.unit_cost != null);
      const hasTotalCost = supplierPOs.some((po: any) => po.total_cost != null);
      const grandTotal = supplierPOs.reduce((sum: any, po: any) => sum + (Number(po.total_cost) || 0), 0);

      const allNotes = supplierPOs.filter((po: any) => po.notes).map((po: any) => po.notes).join("; ");

      const poNumbers = supplierPOs.map((po: any) => po.po_number || po.id.slice(0, 8).toUpperCase()).join(', ');
      
      const emailHtml = is_followup ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 24px;">Delivery Follow-Up</h2>
          <p>Dear ${supplierName},</p>
          <p>We're following up on our purchase order(s) <strong>${poNumbers}</strong> which ${supplierPOs.length === 1 ? 'is' : 'are'} past the expected delivery date.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f5f5;">
              <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Product</th>
              <th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Quantity</th>
            </tr>
            ${productRows}
          </table>
          <p>Could you please provide an updated delivery estimate?</p>
          <p>Thank you,<br/>${orgName}</p>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 24px;">Purchase Order Request</h2>
          
          <p>Dear ${supplierName},</p>
          
          <p>We would like to place the following order${supplierPOs.length > 1 ? ` (${supplierPOs.length} items)` : ""} — PO: ${poNumbers}:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f5f5;">
              <th style="text-align: left; padding: 10px; border: 1px solid #ddd;">Product</th>
              <th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Quantity</th>
              ${hasUnitCost ? '<th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Unit Cost</th>' : ""}
              ${hasTotalCost ? '<th style="text-align: right; padding: 10px; border: 1px solid #ddd;">Total</th>' : ""}
            </tr>
            ${productRows}
            ${hasTotalCost && supplierPOs.length > 1 ? `
            <tr style="background: #f9f9f9; font-weight: bold;">
              <td style="padding: 10px; border: 1px solid #ddd;" colspan="${hasUnitCost ? 3 : 2}">Grand Total</td>
              <td style="text-align: right; padding: 10px; border: 1px solid #ddd;">$${grandTotal.toFixed(2)}</td>
            </tr>` : ""}
          </table>

          ${allNotes ? `<p><strong>Notes:</strong> ${allNotes}</p>` : ""}
          
          <p>Please confirm receipt of this order and provide an estimated delivery date.</p>
          
          <p>Thank you,<br/>${orgName}</p>
        </div>
      `;

      const subjectProducts = supplierPOs.length === 1
        ? `${supplierPOs[0].quantity}x ${productMap.get(supplierPOs[0].product_id)?.name || "Product"}`
        : `${supplierPOs.length} products`;

      const emailSubject = is_followup
        ? `Delivery Follow-Up: ${subjectProducts}`
        : `Purchase Order: ${subjectProducts}`;

      // Include PDF attachments if provided for this supplier
      const supplierAttachments = pdfAttachments[supplierEmail] || [];

      const emailResult = await sendOrgEmail(supabase, orgId, {
        to: [supplierEmail],
        subject: emailSubject,
        html: emailHtml,
        attachments: supplierAttachments.map((att: any) => ({
          filename: att.filename,
          content: att.content,
          type: 'application/pdf',
        })),
      }, { emailType: "transactional" });

      if (!emailResult.success) {
        results.push({ supplier: supplierEmail, success: false, error: emailResult.error });
        continue;
      }

      results.push({ supplier: supplierEmail, success: true, messageId: emailResult.messageId });

      // Update all POs in this group to 'sent'
      const sentIds = supplierPOs.map((po: any) => po.id);
      await supabase
        .from("purchase_orders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .in("id", sentIds);
    }

    const allSuccess = results.every((r: any) => r.success);
    return new Response(JSON.stringify({ 
      success: allSuccess, 
      results,
      sent_count: results.filter((r: any) => r.success).length,
      skipped_no_email: noEmailPOs.length,
    }), {
      status: allSuccess ? 200 : 207,
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
