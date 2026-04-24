import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TrainingAssignment {
  id: string;
  video_id: string;
  user_id: string;
  due_date: string;
  is_required: boolean;
  training_videos: { title: string; description: string | null; };
}

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  organization_id: string;
}

interface NotificationPreference {
  user_id: string;
  task_reminder_enabled: boolean;
  email_notifications_enabled: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: assignments, error: assignmentsError } = await supabase
      .from("training_assignments")
      .select(`id, video_id, user_id, due_date, is_required, training_videos (title, description)`)
      .not("due_date", "is", null)
      .lte("due_date", threeDaysFromNow.toISOString());

    if (assignmentsError) throw assignmentsError;
    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const videoIds = [...new Set(assignments.map((a: any) => a.video_id))];
    const userIds = [...new Set(assignments.map((a: any) => a.user_id))];

    const { data: completedProgress } = await supabase
      .from("training_progress").select("user_id, video_id").in("video_id", videoIds).in("user_id", userIds).not("completed_at", "is", null);

    const completedSet = new Set((completedProgress || []).map((p: any) => `${p.user_id}-${p.video_id}`));
    const incompleteAssignments = assignments.filter((a: any) => !completedSet.has(`${a.user_id}-${a.video_id}`));

    if (incompleteAssignments.length === 0) {
      return new Response(JSON.stringify({ message: "No incomplete assignments", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profiles } = await supabase
      .from("employee_profiles").select("user_id, email, full_name, display_name, organization_id").in("user_id", userIds);

    const profileMap = new Map<string, UserProfile>((profiles || []).map((p: any) => [p.user_id, p]));

    const { data: preferences } = await supabase
      .from("notification_preferences").select("user_id, task_reminder_enabled, email_notifications_enabled").in("user_id", userIds);

    const prefsMap = new Map<string, NotificationPreference>((preferences || []).map((p: any) => [p.user_id, p]));

    const { data: templates } = await supabase
      .from("email_templates").select("template_key, subject, html_body").in("template_key", ["training_reminder", "training_overdue"]);

    const templateMap = new Map((templates || []).map((t: any) => [t.template_key, t]));

    let notificationsSent = 0;
    let emailsSent = 0;

    const userAssignments = new Map<string, TrainingAssignment[]>();
    for (const assignment of incompleteAssignments) {
      const existing = userAssignments.get(assignment.user_id) || [];
      existing.push(assignment as TrainingAssignment);
      userAssignments.set(assignment.user_id, existing);
    }

    for (const [userId, userTrainings] of userAssignments) {
      const profile = profileMap.get(userId);
      if (!profile) continue;

      const prefs = prefsMap.get(userId);
      const taskRemindersEnabled = prefs?.task_reminder_enabled !== false;
      const emailEnabled = prefs?.email_notifications_enabled === true;

      const overdueTrainings = userTrainings.filter((t: any) => new Date(t.due_date) < now);
      const dueSoonTrainings = userTrainings.filter((t: any) => new Date(t.due_date) >= now);
      const userName = profile.display_name || profile.full_name || "Team Member";

      if (overdueTrainings.length > 0 && taskRemindersEnabled) {
        const trainingTitles = overdueTrainings.map((t: any) => t.training_videos?.title || "Training").join(", ");

        await supabase.from("notifications").insert({
          user_id: userId, type: "training_overdue", title: "Overdue Training",
          message: `You have ${overdueTrainings.length} overdue training(s): ${trainingTitles}`,
          metadata: { training_ids: overdueTrainings.map((t: any) => t.video_id), due_dates: overdueTrainings.map((t: any) => t.due_date) },
        });
        notificationsSent++;

        if (emailEnabled && profile.email) {
          const template = templateMap.get("training_overdue");
          if (template) {
            const htmlBody = template.html_body
              .replace(/\{\{user_name\}\}/g, userName)
              .replace(/\{\{training_titles\}\}/g, trainingTitles)
              .replace(/\{\{count\}\}/g, String(overdueTrainings.length));

            try {
              await sendOrgEmail(supabase, profile.organization_id, {
                to: [profile.email],
                subject: template.subject.replace(/\{\{count\}\}/g, String(overdueTrainings.length)),
                html: htmlBody,
              });
              emailsSent++;
            } catch (emailError) { console.error("Error sending email:", emailError); }
          }
        }
      }

      if (dueSoonTrainings.length > 0 && taskRemindersEnabled) {
        const trainingTitles = dueSoonTrainings.map((t: any) => t.training_videos?.title || "Training").join(", ");

        await supabase.from("notifications").insert({
          user_id: userId, type: "training_due_soon", title: "Training Due Soon",
          message: `You have ${dueSoonTrainings.length} training(s) due soon: ${trainingTitles}`,
          metadata: { training_ids: dueSoonTrainings.map((t: any) => t.video_id), due_dates: dueSoonTrainings.map((t: any) => t.due_date) },
        });
        notificationsSent++;

        if (emailEnabled && profile.email) {
          const template = templateMap.get("training_reminder");
          if (template) {
            const htmlBody = template.html_body
              .replace(/\{\{user_name\}\}/g, userName)
              .replace(/\{\{training_titles\}\}/g, trainingTitles)
              .replace(/\{\{count\}\}/g, String(dueSoonTrainings.length));

            try {
              await sendOrgEmail(supabase, profile.organization_id, {
                to: [profile.email],
                subject: template.subject.replace(/\{\{training_title\}\}/g, dueSoonTrainings[0].training_videos?.title || "Training"),
                html: htmlBody,
              });
              emailsSent++;
            } catch (emailError) { console.error("Error sending email:", emailError); }
          }
        }
      }
    }

    console.log(`Sent ${notificationsSent} notifications and ${emailsSent} emails`);

    return new Response(
      JSON.stringify({ message: "Training reminders sent", notificationsSent, emailsSent, usersProcessed: userAssignments.size }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-training-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
