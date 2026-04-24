import { PLATFORM_NAME, PLATFORM_URL } from "./brand.ts";

/**
 * Multi-Tenant Email Infrastructure
 * 
 * Two entry points:
 *  - sendEmail()    → Platform-level emails (platform branding)
 *  - sendOrgEmail() → Org-branded emails (dynamic branding from organizations table)
 * 
 * All emails route through a single Resend account.
 * Organizations never need their own Resend account.
 */

import { buildSignedUrl } from "./signed-url.ts";

export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64-encoded content
  type?: string; // MIME type, defaults to application/pdf
}

export interface OrgEmailPayload {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
  clientId?: string;
  emailType?: string; // 'marketing' | 'feedback' | 'transactional'
  attachments?: EmailAttachment[];
}

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

interface OrgBranding {
  name: string;
  email_sender_name: string | null;
  email_reply_to: string | null;
  email_logo_url: string | null;
  email_accent_color: string | null;
  email_footer_text: string | null;
  email_social_links: SocialLinks | null;
  email_show_attribution: boolean | null;
  email_button_radius: string | null;
  email_header_style: string | null;
  email_physical_address: string | null;
  logo_url: string | null;
  primary_contact_email: string | null;
}

const PLATFORM_DOMAIN = `mail.${PLATFORM_URL.replace("https://", "")}`;
const PLATFORM_FROM = `${PLATFORM_NAME} <notifications@${PLATFORM_DOMAIN}>`;

const BUTTON_RADIUS_MAP: Record<string, string> = {
  sharp: '0',
  rounded: '8px',
  pill: '100px',
};

const RATE_LIMIT_HOURS = 48;

/**
 * Send a platform-level email (Zura branding).
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.log("[email-sender] RESEND_API_KEY not configured - email skipped");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (!payload.to || payload.to.length === 0) {
    console.log("[email-sender] No recipients provided - email skipped");
    return { success: false, error: "No recipients provided" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: payload.from || PLATFORM_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[email-sender] Email send failed:", errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log("[email-sender] Email sent successfully:", result.id);
    return { success: true, messageId: result.id };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[email-sender] Exception sending email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send an org-branded email.
 * When clientId is provided:
 *  1. Checks marketing opt-out status → skips if opted out
 *  2. Checks 48-hour rate limit → skips if recently emailed
 *  3. Generates signed unsubscribe URL → injected into footer
 *  4. Adds List-Unsubscribe headers for Gmail/Yahoo compliance
 *  5. Logs the send to email_send_log for audit trail
 */
export async function sendOrgEmail(
  supabase: any,
  organizationId: string,
  payload: OrgEmailPayload,
): Promise<EmailResult> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.log("[email-sender] RESEND_API_KEY not configured - email skipped");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (!payload.to || payload.to.length === 0) {
    console.log("[email-sender] No recipients provided - email skipped");
    return { success: false, error: "No recipients provided" };
  }

  const emailType = payload.emailType || "marketing";

  // Check opt-out status when clientId is provided
  let unsubscribeUrl: string | null = null;
  if (payload.clientId) {
    try {
      const { data: prefs } = await supabase
        .from("client_email_preferences")
        .select("marketing_opt_out")
        .eq("organization_id", organizationId)
        .eq("client_id", payload.clientId)
        .maybeSingle();

      if (prefs?.marketing_opt_out) {
        console.log(`[email-sender] Client ${payload.clientId} opted out - email skipped`);
        return { success: true, skipped: true, skipReason: "opted_out" };
      }
    } catch (e: any) {
      console.warn("[email-sender] Error checking opt-out status:", e);
    }

    // Rate limiting — skip for service_flow and transactional emails (they follow their own schedule)
    if (emailType === "marketing") {
      try {
        const cutoff = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000).toISOString();
        const { data: recentSends } = await supabase
          .from("email_send_log")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("client_id", payload.clientId)
          .gte("sent_at", cutoff)
          .limit(1);

        if (recentSends && recentSends.length > 0) {
          console.log(`[email-sender] Client ${payload.clientId} received email within ${RATE_LIMIT_HOURS}h - skipping`);
          return { success: true, skipped: true, skipReason: "rate_limited" };
        }
      } catch (e: any) {
        console.warn("[email-sender] Error checking rate limit:", e);
      }
    }

    // Build signed unsubscribe URL
    try {
      unsubscribeUrl = await buildSignedUrl("unsubscribe-client-email", {
        cid: payload.clientId,
        oid: organizationId,
        ts: Date.now(),
      });
    } catch (e: any) {
      console.warn("[email-sender] Error building unsubscribe URL:", e);
    }
  }

  // Fetch org branding
  let branding: OrgBranding | null = null;
  if (organizationId) {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("name, email_sender_name, email_reply_to, email_logo_url, email_accent_color, email_footer_text, email_social_links, email_show_attribution, email_button_radius, email_header_style, email_physical_address, logo_url, primary_contact_email")
        .eq("id", organizationId)
        .single();
      
      if (!error && data) {
        branding = data as OrgBranding;
      } else {
        console.warn("[email-sender] Could not fetch org branding:", error?.message);
      }
    } catch (e: any) {
      console.warn("[email-sender] Error fetching org branding:", e);
    }
  }

  const senderName = branding?.email_sender_name || branding?.name || PLATFORM_NAME;
  const fromAddress = `${senderName} <notifications@${PLATFORM_DOMAIN}>`;
  const replyTo = payload.replyTo || branding?.email_reply_to || branding?.primary_contact_email || undefined;
  const brandedHtml = buildBrandedTemplate(branding, payload.html, unsubscribeUrl);

  // Build headers for Resend API
  const resendBody: Record<string, unknown> = {
    from: fromAddress,
    to: payload.to,
    subject: payload.subject,
    html: brandedHtml,
    reply_to: replyTo,
  };

  // Attach files if provided
  if (payload.attachments && payload.attachments.length > 0) {
    resendBody.attachments = payload.attachments.map((att: any) => ({
      filename: att.filename,
      content: att.content,
      type: att.type || 'application/pdf',
    }));
  }

  // Add List-Unsubscribe headers for Gmail/Yahoo compliance
  if (unsubscribeUrl) {
    resendBody.headers = {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(resendBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[email-sender] Org email send failed:", errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log("[email-sender] Org email sent successfully:", result.id);

    // Gap 5: Log the send for audit trail
    if (payload.clientId) {
      try {
        await supabase.from("email_send_log").insert({
          organization_id: organizationId,
          client_id: payload.clientId,
          email_type: emailType,
          message_id: result.id,
        });
      } catch (e: any) {
        console.warn("[email-sender] Error logging email send:", e);
      }
    }

    return { success: true, messageId: result.id };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[email-sender] Exception sending org email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Build social icons HTML for the email footer.
 */
function buildSocialIconsHtml(links: SocialLinks | null): string {
  if (!links) return '';
  const icons: string[] = [];
  if (links.instagram) icons.push(`<a href="${links.instagram}" style="display:inline-block;margin:0 8px;font-size:18px;text-decoration:none;" title="Instagram">📷</a>`);
  if (links.facebook) icons.push(`<a href="${links.facebook}" style="display:inline-block;margin:0 8px;font-size:18px;text-decoration:none;" title="Facebook">📘</a>`);
  if (links.tiktok) icons.push(`<a href="${links.tiktok}" style="display:inline-block;margin:0 8px;font-size:18px;text-decoration:none;" title="TikTok">🎵</a>`);
  if (links.website) icons.push(`<a href="${links.website}" style="display:inline-block;margin:0 8px;font-size:18px;text-decoration:none;" title="Website">🌐</a>`);
  if (icons.length === 0) return '';
  return `<div style="margin-bottom:12px;">${icons.join('')}</div>`;
}

/**
 * Wrap inner HTML content in a branded email template.
 */
function buildBrandedTemplate(branding: OrgBranding | null, innerHtml: string, unsubscribeUrl?: string | null): string {
  const orgName = branding?.name || PLATFORM_NAME;
  const accentColor = branding?.email_accent_color || "#000000";
  const logoUrl = branding?.email_logo_url || branding?.logo_url || null;
  const headerStyle = branding?.email_header_style || "centered";
  const buttonRadius = BUTTON_RADIUS_MAP[branding?.email_button_radius || 'rounded'] || '8px';
  const footerText = branding?.email_footer_text || null;
  const socialLinks = branding?.email_social_links || null;
  const showAttribution = branding?.email_show_attribution !== false;
  const physicalAddress = branding?.email_physical_address || null;

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 48px; max-width: 200px; margin-bottom: 8px;" />`
    : `<span style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em;">${orgName}</span>`;

  const headerAlign = headerStyle === 'left-aligned' ? 'left' : 'center';

  let headerHtml: string;
  if (headerStyle === 'minimal') {
    headerHtml = `<div style="height: 6px; background-color: ${accentColor}; border-radius: 12px 12px 0 0;"></div>`;
  } else {
    headerHtml = `<div style="background-color: ${accentColor}; padding: 24px; border-radius: 12px 12px 0 0; text-align: ${headerAlign};">
      ${logoHtml}
    </div>`;
  }

  // Footer parts
  const socialIconsHtml = buildSocialIconsHtml(socialLinks);
  const footerTextHtml = footerText
    ? `<p style="margin: 0 0 8px; font-size: 11px; color: #a1a1aa; line-height: 1.5;">${footerText}</p>`
    : '';
  // Gap 4: Physical address in footer (CAN-SPAM requirement)
  const physicalAddressHtml = physicalAddress
    ? `<p style="margin: 0 0 8px; font-size: 11px; color: #a1a1aa; line-height: 1.5;">${physicalAddress}</p>`
    : '';
  const attributionHtml = showAttribution
    ? `<p style="margin: 0; font-size: 12px; color: #a1a1aa;">Sent via <a href="${PLATFORM_URL}" style="color: #a1a1aa; text-decoration: underline;">${PLATFORM_NAME}</a></p>`
    : '';
  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa;"><a href="${unsubscribeUrl}" style="color: #a1a1aa; text-decoration: underline;">Unsubscribe from marketing emails</a></p>`
    : '';

  // Replace button border-radius in inner HTML (for templates that use inline styles)
  const processedInnerHtml = innerHtml.replace(
    /border-radius:\s*8px/g,
    `border-radius: ${buttonRadius}`
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px 16px;">
    <!-- Header -->
    ${headerHtml}

    <!-- Accent bar -->
    <div style="height: 4px; background: linear-gradient(90deg, ${accentColor}, ${accentColor}88);"></div>

    <!-- Content -->
    <div style="background-color: #ffffff; padding: 32px 24px; border-left: 1px solid #e4e4e7; border-right: 1px solid #e4e4e7;">
      ${processedInnerHtml}
    </div>

    <!-- Footer -->
    <div style="background-color: #fafafa; padding: 20px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e4e4e7; border-top: none; text-align: center;">
      ${socialIconsHtml}
      ${footerTextHtml}
      ${physicalAddressHtml}
      ${attributionHtml}
      ${unsubscribeHtml}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Format a date for display in emails
 */
export function formatEmailDate(date: Date, format: 'short' | 'long' = 'long'): string {
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Format currency for display in emails
 */
export function formatEmailCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
