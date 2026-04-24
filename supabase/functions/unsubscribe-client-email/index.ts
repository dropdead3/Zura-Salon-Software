import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySignedPayload, buildSignedUrl } from "../_shared/signed-url.ts";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

serve(async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const payload = url.searchParams.get("payload");
    const sig = url.searchParams.get("sig");
    const action = url.searchParams.get("action"); // "resubscribe" or null

    if (!payload || !sig) {
      return new Response(renderPage("Invalid Link", "This unsubscribe link is missing required parameters.", null, null), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    let decoded: Record<string, unknown>;
    try {
      decoded = await verifySignedPayload(payload, sig, ONE_YEAR_MS);
    } catch (err: any) {
      const isExpired = err.message === "Token expired";
      const title = isExpired ? "Link Expired" : "Invalid Link";
      const message = isExpired
        ? "This unsubscribe link has expired. Please contact the salon directly to manage your email preferences."
        : "This unsubscribe link is invalid or has been tampered with.";
      return new Response(renderPage(title, message, null, null), {
        status: 403,
        headers: { "Content-Type": "text/html" },
      });
    }

    const clientId = decoded.cid as string;
    const organizationId = decoded.oid as string;

    if (!clientId || !organizationId) {
      return new Response(renderPage("Error", "Could not identify the subscription from this link.", null, null), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const isResubscribe = action === "resubscribe";

    if (isResubscribe) {
      // Re-subscribe: set marketing_opt_out to false
      await supabase
        .from("client_email_preferences")
        .upsert(
          {
            organization_id: organizationId,
            client_id: clientId,
            marketing_opt_out: false,
            opt_out_at: null,
          },
          { onConflict: "organization_id,client_id" }
        );
    } else {
      // Unsubscribe: set marketing_opt_out to true
      await supabase
        .from("client_email_preferences")
        .upsert(
          {
            organization_id: organizationId,
            client_id: clientId,
            marketing_opt_out: true,
            opt_out_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,client_id" }
        );
    }

    // Fetch org details for branding and confirmation page
    let orgName = "your salon";
    let logoUrl: string | null = null;
    let accentColor = "#7c3aed";
    let websiteUrl: string | null = null;

    const { data: org } = await supabase
      .from("organizations")
      .select("name, email_social_links, email_logo_url, email_accent_color, logo_url")
      .eq("id", organizationId)
      .single();

    if (org) {
      if (org.name) orgName = org.name;
      logoUrl = org.email_logo_url || org.logo_url || null;
      if (org.email_accent_color) accentColor = org.email_accent_color;
      websiteUrl = (org.email_social_links as any)?.website || null;
    }

    // Build the opposite action URL for re-subscribe/unsubscribe toggle
    let toggleUrl: string | null = null;
    try {
      const baseUrl = await buildSignedUrl("unsubscribe-client-email", {
        cid: clientId,
        oid: organizationId,
        ts: Date.now(),
      });
      toggleUrl = isResubscribe ? baseUrl : `${baseUrl}&action=resubscribe`;
    } catch { /* ignore */ }

    if (isResubscribe) {
      return new Response(
        renderPage(
          "Re-subscribed!",
          `You've been re-subscribed to marketing emails from ${orgName}.`,
          websiteUrl,
          { logoUrl, accentColor, unsubscribeUrl: toggleUrl }
        ),
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }

    return new Response(
      renderPage(
        "Unsubscribed",
        `You've been removed from marketing emails from ${orgName}.`,
        websiteUrl,
        { logoUrl, accentColor, resubscribeUrl: toggleUrl }
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("[unsubscribe-client-email] Error:", error);
    return new Response(
      renderPage("Error", "Something went wrong. Please try again later.", null, null),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
});

interface BrandingContext {
  logoUrl?: string | null;
  accentColor?: string;
  resubscribeUrl?: string | null;
  unsubscribeUrl?: string | null;
}

function renderPage(title: string, message: string, websiteUrl: string | null, branding: BrandingContext | null): string {
  const accent = branding?.accentColor || "#7c3aed";
  const logoHtml = branding?.logoUrl
    ? `<img src="${branding.logoUrl}" alt="Logo" style="max-height:48px;max-width:200px;margin:0 auto 16px;display:block;" />`
    : '';

  const websiteLink = websiteUrl
    ? `<a href="${websiteUrl}" style="display:inline-block;margin-top:24px;color:${accent};text-decoration:underline;font-size:14px;">Visit our website</a>`
    : '';

  const resubscribeLink = branding?.resubscribeUrl
    ? `<a href="${branding.resubscribeUrl}" style="display:inline-block;margin-top:16px;color:#6b7280;text-decoration:underline;font-size:13px;">Changed your mind? Re-subscribe</a>`
    : '';

  const unsubscribeLink = branding?.unsubscribeUrl
    ? `<a href="${branding.unsubscribeUrl}" style="display:inline-block;margin-top:16px;color:#6b7280;text-decoration:underline;font-size:13px;">Unsubscribe again</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:480px;margin:0 auto;text-align:center;padding:40px 24px;">
    ${logoHtml}
    <div style="background:linear-gradient(135deg,${accent},${accent}cc);width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
      <span style="font-size:28px;">✉️</span>
    </div>
    <h1 style="font-size:24px;color:#111827;margin:0 0 12px;">${title}</h1>
    <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 20px;">${message}</p>
    
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;text-align:left;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#166534;">📅 Appointment notifications are not affected</p>
      <p style="margin:0;font-size:13px;color:#15803d;line-height:1.5;">You'll continue to receive appointment confirmations, reminders, and booking updates — no action needed.</p>
    </div>
    
    ${websiteLink}
    ${resubscribeLink}
    ${unsubscribeLink}
  </div>
</body>
</html>`;
}
