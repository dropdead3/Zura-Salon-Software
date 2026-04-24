import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    console.log("Checking for expired assistant assignments...");

    const { data: expiredRequests, error: fetchError } = await supabase
      .from("assistant_requests")
      .select(`*, salon_services (name, duration_minutes)`)
      .eq("status", "assigned")
      .is("accepted_at", null)
      .not("assigned_at", "is", null)
      .not("assistant_id", "is", null);

    if (fetchError) {
      console.error("Error fetching requests:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    let reassignedCount = 0;
    const results: any[] = [];

    for (const request of expiredRequests || []) {
      const assignedAt = new Date(request.assigned_at);
      const deadlineHours = request.response_deadline_hours || 2;
      const deadline = new Date(assignedAt.getTime() + deadlineHours * 60 * 60 * 1000);

      if (now > deadline) {
        console.log(`Request ${request.id} has expired, reassigning...`);

        const declinedAssistant = request.assistant_id;

        const { data: assistantProfile } = await supabase
          .from("employee_profiles")
          .select("full_name, display_name, organization_id")
          .eq("user_id", declinedAssistant)
          .single();

        const assistantName = assistantProfile?.display_name || assistantProfile?.full_name || "Assistant";

        const { data: stylistProfile } = await supabase
          .from("employee_profiles")
          .select("full_name, display_name, email, organization_id")
          .eq("user_id", request.stylist_id)
          .single();

        const stylistName = stylistProfile?.display_name || stylistProfile?.full_name || "Stylist";
        const organizationId = stylistProfile?.organization_id || assistantProfile?.organization_id;

        const declinedByArray = [...(request.declined_by || []), declinedAssistant];

        const { data: assistantRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["stylist_assistant", "assistant"]);

        const assistantUserIds = (assistantRoles || []).map((r: any) => r.user_id);
        const eligibleAssistants = assistantUserIds.filter((id: any) => !declinedByArray.includes(id));

        const { data: conflicts } = await supabase
          .from("assistant_requests")
          .select("assistant_id")
          .eq("request_date", request.request_date)
          .eq("status", "assigned")
          .not("assistant_id", "is", null)
          .neq("id", request.id)
          .or(`and(start_time.lte.${request.start_time},end_time.gt.${request.start_time}),and(start_time.lt.${request.end_time},end_time.gte.${request.end_time}),and(start_time.gte.${request.start_time},end_time.lte.${request.end_time})`);

        const busyAssistants = new Set(conflicts?.map((c: any) => c.assistant_id) || []);
        const availableAssistants = eligibleAssistants.filter((id: any) => !busyAssistants.has(id));

        let newAssistantName = null;

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

        if (availableAssistants.length > 0) {
          const { data: assignments } = await supabase
            .from("assistant_assignments")
            .select("*")
            .in("assistant_id", availableAssistants)
            .order("total_assignments", { ascending: true })
            .order("last_assigned_at", { ascending: true });

          if (assignments?.length) {
            const selectedAssistant = assignments[0];

            await supabase
              .from("assistant_requests")
              .update({
                assistant_id: selectedAssistant.assistant_id,
                assigned_at: new Date().toISOString(),
                accepted_at: null,
                declined_by: declinedByArray,
              })
              .eq("id", request.id);

            await supabase
              .from("assistant_assignments")
              .update({
                last_assigned_at: new Date().toISOString(),
                total_assignments: selectedAssistant.total_assignments + 1
              })
              .eq("id", selectedAssistant.id);

            const { data: newAssistantProfile } = await supabase
              .from("employee_profiles")
              .select("email, full_name, display_name")
              .eq("user_id", selectedAssistant.assistant_id)
              .single();

            newAssistantName = newAssistantProfile?.display_name || newAssistantProfile?.full_name;

            if (organizationId && newAssistantProfile?.email) {
              await sendOrgEmail(supabase, organizationId, {
                to: [newAssistantProfile.email],
                subject: `New Assistant Assignment - ${formattedDate}`,
                html: `
                  <h2>You've Been Assigned!</h2>
                  <p>Hi ${newAssistantName},</p>
                  <p>You've been assigned to help with a client. Please respond within 2 hours.</p>
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Stylist:</strong> ${stylistName}</p>
                    <p><strong>Client:</strong> ${request.client_name}</p>
                    <p><strong>Service:</strong> ${request.salon_services?.name}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Time:</strong> ${formatTime(request.start_time)} - ${formatTime(request.end_time)}</p>
                  </div>
                  <p>Please accept or decline this assignment in your dashboard.</p>
                `,
              });
            }

            reassignedCount++;
          } else {
            await supabase.from("assistant_requests").update({
              assistant_id: null, status: "pending", assigned_at: null, declined_by: declinedByArray,
            }).eq("id", request.id);
          }
        } else {
          await supabase.from("assistant_requests").update({
            assistant_id: null, status: "pending", assigned_at: null, declined_by: declinedByArray,
          }).eq("id", request.id);
        }

        // Notify stylist about the timeout/reassignment
        if (organizationId && stylistProfile?.email) {
          const statusMessage = newAssistantName
            ? `The request has been automatically reassigned to <strong>${newAssistantName}</strong>.`
            : `The request is now pending and awaiting a new assistant to become available.`;

          await sendOrgEmail(supabase, organizationId, {
            to: [stylistProfile.email],
            subject: `Assistant Request Update - Response Timeout`,
            html: `
              <h2>Assignment Update</h2>
              <p>Hi ${stylistName},</p>
              <p><strong>${assistantName}</strong> did not respond to your assistant request within the ${deadlineHours}-hour deadline.</p>
              <p>${statusMessage}</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Client:</strong> ${request.client_name}</p>
                <p><strong>Service:</strong> ${request.salon_services?.name}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formatTime(request.start_time)} - ${formatTime(request.end_time)}</p>
              </div>
              <p>You can check the status in your dashboard.</p>
            `,
          });
        }

        await supabase.from("notifications").insert({
          user_id: request.stylist_id,
          type: "assistant_timeout",
          title: "Assistant Request Update",
          message: newAssistantName
            ? `${assistantName} didn't respond in time. Your request was reassigned to ${newAssistantName}.`
            : `${assistantName} didn't respond in time. Your request is now pending.`,
          link: "/dashboard/assistant-schedule",
        });

        results.push({
          request_id: request.id,
          previous_assistant: assistantName,
          new_assistant: newAssistantName,
          reassigned: !!newAssistantName,
        });
      }
    }

    console.log(`Processed ${results.length} expired assignments, reassigned ${reassignedCount}`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, reassigned: reassignedCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in check-expired-assignments:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
