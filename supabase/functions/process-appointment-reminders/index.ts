import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Process Appointment Reminders
 * 
 * Cron-based processor (every 15 minutes) that:
 * 1. Finds appointments due for 24h or 2h reminders
 * 2. Groups all services for the same client visit into one reminder
 * 3. Resolves org-level and location-specific reminder templates
 * 4. Sends via sendOrgEmail (transactional, but respects global preferences)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const now = new Date();
    let totalSent = 0;

    // Process both 24h and 2h reminders
    for (const reminderType of ["24_hours", "2_hours"] as const) {
      const hoursAhead = reminderType === "24_hours" ? 24 : 2;
      const flagColumn = reminderType === "24_hours" ? "reminder_24h_sent" : "reminder_2h_sent";

      // Find window: appointments starting within (hoursAhead - 0.5h) to (hoursAhead + 0.5h) from now
      const windowStart = new Date(now.getTime() + (hoursAhead - 0.5) * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + (hoursAhead + 0.5) * 60 * 60 * 1000);
      const windowDate = windowStart.toISOString().split("T")[0];
      const windowEndDate = windowEnd.toISOString().split("T")[0];

      // Fetch appointments in the window that haven't had this reminder sent
      const { data: appointments, error: fetchError } = await supabase
        .from("appointments")
        .select("id, organization_id, client_id, client_name, client_email, appointment_date, start_time, end_time, service_name, staff_name, location_id, status")
        .in("appointment_date", [windowDate, windowEndDate])
        .in("status", ["confirmed", "pending"])
        .eq(flagColumn, false)
        .not("client_email", "is", null)
        .order("client_email")
        .order("start_time")
        .limit(200);

      if (fetchError) {
        console.error(`[reminders] Error fetching appointments for ${reminderType}:`, fetchError.message);
        continue;
      }

      if (!appointments || appointments.length === 0) continue;

      // Further filter by actual time window
      const filteredAppointments = appointments.filter((appt: any) => {
        const apptDatetime = new Date(`${appt.appointment_date}T${appt.start_time}`);
        return apptDatetime >= windowStart && apptDatetime <= windowEnd;
      });

      if (filteredAppointments.length === 0) continue;

      // Group by client_email + appointment_date (consolidate multi-service visits)
      const clientGroups = new Map<string, typeof filteredAppointments>();
      for (const appt of filteredAppointments) {
        const key = `${appt.client_email}:${appt.appointment_date}`;
        if (!clientGroups.has(key)) clientGroups.set(key, []);
        clientGroups.get(key)!.push(appt);
      }

      // Fetch reminder configs per org
      const orgIds = [...new Set(filteredAppointments.map((a: any) => a.organization_id).filter(Boolean))];
      const { data: configs } = await supabase
        .from("appointment_reminders_config")
        .select("id, organization_id, reminder_type, is_active, subject, html_body")
        .in("organization_id", orgIds)
        .eq("reminder_type", reminderType)
        .eq("is_active", true);

      const configMap = new Map(configs?.map((c: any) => [c.organization_id, c]) || []);

      // Fetch location overrides
      const configIds = configs?.map((c: any) => c.id) || [];
      const locationIds = [...new Set(filteredAppointments.map((a: any) => a.location_id).filter(Boolean))];
      let overrideMap = new Map<string, any>();

      if (configIds.length > 0 && locationIds.length > 0) {
        const { data: overrides } = await supabase
          .from("appointment_reminder_overrides")
          .select("config_id, location_id, subject, html_body")
          .in("config_id", configIds)
          .in("location_id", locationIds);

        overrides?.forEach((o: any) => overrideMap.set(`${o.config_id}:${o.location_id}`, o));
      }

      // Fetch location names
      let locationNameMap = new Map<string, string>();
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from("locations")
          .select("id, name, city")
          .in("id", locationIds);
        locations?.forEach((l: any) => locationNameMap.set(l.id, l.name));
      }

      // Send reminders
      for (const [, groupAppts] of clientGroups) {
        const first = groupAppts[0];
        const orgId = first.organization_id;
        if (!orgId) continue;

        const config = configMap.get(orgId);
        // If no config for this org, use defaults
        const locationId = first.location_id;
        const override = config && locationId
          ? overrideMap.get(`${config.id}:${locationId}`)
          : null;

        const servicesList = groupAppts.map((a: any) => a.service_name).filter(Boolean).join(", ");
        const stylistName = first.staff_name || "your stylist";
        const locationName = locationId ? locationNameMap.get(locationId) || "" : "";
        const firstName = first.client_name?.split(" ")[0] || "there";
        const apptDate = formatDate(first.appointment_date);
        const apptTime = formatTime(first.start_time);

        let subject: string;
        let htmlBody: string;

        if (config) {
          subject = override?.subject || config.subject;
          htmlBody = override?.html_body || config.html_body;

          // Replace variables
          const vars: Record<string, string> = {
            first_name: firstName,
            client_name: first.client_name || "Valued Client",
            services: servicesList,
            stylist_name: stylistName,
            appointment_date: apptDate,
            appointment_time: apptTime,
            location_name: locationName,
          };

          subject = replaceVariables(subject, vars);
          htmlBody = replaceVariables(htmlBody, vars);
        } else {
          // Default template
          const isDay = reminderType === "24_hours";
          subject = isDay
            ? `Reminder: Your appointment ${apptDate === formatDate(new Date().toISOString().split("T")[0]) ? "today" : "tomorrow"}`
            : `See you soon! Your appointment is in 2 hours`;

          htmlBody = `
            <p>Hi ${firstName},</p>
            <p>${isDay ? "This is a friendly reminder about your upcoming appointment:" : "Your appointment is coming up soon!"}</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Date:</strong> ${apptDate}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${apptTime}</p>
              <p style="margin: 4px 0;"><strong>Services:</strong> ${servicesList || "Appointment"}</p>
              <p style="margin: 4px 0;"><strong>With:</strong> ${stylistName}</p>
              ${locationName ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${locationName}</p>` : ""}
            </div>
            <p>We look forward to seeing you!</p>
          `;
        }

        const result = await sendOrgEmail(supabase, orgId, {
          to: [first.client_email!],
          subject,
          html: htmlBody,
          emailType: "transactional",
        });

        if (result.success && !result.skipped) {
          // Mark all appointments in this group as reminded
          const apptIds = groupAppts.map((a: any) => a.id);
          await supabase
            .from("appointments")
            .update({ [flagColumn]: true })
            .in("id", apptIds);
          totalSent++;
        }
      }
    }

    console.log(`[reminders] Sent ${totalSent} reminder emails`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[reminders] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
