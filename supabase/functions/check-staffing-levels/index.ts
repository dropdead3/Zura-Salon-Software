import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface StaffingAlertSettings {
  percentage: number;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr: any) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { supabaseAdmin } = authResult;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { data: settingsData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "staffing_alert_threshold")
      .maybeSingle();

    const settings: StaffingAlertSettings = settingsData?.value as StaffingAlertSettings || {
      percentage: 70, email_enabled: true, in_app_enabled: true,
    };

    if (!settings.email_enabled && !settings.in_app_enabled) {
      return new Response(
        JSON.stringify({ message: "All staffing alerts are disabled" }),
        { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { data: locations, error: locError } = await supabase
      .from("locations")
      .select("id, name, stylist_capacity, assistant_ratio, organization_id")
      .eq("is_active", true)
      .not("stylist_capacity", "is", null);

    if (locError) throw locError;

    if (!locations || locations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No locations with capacity configured" }),
        { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { data: employees } = await supabase
      .from("employee_profiles")
      .select("user_id, location_ids")
      .eq("is_active", true)
      .eq("is_approved", true);

    const employeeUserIds = employees?.map((e: any) => e.user_id) || [];
    const { data: roles } = employeeUserIds.length > 0
      ? await supabase.from("user_roles").select("user_id, role").in("user_id", employeeUserIds).in("role", ["stylist", "stylist_assistant"])
      : { data: [] };

    const alertLocations: { name: string; currentStaff: number; targetStaff: number; percentage: number; organization_id: string }[] = [];

    for (const location of locations) {
      const locationEmployees = employees?.filter((e: any) => e.location_ids?.includes(location.id)) || [];
      const locationUserIds = locationEmployees.map((e: any) => e.user_id);
      const locationRoles = roles?.filter((r: any) => locationUserIds.includes(r.user_id)) || [];
      const stylistCount = locationRoles.filter((r: any) => r.role === "stylist").length;
      const assistantCount = locationRoles.filter((r: any) => r.role === "stylist_assistant").length;
      const currentStaff = stylistCount + assistantCount;
      const assistantTarget = Math.ceil((location.stylist_capacity || 0) * (location.assistant_ratio || 0.5));
      const targetStaff = (location.stylist_capacity || 0) + assistantTarget;

      if (targetStaff > 0) {
        const percentage = Math.round((currentStaff / targetStaff) * 100);
        if (percentage < settings.percentage) {
          alertLocations.push({ id: location.id, name: location.name, currentStaff, targetStaff, percentage, organization_id: location.organization_id });
        }
      }
    }

    if (alertLocations.length === 0) {
      return new Response(
        JSON.stringify({ message: "All locations are above threshold" }),
        { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { data: adminProfiles } = await supabase
      .from("employee_profiles")
      .select("user_id, email, full_name, organization_id")
      .eq("is_active", true).eq("is_approved", true);

    const adminUserIds = adminProfiles?.map((p: any) => p.user_id) || [];
    const { data: adminRoles } = adminUserIds.length > 0
      ? await supabase.from("user_roles").select("user_id, role").in("user_id", adminUserIds).in("role", ["admin", "super_admin", "manager"])
      : { data: [] };

    const adminEmails = adminProfiles?.filter((p: any) => adminRoles?.some((r: any) => r.user_id === p.user_id)).map((p: any) => p.email).filter(Boolean) || [];
    const adminIds = adminRoles?.map((r: any) => r.user_id) || [];

    let notificationsSent = 0;
    let emailsSent = 0;

    if (settings.in_app_enabled) {
      // ── Dedup: 24h window per (location, recipient) to prevent cron-spam ──
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentAlerts } = await supabase
        .from("notifications")
        .select("user_id, metadata")
        .eq("type", "staffing_alert")
        .gte("created_at", oneDayAgo);

      const alertedPairs = new Set(
        (recentAlerts || [])
          .map((n: any) => {
            const locId = n.metadata?.location_id;
            return locId ? `${n.user_id}:${locId}` : null;
          })
          .filter(Boolean)
      );

      const notifications = alertLocations.flatMap((loc: any) =>
        adminIds
          .filter((userId: any) => !alertedPairs.has(`${userId}:${loc.id}`))
          .map((userId: any) => ({
            user_id: userId,
            type: "staffing_alert",
            title: `⚠️ Staffing Alert: ${loc.name}`,
            message: `${loc.name} is at ${loc.percentage}% staffing capacity (${loc.currentStaff}/${loc.targetStaff}). Consider prioritizing hiring.`,
            link: "/dashboard/admin/operational-analytics",
            is_read: false,
            metadata: {
              location_id: loc.id,
              organization_id: loc.organization_id,
              percentage: loc.percentage,
              current_staff: loc.currentStaff,
              target_staff: loc.targetStaff,
            },
          }))
      );
      if (notifications.length > 0) {
        const { error: notifError } = await supabase.from("notifications").insert(notifications);
        if (!notifError) notificationsSent = notifications.length;
      }
    }

    if (settings.email_enabled && adminEmails.length > 0) {
      const locationList = alertLocations
        .map((loc: any) => `• ${loc.name}: ${loc.percentage}% (${loc.currentStaff}/${loc.targetStaff})`)
        .join("<br>");

      // Use org from first alert location
      const orgId = alertLocations[0]?.organization_id || adminProfiles?.[0]?.organization_id;

      const result = await sendOrgEmail(supabase, orgId, {
        to: adminEmails,
        subject: `⚠️ Staffing Alert: ${alertLocations.length} location(s) below ${settings.percentage}% capacity`,
        html: `
          <h2 style="margin-top:0;">Staffing Capacity Alert</h2>
          <p>The following locations are below your configured threshold of ${settings.percentage}%:</p>
          <p>${locationList}</p>
          <p><a href="/dashboard/admin/operational-analytics">View Hiring Capacity Dashboard</a></p>
        `,
      });

      if (result.success) emailsSent = adminEmails.length;
    }

    console.log(`Staffing alert: ${alertLocations.length} locations below threshold, ${notificationsSent} notifications, ${emailsSent} emails`);

    return new Response(
      JSON.stringify({ success: true, alertLocations, notificationsSent, emailsSent }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error checking staffing levels:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
