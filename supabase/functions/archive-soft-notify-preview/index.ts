// Smoke-test sender for the archive soft-notify pipeline.
// Sends ONE email + ONE SMS to the *operator* (not to clients) so they can
// verify wording and rendering before committing the archive.
//
// Auth: caller must be authenticated and a member of `organizationId`.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireAuth, authErrorResponse } from "../_shared/auth.ts";
import { sendOrgEmail } from "../_shared/email-sender.ts";
import { sendSms } from "../_shared/sms-sender.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  organizationId: string;
  archivedStylistName: string;
  successorStylistName: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireAuth(req);
    const body = (await req.json()) as Body;

    if (!body.organizationId) {
      return new Response(JSON.stringify({ error: "organizationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Membership check — caller must belong to the org.
    const { data: membership } = await supabaseAdmin
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", body.organizationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve org name for templating.
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", body.organizationId)
      .maybeSingle();
    const orgName = (org?.name as string | undefined) ?? "Our team";

    const archivedName = body.archivedStylistName?.trim() || "your previous stylist";
    const newStylistName = body.successorStylistName?.trim() || "a new stylist";

    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const subject = `[PREVIEW] A quick update about your stylist`;
    const html = `<!doctype html>
<html><body style="margin:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 0 16px 0;">
          <div style="display:inline-block;padding:4px 10px;background:#fff7ed;color:#9a3412;border-radius:9999px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:500;">Preview — sent to you only</div>
        </td></tr>
        <tr><td style="padding:0 0 16px 0;">
          <h1 style="margin:0;font-size:22px;font-weight:500;color:#0a0a0a;letter-spacing:0.01em;">A quick update about your stylist</h1>
        </td></tr>
        <tr><td style="padding:8px 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Hi there,</td></tr>
        <tr><td style="padding:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">
          We wanted to let you know that <strong>${escapeHtml(archivedName)}</strong> is no longer with us at <strong>${escapeHtml(orgName)}</strong>.
        </td></tr>
        <tr><td style="padding:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">
          <strong>${escapeHtml(newStylistName)}</strong> will be taking great care of you going forward — same level, same pricing. We can't wait to see you at your next visit.
        </td></tr>
        <tr><td style="padding:24px 0 0 0;font-size:14px;line-height:1.6;color:#666;">
          Warmly,<br/>The ${escapeHtml(orgName)} Team
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const result: {
      email_sent: boolean;
      sms_sent: boolean;
      email_error?: string;
      sms_error?: string;
      email_to?: string;
      sms_to?: string;
    } = { email_sent: false, sms_sent: false };

    // Email preview
    if (body.recipientEmail) {
      try {
        const r = await sendOrgEmail(supabaseAdmin, body.organizationId, {
          to: [body.recipientEmail],
          subject,
          html,
          emailType: "transactional",
        });
        result.email_sent = !!r.success && !r.skipped;
        result.email_to = body.recipientEmail;
        if (!r.success) result.email_error = r.error || "send failed";
        else if (r.skipped) result.email_error = `skipped (${r.skipReason})`;
      } catch (e) {
        result.email_error = e instanceof Error ? e.message : String(e);
      }
    }

    // SMS preview — prefix the body so the recipient knows it's a test.
    if (body.recipientPhone) {
      try {
        const r = await sendSms(
          supabaseAdmin,
          {
            to: body.recipientPhone,
            templateKey: "stylist-reassignment-soft-notify",
            variables: {
              first_name: "[PREVIEW] there",
              archived_stylist: archivedName,
              new_stylist: newStylistName,
              org_name: orgName,
            },
          },
          body.organizationId,
        );
        result.sms_sent = !!r.success;
        result.sms_to = body.recipientPhone;
        if (!r.success) result.sms_error = r.error || "send failed";
      } catch (e) {
        result.sms_error = e instanceof Error ? e.message : String(e);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return authErrorResponse(err, corsHeaders);
  }
});
