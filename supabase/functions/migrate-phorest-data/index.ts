import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 200;
const IMPORT_SOURCE = "phorest_migration";

interface DomainResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  error_details: string[];
}

function newResult(): DomainResult {
  return { total: 0, inserted: 0, updated: 0, skipped: 0, errors: 0, error_details: [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin/platform role
    const { data: platformRole } = await supabase
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: empProfile } = await supabase
      .from("employee_profiles")
      .select("is_super_admin, is_primary_owner")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAuthorized = platformRole || empProfile?.is_super_admin || empProfile?.is_primary_owner;
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Insufficient permissions. Requires admin or platform role." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // defaults to true

    console.log(`Migration started. dry_run=${dryRun}, user=${user.id}`);

    const warnings: string[] = [];

    // ── Build lookup maps ──

    // Staff mapping: phorest_staff_id → user_id
    const { data: staffMappings } = await supabase
      .from("phorest_staff_mapping")
      .select("phorest_staff_id, user_id")
      .eq("is_active", true);

    const staffMap = new Map<string, string>();
    for (const m of staffMappings || []) {
      if (m.user_id) staffMap.set(m.phorest_staff_id, m.user_id);
    }
    console.log(`Staff mapping: ${staffMap.size} entries`);

    // Branch-to-location mapping
    const { data: phorestSettings } = await supabase
      .from("phorest_settings")
      .select("phorest_branch_id, location_id");

    const branchToLocation = new Map<string, string>();
    for (const s of phorestSettings || []) {
      if (s.phorest_branch_id && s.location_id) {
        branchToLocation.set(s.phorest_branch_id, s.location_id);
      }
    }

    // Location → organization mapping
    const { data: locations } = await supabase
      .from("locations")
      .select("id, organization_id");

    const locationToOrg = new Map<string, string>();
    for (const l of locations || []) {
      if (l.organization_id) locationToOrg.set(l.id, l.organization_id);
    }

    // Get default org from first location (single-org deployment)
    const defaultOrgId = locations?.[0]?.organization_id;
    if (!defaultOrgId) {
      throw new Error("No organization found. Cannot proceed with migration.");
    }

    // ══════════════════════════════════════════
    // 1. CLIENTS MIGRATION
    // ══════════════════════════════════════════
    const clientResult = newResult();
    const clientMapping = new Map<string, string>(); // phorest_client_id → native client UUID

    // Fetch all phorest clients
    const allPhorestClients: any[] = [];
    let clientOffset = 0;
    while (true) {
      const { data: batch, error } = await supabase
        .from("phorest_clients")
        .select("*")
        .eq("is_duplicate", false)
        .range(clientOffset, clientOffset + 999);
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      allPhorestClients.push(...batch);
      clientOffset += batch.length;
      if (batch.length < 1000) break;
    }
    clientResult.total = allPhorestClients.length;
    console.log(`Fetched ${allPhorestClients.length} phorest clients`);

    // Fetch all native clients for dedup
    const allNativeClients: any[] = [];
    let nativeOffset = 0;
    while (true) {
      const { data: batch, error } = await supabase
        .from("clients")
        .select("id, email_normalized, phone_normalized, phorest_client_id")
        .range(nativeOffset, nativeOffset + 999);
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      allNativeClients.push(...batch);
      nativeOffset += batch.length;
      if (batch.length < 1000) break;
    }

    // Build native lookup maps
    const nativeByEmail = new Map<string, any>();
    const nativeByPhone = new Map<string, any>();
    const nativeByPhorestId = new Map<string, any>();
    for (const nc of allNativeClients) {
      if (nc.email_normalized) nativeByEmail.set(nc.email_normalized, nc);
      if (nc.phone_normalized) nativeByPhone.set(nc.phone_normalized, nc);
      if (nc.phorest_client_id) nativeByPhorestId.set(nc.phorest_client_id, nc);
    }

    // Process clients in batches
    const clientsToInsert: any[] = [];
    const clientsToUpdate: { id: string; phorest_client_id: string }[] = [];

    for (const pc of allPhorestClients) {
      // Already mapped?
      const existingByPhorestId = nativeByPhorestId.get(pc.phorest_client_id);
      if (existingByPhorestId) {
        clientMapping.set(pc.phorest_client_id, existingByPhorestId.id);
        clientResult.skipped++;
        continue;
      }

      // Match by email
      const emailNorm = pc.email_normalized || (pc.email ? pc.email.toLowerCase().trim() : null);
      const matchByEmail = emailNorm ? nativeByEmail.get(emailNorm) : null;
      if (matchByEmail) {
        clientMapping.set(pc.phorest_client_id, matchByEmail.id);
        if (!matchByEmail.phorest_client_id) {
          clientsToUpdate.push({ id: matchByEmail.id, phorest_client_id: pc.phorest_client_id });
        }
        clientResult.updated++;
        continue;
      }

      // Match by phone
      const phoneNorm = pc.phone_normalized;
      const matchByPhone = phoneNorm ? nativeByPhone.get(phoneNorm) : null;
      if (matchByPhone) {
        clientMapping.set(pc.phorest_client_id, matchByPhone.id);
        if (!matchByPhone.phorest_client_id) {
          clientsToUpdate.push({ id: matchByPhone.id, phorest_client_id: pc.phorest_client_id });
        }
        clientResult.updated++;
        continue;
      }

      // No match — insert
      const nameParts = (pc.name || "").trim().split(/\s+/);
      const firstName = pc.first_name || nameParts[0] || "Unknown";
      const lastName = pc.last_name || nameParts.slice(1).join(" ") || "";

      const locationId = pc.phorest_branch_id ? branchToLocation.get(pc.phorest_branch_id) : null;

      clientsToInsert.push({
        first_name: firstName,
        last_name: lastName,
        email: pc.email || null,
        mobile: pc.phone || null,
        phone: pc.landline || null,
        location_id: locationId || null,
        preferred_stylist_id: pc.preferred_stylist_id || null,
        is_vip: pc.is_vip || false,
        notes: pc.notes || null,
        total_spend: pc.total_spend || 0,
        visit_count: pc.visit_count || 0,
        last_visit_date: pc.last_visit ? new Date(pc.last_visit).toISOString().split("T")[0] : null,
        first_visit: pc.first_visit || null,
        external_id: pc.phorest_client_id,
        phorest_client_id: pc.phorest_client_id,
        import_source: IMPORT_SOURCE,
        imported_at: new Date().toISOString(),
        organization_id: defaultOrgId,
        status: pc.is_archived ? "inactive" : "active",
        birthday: pc.birthday || null,
        address_line1: pc.address_line1 || null,
        address_line2: pc.address_line2 || null,
        city: pc.city || null,
        state: pc.state || null,
        zip: pc.zip || null,
        country: pc.country || null,
        gender: pc.gender || null,
        lead_source: pc.lead_source || null,
        client_since: pc.client_since || null,
        reminder_email_opt_in: pc.reminder_email_opt_in,
        reminder_sms_opt_in: pc.reminder_sms_opt_in,
        referred_by: pc.referred_by || null,
        client_category: pc.client_category || null,
        prompt_client_notes: pc.prompt_client_notes,
        prompt_appointment_notes: pc.prompt_appointment_notes,
        is_banned: pc.is_banned || false,
        ban_reason: pc.ban_reason || null,
        banned_at: pc.banned_at || null,
        banned_by: pc.banned_by || null,
        is_archived: pc.is_archived || false,
        archived_at: pc.archived_at || null,
        archived_by: pc.archived_by || null,
        preferred_services: pc.preferred_services || null,
        branch_name: pc.branch_name || null,
        landline: pc.landline || null,
      });
    }

    if (!dryRun) {
      // Backfill phorest_client_id on existing matches
      for (let i = 0; i < clientsToUpdate.length; i += BATCH_SIZE) {
        const batch = clientsToUpdate.slice(i, i + BATCH_SIZE);
        for (const upd of batch) {
          const { error } = await supabase
            .from("clients")
            .update({ phorest_client_id: upd.phorest_client_id })
            .eq("id", upd.id);
          if (error) {
            clientResult.errors++;
            clientResult.error_details.push(`Update ${upd.id}: ${error.message}`);
          }
        }
      }

      // Insert new clients
      for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
        const batch = clientsToInsert.slice(i, i + BATCH_SIZE);
        const { data: inserted, error } = await supabase
          .from("clients")
          .insert(batch)
          .select("id, phorest_client_id");

        if (error) {
          clientResult.errors += batch.length;
          clientResult.error_details.push(`Insert batch ${i}: ${error.message}`);
          console.error(`Client insert error at batch ${i}:`, error.message);
        } else if (inserted) {
          for (const row of inserted) {
            if (row.phorest_client_id) {
              clientMapping.set(row.phorest_client_id, row.id);
            }
          }
          clientResult.inserted += inserted.length;
        }
      }
    } else {
      clientResult.inserted = clientsToInsert.length;
      // For dry run, build fake mapping from phorest_client_id → placeholder
      for (const c of clientsToInsert) {
        clientMapping.set(c.phorest_client_id, "dry-run-placeholder");
      }
    }

    console.log(`Clients: total=${clientResult.total}, inserted=${clientResult.inserted}, updated=${clientResult.updated}, skipped=${clientResult.skipped}, errors=${clientResult.errors}`);

    // ══════════════════════════════════════════
    // 2. SERVICES MIGRATION
    // ══════════════════════════════════════════
    const serviceResult = newResult();

    const { data: phorestServices } = await supabase
      .from("phorest_services")
      .select("*");

    serviceResult.total = phorestServices?.length || 0;

    // Fetch existing native services for dedup
    const { data: nativeServices } = await supabase
      .from("services")
      .select("id, name, category, location_id, external_id");

    const nativeServiceKeys = new Set<string>();
    const nativeServiceByExtId = new Map<string, string>();
    for (const ns of nativeServices || []) {
      nativeServiceKeys.add(`${ns.name}|${ns.category || ""}|${ns.location_id || ""}`);
      if (ns.external_id) nativeServiceByExtId.set(ns.external_id, ns.id);
    }

    const servicesToInsert: any[] = [];
    for (const ps of phorestServices || []) {
      // Already exists by external_id?
      if (nativeServiceByExtId.has(ps.phorest_service_id)) {
        serviceResult.skipped++;
        continue;
      }

      const locationId = branchToLocation.get(ps.phorest_branch_id) || null;
      const key = `${ps.name}|${ps.category || ""}|${locationId || ""}`;

      if (nativeServiceKeys.has(key)) {
        serviceResult.skipped++;
        continue;
      }

      const orgId = locationId ? locationToOrg.get(locationId) : defaultOrgId;

      servicesToInsert.push({
        name: ps.name,
        category: ps.category || null,
        duration_minutes: ps.duration_minutes,
        price: ps.price || null,
        location_id: locationId,
        requires_qualification: ps.requires_qualification || false,
        allow_same_day_booking: ps.allow_same_day_booking,
        lead_time_days: ps.lead_time_days,
        same_day_restriction_reason: ps.same_day_restriction_reason,
        is_active: ps.is_active !== false,
        external_id: ps.phorest_service_id,
        import_source: IMPORT_SOURCE,
        imported_at: new Date().toISOString(),
        organization_id: orgId,
      });
      nativeServiceKeys.add(key); // prevent dupes within batch
    }

    if (!dryRun) {
      for (let i = 0; i < servicesToInsert.length; i += BATCH_SIZE) {
        const batch = servicesToInsert.slice(i, i + BATCH_SIZE);
        const { data: inserted, error } = await supabase
          .from("services")
          .insert(batch)
          .select("id");
        if (error) {
          serviceResult.errors += batch.length;
          serviceResult.error_details.push(`Insert batch ${i}: ${error.message}`);
        } else {
          serviceResult.inserted += inserted?.length || 0;
        }
      }
    } else {
      serviceResult.inserted = servicesToInsert.length;
    }

    console.log(`Services: total=${serviceResult.total}, inserted=${serviceResult.inserted}, skipped=${serviceResult.skipped}`);

    // ══════════════════════════════════════════
    // 3. APPOINTMENTS MIGRATION
    // ══════════════════════════════════════════
    const apptResult = newResult();

    const allPhorestAppts: any[] = [];
    let apptOffset = 0;
    while (true) {
      const { data: batch, error } = await supabase
        .from("phorest_appointments")
        .select("*")
        .range(apptOffset, apptOffset + 999);
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      allPhorestAppts.push(...batch);
      apptOffset += batch.length;
      if (batch.length < 1000) break;
    }
    apptResult.total = allPhorestAppts.length;

    // Fetch existing native appointments with external_id for dedup
    const { data: nativeAppts } = await supabase
      .from("appointments")
      .select("id, external_id")
      .not("external_id", "is", null);

    const existingExternalIds = new Set<string>();
    for (const na of nativeAppts || []) {
      if (na.external_id) existingExternalIds.add(na.external_id);
    }

    let unmappedStaffCount = 0;
    const apptsToInsert: any[] = [];

    for (const pa of allPhorestAppts) {
      // Dedup by phorest_id
      if (existingExternalIds.has(pa.phorest_id)) {
        apptResult.skipped++;
        continue;
      }

      const staffUserId = pa.phorest_staff_id ? staffMap.get(pa.phorest_staff_id) || null : null;
      if (pa.phorest_staff_id && !staffUserId) unmappedStaffCount++;

      const clientId = pa.phorest_client_id ? clientMapping.get(pa.phorest_client_id) || null : null;
      const orgId = pa.location_id ? locationToOrg.get(pa.location_id) : defaultOrgId;

      // Get staff name from employee_profiles if mapped
      let staffName = null;
      if (staffUserId) {
        // We'll resolve names in bulk later if needed; for now skip individual lookups in dry run
        staffName = null; // Will be resolved below for actual inserts
      }

      const durationMinutes = pa.start_time && pa.end_time
        ? Math.round((timeToMinutes(pa.end_time) - timeToMinutes(pa.start_time)))
        : null;

      apptsToInsert.push({
        location_id: pa.location_id || null,
        staff_user_id: staffUserId,
        staff_name: staffName,
        client_id: clientId === "dry-run-placeholder" ? null : clientId,
        client_name: pa.client_name || null,
        client_phone: pa.client_phone || null,
        service_name: pa.service_name || null,
        service_category: pa.service_category || null,
        appointment_date: pa.appointment_date,
        start_time: pa.start_time,
        end_time: pa.end_time,
        duration_minutes: durationMinutes,
        status: pa.status,
        total_price: pa.total_price || null,
        original_price: pa.original_price || null,
        tip_amount: pa.tip_amount || null,
        notes: pa.notes || null,
        external_id: pa.phorest_id,
        phorest_client_id: pa.phorest_client_id || null,
        phorest_staff_id: pa.phorest_staff_id || null,
        import_source: IMPORT_SOURCE,
        imported_at: new Date().toISOString(),
        organization_id: orgId,
        is_new_client: pa.is_new_client || false,
        rebooked_at_checkout: pa.rebooked_at_checkout || null,
        rebook_declined_reason: pa.rebook_declined_reason || null,
        is_redo: pa.is_redo || false,
        redo_reason: pa.redo_reason || null,
        redo_pricing_override: pa.redo_pricing_override || null,
        redo_approved_by: pa.redo_approved_by || null,
        payment_method: pa.payment_method || null,
        recurrence_rule: pa.recurrence_rule || null,
        recurrence_group_id: pa.recurrence_group_id || null,
        recurrence_index: pa.recurrence_index || null,
        rescheduled_from_date: pa.rescheduled_from_date || null,
        rescheduled_from_time: pa.rescheduled_from_time || null,
        rescheduled_at: pa.rescheduled_at || null,
        deposit_required: pa.deposit_required || false,
        deposit_amount: pa.deposit_amount || null,
        deposit_status: pa.deposit_status || null,
        deposit_collected_at: pa.deposit_collected_at || null,
        deposit_stripe_payment_id: pa.deposit_stripe_payment_id || null,
        deposit_applied_to_total: pa.deposit_applied_to_total || false,
      });
      existingExternalIds.add(pa.phorest_id); // prevent dupes within batch
    }

    // Resolve staff names for inserts
    if (!dryRun && apptsToInsert.length > 0) {
      const staffUserIds = [...new Set(apptsToInsert.map((a: any) => a.staff_user_id).filter(Boolean))];
      if (staffUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("employee_profiles")
          .select("user_id, display_name, full_name")
          .in("user_id", staffUserIds);

        const staffNames = new Map<string, string>();
        for (const p of profiles || []) {
          staffNames.set(p.user_id, p.display_name || p.full_name || "Unknown");
        }
        for (const a of apptsToInsert) {
          if (a.staff_user_id) {
            a.staff_name = staffNames.get(a.staff_user_id) || null;
          }
        }
      }
    }

    if (!dryRun) {
      for (let i = 0; i < apptsToInsert.length; i += BATCH_SIZE) {
        const batch = apptsToInsert.slice(i, i + BATCH_SIZE);
        const { data: inserted, error } = await supabase
          .from("appointments")
          .insert(batch)
          .select("id");
        if (error) {
          apptResult.errors += batch.length;
          apptResult.error_details.push(`Insert batch ${i}: ${error.message}`);
          console.error(`Appointment insert error at batch ${i}:`, error.message);
        } else {
          apptResult.inserted += inserted?.length || 0;
        }
      }
    } else {
      apptResult.inserted = apptsToInsert.length;
    }

    if (unmappedStaffCount > 0) {
      warnings.push(`${unmappedStaffCount} appointments have unmapped staff - staff_user_id will be NULL`);
    }

    console.log(`Appointments: total=${apptResult.total}, inserted=${apptResult.inserted}, skipped=${apptResult.skipped}`);

    // ══════════════════════════════════════════
    // 4. TRANSACTION ITEMS MIGRATION
    // ══════════════════════════════════════════
    const txResult = newResult();

    const allPhorestTx: any[] = [];
    let txOffset = 0;
    while (true) {
      const { data: batch, error } = await supabase
        .from("phorest_transaction_items")
        .select("*")
        .range(txOffset, txOffset + 999);
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      allPhorestTx.push(...batch);
      txOffset += batch.length;
      if (batch.length < 1000) break;
    }
    txResult.total = allPhorestTx.length;

    // Dedup check
    const { data: existingTx } = await supabase
      .from("transaction_items")
      .select("external_id")
      .not("external_id", "is", null);

    const existingTxIds = new Set<string>();
    for (const et of existingTx || []) {
      if (et.external_id) existingTxIds.add(et.external_id);
    }

    const txToInsert: any[] = [];
    for (const pt of allPhorestTx) {
      const extId = pt.transaction_id;
      if (existingTxIds.has(extId)) {
        txResult.skipped++;
        continue;
      }

      const staffUserId = pt.phorest_staff_id ? staffMap.get(pt.phorest_staff_id) || null : null;
      const clientId = pt.phorest_client_id ? clientMapping.get(pt.phorest_client_id) || null : null;
      const nativeLocationId = pt.location_id ? branchToLocation.get(pt.location_id) || null : null;
      const orgId = (nativeLocationId ? locationToOrg.get(nativeLocationId) : defaultOrgId) || defaultOrgId;

      txToInsert.push({
        organization_id: orgId,
        transaction_id: pt.transaction_id,
        staff_user_id: staffUserId,
        staff_name: pt.stylist_name || null,
        client_id: clientId === "dry-run-placeholder" ? null : clientId,
        client_name: pt.client_name || null,
        location_id: nativeLocationId || pt.location_id || null,
        branch_name: pt.branch_name || null,
        transaction_date: pt.transaction_date,
        item_type: pt.item_type,
        item_name: pt.item_name,
        item_category: pt.item_category || null,
        quantity: pt.quantity || 1,
        unit_price: pt.unit_price || null,
        discount: pt.discount || null,
        total_amount: pt.total_amount,
        tax_amount: pt.tax_amount || null,
        tip_amount: pt.tip_amount || null,
        payment_method: pt.payment_method || null,
        sale_classification: pt.sale_classification || null,
        promotion_id: pt.promotion_id || null,
        appointment_id: pt.appointment_id || null,
        external_id: extId,
        import_source: IMPORT_SOURCE,
        imported_at: new Date().toISOString(),
      });
      existingTxIds.add(extId);
    }

    if (!dryRun) {
      for (let i = 0; i < txToInsert.length; i += BATCH_SIZE) {
        const batch = txToInsert.slice(i, i + BATCH_SIZE);
        const { data: inserted, error } = await supabase
          .from("transaction_items")
          .insert(batch)
          .select("id");
        if (error) {
          txResult.errors += batch.length;
          txResult.error_details.push(`Insert batch ${i}: ${error.message}`);
          console.error(`Transaction insert error at batch ${i}:`, error.message);
        } else {
          txResult.inserted += inserted?.length || 0;
        }
      }
    } else {
      txResult.inserted = txToInsert.length;
    }

    console.log(`Transactions: total=${txResult.total}, inserted=${txResult.inserted}, skipped=${txResult.skipped}`);

    // ══════════════════════════════════════════
    // 5. DAILY SALES SUMMARY MIGRATION
    // ══════════════════════════════════════════
    const salesResult = newResult();

    const { data: phorestSales } = await supabase
      .from("phorest_daily_sales_summary")
      .select("*");

    salesResult.total = phorestSales?.length || 0;

    // Dedup check
    const { data: existingSales } = await supabase
      .from("daily_sales_summary")
      .select("external_id")
      .not("external_id", "is", null);

    const existingSalesIds = new Set<string>();
    for (const es of existingSales || []) {
      if (es.external_id) existingSalesIds.add(es.external_id);
    }

    const salesToInsert: any[] = [];
    for (const ps of phorestSales || []) {
      const compositeKey = `${ps.location_id || ""}|${ps.summary_date}|${ps.phorest_staff_id || ""}`;
      if (existingSalesIds.has(compositeKey)) {
        salesResult.skipped++;
        continue;
      }

      const staffUserId = ps.phorest_staff_id ? staffMap.get(ps.phorest_staff_id) || null : null;
      const nativeLocationId = ps.location_id ? branchToLocation.get(ps.location_id) || null : null;
      const orgId = (nativeLocationId ? locationToOrg.get(nativeLocationId) : defaultOrgId) || defaultOrgId;

      salesToInsert.push({
        organization_id: orgId,
        staff_user_id: staffUserId,
        location_id: nativeLocationId || ps.location_id || null,
        branch_name: ps.branch_name || null,
        summary_date: ps.summary_date,
        total_services: ps.total_services || 0,
        total_products: ps.total_products || 0,
        service_revenue: ps.service_revenue || 0,
        product_revenue: ps.product_revenue || 0,
        total_revenue: ps.total_revenue || 0,
        total_transactions: ps.total_transactions || 0,
        average_ticket: ps.average_ticket || 0,
        total_discounts: ps.total_discounts || 0,
        external_id: compositeKey,
        import_source: IMPORT_SOURCE,
      });
      existingSalesIds.add(compositeKey);
    }

    if (!dryRun) {
      for (let i = 0; i < salesToInsert.length; i += BATCH_SIZE) {
        const batch = salesToInsert.slice(i, i + BATCH_SIZE);
        const { data: inserted, error } = await supabase
          .from("daily_sales_summary")
          .insert(batch)
          .select("id");
        if (error) {
          salesResult.errors += batch.length;
          salesResult.error_details.push(`Insert batch ${i}: ${error.message}`);
        } else {
          salesResult.inserted += inserted?.length || 0;
        }
      }
    } else {
      salesResult.inserted = salesToInsert.length;
    }

    console.log(`Daily Sales: total=${salesResult.total}, inserted=${salesResult.inserted}, skipped=${salesResult.skipped}`);

    // ── Compile warnings ──
    const unmappedStaffIds = new Set<string>();
    for (const pa of allPhorestAppts) {
      if (pa.phorest_staff_id && !staffMap.has(pa.phorest_staff_id)) {
        unmappedStaffIds.add(pa.phorest_staff_id);
      }
    }
    if (unmappedStaffIds.size > 0) {
      warnings.push(`${unmappedStaffIds.size} unique staff IDs unmapped - records will have NULL staff_user_id`);
      warnings.push("phorest_staff_id preserved as text on appointments for future backfill");
    }

    const response = {
      success: true,
      dry_run: dryRun,
      results: {
        clients: { total: clientResult.total, inserted: clientResult.inserted, updated: clientResult.updated, skipped: clientResult.skipped, errors: clientResult.errors },
        services: { total: serviceResult.total, inserted: serviceResult.inserted, updated: serviceResult.updated, skipped: serviceResult.skipped, errors: serviceResult.errors },
        appointments: { total: apptResult.total, inserted: apptResult.inserted, updated: apptResult.updated, skipped: apptResult.skipped, errors: apptResult.errors },
        transactions: { total: txResult.total, inserted: txResult.inserted, updated: txResult.updated, skipped: txResult.skipped, errors: txResult.errors },
        daily_sales: { total: salesResult.total, inserted: salesResult.inserted, updated: salesResult.updated, skipped: salesResult.skipped, errors: salesResult.errors },
      },
      warnings,
      error_details: dryRun ? undefined : {
        clients: clientResult.error_details.length ? clientResult.error_details : undefined,
        services: serviceResult.error_details.length ? serviceResult.error_details : undefined,
        appointments: apptResult.error_details.length ? apptResult.error_details : undefined,
        transactions: txResult.error_details.length ? txResult.error_details : undefined,
        daily_sales: salesResult.error_details.length ? salesResult.error_details : undefined,
      },
    };

    console.log("Migration complete:", JSON.stringify(response.results));

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}
