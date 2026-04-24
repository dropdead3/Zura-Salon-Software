import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedbackRequestPayload {
  organizationId: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  appointmentId?: string;
  staffUserId?: string;
  staffName?: string;
  serviceName?: string;
  baseUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: FeedbackRequestPayload = await req.json();
    const { organizationId, clientId, clientEmail, clientName, appointmentId, staffUserId, staffName, serviceName, baseUrl } = payload;

    if (!organizationId || !clientId || !clientEmail || !clientName || !baseUrl) {
      throw new Error("Missing required fields");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: insertError } = await supabase.from('client_feedback_responses').insert({
      organization_id: organizationId, client_id: clientId, appointment_id: appointmentId,
      staff_user_id: staffUserId, token, expires_at: expiresAt.toISOString(),
    });

    if (insertError) throw new Error("Failed to create feedback request");

    const feedbackUrl = `${baseUrl}/feedback?token=${token}`;

    // Gap 1: Pass clientId so opt-out is respected and unsubscribe link is injected
    const emailResult = await sendOrgEmail(supabase, organizationId, {
      to: [clientEmail],
      subject: "We'd love your feedback!",
      clientId: clientId,
      emailType: "feedback",
      html: `
        <p>Hi ${clientName},</p>
        <p>Thank you for visiting us${staffName ? ` and seeing ${staffName}` : ''}${serviceName ? ` for your ${serviceName}` : ''}!</p>
        <p>We'd love to hear about your experience. Your feedback helps us continue to provide excellent service.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${feedbackUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600;">
            Share Your Feedback
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
      `,
    });

    console.log("Feedback email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, token }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-feedback-request:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
