import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentRequest {
  request_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { request_id }: AssignmentRequest = await req.json();
    console.log("Processing assignment for request:", request_id);

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

    // Get stylist info including org
    const { data: stylistProfile } = await supabase
      .from("employee_profiles")
      .select("full_name, display_name, organization_id")
      .eq("user_id", request.stylist_id)
      .single();

    const stylistName = stylistProfile?.display_name || stylistProfile?.full_name || "A stylist";
    const organizationId = stylistProfile?.organization_id;

    // Get all assistants
    const { data: assistantRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["stylist_assistant", "assistant"]);

    if (rolesError || !assistantRoles?.length) {
      return new Response(
        JSON.stringify({ error: "No assistants available", assigned: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const assistantUserIds = assistantRoles.map((r: any) => r.user_id);

    // Check for conflicts
    const { data: conflicts } = await supabase
      .from("assistant_requests")
      .select("assistant_id")
      .eq("request_date", request.request_date)
      .eq("status", "assigned")
      .not("assistant_id", "is", null)
      .or(`and(start_time.lte.${request.start_time},end_time.gt.${request.start_time}),and(start_time.lt.${request.end_time},end_time.gte.${request.end_time}),and(start_time.gte.${request.start_time},end_time.lte.${request.end_time})`);

    const busyAssistants = new Set(conflicts?.map((c: any) => c.assistant_id) || []);
    const availableAssistants = assistantUserIds.filter((id: any) => !busyAssistants.has(id));

    if (availableAssistants.length === 0) {
      return new Response(
        JSON.stringify({ error: "No assistants available for this time slot", assigned: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round-robin assignment
    const { data: assignments } = await supabase
      .from("assistant_assignments")
      .select("*")
      .in("assistant_id", availableAssistants);

    const existingAssistantIds = new Set(assignments?.map((a: any) => a.assistant_id) || []);
    const newAssistants = availableAssistants.filter((id: any) => !existingAssistantIds.has(id));

    if (newAssistants.length > 0) {
      await supabase
        .from("assistant_assignments")
        .insert(newAssistants.map((id: any) => ({ assistant_id: id, total_assignments: 0 })));
    }

    const { data: allAssignments } = await supabase
      .from("assistant_assignments")
      .select("*")
      .in("assistant_id", availableAssistants)
      .order("total_assignments", { ascending: true })
      .order("last_assigned_at", { ascending: true });

    if (!allAssignments?.length) {
      return new Response(
        JSON.stringify({ error: "Assignment error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedAssistant = allAssignments[0];

    await supabase.from("assistant_requests").update({
      assistant_id: selectedAssistant.assistant_id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    }).eq("id", request_id);

    await supabase.from("assistant_assignments").update({
      last_assigned_at: new Date().toISOString(),
      total_assignments: selectedAssistant.total_assignments + 1
    }).eq("id", selectedAssistant.id);

    // Get assistant's email for notification
    const { data: assistantProfile } = await supabase
      .from("employee_profiles")
      .select("email, full_name, display_name")
      .eq("user_id", selectedAssistant.assistant_id)
      .single();

    if (organizationId && assistantProfile?.email) {
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

      await sendOrgEmail(supabase, organizationId, {
        to: [assistantProfile.email],
        subject: `New Assistant Assignment - ${formattedDate}`,
        html: `
          <h2>You've Been Assigned!</h2>
          <p>Hi ${assistantProfile.display_name || assistantProfile.full_name},</p>
          <p>You've been assigned to help with a client. Here are the details:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Stylist:</strong> ${stylistName}</p>
            <p><strong>Client:</strong> ${request.client_name}</p>
            <p><strong>Service:</strong> ${request.salon_services?.name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formatTime(request.start_time)} - ${formatTime(request.end_time)}</p>
            ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
          </div>
          <p>Please be ready at your station before the scheduled time.</p>
        `,
      });
    }

    // Send push notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          user_id: selectedAssistant.assistant_id,
          title: "New Assistant Assignment 🔔",
          body: `${stylistName} needs help with ${request.client_name}`,
          url: "/dashboard/assistant-schedule",
          tag: "assistant-assignment",
        }),
      });
    } catch (pushError) {
      console.error("Failed to send push notification:", pushError);
    }

    return new Response(
      JSON.stringify({
        success: true, assigned: true,
        assistant_id: selectedAssistant.assistant_id,
        assistant_name: assistantProfile?.display_name || assistantProfile?.full_name
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in assign-assistant:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
