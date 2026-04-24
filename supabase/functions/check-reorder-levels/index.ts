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
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Find all active products with reorder info
    const { data: allProducts, error: queryErr } = await supabase
      .from("products")
      .select("id, name, sku, organization_id, quantity_on_hand, reorder_level, par_level, supplier_id, is_active")
      .eq("is_active", true)
      .not("quantity_on_hand", "is", null);

    if (queryErr) throw queryErr;

    // Load all org alert settings
    const { data: allSettings } = await supabase
      .from("inventory_alert_settings")
      .select("*");

    const settingsMap = new Map<string, any>();
    for (const s of allSettings || []) {
      settingsMap.set(s.organization_id, s);
    }

    // ── LOW STOCK ALERTS ──
    const lowStockProducts = (allProducts || []).filter((p: any) => p.reorder_level != null);

    const belowThreshold = lowStockProducts.filter((p: any) => {
      const settings = settingsMap.get(p.organization_id);
      if (settings && !settings.enabled) return false;
      const thresholdPct = settings?.default_threshold_pct ?? 100;
      const threshold = (p.reorder_level * thresholdPct) / 100;
      return p.quantity_on_hand <= threshold;
    });

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
      const settings = settingsMap.get(orgId);
      const productNames = orgProducts.slice(0, 10).map((p: any) => p.name).join(", ");
      const suffix = orgProducts.length > 10 ? ` and ${orgProducts.length - 10} more` : "";

      const recipientUserIds: string[] = settings?.recipient_user_ids || [];

      if (recipientUserIds.length > 0) {
        for (const userId of recipientUserIds) {
          const result = await createNotification(supabase, {
            type: "low_stock_alert",
            severity: "warning",
            title: `${orgProducts.length} product(s) below minimum stock`,
            message: `Low stock: ${productNames}${suffix}. Review your inventory and consider reordering.`,
            metadata: { organization_id: orgId, product_count: orgProducts.length, recipient_id: userId },
          }, { cooldownMinutes: 120 });
          if (result.inserted) notificationsCreated++;
        }
      } else {
        const result = await createNotification(supabase, {
          type: "low_stock_alert",
          severity: "warning",
          title: `${orgProducts.length} product(s) below minimum stock`,
          message: `Low stock: ${productNames}${suffix}. Review your inventory and consider reordering.`,
          metadata: { organization_id: orgId, product_count: orgProducts.length },
        }, { cooldownMinutes: 120 });
        if (result.inserted) notificationsCreated++;
      }

      // Auto-create draft POs or auto-send
      const autoCreatePo = settings?.auto_create_draft_po ?? true;
      if (!autoCreatePo) continue;

      const autoReorderEnabled = settings?.auto_reorder_enabled ?? false;
      const autoReorderMode = settings?.auto_reorder_mode ?? "to_par";
      const maxAutoReorderValue = settings?.max_auto_reorder_value ?? null;

      // Check daily spend cap if auto-reorder is enabled
      let dailySpentSoFar = 0;
      if (autoReorderEnabled && maxAutoReorderValue) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: todayPOs } = await supabase
          .from("purchase_orders")
          .select("quantity, unit_cost")
          .eq("organization_id", orgId)
          .eq("status", "sent")
          .gte("created_at", todayStart.toISOString());

        for (const po of todayPOs || []) {
          dailySpentSoFar += (po.quantity || 0) * (po.unit_cost || 0);
        }
      }

      for (const product of orgProducts) {
        const { data: supplier } = await supabase
          .from("product_suppliers")
          .select("id, supplier_name, supplier_email, moq")
          .eq("product_id", product.id)
          .eq("organization_id", orgId)
          .maybeSingle();

        if (!supplier) continue;

        const { count: openPoCount } = await supabase
          .from("purchase_orders")
          .select("id", { count: "exact", head: true })
          .eq("product_id", product.id)
          .eq("organization_id", orgId)
          .in("status", ["draft", "sent", "confirmed"]);

        if ((openPoCount ?? 0) > 0) continue;

        // Calculate order quantity based on mode
        const moq = supplier.moq || 1;
        const parLevel = product.par_level ?? (product.reorder_level ? product.reorder_level * 2 : null);
        let suggestedQty: number;

        if (autoReorderEnabled && autoReorderMode === "moq_only") {
          suggestedQty = moq;
        } else if (parLevel) {
          const deficit = parLevel - (product.quantity_on_hand || 0);
          if (deficit <= 0) continue;
          suggestedQty = Math.max(moq, deficit);
          // Round up to nearest MOQ multiple
          if (moq > 1) {
            suggestedQty = Math.ceil(suggestedQty / moq) * moq;
          }
        } else {
          suggestedQty = Math.max(moq, (product.reorder_level * 2) - (product.quantity_on_hand || 0));
        }

        if (suggestedQty <= 0) suggestedQty = moq;

        // Determine PO status: auto-send or draft
        const requirePoApproval = settings?.require_po_approval ?? true;
        let poStatus = "draft";
        let shouldSendEmail = false;

        if (autoReorderEnabled && supplier.supplier_email) {
          // Check spend cap
          if (maxAutoReorderValue && dailySpentSoFar >= maxAutoReorderValue) {
            // Spend cap exceeded, keep as draft
            poStatus = "draft";
          } else {
            poStatus = "sent";
            shouldSendEmail = true;
          }
        } else if (!requirePoApproval && supplier.supplier_email) {
          // No approval required — auto-send even when auto_reorder is off
          poStatus = "sent";
          shouldSendEmail = true;
        }

        const notes = autoReorderEnabled && shouldSendEmail
          ? "Auto-reorder: sent to supplier automatically"
          : "Auto-generated: product below minimum stock level";

        const { data: newPo, error: poErr } = await supabase
          .from("purchase_orders")
          .insert({
            organization_id: orgId,
            product_id: product.id,
            supplier_name: supplier.supplier_name,
            supplier_email: supplier.supplier_email,
            quantity: suggestedQty,
            status: poStatus,
            notes,
          })
          .select("id")
          .single();

        if (!poErr) {
          draftPosCreated++;

          // Send email if auto-reorder
          if (shouldSendEmail && newPo) {
            try {
              await supabase.functions.invoke("send-reorder-email", {
                body: { purchase_order_id: newPo.id },
              });

              // Log stock movement for audit
              await supabase.from("stock_movements").insert({
                organization_id: orgId,
                product_id: product.id,
                quantity_change: 0,
                quantity_after: product.quantity_on_hand || 0,
                reason: "auto_reorder",
                notes: `Auto-reorder PO created and sent: ${suggestedQty} units to ${supplier.supplier_name}`,
              });
            } catch (emailErr) {
              console.error("Failed to send reorder email:", emailErr);
            }
          }
        }
      }
    }

    // ── DEAD STOCK ALERTS ──
    let deadStockAlerts = 0;

    // Group all products by org for dead stock check
    const productsByOrg = new Map<string, any[]>();
    for (const p of allProducts || []) {
      if (!p.organization_id || (p.quantity_on_hand ?? 0) === 0) continue;
      const list = productsByOrg.get(p.organization_id) || [];
      list.push(p);
      productsByOrg.set(p.organization_id, list);
    }

    for (const [orgId, orgProds] of productsByOrg) {
      const settings = settingsMap.get(orgId);
      const deadStockEnabled = settings?.dead_stock_enabled ?? true;
      if (!deadStockEnabled) continue;

      const deadStockDays = settings?.dead_stock_days ?? 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deadStockDays);
      const cutoffIso = cutoffDate.toISOString();

      // Get products that have had sales in the period (via appointments or stock_movements with reason 'sale')
      const productIds = orgProds.map((p: any) => p.id);

      const { data: recentMovements } = await supabase
        .from("stock_movements")
        .select("product_id")
        .eq("organization_id", orgId)
        .eq("reason", "sale")
        .gte("created_at", cutoffIso)
        .in("product_id", productIds.slice(0, 100));

      const soldProductIds = new Set((recentMovements || []).map((m: any) => m.product_id));

      // Also check POs received recently (product is moving)
      const { data: recentPOs } = await supabase
        .from("purchase_orders")
        .select("product_id")
        .eq("organization_id", orgId)
        .eq("status", "received")
        .gte("received_at", cutoffIso)
        .in("product_id", productIds.slice(0, 100));

      for (const po of recentPOs || []) {
        soldProductIds.add(po.product_id);
      }

      const deadProducts = orgProds.filter((p: any) => !soldProductIds.has(p.id));

      if (deadProducts.length > 0) {
        const names = deadProducts.slice(0, 8).map((p: any) => p.name).join(", ");
        const more = deadProducts.length > 8 ? ` and ${deadProducts.length - 8} more` : "";

        const result = await createNotification(supabase, {
          type: "dead_stock_alert",
          severity: "info",
          title: `${deadProducts.length} product(s) with no movement in ${deadStockDays} days`,
          message: `Dead stock: ${names}${more}. Consider discounting or discontinuing.`,
          metadata: { organization_id: orgId, product_count: deadProducts.length, dead_stock_days: deadStockDays },
        }, { cooldownMinutes: 1440 }); // 24h cooldown for dead stock

        if (result.inserted) deadStockAlerts++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        low_stock_count: belowThreshold.length,
        organizations_affected: byOrg.size,
        notifications_created: notificationsCreated,
        draft_pos_created: draftPosCreated,
        dead_stock_alerts: deadStockAlerts,
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
