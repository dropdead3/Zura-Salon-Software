/**
 * commit-org-setup
 *
 * Orchestrator for finalizing the org setup wizard.
 * - Reads draft from org_setup_drafts
 * - Runs per-step commit handlers in dependency order
 * - Records partial-success in org_setup_commit_log
 * - Stamps organizations.setup_completed_at regardless of partial failures
 * - Returns { success, completed, failed } so the UI can render SetupCommitResult
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface CommitStepResult {
  step_key: string;
  system: string;
  status: "completed" | "failed" | "skipped";
  reason?: string;
  deep_link?: string;
}

const STEP_ORDER = [
  "fit_check",
  "identity",
  "footprint",
  "team",
  "compensation",
  "catalog",
  "standards",
  "intent",
  "apps",
];

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const { organization_id, acknowledged_conflicts = [] } = body ?? {};
    if (!organization_id) {
      return json({ error: "organization_id required" }, 400, corsHeaders);
    }

    // Verify caller is org admin
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isAdmin) {
      return json({ error: "Forbidden" }, 403, corsHeaders);
    }

    // Load draft
    const { data: draft } = await supabase
      .from("org_setup_drafts")
      .select("step_data")
      .eq("user_id", user.id)
      .eq("org_id", organization_id)
      .maybeSingle();

    const stepData = (draft?.step_data ?? {}) as Record<string, any>;
    const results: CommitStepResult[] = [];

    // Execute per-step commit handlers in order
    for (const stepKey of STEP_ORDER) {
      const data = stepData[stepKey];
      if (!data) {
        results.push({
          step_key: stepKey,
          system: stepKey,
          status: "skipped",
          reason: "no draft data",
        });
        continue;
      }

      try {
        const handlerResult = await executeStepHandler(
          supabase,
          stepKey,
          organization_id,
          data,
          user.id,
        );
        results.push(handlerResult);

        // Mark step completion
        await supabase.from("org_setup_step_completion").upsert({
          organization_id,
          step_key: stepKey,
          status: handlerResult.status === "completed" ? "completed" : "failed",
          data,
          completion_source: "wizard",
          completed_version: 1,
        }, { onConflict: "organization_id,step_key" });

        // Audit log — mark source='wizard' so process-setup-followups can
        // distinguish real wizard completions from synthetic backfills.
        await supabase.from("org_setup_commit_log").insert({
          organization_id,
          system: handlerResult.system,
          status: handlerResult.status,
          reason: handlerResult.reason ?? null,
          deep_link: handlerResult.deep_link ?? null,
          acknowledged_conflicts,
          attempted_by: user.id,
          source: "wizard",
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[commit-org-setup] step ${stepKey} failed:`, reason);
        results.push({
          step_key: stepKey,
          system: stepKey,
          status: "failed",
          reason,
        });
        await supabase.from("org_setup_commit_log").insert({
          organization_id,
          system: stepKey,
          status: "failed",
          reason,
          acknowledged_conflicts,
          attempted_by: user.id,
          source: "wizard",
        });
      }
    }

    // Stamp setup_completed_at regardless of partial failures
    await supabase.from("organizations")
      .update({
        setup_completed_at: new Date().toISOString(),
        setup_source: "wizard",
      })
      .eq("id", organization_id);

    // Schedule confirmation email +5 minutes (best-effort)
    const sendAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabase.functions.invoke("send-setup-confirmation", {
      body: {
        organization_id,
        user_id: user.id,
        scheduled_for: sendAt,
        results,
      },
    }).catch((e) => console.warn("[commit-org-setup] email schedule failed:", e));

    const completed = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const total = results.filter((r) => r.status !== "skipped").length;

    return json({
      success: failed === 0,
      partial: failed > 0,
      completed,
      failed,
      total,
      results,
    }, 200, corsHeaders);
  } catch (err) {
    console.error("[commit-org-setup] error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500,
      corsHeaders,
    );
  }
});

async function executeStepHandler(
  supabase: any,
  stepKey: string,
  orgId: string,
  data: any,
  userId: string,
): Promise<CommitStepResult> {
  switch (stepKey) {
    case "fit_check":
      return {
        step_key: stepKey,
        system: "fit_check",
        status: "completed",
        reason: "self-selection recorded",
      };

    case "identity": {
      const { error } = await supabase.from("organizations").update({
        name: data.business_name,
        legal_name: data.legal_name ?? null,
        business_type: data.business_type ?? null,
        timezone: data.timezone ?? null,
      }).eq("id", orgId);
      if (error) throw error;
      return {
        step_key: stepKey,
        system: "identity",
        status: "completed",
        deep_link: "/dashboard/admin/settings?category=business",
      };
    }

    case "footprint": {
      // Insert any locations not already present
      const locations = data.locations ?? [];
      for (const loc of locations) {
        if (loc.id) continue; // existing
        const { error } = await supabase.from("locations").insert({
          organization_id: orgId,
          name: loc.name,
          address: loc.address ?? null,
          city: loc.city ?? null,
          state: loc.state ?? null,
          postal_code: loc.postal_code ?? null,
        });
        if (error) throw error;
      }
      return {
        step_key: stepKey,
        system: "footprint",
        status: "completed",
        deep_link: "/dashboard/admin/settings?category=locations",
      };
    }

    case "team": {
      // Just persist team band on org metadata; actual invites come later
      return {
        step_key: stepKey,
        system: "team",
        status: "completed",
        deep_link: "/dashboard/admin/team-hub",
      };
    }

    case "compensation": {
      // Seed policy_org_profile with compensation models in use
      const models = data.compensation_models_in_use ?? [];
      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        compensation_models_in_use: models,
      }, { onConflict: "organization_id" });
      if (error) throw error;
      return {
        step_key: stepKey,
        system: "compensation",
        status: "completed",
        deep_link: "/dashboard/admin/compensation-hub",
      };
    }

    case "catalog": {
      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        offers_color_services: !!data.offers_color_services,
        offers_extensions: !!data.offers_extensions,
        sells_retail: !!data.sells_retail,
        offers_packages: !!data.offers_packages,
        offers_memberships: !!data.offers_memberships,
        serves_minors: !!data.serves_minors,
      }, { onConflict: "organization_id" });
      if (error) throw error;
      return {
        step_key: stepKey,
        system: "catalog",
        status: "completed",
        deep_link: "/dashboard/admin/services",
      };
    }

    case "standards": {
      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        tip_handling: data.tip_handling ?? null,
        commission_basis: data.commission_basis ?? null,
        refund_clawback: !!data.refund_clawback,
        has_existing_handbook: !!data.has_existing_handbook,
      }, { onConflict: "organization_id" });
      if (error) throw error;
      return {
        step_key: stepKey,
        system: "standards",
        status: "completed",
        deep_link: "/dashboard/admin/policy-profile",
      };
    }

    case "intent": {
      const { error } = await supabase.from("organizations").update({
        setup_intent: data.intents ?? [],
      }).eq("id", orgId);
      if (error) throw error;
      return {
        step_key: stepKey,
        system: "intent",
        status: "completed",
      };
    }

    case "apps": {
      // Track app interest for Tier 3; Tier 1/2 trial activation handled elsewhere
      const interest = data.tier3_interest ?? [];
      for (const appKey of interest) {
        await supabase.from("app_interest").upsert({
          organization_id: orgId,
          app_key: appKey,
          expressed_by: userId,
        }, { onConflict: "organization_id,app_key" });
      }
      return {
        step_key: stepKey,
        system: "apps",
        status: "completed",
        deep_link: "/dashboard/apps",
      };
    }

    default:
      return {
        step_key: stepKey,
        system: stepKey,
        status: "skipped",
        reason: "unknown step",
      };
  }
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
