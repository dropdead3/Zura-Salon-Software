import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// S1: Valid status transition map
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "denied"],
  approved: ["shipped", "denied"],
  shipped: ["delivered"],
  delivered: [],
  denied: [],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action } = body;

    // ---- create_request ----
    if (action === "create_request") {
      const { organization_id, location_id, quantity, reason, notes } = body;

      if (!organization_id || !location_id || !reason) {
        return jsonResponse({ error: "Missing required fields: organization_id, location_id, reason" }, 400);
      }

      // S2: Validate location_id belongs to organization_id
      const { data: locationCheck, error: locError } = await supabase
        .from("locations")
        .select("id")
        .eq("id", location_id)
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (locError || !locationCheck) {
        return jsonResponse({ error: "Location does not belong to this organization" }, 400);
      }

      // Verify org admin role
      const { data: membership } = await supabase
        .from("organization_admins")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      const isAdmin = !!membership;

      if (!isAdmin) {
        const { data: ep } = await supabase
          .from("employee_profiles")
          .select("is_super_admin")
          .eq("user_id", user.id)
          .eq("organization_id", organization_id)
          .maybeSingle();

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const hasRole = roles?.some((r: { role: string }) =>
          ["admin", "manager", "super_admin"].includes(r.role)
        );

        if (!ep?.is_super_admin && !hasRole) {
          return jsonResponse({ error: "Insufficient permissions. Admin or manager role required." }, 403);
        }
      }

      const qty = Math.min(Math.max(Math.round(quantity || 1), 1), 10);
      const validReasons = ["new_location", "replacement", "additional", "upgrade_to_s710", "other"];
      if (!validReasons.includes(reason)) {
        return jsonResponse({ error: `Invalid reason. Must be one of: ${validReasons.join(", ")}` }, 400);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("terminal_hardware_requests")
        .insert({
          organization_id,
          location_id,
          requested_by: user.id,
          quantity: qty,
          reason,
          notes: notes?.slice(0, 1000) || null,
          status: "pending",
          device_type: "s710",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return jsonResponse({ error: insertError.message }, 500);
      }

      return jsonResponse({ data: inserted });
    }

    // ---- list_all_requests (platform) ----
    if (action === "list_all_requests") {
      // Check platform role
      const { data: platformRole } = await supabase
        .from("platform_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!platformRole) {
        return jsonResponse({ error: "Platform access required" }, 403);
      }

      let query = supabase
        .from("terminal_hardware_requests")
        .select(`
          *,
          organizations!inner(name),
          locations!terminal_hardware_requests_location_id_fkey(name)
        `)
        .order("created_at", { ascending: false });

      if (body.status_filter && body.status_filter !== "all") {
        query = query.eq("status", body.status_filter);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback without joins if FK doesn't exist
        const { data: fallback, error: fbError } = await supabase
          .from("terminal_hardware_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (fbError) {
          return jsonResponse({ error: fbError.message }, 500);
        }

        // Enrich with org names + requester names
        const orgIds = [...new Set((fallback || []).map((r: Record<string, unknown>) => r.organization_id))];
        const locIds = [...new Set((fallback || []).filter((r: Record<string, unknown>) => r.location_id).map((r: Record<string, unknown>) => r.location_id))];
        const userIds = [...new Set((fallback || []).filter((r: Record<string, unknown>) => r.requested_by).map((r: Record<string, unknown>) => r.requested_by))];

        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds as string[]);

        const { data: locs } = await supabase
          .from("locations")
          .select("id, name")
          .in("id", locIds as string[]);

        const { data: profiles } = await supabase
          .from("employee_profiles")
          .select("user_id, display_name")
          .in("user_id", userIds as string[]);

        const orgMap = Object.fromEntries((orgs || []).map((o: { id: string; name: string }) => [o.id, o.name]));
        const locMap = Object.fromEntries((locs || []).map((l: { id: string; name: string }) => [l.id, l.name]));
        const profileMap = Object.fromEntries((profiles || []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));

        const enriched = (fallback || []).map((r: Record<string, unknown>) => ({
          ...r,
          organization_name: orgMap[r.organization_id as string] || "Unknown",
          location_name: locMap[r.location_id as string] || "Unknown",
          requester_name: profileMap[r.requested_by as string] || null,
        }));

        if (body.status_filter && body.status_filter !== "all") {
          return jsonResponse({ data: enriched.filter((r: Record<string, unknown>) => r.status === body.status_filter) });
        }
        return jsonResponse({ data: enriched });
      }

      // E2: Also fetch requester names for the joined path
      const requestedByIds = [...new Set((data || []).filter((r: Record<string, unknown>) => r.requested_by).map((r: Record<string, unknown>) => r.requested_by))];
      const { data: profiles } = await supabase
        .from("employee_profiles")
        .select("user_id, display_name")
        .in("user_id", requestedByIds as string[]);
      const profileMap = Object.fromEntries((profiles || []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));

      const enriched = (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        organization_name: (r as Record<string, { name?: string }>).organizations?.name || "Unknown",
        location_name: (r as Record<string, { name?: string }>).locations?.name || "Unknown",
        requester_name: profileMap[r.requested_by as string] || null,
        organizations: undefined,
        locations: undefined,
      }));

      return jsonResponse({ data: enriched });
    }

    // ---- update_request (platform) ----
    if (action === "update_request") {
      const { request_id, status, admin_notes, tracking_number } = body;

      if (!request_id) {
        return jsonResponse({ error: "request_id is required" }, 400);
      }

      // Check platform role
      const { data: platformRole } = await supabase
        .from("platform_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!platformRole) {
        return jsonResponse({ error: "Platform access required" }, 403);
      }

      const validStatuses = ["pending", "approved", "shipped", "delivered", "denied"];
      if (status && !validStatuses.includes(status)) {
        return jsonResponse({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, 400);
      }

      // S1: Enforce valid status transitions
      if (status) {
        const { data: current, error: fetchErr } = await supabase
          .from("terminal_hardware_requests")
          .select("status")
          .eq("id", request_id)
          .single();

        if (fetchErr || !current) {
          return jsonResponse({ error: "Request not found" }, 404);
        }

        const allowed = VALID_TRANSITIONS[current.status] || [];
        if (!allowed.includes(status)) {
          return jsonResponse({
            error: `Invalid transition: cannot move from '${current.status}' to '${status}'. Allowed: ${allowed.join(", ") || "none (terminal state)"}`,
          }, 400);
        }
      }

      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (admin_notes !== undefined) updates.admin_notes = admin_notes?.slice(0, 2000) || null;
      if (tracking_number !== undefined) updates.tracking_number = tracking_number?.slice(0, 200) || null;

      if (Object.keys(updates).length === 0) {
        return jsonResponse({ error: "No updates provided" }, 400);
      }

      const { data: updated, error: updateError } = await supabase
        .from("terminal_hardware_requests")
        .update(updates)
        .eq("id", request_id)
        .select()
        .single();

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }

      return jsonResponse({ data: updated });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
