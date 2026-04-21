/**
 * log-setup-outreach
 *
 * Server-side write path for setup_outreach_log. Enforces the
 * platform-user contract that the table's RLS policy requires, surfaces
 * errors back to the caller (so the UI can toast on failure), and uses
 * upsert/ignore semantics against the (org, step, day) unique index so
 * concurrent CSV exports don't double-log.
 *
 * Doctrine: multi-tenant-isolation-and-hardening + edge-function-execution-context.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LogRow {
  organization_id: string;
  step_number: number;
  step_label?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Authorization gate — table is platform-only.
    const { data: isPlatform } = await admin.rpc("is_platform_user", {
      _user_id: userData.user.id,
    });
    if (!isPlatform) {
      return json({ error: "Forbidden — platform users only" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { rows } = body as { rows?: LogRow[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return json({ error: "rows[] required" }, 400);
    }

    // Validate each row shape (defensive — never trust client input)
    for (const r of rows) {
      if (!r.organization_id || typeof r.organization_id !== "string") {
        return json({ error: "Each row must have organization_id" }, 400);
      }
      if (typeof r.step_number !== "number") {
        return json({ error: "Each row must have step_number" }, 400);
      }
    }

    // Insert with ignore-on-conflict (unique index on org+step+day prevents dupes)
    const insertRows = rows.map((r) => ({
      organization_id: r.organization_id,
      step_number: r.step_number,
      step_label: r.step_label ?? null,
      exported_by: userData.user!.id,
    }));

    // PostgREST "ignoreDuplicates" via upsert with onConflict on the unique index columns
    const { data, error } = await admin
      .from("setup_outreach_log")
      .upsert(insertRows, {
        onConflict: "organization_id,step_number,exported_on_date",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      console.error("[log-setup-outreach] insert error:", error);
      return json({ error: error.message }, 500);
    }

    return json({
      success: true,
      requested: rows.length,
      inserted: data?.length ?? 0,
    });
  } catch (err) {
    console.error("[log-setup-outreach] unexpected:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
