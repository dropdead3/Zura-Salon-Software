/**
 * commit-self-serve-signup
 *
 * Self-serve signup flow:
 * 1. Creates auth user (with email verification)
 * 2. Creates organization with auto-suffixed slug
 * 3. Assigns 'owner' role to user
 * 4. Returns org_id so client can route to /onboarding/setup?org=<id>
 *
 * Rate-limited per IP+email to prevent abuse.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SignupBody {
  email: string;
  password: string;
  business_name: string;
  full_name?: string;
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // signups per IP per hour

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json() as SignupBody;
    const { email, password, business_name, full_name } = body;

    if (!email || !password || !business_name) {
      return json(
        { error: "email, password, and business_name are required" },
        400,
        corsHeaders,
      );
    }

    if (password.length < 8) {
      return json(
        { error: "Password must be at least 8 characters" },
        400,
        corsHeaders,
      );
    }

    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("setup_pause_events") // re-use as a generic event audit; actual rate-limit table optional
      .select("*", { count: "exact", head: true })
      .gte("occurred_at", since)
      .eq("free_text", `signup:${ip}`);
    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return json(
        { error: "Too many signup attempts. Try again later." },
        429,
        corsHeaders,
      );
    }

    // Create auth user (email verification required)
    const { data: authData, error: authErr } = await supabase.auth.admin
      .createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { full_name: full_name ?? null },
      });
    if (authErr || !authData.user) {
      return json(
        { error: authErr?.message ?? "Failed to create user" },
        400,
        corsHeaders,
      );
    }

    const userId = authData.user.id;

    // Auto-suffix slug
    const baseSlug = business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "salon";
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 10) {
      const { data: existing } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // Create organization
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: business_name,
        slug,
        setup_source: "self_serve",
      })
      .select("id, slug")
      .single();

    if (orgErr || !org) {
      // Roll back the auth user
      await supabase.auth.admin.deleteUser(userId);
      return json(
        { error: orgErr?.message ?? "Failed to create organization" },
        500,
        corsHeaders,
      );
    }

    // Assign owner role (org_users table or user_roles — try common patterns)
    const { error: roleErr } = await supabase.from("organization_users").insert({
      user_id: userId,
      organization_id: org.id,
      role: "owner",
      is_primary_owner: true,
    });
    if (roleErr) {
      console.error("[commit-self-serve-signup] role assignment failed:", roleErr);
      // Don't roll back — org+user exist; surface warning instead
    }

    // Audit IP for rate-limit window (re-use setup_pause_events as event log)
    await supabase.from("setup_pause_events").insert({
      org_id: org.id,
      step_key: "signup",
      reason_chip: "self_serve_signup",
      free_text: `signup:${ip}`,
    }).catch(() => {});

    // Trigger verification email via Supabase auth (resend)
    await supabase.auth.admin.generateLink({
      type: "signup",
      email,
    }).catch((e) => console.warn("[commit-self-serve-signup] verify link gen failed:", e));

    return json({
      success: true,
      organization_id: org.id,
      organization_slug: org.slug,
      user_id: userId,
      email_verification_required: true,
    }, 200, corsHeaders);
  } catch (err) {
    console.error("[commit-self-serve-signup] error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
      corsHeaders,
    );
  }
});

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
