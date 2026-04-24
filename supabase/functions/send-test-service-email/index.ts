import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Send Test Service Email
 * 
 * Sends a preview of a flow step's email to a test address with sample data.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const { stepId, testEmail } = await req.json();

    if (!stepId || !testEmail) {
      throw new Error("stepId and testEmail are required");
    }

    // Fetch step details
    const { data: step, error: stepError } = await supabase
      .from("service_email_flow_steps")
      .select("subject, html_body, timing_type, timing_value, flow_id")
      .eq("id", stepId)
      .single();

    if (stepError || !step) {
      throw new Error("Step not found");
    }

    // Fetch flow for context
    const { data: flow } = await supabase
      .from("service_email_flows")
      .select("name, service_category, service:services(name)")
      .eq("id", step.flow_id)
      .single();

    // Replace variables with sample data
    const sampleVars: Record<string, string> = {
      first_name: "Jane",
      client_name: "Jane Smith",
      service_name: (flow as any)?.service?.name || flow?.service_category || "Sample Service",
      stylist_name: "Alex Johnson",
      appointment_date: "Monday, March 15, 2026",
      appointment_time: "2:00 PM",
      location_name: "Downtown Studio",
    };

    let processedSubject = step.subject;
    let processedBody = step.html_body;

    for (const [key, value] of Object.entries(sampleVars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      processedSubject = processedSubject.replace(regex, value);
      processedBody = processedBody.replace(regex, value);
    }

    // Send test email
    const result = await sendEmail({
      to: [testEmail],
      subject: `[TEST] ${processedSubject}`,
      html: `
        <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; color: #92400e;">
          <strong>⚠️ TEST EMAIL</strong> — This is a preview of "${flow?.name || 'Service Flow'}" step. 
          Template variables have been replaced with sample data.
        </div>
        ${processedBody}
      `,
    });

    return new Response(
      JSON.stringify({ success: result.success, messageId: result.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[test-service-email] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
