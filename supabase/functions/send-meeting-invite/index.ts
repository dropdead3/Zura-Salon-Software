import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const { meetingId } = await req.json();
    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: "meetingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("admin_meetings")
      .select("*")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      return new Response(
        JSON.stringify({ error: "Meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch attendees
    const { data: attendees } = await supabase
      .from("admin_meeting_attendees")
      .select("user_id")
      .eq("meeting_id", meetingId);

    if (!attendees || attendees.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No attendees" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organizer profile
    const { data: organizer } = await supabase
      .from("employee_profiles")
      .select("display_name, full_name, email")
      .eq("user_id", meeting.organizer_user_id)
      .maybeSingle();

    const organizerName = organizer?.display_name || organizer?.full_name || "A team member";

    // Fetch attendee profiles with emails
    const attendeeUserIds = attendees.map((a: any) => a.user_id);
    const { data: profiles } = await supabase
      .from("employee_profiles")
      .select("user_id, display_name, full_name, email")
      .in("user_id", attendeeUserIds);

    // Format meeting time
    const formatTime12 = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
    };

    const meetingDate = new Date(meeting.start_date + "T12:00:00");
    const dateStr = meetingDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const modeLabel =
      meeting.meeting_mode === "video"
        ? "Video Call"
        : meeting.meeting_mode === "hybrid"
        ? "Hybrid"
        : "In Person";

    const typeLabels: Record<string, string> = {
      one_on_one: "1-on-1",
      interview: "Interview",
      manager_meeting: "Team Meeting",
      training: "Training",
      other: "Meeting",
    };

    let sent = 0;
    for (const profile of profiles || []) {
      if (!profile.email) continue;

      const recipientName = profile.display_name || profile.full_name || "Team Member";

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="font-size: 20px; font-weight: 500; margin-bottom: 4px;">Meeting Invite</h2>
          <p style="color: #666; margin-top: 0;">You've been invited to a meeting by ${organizerName}.</p>
          
          <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 4px; font-size: 16px; font-weight: 500;">${meeting.title}</p>
            <p style="margin: 0 0 12px; color: #888; font-size: 13px;">${typeLabels[meeting.meeting_type] || "Meeting"} · ${modeLabel}</p>
            
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #888; width: 80px;">Date</td>
                <td style="padding: 6px 0;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888;">Time</td>
                <td style="padding: 6px 0;">${formatTime12(meeting.start_time)} – ${formatTime12(meeting.end_time)} (${meeting.duration_minutes} min)</td>
              </tr>
              ${meeting.video_link ? `
              <tr>
                <td style="padding: 6px 0; color: #888;">Link</td>
                <td style="padding: 6px 0;"><a href="${meeting.video_link}" style="color: #4f46e5;">${meeting.video_link}</a></td>
              </tr>` : ""}
              ${meeting.notes ? `
              <tr>
                <td style="padding: 6px 0; color: #888; vertical-align: top;">Notes</td>
                <td style="padding: 6px 0;">${meeting.notes}</td>
              </tr>` : ""}
            </table>
          </div>
          
          <p style="font-size: 13px; color: #888;">Open your schedule in Zura to RSVP.</p>
        </div>
      `;

      const result = await sendOrgEmail(supabase, meeting.organization_id, {
        to: [profile.email],
        subject: `Meeting Invite: ${meeting.title} — ${dateStr}`,
        html,
        emailType: "transactional",
      });

      if (result.success) sent++;
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
