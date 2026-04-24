import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Enrollment {
  id: string;
  user_id: string;
  current_day: number;
  streak_count: number;
  status: string;
  last_completion_date: string | null;
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string | null;
}

interface NotificationPreference {
  user_id: string;
  program_reminder_enabled: boolean;
  email_notifications_enabled: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const today = new Date().toISOString().split("T")[0];

    // Fetch active enrollments
    const { data: enrollments, error: enrollError } = await supabase
      .from("stylist_program_enrollment")
      .select("id, user_id, current_day, streak_count, status, last_completion_date")
      .eq("status", "active");

    if (enrollError) throw enrollError;

    if (!enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ message: "No active enrollments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profiles
    const userIds = enrollments.map((e: Enrollment) => e.user_id);
    const { data: profiles } = await supabase
      .from("employee_profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    // Get notification preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("user_id, program_reminder_enabled, email_notifications_enabled")
      .in("user_id", userIds);

    const prefsMap = new Map(
      (preferences || []).map((p: NotificationPreference) => [p.user_id, p])
    );
    const profilesMap = new Map(
      (profiles || []).map((p: Profile) => [p.user_id, p])
    );

    // Check which users haven't completed today
    const { data: todayCompletions } = await supabase
      .from("daily_completions")
      .select("enrollment_id")
      .eq("completion_date", today)
      .eq("is_complete", true);

    const completedEnrollmentIds = new Set(
      (todayCompletions || []).map((c: { enrollment_id: string }) => c.enrollment_id)
    );

    const notificationsToSend: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      link: string;
    }> = [];

    for (const enrollment of enrollments as Enrollment[]) {
      const prefs = prefsMap.get(enrollment.user_id);
      const profile = profilesMap.get(enrollment.user_id);

      // Skip if user has opted out
      if (prefs && !prefs.program_reminder_enabled) continue;

      // Skip if already completed today
      if (completedEnrollmentIds.has(enrollment.id)) continue;

      // Create reminder notification
      const streakWarning = enrollment.streak_count >= 7 
        ? ` Don't break your ${enrollment.streak_count}-day streak!` 
        : "";

      notificationsToSend.push({
        user_id: enrollment.user_id,
        type: "program_reminder",
        title: "Daily Tasks Reminder",
        message: `Day ${enrollment.current_day} is waiting for you!${streakWarning}`,
        link: "/dashboard/program",
      });
    }

    // Insert notifications
    if (notificationsToSend.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notificationsToSend);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
      }
    }

    // Check for at-risk participants (no completion in 2+ days)
    const atRiskNotifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      link: string;
    }> = [];

    for (const enrollment of enrollments as Enrollment[]) {
      if (!enrollment.last_completion_date) continue;

      const lastDate = new Date(enrollment.last_completion_date);
      const daysSince = Math.floor(
        (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSince >= 2) {
        const profile = profilesMap.get(enrollment.user_id);
        
        // Notify coaches/admins about at-risk participants
        const { data: coaches } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "manager"]);

        for (const coach of coaches || []) {
          atRiskNotifications.push({
            user_id: coach.user_id,
            type: "at_risk_participant",
            title: "At-Risk Participant",
            message: `${profile?.full_name || "A participant"} hasn't completed tasks in ${daysSince} days`,
            link: "/dashboard/admin/client-engine-tracker",
          });
        }
      }
    }

    // Insert at-risk notifications (limit to avoid spam)
    if (atRiskNotifications.length > 0) {
      const uniqueCoachNotifications = atRiskNotifications.slice(0, 10);
      await supabase.from("notifications").insert(uniqueCoachNotifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent: notificationsToSend.length,
        atRiskAlerts: atRiskNotifications.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-program-reminders:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
