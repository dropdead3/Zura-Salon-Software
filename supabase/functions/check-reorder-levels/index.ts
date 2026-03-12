import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createNotification } from "../_shared/notify.ts";

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

    // Find all active products at or below reorder level
    const { data: lowStockProducts, error: queryErr } = await supabase
      .from("products")
      .select("id, name, sku, organization_id, quantity_on_hand, reorder_level, supplier_id")
      .eq("is_active", true)
      .not("reorder_level", "is", null)
      .not("quantity_on_hand", "is", null);

    if (queryErr) throw queryErr;

    // Filter in-memory: quantity_on_hand <= reorder_level
    const belowThreshold = (lowStockProducts || []).filter(
      (p) => p.quantity_on_hand <= p.reorder_level
    );

    if (belowThreshold.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No low-stock products found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by organization
    const byOrg = new Map<string, typeof belowThreshold>();
    for (const p of belowThreshold) {
      if (!p.organization_id) continue;
      const list = byOrg.get(p.organization_id) || [];
      list.push(p);
      byOrg.set(p.organization_id, list);
    }

    let notificationsCreated = 0;
    let draftPosCreated = 0;

    for (const [orgId, orgProducts] of byOrg) {
      const productNames = orgProducts.slice(0, 10).map((p) => p.name).join(", ");
      const suffix = orgProducts.length > 10 ? ` and ${orgProducts.length - 10} more` : "";

      // Create throttled notification (120min cooldown)
      const result = await createNotification(supabase, {
        type: "low_stock_alert",
        severity: "warning",
        title: `${orgProducts.length} product(s) below minimum stock`,
        message: `Low stock: ${productNames}${suffix}. Review your inventory and consider reordering.`,
        metadata: { organization_id: orgId, product_count: orgProducts.length },
      }, { cooldownMinutes: 120 });

      if (result.inserted) notificationsCreated++;

      // Auto-create draft POs for products that have a supplier but no open PO
      for (const product of orgProducts) {
        // Check if product has a supplier
        const { data: supplier } = await supabase
          .from("product_suppliers")
          .select("id, supplier_name, supplier_email")
          .eq("product_id", product.id)
          .eq("organization_id", orgId)
          .maybeSingle();

        if (!supplier) continue;

        // Check for existing open PO
        const { count: openPoCount } = await supabase
          .from("purchase_orders")
          .select("id", { count: "exact", head: true })
          .eq("product_id", product.id)
          .eq("organization_id", orgId)
          .in("status", ["draft", "sent", "confirmed"]);

        if ((openPoCount ?? 0) > 0) continue;

        // Calculate suggested quantity: reorder to 2x reorder_level
        const suggestedQty = Math.max(1, (product.reorder_level * 2) - product.quantity_on_hand);

        const { error: poErr } = await supabase
          .from("purchase_orders")
          .insert({
            organization_id: orgId,
            product_id: product.id,
            supplier_name: supplier.supplier_name,
            supplier_email: supplier.supplier_email,
            quantity: suggestedQty,
            status: "draft",
            notes: "Auto-generated: product below minimum stock level",
          });

        if (!poErr) draftPosCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        low_stock_count: belowThreshold.length,
        organizations_affected: byOrg.size,
        notifications_created: notificationsCreated,
        draft_pos_created: draftPosCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
