import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { supabaseAdmin } = authResult;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Fetch all active locations with capacity settings
    const { data: locations, error: locError } = await supabase
      .from("locations")
      .select("id, name, stylist_capacity, assistant_ratio")
      .eq("is_active", true);

    if (locError) throw locError;

    if (!locations || locations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active locations found" }),
        { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Fetch all active employees with their location assignments and roles
    const { data: employees, error: empError } = await supabase
      .from("employee_profiles")
      .select("user_id, location_ids")
      .eq("is_active", true)
      .eq("is_approved", true);

    if (empError) throw empError;

    const employeeUserIds = employees?.map((e) => e.user_id) || [];

    // Fetch roles for these employees
    const { data: roles, error: roleError } = employeeUserIds.length > 0
      ? await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", employeeUserIds)
          .in("role", ["stylist", "stylist_assistant"])
      : { data: [], error: null };

    if (roleError) throw roleError;

    const today = new Date().toISOString().split("T")[0];
    const snapshots = [];

    for (const location of locations) {
      // Find employees at this location
      const locationEmployees = employees?.filter(
        (e) => e.location_ids?.includes(location.id)
      ) || [];
      const locationUserIds = locationEmployees.map((e) => e.user_id);

      // Count stylists and assistants
      const locationRoles = roles?.filter((r) => locationUserIds.includes(r.user_id)) || [];
      const stylistCount = locationRoles.filter((r) => r.role === "stylist").length;
      const assistantCount = locationRoles.filter((r) => r.role === "stylist_assistant").length;

      snapshots.push({
        location_id: location.id,
        record_date: today,
        stylist_count: stylistCount,
        assistant_count: assistantCount,
        stylist_capacity: location.stylist_capacity,
        assistant_ratio: location.assistant_ratio,
      });
    }

    // Upsert snapshots (update if exists for today, insert otherwise)
    const { error: insertError } = await supabase
      .from("staffing_history")
      .upsert(snapshots, { onConflict: "location_id,record_date" });

    if (insertError) throw insertError;

    console.log(`Recorded ${snapshots.length} staffing snapshots for ${today}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Recorded ${snapshots.length} snapshots`,
        snapshots 
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error recording staffing snapshot:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
