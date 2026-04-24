import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLATFORM_NAME } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatICSDate(dateStr: string, timeStr: string): string {
  // dateStr: "2026-02-19", timeStr: "09:00:00"
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(str: string): string {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Look up token
    const { data: feedToken, error: tokenError } = await supabase
      .from("calendar_feed_tokens")
      .select("user_id, is_active")
      .eq("token", token)
      .single();

    if (tokenError || !feedToken || !feedToken.is_active) {
      return new Response("Invalid or inactive token", { status: 403, headers: corsHeaders });
    }

    const userId = feedToken.user_id;

    // Get user's appointments (past 30 days + future)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, appointment_date, start_time, end_time, client_name, service_name, status, notes, location_id, duration_minutes")
      .eq("staff_user_id", userId)
      .gte("appointment_date", cutoff)
      .neq("status", "cancelled")
      .order("appointment_date", { ascending: true })
      .limit(500);

    if (apptError) {
      console.error("Error fetching appointments:", apptError);
      return new Response("Error fetching appointments", { status: 500, headers: corsHeaders });
    }

    // Build iCalendar content
    const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//${PLATFORM_NAME}//Calendar Feed//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:${PLATFORM_NAME} Appointments\r\nX-WR-TIMEZONE:UTC\r\nREFRESH-INTERVAL;VALUE=DURATION:PT30M\r\n`;

    for (const appt of appointments || []) {
      const dtStart = formatICSDate(appt.appointment_date, appt.start_time);
      const dtEnd = formatICSDate(appt.appointment_date, appt.end_time);
      const summary = escapeICS(
        [appt.service_name, appt.client_name].filter(Boolean).join(" - ") || "Appointment"
      );
      const description = escapeICS(
        [
          appt.status ? `Status: ${appt.status}` : null,
          appt.notes ? `Notes: ${appt.notes}` : null,
        ].filter(Boolean).join("\\n")
      );

      ics += `BEGIN:VEVENT\r\n`;
      ics += `UID:${appt.id}@${PLATFORM_NAME.toLowerCase()}.app\r\n`;
      ics += `DTSTAMP:${now}\r\n`;
      ics += `DTSTART:${dtStart}\r\n`;
      ics += `DTEND:${dtEnd}\r\n`;
      ics += `SUMMARY:${summary}\r\n`;
      if (description) {
        ics += `DESCRIPTION:${description}\r\n`;
      }
      ics += `STATUS:CONFIRMED\r\n`;
      ics += `END:VEVENT\r\n`;
    }

    ics += `END:VCALENDAR\r\n`;

    return new Response(ics, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${PLATFORM_NAME.toLowerCase()}-appointments.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Calendar feed error:", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
