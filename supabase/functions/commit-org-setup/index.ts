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

// Wave 13F.B — Registry-driven step order (G26 fix).
// Hardcoded fallback used only if the registry read fails or returns empty.
// Keys must match setup_step_registry.key values.
const STEP_ORDER_FALLBACK = [
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

// Wave 13H — B9: SYSTEM_BY_STEP is now a fallback only. The registry's
// `system` column is the source of truth (see migration 13H). Keeping this
// map handles cold-cache / registry-read-failure cases.
const SYSTEM_BY_STEP_FALLBACK: Record<string, string> = {
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

/**
 * Loads {stepKey → system} from setup_step_registry (B9).
 * Falls back to hardcoded map on any failure so a registry regression
 * never blocks commit.
 */
async function loadRegistry(
  supabase: any,
): Promise<{ stepOrder: string[]; systemByStep: Record<string, string> }> {
  const { data, error } = await supabase
    .from("setup_step_registry")
    .select("key, step_order, system, deprecated_at")
    .is("deprecated_at", null)
    .order("step_order", { ascending: true });
  if (error || !data || data.length === 0) {
    console.warn(
      "[commit-org-setup] registry read failed, using fallbacks:",
      error?.message,
    );
    return {
      stepOrder: STEP_ORDER_FALLBACK,
      systemByStep: SYSTEM_BY_STEP_FALLBACK,
    };
  }
  const stepOrder = data.map((r: any) => r.key);
  const systemByStep: Record<string, string> = {};
  for (const r of data) {
    systemByStep[r.key] = r.system ?? SYSTEM_BY_STEP_FALLBACK[r.key] ?? r.key;
  }
  return { stepOrder, systemByStep };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ) as any;

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
    const {
      organization_id,
      acknowledged_conflicts = [],
      idempotency_key,
      // Wave 13G.B — single-step re-entry from settings. When set, the
      // orchestrator only runs handlers for these step keys; everything
      // else is reported as `skipped: caller-scoped`. setup_completed_at
      // is NOT stamped in scoped mode (the wizard is still in progress).
      step_keys,
    } = body ?? {};
    const scopedKeys: string[] | null =
      Array.isArray(step_keys) && step_keys.length > 0
        ? step_keys.filter((k: any) => typeof k === "string")
        : null;
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
        const completed = results.filter((r: any) => r.status === "completed").length;
        const failed = results.filter((r: any) => r.status === "failed").length;
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

    // Execute per-step commit handlers in registry order (Wave 13F.B — G26)
    const { stepOrder, systemByStep } = await loadRegistry(supabase);
    for (const stepKey of stepOrder) {
      const data = stepData[stepKey];
      const system = systemByStep[stepKey] ?? SYSTEM_BY_STEP_FALLBACK[stepKey] ?? stepKey;

      // Wave 13G.B — scoped re-entry: skip every step not in the caller's list.
      if (scopedKeys && !scopedKeys.includes(stepKey)) {
        results.push({
          step_key: stepKey,
          system,
          status: "skipped",
          reason: "caller-scoped",
        });
        continue;
      }

      if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
        results.push({
          step_key: stepKey,
          system,
          status: "skipped",
          reason: "no draft data",
        });
        continue;
      }

      // Wave 13H — B6: purely-backfilled-untouched steps are NOT re-applied.
      // Backfill seeds defaults (e.g. serves_minors:false, tip_distribution_rule:
      // individual) which would silently overwrite policy_org_profile on commit
      // if the operator never confirmed them. Step 0 (fit check) and Step 7/7.5
      // have no backfilled shape so they always pass through.
      const d = data as Record<string, unknown>;
      const isPurelyBackfilled =
        d.backfilled === true &&
        d.__touched !== true &&
        d.__skipped__ !== true;
      if (isPurelyBackfilled) {
        results.push({
          step_key: stepKey,
          system,
          status: "skipped",
          reason: "backfill-only, no user confirmation",
        });
        // Still record a completion row so the rail and audit trail see
        // this step as "acknowledged via backfill" — but do NOT run the
        // handler or write to policy_org_profile.
        await supabase.from("org_setup_commit_log").insert({
          organization_id,
          system,
          status: "skipped",
          reason: "backfill-only, no user confirmation",
          acknowledged_conflicts,
          attempted_by: user.id,
          source: "wizard",
          idempotency_key: idempotency_key ?? null,
        });
        // Wave 13I — B6 residual: also write to org_setup_step_completion so
        // the side rail's timestamp surface ("Inferred Xm ago") has a row to
        // render. Without this, a backfilled-then-committed org sees a
        // half-empty rail even though setup is acknowledged complete.
        const { error: backfillCompletionErr } = await supabase.rpc(
          "upsert_org_setup_step_completion",
          {
            p_organization_id: organization_id,
            p_step_key: stepKey,
            p_status: "skipped",
            p_data: data ?? {},
            p_completion_source: "backfill_only",
            p_completed_version: 1,
            p_user_id: user.id,
          },
        );
        if (backfillCompletionErr) {
          console.warn(
            `[commit-org-setup] backfill step_completion rpc: ${backfillCompletionErr.message}`,
          );
        }
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
          stepData, // Wave 13H — B2: full draft for server-side cross-step derivation
        );
        results.push(handlerResult);

        // Wave 13G.G — atomic upsert via RPC so attempt_count increments
        // exactly +1 per commit (replaces the heuristic gap-based detection).
        const { error: completionErr } = await supabase.rpc(
          "upsert_org_setup_step_completion",
          {
            p_organization_id: organization_id,
            p_step_key: stepKey,
            p_status: handlerResult.status === "completed" ? "completed" : "failed",
            p_data: data ?? {},
            p_completion_source: "wizard",
            p_completed_version: 1,
            p_user_id: user.id,
          },
        );
        if (completionErr) {
          console.warn(`[commit-org-setup] step_completion rpc: ${completionErr.message}`);
        }

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

    const completed = results.filter((r: any) => r.status === "completed").length;
    const failed = results.filter((r: any) => r.status === "failed").length;
    const total = results.filter((r: any) => r.status !== "skipped").length;
    const success = failed === 0 && completed > 0;

    // Wave 13A.B5 — only stamp setup_completed_at on a clean run with real work.
    // Otherwise leave it null so the org stays in the funnel and the user can
    // re-enter from the dashboard.
    // Wave 13G.B — never stamp completion in scoped (single-step) mode; the
    // wizard isn't actually finished, the operator just patched one slice.
    if (success && !scopedKeys) {
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
  fullDraft?: Record<string, any>, // Wave 13H — B2: cross-step re-derivation
): Promise<CommitStepResult> {
  switch (stepKey) {
    case "step_0_fit_check": {
      // Wave 13F.A — fix B7. Component writes `fit_choice`, not `fit`.
      // Persist the self-classification so downstream features (rental_heavy,
      // hybrid_unique) can skip standard-shop assumptions.
      const fitChoice = data.fit_choice ?? data.fit ?? null; // backward compat
      const isOffRamp = fitChoice === "not_a_salon";
      const nonTraditional =
        fitChoice === "rental_heavy" || fitChoice === "hybrid_unique";

      if (fitChoice && !isOffRamp) {
        const { error } = await supabase.from("policy_org_profile").upsert({
          organization_id: orgId,
          fit_choice: fitChoice,
          non_traditional_structure: nonTraditional,
        }, { onConflict: "organization_id" });
        if (error) throw error;
      }
      return {
        step_key: stepKey,
        system,
        status: "completed",
        reason: isOffRamp
          ? "self-disqualified"
          : `fit confirmed: ${fitChoice ?? "unspecified"}`,
      };
    }

    case "step_1_identity": {
      // Wave 13G.A — only write business_type when the caller actually
      // touched it. Default-on-mount used to overwrite multi_location
      // backfills with single_location.
      const updates: Record<string, any> = {};
      if (data.business_name) updates.name = data.business_name;
      if (data.legal_name) updates.legal_name = data.legal_name;
      if (data.business_type && data.__touched_business_type === true) {
        updates.business_type = data.business_type;
      }
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

      // Wave 13G.A — persist total_team_count + unmodeled_structure (was dropped).
      const totalCount =
        typeof data.total_team_count === "number" && Number.isFinite(data.total_team_count)
          ? Math.max(0, Math.round(data.total_team_count))
          : null;
      const unmodeledStructure =
        typeof data.unmodeled_structure === "string" && data.unmodeled_structure.trim()
          ? data.unmodeled_structure.trim()
          : null;

      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        team_size_band: data.team_size_band ?? null,
        total_team_count: totalCount,
        has_booth_renters: !!data.has_booth_renters,
        roles_used: rolesUsed,
        unmodeled_structure: unmodeledStructure,
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
      const cleanModels = models.filter((m: any) => m && m !== "__escape__");
      // Wave 13G.A — persist unmodeled_description (was dropped despite
      // the component requiring ≥10 chars when __escape__ is selected).
      const unmodeledComp =
        typeof data.unmodeled_description === "string" && data.unmodeled_description.trim()
          ? data.unmodeled_description.trim()
          : null;
      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        compensation_models_in_use: cleanModels,
        unmodeled_compensation: unmodeledComp,
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
      // Wave 13G.A — persist unmodeled_categories (was dropped).
      const unmodeledCats =
        typeof data.unmodeled_categories === "string" && data.unmodeled_categories.trim()
          ? data.unmodeled_categories.trim()
          : null;

      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        service_categories: categories,
        offers_extensions: offersExtensions,
        offers_retail: !!data.sells_retail,
        offers_packages: !!data.sells_packages,
        offers_memberships: !!data.sells_memberships,
        serves_minors: !!data.serves_minors,
        unmodeled_categories: unmodeledCats,
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
      //
      // Wave 13F.A — preserve the full tip_distribution_model alongside the
      // legacy uses_tip_pooling boolean. Pooled and team_based are distinct
      // operational realities; flattening them loses payroll fidelity.
      const tipModel: string | null = data.tip_distribution_rule ?? null;
      const usesTipPooling = tipModel === "pooled" || tipModel === "team_based";
      const usesRefundClawback = data.refund_clawback === "always";
      const commissionBases: string[] = data.commission_basis
        ? [data.commission_basis]
        : [];

      const { error } = await supabase.from("policy_org_profile").upsert({
        organization_id: orgId,
        tip_distribution_model: tipModel,
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
      // Component writes: { installed_apps: string[], expressed_interest: string[],
      //                     declined_apps?: string[], qualified_keys?: string[] }
      //
      // Wave 13F.A — fix B9. Activate every Tier 1/2 install, record Tier 3 interest.
      // Wave 13G.A — classifier idempotency: intersect installed_apps with the
      //   freshly-classified `qualified_keys` so a previously-Tier-1 app does
      //   not get re-activated after the operator removed its qualifying input.
      // Wave 13G.F — record Tier-1 declines as `app_interest.status='declined'`
      //   instead of activating; preserves operator autonomy.
      // Wave 13H — B2: re-derive qualification server-side from steps 3/4/5
      // so stale client qualified_keys can't cause wrongly-activated apps.
      const step3 = (fullDraft?.["step_3_team"] ?? {}) as Record<string, any>;
      const step4 = (fullDraft?.["step_4_compensation"] ?? {}) as Record<string, any>;
      const step5 = (fullDraft?.["step_5_catalog"] ?? {}) as Record<string, any>;
      const cats: string[] = Array.isArray(step5.service_categories) ? step5.service_categories : [];
      const compModels: string[] = Array.isArray(step4.models) ? step4.models : [];
      const serverQualified = new Set<string>();
      if (cats.includes("color") || cats.includes("chemical")) serverQualified.add("color_bar");
      if (compModels.length > 0) serverQualified.add("zura_payroll");
      if (step3.has_booth_renters === true) serverQualified.add("booth_rental");
      if (cats.includes("extensions")) serverQualified.add("extensions_tracker");

      const installedRaw: string[] = Array.isArray(data.installed_apps)
        ? data.installed_apps.filter(Boolean)
        : [];
      const declined: string[] = Array.isArray(data.declined_apps)
        ? data.declined_apps.filter(Boolean)
        : [];
      const clientQualified: string[] | null = Array.isArray(data.qualified_keys)
        ? data.qualified_keys.filter(Boolean)
        : null;
      // Server-derived takes precedence; fall back to client list only when
      // we have no server signal (forward-compat for new app keys).
      const effectiveQualified: Set<string> | null =
        serverQualified.size > 0
          ? serverQualified
          : (clientQualified ? new Set(clientQualified) : null);
      const installed = installedRaw.filter((k: any) => (effectiveQualified === null || effectiveQualified.has(k)) && !declined.includes(k),
      );
      const interest: string[] = Array.isArray(data.expressed_interest)
        ? data.expressed_interest.filter(Boolean)
        : [];

      let activated = 0;
      for (const appKey of installed) {
        const { error } = await supabase.from("organization_apps").upsert({
          organization_id: orgId,
          app_key: appKey,
          activated_at: new Date().toISOString(),
        }, { onConflict: "organization_id,app_key" });
        if (error) throw error;
        activated++;
      }

      for (const appKey of interest) {
        const { error } = await supabase.from("app_interest").upsert({
          organization_id: orgId,
          app_key: appKey,
          expressed_by: userId,
          status: "interested",
        }, { onConflict: "organization_id,app_key" });
        if (error) throw error;
      }

      // Wave 13G.F — declines recorded for product/lifecycle visibility.
      for (const appKey of declined) {
        const { error } = await supabase.from("app_interest").upsert({
          organization_id: orgId,
          app_key: appKey,
          expressed_by: userId,
          status: "declined",
        }, { onConflict: "organization_id,app_key" });
        if (error) throw error;
      }
      return {
        step_key: stepKey,
        system,
        status: "completed",
        reason: `${activated} activated, ${interest.length} interest, ${declined.length} declined`,
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
