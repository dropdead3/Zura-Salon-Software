import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReassignRequest {
  request_id: string;
  declined_by: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { request_id, declined_by }: ReassignRequest = await req.json();

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

    const declinedByArray = [...(request.declined_by || []), declined_by];

    const { data: stylistProfile } = await supabase
      .from("employee_profiles")
      .select("full_name, display_name, email, organization_id")
      .eq("user_id", request.stylist_id)
      .single();

    const stylistName = stylistProfile?.display_name || stylistProfile?.full_name || "A stylist";
    const organizationId = stylistProfile?.organization_id;

    const { data: decliningAssistantProfile } = await supabase
      .from("employee_profiles")
      .select("full_name, display_name")
      .eq("user_id", declined_by)
      .single();

    const decliningAssistantName = decliningAssistantProfile?.display_name || decliningAssistantProfile?.full_name || "An assistant";

    const { data: assistantRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["stylist_assistant", "assistant"]);

    if (rolesError || !assistantRoles?.length) {
      await supabase.from("assistant_requests").update({
        assistant_id: null, status: "pending", declined_by: declinedByArray,
      }).eq("id", request_id);
      return new Response(
        JSON.stringify({ error: "No assistants available", reassigned: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const assistantUserIds = assistantRoles.map((r: any) => r.user_id);
    const eligibleAssistants = assistantUserIds.filter((id: any) => !declinedByArray.includes(id));

    if (eligibleAssistants.length === 0) {
      await supabase.from("assistant_requests").update({
        assistant_id: null, status: "pending", declined_by: declinedByArray,
      }).eq("id", request_id);
      return new Response(
        JSON.stringify({ error: "All assistants have declined", reassigned: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: conflicts } = await supabase
      .from("assistant_requests")
      .select("assistant_id")
      .eq("request_date", request.request_date)
      .eq("status", "assigned")
      .not("assistant_id", "is", null)
      .neq("id", request_id)
      .or(`and(start_time.lte.${request.start_time},end_time.gt.${request.start_time}),and(start_time.lt.${request.end_time},end_time.gte.${request.end_time}),and(start_time.gte.${request.start_time},end_time.lte.${request.end_time})`);

    const busyAssistants = new Set(conflicts?.map((c: any) => c.assistant_id) || []);
    const availableAssistants = eligibleAssistants.filter((id: any) => !busyAssistants.has(id));

    if (availableAssistants.length === 0) {
      await supabase.from("assistant_requests").update({
        assistant_id: null, status: "pending", declined_by: declinedByArray,
      }).eq("id", request_id);
      return new Response(
        JSON.stringify({ error: "No assistants available for this time slot", reassigned: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round-robin
    const { data: assignments } = await supabase
      .from("assistant_assignments")
      .select("*")
      .in("assistant_id", availableAssistants);

    const existingAssistantIds = new Set(assignments?.map((a: any) => a.assistant_id) || []);
    const newAssistants = availableAssistants.filter((id: any) => !existingAssistantIds.has(id));

    if (newAssistants.length > 0) {
      await supabase.from("assistant_assignments")
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
      accepted_at: null,
      declined_by: declinedByArray,
      assigned_at: new Date().toISOString(),
    }).eq("id", request_id);

    await supabase.from("assistant_assignments").update({
      last_assigned_at: new Date().toISOString(),
      total_assignments: selectedAssistant.total_assignments + 1
    }).eq("id", selectedAssistant.id);

    const { data: assistantProfile } = await supabase
      .from("employee_profiles")
      .select("email, full_name, display_name")
      .eq("user_id", selectedAssistant.assistant_id)
      .single();

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };

    const formattedDate = new Date(request.request_date).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });

    // Send email to new assistant
    if (organizationId && assistantProfile?.email) {
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
          <p>Please accept or decline this assignment in your dashboard.</p>
        `,
      });
    }

    // Notify stylist
    const newAssistantName = assistantProfile?.display_name || assistantProfile?.full_name;

    if (organizationId && stylistProfile?.email) {
      await sendOrgEmail(supabase, organizationId, {
        to: [stylistProfile.email],
        subject: `Assistant Request Reassigned`,
        html: `
          <h2>Assignment Update</h2>
          <p>Hi ${stylistName},</p>
          <p><strong>${decliningAssistantName}</strong> has declined your assistant request.</p>
          <p>Your request has been automatically reassigned to <strong>${newAssistantName}</strong>.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Client:</strong> ${request.client_name}</p>
            <p><strong>Service:</strong> ${request.salon_services?.name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formatTime(request.start_time)} - ${formatTime(request.end_time)}</p>
            <p><strong>New Assistant:</strong> ${newAssistantName}</p>
          </div>
          <p>You can check the status in your dashboard.</p>
        `,
      });
    }

    await supabase.from("notifications").insert({
      user_id: request.stylist_id,
      type: "assistant_declined",
      title: "Assistant Request Reassigned",
      message: `${decliningAssistantName} declined. Your request was reassigned to ${newAssistantName || 'another assistant'}.`,
      link: "/dashboard/assistant-schedule",
    });

    return new Response(
      JSON.stringify({
        success: true, reassigned: true,
        assistant_id: selectedAssistant.assistant_id,
        assistant_name: newAssistantName
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in reassign-assistant:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
