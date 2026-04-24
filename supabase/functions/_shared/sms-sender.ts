/**
 * Shared SMS Sending Utility
 * 
 * Resolves SMS templates from the sms_templates table and sends via Twilio.
 * Falls back to logging if Twilio is not configured.
 * 
 * Twilio credentials are stored per-org in the organization_secrets table.
 */

import { createClient } from "@supabase/supabase-js";

export interface SmsPayload {
  to: string;
  templateKey: string;
  variables: Record<string, string>;
}

export interface SmsResult {
  success: boolean;
  message?: string;
  sid?: string;
  error?: string;
}

/**
 * Resolve a template from sms_templates and interpolate variables.
 */
async function resolveTemplate(
  supabase: any,
  templateKey: string,
  variables: Record<string, string>
): Promise<string | null> {
  const { data, error } = await supabase
    .from("sms_templates")
    .select("message_body, is_active")
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.error(`[sms-sender] Template "${templateKey}" not found or inactive:`, error);
    return null;
  }

  let body = data.message_body as string;
  for (const [key, value] of Object.entries(variables)) {
    body = body.replaceAll(`{{${key}}}`, value);
  }
  return body;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

/**
 * Fetch Twilio credentials for an organization from organization_secrets.
 */
async function getOrgTwilioConfig(
  supabase: any,
  organizationId: string
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
    accountSid: data.twilio_account_sid,
    authToken: data.twilio_auth_token,
    phoneNumber: data.twilio_phone_number,
  };
}

/**
 * Send an SMS via Twilio REST API.
 */
async function sendViaTwilio(
  config: TwilioConfig,
  to: string,
  body: string
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
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[sms-sender] Twilio error:", result.message || result.code);
      return { success: false, error: result.message || `Twilio error ${result.code}` };
    }

    console.log(`[sms-sender] SMS sent via Twilio, SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[sms-sender] Twilio request failed:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Send an SMS using a template.
 * If Twilio is configured for the org, sends via Twilio.
 * Otherwise, logs the message (dev/testing mode).
 */
export async function sendSms(
  supabase: any,
  payload: SmsPayload,
  organizationId?: string
): Promise<SmsResult> {
  const message = await resolveTemplate(supabase, payload.templateKey, payload.variables);

  if (!message) {
    return { success: false, error: `Template "${payload.templateKey}" could not be resolved` };
  }

  // Try Twilio if org is provided
  if (organizationId) {
    const twilioConfig = await getOrgTwilioConfig(supabase, organizationId);
    if (twilioConfig) {
      const result = await sendViaTwilio(twilioConfig, payload.to, message);
      return { success: result.success, message, sid: result.sid, error: result.error };
    }
  }

  // Fallback: log only (no Twilio configured)
  console.log(`[sms-sender] SMS to ${payload.to} (no Twilio configured): ${message}`);
  return { success: true, message };
}
