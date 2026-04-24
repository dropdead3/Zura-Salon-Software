import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  request_id: string;
  action: 'accepted' | 'declined';
  assistant_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { request_id, action, assistant_id }: NotificationRequest = await req.json();

    const { data: request, error: requestError } = await supabase
      .from("assistant_requests")
      .select(`*, salon_services (name, duration_minutes)`)
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: stylistProfile } = await supabase
      .from("employee_profiles")
      .select("full_name, display_name, email, organization_id")
      .eq("user_id", request.stylist_id)
      .single();

    const { data: assistantProfile } = await supabase
      .from("employee_profiles")
      .select("full_name, display_name, email, organization_id")
      .eq("user_id", assistant_id)
      .single();

    const stylistName = stylistProfile?.display_name || stylistProfile?.full_name || "Stylist";
    const assistantName = assistantProfile?.display_name || assistantProfile?.full_name || "Assistant";
    const organizationId = stylistProfile?.organization_id || assistantProfile?.organization_id;

    const formattedDate = new Date(request.request_date).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };

    // Send notification to stylist
    if (organizationId && stylistProfile?.email) {
      if (action === 'accepted') {
        await sendOrgEmail(supabase, organizationId, {
          to: [stylistProfile.email],
          subject: `✅ Assistant Confirmed - ${formattedDate}`,
          html: `
            <h2 style="color: #22c55e;">Assistant Confirmed!</h2>
            <p>Hi ${stylistName},</p>
            <p><strong>${assistantName}</strong> has confirmed they will assist you with your client.</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <p style="margin: 0 0 8px;"><strong>Client:</strong> ${request.client_name}</p>
              <p style="margin: 0 0 8px;"><strong>Service:</strong> ${request.salon_services?.name}</p>
              <p style="margin: 0 0 8px;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 0;"><strong>Time:</strong> ${formatTime(request.start_time)} - ${formatTime(request.end_time)}</p>
            </div>
            <p>Your assistant will be ready at the scheduled time.</p>
          `,
        });
      } else {
        await sendOrgEmail(supabase, organizationId, {
          to: [stylistProfile.email],
          subject: `⚠️ Assistant Change - ${formattedDate}`,
          html: `
            <h2 style="color: #f59e0b;">Assignment Update</h2>
            <p>Hi ${stylistName},</p>
            <p><strong>${assistantName}</strong> was unable to take this assignment and has declined.</p>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0 0 8px;"><strong>Client:</strong> ${request.client_name}</p>
              <p style="margin: 0 0 8px;"><strong>Service:</strong> ${request.salon_services?.name}</p>
              <p style="margin: 0 0 8px;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 0;"><strong>Time:</strong> ${formatTime(request.start_time)} - ${formatTime(request.end_time)}</p>
            </div>
            <p>We're automatically looking for another available assistant.</p>
          `,
        });
      }
    }

    // Create in-app notification
    const notificationMessage = action === 'accepted'
      ? `Your assistant request for ${request.client_name} on ${formattedDate} has been confirmed.`
      : `${assistantName} was unable to assist with ${request.client_name} on ${formattedDate}. We're finding a replacement.`;

    await supabase.from("notifications").insert({
      user_id: request.stylist_id,
      type: action === 'accepted' ? 'assignment_accepted' : 'assignment_declined',
      title: action === 'accepted' ? `${assistantName} confirmed your request` : `${assistantName} declined - reassigning`,
      message: notificationMessage,
      link: '/dashboard/assistant-schedule',
      metadata: { request_id, assistant_id, action }
    });

    // Send push notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          user_id: request.stylist_id,
          title: action === 'accepted' ? "Assistant Confirmed ✅" : "Assignment Update ⚠️",
          body: notificationMessage,
          url: "/dashboard/assistant-schedule",
          tag: "assignment-response",
        }),
      });
    } catch (pushError: any) {
      console.error("Failed to send push notification:", pushError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in notify-assignment-response:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
