import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncFailureNotification {
  sync_type: string;
  error_message: string;
  timestamp?: string;
  organization_id?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const { sync_type, error_message, timestamp, organization_id }: SyncFailureNotification = await req.json();
    const failureTime = timestamp || new Date().toISOString();

    console.log(`Processing sync failure alert for: ${sync_type}`);

    // Get admin users to notify (super admins and account owners)
    let adminsQuery = supabase
      .from("employee_profiles")
      .select("email, full_name, user_id, organization_id")
      .or("is_super_admin.eq.true,is_primary_owner.eq.true")
      .eq("is_active", true)
      .not("email", "is", null);

    if (organization_id) {
      adminsQuery = adminsQuery.eq("organization_id", organization_id);
    }

    const { data: admins, error: adminError } = await adminsQuery;

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw new Error("Failed to fetch admin users");
    }

    if (!admins || admins.length === 0) {
      console.log("No admin users to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${admins.length} admins to notify`);

    const formattedTime = new Date(failureTime).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });

    const orgId = organization_id || admins[0]?.organization_id;

    const emailPromises = admins.map(async (admin) => {
      try {
        const result = await sendOrgEmail(supabase, orgId, {
          to: [admin.email],
          subject: `⚠️ Phorest Sync Failure: ${sync_type}`,
          html: `
            <p style="margin-top: 0;">Hi ${admin.full_name?.split(' ')[0] || 'Admin'},</p>
            <p>A scheduled Phorest sync has failed and requires your attention:</p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Sync Type:</strong> ${sync_type.charAt(0).toUpperCase() + sync_type.slice(1)}</p>
              <p style="margin: 0 0 8px 0;"><strong>Failed At:</strong> ${formattedTime}</p>
              <p style="margin: 0;"><strong>Error:</strong> ${error_message}</p>
            </div>
            <p>Please investigate the issue and ensure the Phorest integration is working correctly.</p>
          `,
        });
        console.log(`Email sent to ${admin.email}:`, result);
        return { email: admin.email, success: result.success };
      } catch (emailError: any) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
        return { email: admin.email, success: false, error: emailError.message };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter((r: any) => r.success).length;

    const notificationPromises = admins.map(async (admin) => {
      await supabase.from("notifications").insert({
        user_id: admin.user_id,
        type: "sync_failure",
        title: `Phorest Sync Failed: ${sync_type}`,
        message: `The ${sync_type} sync failed at ${formattedTime}. Error: ${error_message}`,
        link: "/dashboard/admin/phorest-settings",
      });
    });

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ success: true, emails_sent: successCount, total_admins: admins.length, results: emailResults }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-sync-failure:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
