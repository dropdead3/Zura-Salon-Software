import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: items, error: itemsError } = await supabase
      .from("accountability_items").select("*").eq("reminder_date", today).eq("reminder_sent", false).neq("status", "completed").neq("status", "cancelled");

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const results = [];

    for (const item of items) {
      try {
        const { data: teamMember } = await supabase.from("employee_profiles").select("email, full_name, display_name, organization_id").eq("user_id", item.team_member_id).single();
        const { data: coach } = await supabase.from("employee_profiles").select("email, full_name, display_name").eq("user_id", item.coach_id).single();

        const coachName = coach?.display_name || coach?.full_name || "Your Coach";
        const memberName = teamMember?.display_name || teamMember?.full_name || "Team Member";
        const dueDate = item.due_date ? new Date(item.due_date).toLocaleDateString() : "No due date";
        const orgId = teamMember?.organization_id;

        if (teamMember?.email && orgId) {
          await sendOrgEmail(supabase, orgId, {
            to: [teamMember.email], subject: `Reminder: ${item.title}`,
            html: `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 8px 0; color: #92400e;">Action Item Reminder</h2>
                <p style="margin: 0; color: #78350f;">You have an upcoming action item to complete.</p>
              </div>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
                <h3 style="margin: 0 0 12px 0;">${item.title}</h3>
                ${item.description ? `<p style="color: #666; margin: 0 0 12px 0;">${item.description}</p>` : ''}
                <p style="margin: 0; font-size: 14px;"><strong>Due:</strong> ${dueDate}<br><strong>Assigned by:</strong> ${coachName}</p>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">Log in to your dashboard to update your progress.</p>
            `,
          });
        }

        if (coach?.email && orgId) {
          await sendOrgEmail(supabase, orgId, {
            to: [coach.email], subject: `Reminder sent: ${item.title} (${memberName})`,
            html: `
              <p>A reminder was sent to <strong>${memberName}</strong> for the following action item:</p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
                <h3 style="margin: 0 0 12px 0;">${item.title}</h3>
                ${item.description ? `<p style="color: #666; margin: 0 0 12px 0;">${item.description}</p>` : ''}
                <p style="margin: 0; font-size: 14px;"><strong>Due:</strong> ${dueDate}</p>
              </div>
            `,
          });
        }

        await supabase.from("notifications").insert([
          { user_id: item.team_member_id, type: "accountability_reminder", title: "Action Item Reminder", message: `Reminder: "${item.title}" is due ${item.due_date ? `on ${dueDate}` : 'soon'}.`, metadata: { item_id: item.id } },
          { user_id: item.coach_id, type: "accountability_reminder", title: "Reminder Sent", message: `Reminder sent to ${memberName} for "${item.title}".`, metadata: { item_id: item.id } },
        ]);

        await supabase.from("accountability_items").update({ reminder_sent: true }).eq("id", item.id);
        results.push({ id: item.id, status: "sent" });
      } catch (err: any) {
        console.error(`Error processing item ${item.id}:`, err);
        results.push({ id: item.id, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({ message: "Reminders processed", results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in send-accountability-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
