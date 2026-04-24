// Send a custom outbound SMS to a client and log it to client_communications.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  organization_id: string;
  client_id?: string | null;
  appointment_id?: string | null;
  to_phone: string;
  message: string;
  template_key?: string | null;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

async function getOrgTwilioConfig(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
): Promise<TwilioConfig | null> {
  const { data } = await supabase
    .from("organization_secrets")
    .select("twilio_account_sid, twilio_auth_token, twilio_phone_number")
    .eq("organization_id", organizationId)
    .single();

  if (!data?.twilio_account_sid || !data?.twilio_auth_token || !data?.twilio_phone_number) {
    return null;
  }
  return {
    accountSid: data.twilio_account_sid as string,
    authToken: data.twilio_auth_token as string,
    phoneNumber: data.twilio_phone_number as string,
  };
}

async function sendViaTwilio(
  config: TwilioConfig,
  to: string,
  body: string,
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const auth = btoa(`${config.accountSid}:${config.authToken}`);
  const params = new URLSearchParams();
  params.append("To", to);
  params.append("From", config.phoneNumber);
  params.append("Body", body);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.message || `Twilio error ${result.code}` };
    }
    return { success: true, sid: result.sid };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    }) as any;
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = (await req.json()) as RequestBody;
    if (!body?.organization_id || !body?.to_phone || !body?.message) {
      return new Response(
        JSON.stringify({ error: "organization_id, to_phone, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (body.message.length > 1600) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 1600 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey) as any;

    // Verify org membership
    const { data: isMember } = await admin.rpc("is_org_member", {
      _user_id: userId,
      _org_id: body.organization_id,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const twilio = await getOrgTwilioConfig(admin, body.organization_id);
    if (!twilio) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Twilio is not configured for this organization",
          twilio_configured: false,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await sendViaTwilio(twilio, body.to_phone, body.message);

    // Log communication
    await admin.from("client_communications").insert({
      organization_id: body.organization_id,
      client_id: body.client_id ?? null,
      appointment_id: body.appointment_id ?? null,
      channel: "sms",
      direction: "outbound",
      to_phone: body.to_phone,
      from_phone: twilio.phoneNumber,
      body: body.message,
      template_key: body.template_key ?? null,
      twilio_sid: result.sid ?? null,
      status: result.success ? "sent" : "failed",
      error_message: result.error ?? null,
      sent_by_user_id: userId,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, sid: result.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[send-client-sms] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
