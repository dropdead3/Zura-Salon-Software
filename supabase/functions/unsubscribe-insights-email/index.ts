import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLATFORM_NAME } from "../_shared/brand.ts";

serve(async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const payload = url.searchParams.get("payload");
    const sig = url.searchParams.get("sig");

    if (!payload || !sig) {
      return new Response(renderPage("Invalid Link", "This unsubscribe link is missing required parameters."), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Verify HMAC signature
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET") || "fallback";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = Uint8Array.from(atob(decodeURIComponent(sig)), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(decodeURIComponent(payload)));

    if (!valid) {
      return new Response(renderPage("Invalid Link", "This unsubscribe link is invalid or has been tampered with."), {
        status: 403,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Decode payload
    const decoded = JSON.parse(atob(decodeURIComponent(payload)));
    const userId = decoded.uid;

    if (!userId) {
      return new Response(renderPage("Error", "Could not identify user from this link."), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Disable insights email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    await supabase
      .from("notification_preferences")
      .update({ insights_email_enabled: false })
      .eq("user_id", userId);

    return new Response(
      renderPage(
        "Unsubscribed ✓",
        `You've been unsubscribed from ${PLATFORM_NAME} Insights emails. You can re-enable them anytime from your Notification Preferences in the dashboard.`
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("[unsubscribe-insights-email] Error:", error);
    return new Response(renderPage("Error", "Something went wrong. Please try again or manage your preferences from the dashboard."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
});

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:480px;margin:0 auto;text-align:center;padding:40px 24px;">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
      <span style="font-size:28px;">✨</span>
    </div>
    <h1 style="font-size:24px;color:#111827;margin:0 0 12px;">${title}</h1>
    <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0;">${message}</p>
  </div>
</body>
</html>`;
}
