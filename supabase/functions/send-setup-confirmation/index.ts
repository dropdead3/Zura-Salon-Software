/**
 * send-setup-confirmation
 *
 * Sends a transactional confirmation email ~5 minutes after wizard commit.
 * Treats failures as non-fatal — the wizard already succeeded.
 *
 * Note: This is a thin scheduler wrapper. Full transactional email infra
 * (queue + templates) is set up by the email-domain tooling. If absent,
 * this falls back to logging only.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { wildcardCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: wildcardCorsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ) as any;

    const body = await req.json();
    const { organization_id, user_id, results } = body ?? {};

    if (!organization_id || !user_id) {
      return json(
        { error: "organization_id and user_id required" },
        400,
      );
    }

    // Fetch org + user email
    const { data: org } = await supabase
      .from("organizations")
      .select("name, slug, setup_intent")
      .eq("id", organization_id)
      .maybeSingle();

    const { data: { user } } = await supabase.auth.admin.getUserById(user_id);
    if (!user?.email) {
      return json({ error: "user email not found" }, 404);
    }

    const completed = (results ?? []).filter((r: any) => r.status === "completed").length;
    const total = (results ?? []).filter((r: any) => r.status !== "skipped").length;

    // Best-effort transactional send. If template not registered, log and exit.
    const sendResult = await supabase.functions.invoke(
      "send-transactional-email",
      {
        body: {
          templateName: "setup-confirmation",
          recipientEmail: user.email,
          idempotencyKey: `setup-confirm-${organization_id}`,
          templateData: {
            business_name: org?.name ?? "your business",
            completed,
            total,
            dashboard_url: `https://getzura.com/dashboard`,
          },
        },
      },
    ).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));

    if ((sendResult as any)?.error) {
      console.warn(
        "[send-setup-confirmation] send failed (non-fatal):",
        (sendResult as any).error,
      );
    }

    return json({ success: true, scheduled: true });
  } catch (err) {
    console.error("[send-setup-confirmation] error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...wildcardCorsHeaders, "Content-Type": "application/json" },
  });
}
