import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSms } from "../_shared/sms-sender.ts";
import { sendOrgEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // ── Input ────────────────────────────────────────────────────
    const body = await req.json();
    const {
      organization_id,
      appointment_id,
      checkout_url,
      client_name,
      client_email,
      client_phone,
      amount_display,
      send_sms = true,
      send_email = true,
    } = body;

    if (!organization_id || !appointment_id || !checkout_url) {
      return jsonResponse({ error: "organization_id, appointment_id, and checkout_url are required" }, 400);
    }

    // ── Verify membership ────────────────────────────────────────
    const { data: isMember } = await supabase.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isMember) {
      return jsonResponse({ error: "Unauthorized" }, 403);
    }

    // ── Get org name ─────────────────────────────────────────────
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .maybeSingle();

    const salonName = org?.name || "your salon";
    const firstName = client_name?.split(" ")[0] || "there";
    const results: { sms?: boolean; email?: boolean } = {};

    // ── Send SMS ─────────────────────────────────────────────────
    if (send_sms && client_phone) {
      try {
        const smsResult = await sendSms(
          supabase,
          {
            to: client_phone,
            templateKey: "payment_link",
            variables: {
              first_name: firstName,
              salon_name: salonName,
              amount: amount_display || "",
              payment_url: checkout_url,
            },
          },
          organization_id
        );
        results.sms = smsResult.success;
      } catch (e) {
        console.error("SMS send failed:", e);
        results.sms = false;
      }
    }

    // ── Send Email ───────────────────────────────────────────────
    if (send_email && client_email) {
      try {
        const amountLine = amount_display ? ` for <strong>${amount_display}</strong>` : "";
        const emailHtml = `
          <p>Hi ${firstName},</p>
          <p>Here's your payment link${amountLine} from <strong>${salonName}</strong>.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${checkout_url}" 
               style="display: inline-block; padding: 14px 32px; background-color: #000; color: #fff; 
                      text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500;">
              Pay Now
            </a>
          </div>
          <p style="font-size: 13px; color: #666;">
            You can also copy and paste this link into your browser:<br/>
            <a href="${checkout_url}" style="color: #666;">${checkout_url}</a>
          </p>
        `;

        const emailResult = await sendOrgEmail(supabase, organization_id, {
          to: [client_email],
          subject: `Payment link from ${salonName}`,
          html: emailHtml,
          emailType: "transactional",
        });
        results.email = emailResult.success;
      } catch (e) {
        console.error("Email send failed:", e);
        results.email = false;
      }
    }

    // ── Update appointment ───────────────────────────────────────
    await supabase
      .from("appointments")
      .update({ payment_link_sent_at: new Date().toISOString() })
      .eq("id", appointment_id);

    return jsonResponse({
      success: true,
      delivery: results,
    });
  } catch (error) {
    console.error("send-payment-link error:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
