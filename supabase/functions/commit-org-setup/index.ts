/**
 * commit-org-setup
 *
 * Orchestrator for finalizing the org setup wizard.
 * - Reads draft from org_setup_drafts (keyed by user_id + organization_id)
 * - Iterates registry-aligned step keys (step_0_fit_check … step_7_5_apps)
 * - Each handler maps the component's onChange payload to true DB columns
 * - Records partial-success in org_setup_commit_log (source='wizard')
 * - Stamps organizations.setup_completed_at ONLY when failed === 0 && completed > 0
 * - Returns { success, partial, completed, failed, total, results } for the UI
 *
 * Wave 13A/B fixes: B1 (organization_id), B2 (registry keys), B5 (gate
 * setup_completed_at), and field-shape contract per step against real DB columns.
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

// Registry-aligned keys. Must match setup_step_registry.key values.
const STEP_ORDER = [
  "step_0_fit_check",
  "step_1_identity",
  "step_2_footprint",
  "step_3_team",
  "step_4_compensation",
  "step_5_catalog",
  "step_6_standards",
  "step_7_intent",
  "step_7_5_apps",
];

const SYSTEM_BY_STEP: Record<string, string> = {
  step_0_fit_check: "fit_check",
  step_1_identity: "identity",
  step_2_footprint: "footprint",
  step_3_team: "team",
  step_4_compensation: "compensation",
  step_5_catalog: "catalog",
  step_6_standards: "standards",
  step_7_intent: "intent",
  step_7_5_apps: "apps",
};

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
    const { organization_id, acknowledged_conflicts = [], idempotency_key } = body ?? {};
    if (!organization_id) {
      return json({ error: "organization_id required" }, 400, corsHeaders);
    }

    // Wave 13D.G10 — short-circuit if this exact attempt already ran.
    // The unique index (organization_id, idempotency_key, system) protects
    // the audit log from duplicate inserts; we additionally pre-check so
    // the orchestrator doesn't re-run handlers (which would duplicate
    // locations and app_interest rows).
    if (idempotency_key) {
      const { data: prior } = await supabase
        .from("org_setup_commit_log")
        .select("system, status, reason, deep_link")
        .eq("organization_id", organization_id)
        .eq("idempotency_key", idempotency_key);
      if (prior && prior.length > 0) {
        const results = prior.map((r: any) => ({
          step_key: `replayed_${r.system}`,
          system: r.system,
          status: r.status,
          reason: r.reason ?? "replay (idempotency)",
          deep_link: r.deep_link ?? undefined,
        }));
        const completed = results.filter((r) => r.status === "completed").length;
        const failed = results.filter((r) => r.status === "failed").length;
        return json({
          success: failed === 0 && completed > 0,
          partial: failed > 0,
          completed,
          failed,
          total: results.length,
          results,
          replayed: true,
        }, 200, corsHeaders);
      }
    }

    // Verify caller is org admin
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isAdmin) {
      return json({ error: "Forbidden" }, 403, corsHeaders);
    }

    // Load draft (Wave 13A.B1: column is organization_id, not org_id)
    const { data: draft, error: draftErr } = await supabase
      .from("org_setup_drafts")
      .select("step_data")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (draftErr) {
      console.error("[commit-org-setup] draft load failed:", draftErr);
    }

    const stepData = (draft?.step_data ?? {}) as Record<string, any>;
    const results: CommitStepResult[] = [];

    // Execute per-step commit handlers in registry order
    for (const stepKey of STEP_ORDER) {
      const data = stepData[stepKey];
      const system = SYSTEM_BY_STEP[stepKey] ?? stepKey;

      if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
        results.push({
          step_key: stepKey,
          system,
          status: "skipped",
          reason: "no draft data",
        });
        continue;
      }

      try {
        const handlerResult = await executeStepHandler(
          supabase,
          stepKey,
          system,
          organization_id,
          data,
          user.id,
        );
        results.push(handlerResult);

        // Mark step completion (best-effort — the table may not exist in all envs)
        await supabase.from("org_setup_step_completion").upsert({
          organization_id,
          step_key: stepKey,
          status: handlerResult.status === "completed" ? "completed" : "failed",
          data,
          completion_source: "wizard",
          completed_version: 1,
        }, { onConflict: "organization_id,step_key" }).then(({ error }) => {
          if (error) console.warn(`[commit-org-setup] step_completion upsert: ${error.message}`);
        });

        // Audit log — source='wizard' so process-setup-followups can
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
          idempotency_key: idempotency_key ?? null,
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[commit-org-setup] step ${stepKey} failed:`, reason);
        results.push({
          step_key: stepKey,
          system,
          status: "failed",
          reason,
        });
        await supabase.from("org_setup_commit_log").insert({
          organization_id,
          system,
          status: "failed",
          reason,
          acknowledged_conflicts,
          attempted_by: user.id,
          source: "wizard",
          idempotency_key: idempotency_key ?? null,
        });
      }
    }

    const completed = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const total = results.filter((r) => r.status !== "skipped").length;
    const success = failed === 0 && completed > 0;

    // Wave 13A.B5 — only stamp setup_completed_at on a clean run with real work.
    // Otherwise leave it null so the org stays in the funnel and the user can
    // re-enter from the dashboard.
    if (success) {
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
    }

    return json({
      success,
      partial: failed > 0 || (completed === 0 && total === 0),
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

/**
 * Per-step handlers. Each one consumes the EXACT shape the React component's
 * onChange writes (see src/components/onboarding/setup/Step*.tsx) and maps
 * to the actual DB columns. This is the field-shape contract — handlers must
 * never silently rename keys.
 */
async function executeStepHandler(
  supabase: any,
  stepKey: string,
  system: string,
  orgId: string,
  data: any,
  userId: string,
): Promise<CommitStepResult> {
  switch (stepKey) {
    case "step_0_fit_check":
      // Self-selection only — no DB writes. Off-ramp telemetry handled in UI.
      return {
        step_key: stepKey,
        system,
        status: "completed",
        reason: data.fit === "not_a_salon" ? "self-disqualified" : "fit confirmed",
      };

    case "step_1_identity": {
      const updates: Record<string, any> = {};
      if (data.business_name) updates.name = data.business_name;
      if (data.legal_name) updates.legal_name = data.legal_name;
      if (data.business_type) updates.business_type = data.business_type;
      if (data.timezone) updates.timezone = data.timezone;
      if (Object.keys(updates).length === 0) {
        return { step_key: stepKey, system, status: "skipped", reason: "no identity fields" };
      }
      const { error } = await supabase.from("organizations").update(updates).eq("id", orgId);
      if (error) throw error;
      return {
        step_key: stepKey,
        system,
        status: "completed",
        deep_link: "/dashboard/admin/settings?category=business",
      };
    }

    case "step_2_footprint": {
      // Component writes: { locations: [{name, city, state}], location_count, operating_states }
      // Idempotency: dedupe by case-insensitive (name, city) within the org's existing locations.
      const locations = Array.isArray(data.locations) ? data.locations : [];
      if (locations.length === 0) {
        return { step_key: stepKey, system, status: "skipped", reason: "no locations" };
      }

      const { data: existing } = await supabase
        .from("locations")
        .select("id, name, city")
        .eq("organization_id", orgId);
      const existingKeys = new Set(
        (existing ?? []).map((l: any) =>
          `${(l.name ?? "").toLowerCase().trim()}|${(l.city ?? "").toLowerCase().trim()}`
        ),
      );

      let inserted = 0;
      for (const loc of locations) {
        if (loc.id) continue; // pre-existing reference
        if (!loc.name?.trim()) continue;
        const key = `${loc.name.toLowerCase().trim()}|${(loc.city ?? "").toLowerCase().trim()}`;
        if (existingKeys.has(key)) continue;
        const { error } = await supabase.from("locations").insert({
          organization_id: orgId,
          name: loc.name.trim(),
          city: loc.city ?? null,
          state: loc.state ?? null,
        });
        if (error) throw error;
        existingKeys.add(key);
        inserted++;
      }

      // Mirror operating_states onto policy_org_profile for downstream applicability.
      const operatingStates: string[] = Array.isArray(data.operating_states)
        ? data.operating_states.filter(Boolean)
        : Array.from(new Set(locations.map((l: any) => l.state).filter(Boolean)));
      if (operatingStates.length > 0) {
        await supabase.from("policy_org_profile").upsert({
          organization_id: orgId,
          operating_states: operatingStates,
          primary_state: operatingStates[0],
        }, { onConflict: "organization_id" });
      }

      return {
        step_key: stepKey,
        system,
        status: "completed",
        reason: inserted > 0 ? `${inserted} new location(s)` : "no new locations",
        deep_link: "/dashboard/admin/settings?category=locations",
      };
    }

    case "step_3_team": {
      // Component writes: team_size_band, total_team_count, has_apprentices,
      // has_booth_renters, has_assistants, has_front_desk, unmodeled_structure
      const rolesUsed: string[] = [];
      if (data.has_apprentices) rolesUsed.push("apprentice");
      if (data.has_booth_renters) rolesUsed.push("booth_renter");
      if (data.has_assistants) rolesUsed.push("assistant");
      if (data.has_front_desk) rolesUsed.push("front_desk");

      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        team_size_band: data.team_size_band ?? null,
        has_booth_renters: !!data.has_booth_renters,
        roles_used: rolesUsed,
      }, { onConflict: "organization_id" });
      if (error) throw error;
      return {
        step_key: stepKey,
        system,
        status: "completed",
        deep_link: "/dashboard/admin/team-hub",
      };
    }

    case "step_4_compensation": {
      // Component writes: { models: string[], unmodeled_description? }
      const models: string[] = Array.isArray(data.models) ? data.models : [];
      const cleanModels = models.filter((m) => m && m !== "__escape__");
      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        compensation_models_in_use: cleanModels,
      }, { onConflict: "organization_id" });
      if (error) throw error;
      return {
        step_key: stepKey,
        system,
        status: "completed",
        deep_link: "/dashboard/admin/compensation-hub",
      };
    }

    case "step_5_catalog": {
      // Component writes: service_categories[], sells_retail, sells_packages,
      // sells_memberships, serves_minors, unmodeled_categories?
      const categories: string[] = Array.isArray(data.service_categories)
        ? data.service_categories
        : [];
      const offersExtensions = categories.includes("extensions");

      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        service_categories: categories,
        offers_extensions: offersExtensions,
        offers_retail: !!data.sells_retail,
        offers_packages: !!data.sells_packages,
        offers_memberships: !!data.sells_memberships,
        serves_minors: !!data.serves_minors,
      }, { onConflict: "organization_id" });
      if (error) throw error;
      return {
        step_key: stepKey,
        system,
        status: "completed",
        deep_link: "/dashboard/admin/services",
      };
    }

    case "step_6_standards": {
      // Component writes: tip_distribution_rule (enum), commission_basis,
      // refund_clawback (enum: always|rare|never), has_existing_handbook
      const usesTipPooling =
        data.tip_distribution_rule === "pooled" ||
        data.tip_distribution_rule === "team_based";
      const usesRefundClawback = data.refund_clawback === "always";
      const commissionBases: string[] = data.commission_basis
        ? [data.commission_basis]
        : [];

      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        uses_tip_pooling: usesTipPooling,
        uses_refund_clawback: usesRefundClawback,
        commission_basis_in_use: commissionBases,
        has_existing_handbook: !!data.has_existing_handbook,
      }, { onConflict: "organization_id" });
      if (error) throw error;
      return {
        step_key: stepKey,
        system,
        status: "completed",
        deep_link: "/dashboard/admin/policy-profile",
      };
    }

    case "step_7_intent": {
      // Component writes: { intent: string[] }
      const intent: string[] = Array.isArray(data.intent) ? data.intent : [];
      const { error } = await supabase.from("organizations").update({
        setup_intent: intent,
      }).eq("id", orgId);
      if (error) throw error;
      return {
        step_key: stepKey,
        system,
        status: "completed",
      };
    }

    case "step_7_5_apps": {
      // Component writes: { installed_apps: string[], expressed_interest: string[] }
      // Tier 3 interest goes to app_interest. Tier 1/2 install activation
      // is handled by the apps marketplace separately.
      const interest: string[] = Array.isArray(data.expressed_interest)
        ? data.expressed_interest
        : [];
      for (const appKey of interest) {
        const { error } = await supabase.from("app_interest").upsert({
          organization_id: orgId,
          app_key: appKey,
          expressed_by: userId,
        }, { onConflict: "organization_id,app_key" });
        if (error) throw error;
      }
      return {
        step_key: stepKey,
        system,
        status: "completed",
        deep_link: "/dashboard/apps",
      };
    }

    default:
      return {
        step_key: stepKey,
        system,
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
