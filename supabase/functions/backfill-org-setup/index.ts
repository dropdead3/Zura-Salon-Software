/**
 * backfill-org-setup
 *
 * Hybrid silent backfill for orgs that pre-date the wizard.
 * - Infers identity, footprint, team, compensation, catalog, standards
 *   from existing tables and writes them to org_setup_drafts.
 * - Writes synthetic commit log entries (status='backfilled') so the
 *   "Unfinished from setup" callouts know which systems are confirmed.
 * - Marks intent + apps as pending so the owner sees a focused 2-step
 *   prompt (Review your business + pick apps) instead of the full wizard.
 * - Idempotent: safe to re-run; never overwrites a non-empty draft step.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface BackfillResult {
  step_key: string;
  system: string;
  status: "backfilled" | "skipped" | "pending_intent";
  reason?: string;
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
    const { organization_id } = body ?? {};
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

    // Idempotency guard — if setup_completed_at is already set, no-op.
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, timezone, setup_completed_at")
      .eq("id", organization_id)
      .maybeSingle();
    if (!org) {
      return json({ error: "Organization not found" }, 404, corsHeaders);
    }

    // Wave 13H — B8: log ineligible outcomes too so platform admin can see
    // *why* nothing's been backfilled, not just that nothing has. Each early
    // return below threads through this helper before responding.
    const logIneligible = async (reason: string) => {
      await supabase.from("org_setup_backfill_attempts").insert({
        organization_id,
        attempted_by: user.id,
        outcome: "ineligible",
        backfilled_count: 0,
        pending_count: 0,
        skipped_count: 0,
        details: { reason },
      });
    };

    if (org.setup_completed_at) {
      await logIneligible("already_completed");
      return json(
        {
          success: true,
          backfilled: 0,
          pending: 0,
          skipped: 0,
          results: [],
          ineligible: "already_completed",
        },
        200,
        corsHeaders,
      );
    }

    const results: BackfillResult[] = [];

    // Read existing draft to preserve any owner-entered data — including
    // resume position (Wave 13H — B5). Without this, a backfill that runs
    // after a user has already started the wizard (e.g. they opened the
    // dashboard in another browser) wipes their current_step/current_step_key
    // and dumps them back at Step 0 on next visit.
    const { data: existingDraft } = await supabase
      .from("org_setup_drafts")
      .select("step_data, current_step, current_step_key")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .maybeSingle();
    const existingStepData =
      (existingDraft?.step_data as Record<string, unknown>) ?? {};
    const existingCurrentStep = existingDraft?.current_step ?? null;
    const existingCurrentStepKey = existingDraft?.current_step_key ?? null;

    const stepData: Record<string, unknown> = { ...existingStepData };

    // --- Step 1: Identity (from organizations) ---
    // Canonical shape matches Step1Identity onChange payload.
    if (!stepData["step_1_identity"] && org.name) {
      stepData["step_1_identity"] = {
        business_name: org.name,
        legal_name: "",
        business_type: "single_location",
        timezone: org.timezone ?? "America/Los_Angeles",
        backfilled: true,
      };
      results.push({
        step_key: "step_1_identity",
        system: "identity",
        status: "backfilled",
      });
    }

    // --- Step 2: Footprint (from locations) ---
    // Canonical shape matches Step2Footprint onChange payload.
    const { data: locations } = await supabase
      .from("locations")
      .select("id, name, city, state, country, is_active")
      .eq("organization_id", organization_id)
      .eq("is_active", true);
    if (!stepData["step_2_footprint"] && locations && locations.length > 0) {
      const locShapes = locations.map((l: any) => ({
        id: l.id,
        name: l.name ?? "",
        city: l.city ?? "",
        state: l.state ?? "",
      }));
      const operatingStates = Array.from(
        new Set(locShapes.map((l: any) => l.state).filter(Boolean)),
      );
      stepData["step_2_footprint"] = {
        locations: locShapes,
        location_count: locShapes.length,
        operating_states: operatingStates,
        backfilled: true,
      };
      results.push({
        step_key: "step_2_footprint",
        system: "footprint",
        status: "backfilled",
      });
    }

    // --- Step 3: Team (from employee_profiles) ---
    // Canonical shape matches Step3Team onChange payload.
    const { data: employees } = await supabase
      .from("employee_profiles")
      .select("user_id, employment_type, is_active")
      .eq("organization_id", organization_id)
      .eq("is_active", true);
    if (!stepData["step_3_team"] && employees && employees.length > 0) {
      const types = new Set(employees.map((e: any) => e.employment_type).filter(Boolean));
      const count = employees.length;
      const band: "1-3" | "4-10" | "11-25" | "26+" =
        count <= 3 ? "1-3" : count <= 10 ? "4-10" : count <= 25 ? "11-25" : "26+";
      stepData["step_3_team"] = {
        team_size_band: band,
        total_team_count: count,
        has_apprentices: types.has("apprentice"),
        has_booth_renters: types.has("booth_renter") || types.has("renter"),
        has_assistants: types.has("assistant"),
        has_front_desk: types.has("front_desk") || types.has("receptionist"),
        backfilled: true,
      };
      results.push({
        step_key: "step_3_team",
        system: "team",
        status: "backfilled",
      });
    }

    // --- Step 4: Compensation (from stylist_levels presence) ---
    // Canonical shape matches Step4Compensation onChange payload.
    const { data: levels } = await supabase
      .from("stylist_levels")
      .select("id, level_number")
      .eq("organization_id", organization_id)
      .limit(1);
    if (!stepData["step_4_compensation"]) {
      if (levels && levels.length > 0) {
        stepData["step_4_compensation"] = {
          models: ["level_based"],
          backfilled: true,
        };
        results.push({
          step_key: "step_4_compensation",
          system: "compensation",
          status: "backfilled",
        });
      } else {
        results.push({
          step_key: "step_4_compensation",
          system: "compensation",
          status: "skipped",
          reason: "No stylist levels configured — owner should review.",
        });
      }
    }

    // --- Step 5: Catalog (from services) ---
    // Canonical shape matches Step5Catalog onChange payload.
    const { data: services } = await supabase
      .from("services")
      .select("id, category")
      .eq("organization_id", organization_id)
      .limit(500);
    if (!stepData["step_5_catalog"] && services && services.length > 0) {
      const rawCategories = Array.from(
        new Set(services.map((s: any) => (s.category ?? "").toLowerCase()).filter(Boolean)),
      );
      // Map raw service categories to wizard's canonical category vocabulary
      const CATEGORY_MAP: Record<string, string> = {
        cut: "haircut", haircut: "haircut", style: "haircut", styling: "haircut", blowout: "haircut",
        color: "color", colour: "color", highlights: "color", balayage: "color",
        chemical: "chemical", perm: "chemical", relaxer: "chemical", keratin: "chemical",
        extension: "extensions", extensions: "extensions",
        treatment: "treatment", olaplex: "treatment",
        barber: "barbering", barbering: "barbering", beard: "barbering",
        spa: "spa", facial: "spa", wax: "spa", lash: "spa", brow: "spa",
        nail: "nails", nails: "nails", manicure: "nails", pedicure: "nails",
      };
      const mapped = Array.from(new Set(
        rawCategories.map((c: any) => CATEGORY_MAP[c] ?? null).filter(Boolean) as string[],
      ));
      stepData["step_5_catalog"] = {
        service_categories: mapped,
        sells_retail: true,
        sells_packages: false,
        sells_memberships: false,
        serves_minors: false,
        backfilled: true,
      };
      results.push({
        step_key: "step_5_catalog",
        system: "catalog",
        status: "backfilled",
      });
    }

    // --- Step 6: Standards (from business_settings) ---
    // Canonical shape matches Step6Standards onChange payload.
    const { data: bizSettings } = await supabase
      .from("business_settings")
      .select("*")
      .eq("organization_id", organization_id)
      .maybeSingle();
    if (!stepData["step_6_standards"] && bizSettings) {
      stepData["step_6_standards"] = {
        tip_distribution_rule: "individual",
        commission_basis: "gross",
        refund_clawback: "rare",
        has_existing_handbook: false,
        backfilled: true,
      };
      results.push({
        step_key: "step_6_standards",
        system: "standards",
        status: "backfilled",
      });
    }

    // --- Step 7 + 7.5: Always pending — owner picks intent + apps interactively ---
    if (!stepData["step_7_intent"]) {
      results.push({
        step_key: "step_7_intent",
        system: "intent",
        status: "pending_intent",
        reason: "Tell us what you want from Zura so we can prioritize.",
      });
    }
    if (!stepData["step_7_5_apps"]) {
      results.push({
        step_key: "step_7_5_apps",
        system: "apps",
        status: "pending_intent",
        reason: "Pick the apps that fit your operation.",
      });
    }

    // Persist the merged draft. Wave 13H — B5: preserve any existing
    // resume position; only write current_step/current_step_key when we
    // actually have a prior value. Never clobber an in-progress wizard.
    const upsertRow: Record<string, unknown> = {
      user_id: user.id,
      organization_id,
      step_data: stepData,
      updated_at: new Date().toISOString(),
    };
    if (existingCurrentStep !== null && existingCurrentStep !== undefined) {
      upsertRow.current_step = existingCurrentStep;
    }
    if (existingCurrentStepKey) {
      upsertRow.current_step_key = existingCurrentStepKey;
    }
    await supabase
      .from("org_setup_drafts")
      .upsert(upsertRow, { onConflict: "user_id,organization_id" });

    // Wave 13D.G9 — record per-step inference provenance on the policy
    // profile so a future "review your inferred answers" UI can show the
    // operator exactly what we guessed and from which source table.
    const inferences: Record<string, { source: string; inferred_at: string }> = {};
    const SOURCE_BY_STEP: Record<string, string> = {
      step_1_identity: "organizations",
      step_2_footprint: "locations",
      step_3_team: "employee_profiles",
      step_4_compensation: "stylist_levels",
      step_5_catalog: "services",
      step_6_standards: "business_settings",
    };
    for (const r of results) {
      if (r.status !== "backfilled") continue;
      const source = SOURCE_BY_STEP[r.step_key];
      if (!source) continue;
      inferences[r.step_key] = {
        source,
        inferred_at: new Date().toISOString(),
      };
    }
    if (Object.keys(inferences).length > 0) {
      await supabase.from("policy_org_profile").upsert(
        {
          organization_id,
          backfill_inferences: inferences,
        },
        { onConflict: "organization_id" },
      );
    }

    // Write synthetic commit log entries (only for backfilled/skipped — not pending)
    // Marked source='backfill' so the followup processor doesn't treat
    // a backfilled 'completed' as a real wizard completion.
    const logRows = results
      .filter((r: any) => r.status === "backfilled" || r.status === "skipped")
      .map((r: any) => ({
        organization_id,
        system: r.system,
        status: r.status === "backfilled" ? "completed" : "skipped",
        reason: r.status === "backfilled"
          ? "Inferred from existing data"
          : r.reason ?? null,
        deep_link: null,
        attempted_at: new Date().toISOString(),
        acknowledged_conflicts: [],
        attempted_by: user.id,
        source: "backfill",
      }));
    if (logRows.length > 0) {
      await supabase.from("org_setup_commit_log").insert(logRows);
    }

    // Wave 7: Backfill telemetry — emit synthetic step events so the funnel
    // reflects backfilled orgs, not just wizard walkers. We mark each
    // backfilled system as 'completed' and each pending one as 'viewed'
    // so platform ops see them as "started but not finished".
    const stepNumberByKey: Record<string, number> = {
      step_1_identity: 1,
      step_2_footprint: 2,
      step_3_team: 3,
      step_4_compensation: 4,
      step_5_catalog: 5,
      step_6_standards: 6,
      step_7_intent: 7,
      step_7_5_apps: 8,
    };
    const eventRows = results.map((r: any) => ({
      organization_id,
      user_id: user.id,
      step_key: r.step_key,
      step_number: stepNumberByKey[r.step_key] ?? null,
      event:
        r.status === "backfilled"
          ? "completed"
          : r.status === "skipped"
            ? "skipped"
            : "viewed", // pending_intent → owner needs to act
      metadata: { source: "backfill", reason: r.reason ?? null },
    }));
    if (eventRows.length > 0) {
      await supabase.from("org_setup_step_events").insert(eventRows);
    }

    // Stamp acquisition source so cohort filter shows "backfilled" bucket
    await supabase
      .from("organizations")
      .update({ signup_source: "backfilled" })
      .eq("id", organization_id)
      .is("signup_source", null);

    const backfilled = results.filter((r: any) => r.status === "backfilled").length;
    const pending = results.filter((r: any) => r.status === "pending_intent").length;
    const skippedCt = results.filter((r: any) => r.status === "skipped").length;

    // Server-side audit ledger — replaces the localStorage attempt key so
    // platform ops can audit who ran backfill, when, and what was inferred.
    await supabase.from("org_setup_backfill_attempts").insert({
      organization_id,
      attempted_by: user.id,
      outcome: backfilled > 0 ? "backfilled" : (skippedCt > 0 ? "skipped" : "noop"),
      backfilled_count: backfilled,
      pending_count: pending,
      skipped_count: skippedCt,
      details: { results },
    });

    return json(
      {
        success: true,
        backfilled,
        pending,
        skipped: skippedCt,
        results,
      },
      200,
      corsHeaders,
    );
  } catch (err: any) {
    console.error("[backfill-org-setup]", err);
    return json(
      { error: (err as Error).message ?? "Backfill failed" },
      500,
      getCorsHeaders(req),
    );
  }
});

function json(payload: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
