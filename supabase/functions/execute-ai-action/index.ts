import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, z } from "../_shared/validation.ts";
import {
  getCapabilityHandlers,
  userCanInvoke,
  recordAudit,
  updateAuditStatus,
  hashConfirmationToken,
  constantTimeEquals,
  type CapabilityRow,
} from "../_shared/capability-runtime.ts";
// IMPORTANT: importing this file registers all capability handlers.
import "../_shared/capability-handlers.ts";
import { validateCapability } from "../_shared/capability-invariants.ts";
import { validateCapabilityParams } from "../_shared/capability-zod.ts";
import { enforceRateLimit, isCapabilityKilled } from "../_shared/capability-rate-limit.ts";
import { recordAnomaly, checkRepeatedDenialsBurst } from "../_shared/capability-anomalies.ts";

const ExecuteSchema = z.object({
  capability_id: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  organizationId: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  audit_id: z.string().uuid().optional(),
  confirmation_token: z.string().optional(),
  /** denied means the user clicked Cancel — no execution, just audit */
  denied: z.boolean().optional(),
  /** simulate=true runs validation + handler-free dry run, mutates nothing */
  simulate: z.boolean().optional(),
});

// deno-lint-ignore no-explicit-any
async function getCallerRolesAndPermissions(supabase: any, userId: string) {
  const [{ data: roleRows }, { data: permRows }, { data: prof }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase
      .from('user_roles')
      .select('role, role_permissions:role_permissions!inner(permission_id, permissions:permission_id(name))')
      .eq('user_id', userId),
    supabase.from('employee_profiles').select('is_super_admin').eq('user_id', userId).maybeSingle(),
  ]);
  const roleSet = new Set<string>((roleRows || []).map((r: any) => r.role));
  if (prof?.is_super_admin) roleSet.add('super_admin');
  const permSet = new Set<string>();
  (permRows || []).forEach((row: any) => {
    const rps = row?.role_permissions;
    if (Array.isArray(rps)) {
      rps.forEach((rp: any) => { if (rp?.permissions?.name) permSet.add(rp.permissions.name); });
    } else if (rps?.permissions?.name) {
      permSet.add(rps.permissions.name);
    }
  });
  return { roleSet, permSet };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    let authResult;
    try { authResult = await requireAuth(req); }
    catch (authErr: any) { return authErrorResponse(authErr, getCorsHeaders(req)); }
    const { user, supabaseAdmin } = authResult;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env vars not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as any;

    const body = await validateBody(req, ExecuteSchema, getCorsHeaders(req));
    const { capability_id, params, audit_id, confirmation_token, denied, simulate } = body;
    const orgId = body.organizationId || body.organization_id;
    if (!orgId) {
      return authErrorResponse({ status: 400, message: "organizationId is required" }, getCorsHeaders(req));
    }

    try { await requireOrgMember(supabaseAdmin, user.id, orgId); }
    catch (orgErr: any) { return authErrorResponse(orgErr, getCorsHeaders(req)); }

    // ---------- DENIAL PATH ----------
    if (denied) {
      if (audit_id) await updateAuditStatus(supabase, audit_id, { status: 'denied' });
      // Track denial-burst anomaly (5 denied/failed in 5min triggers alert).
      await checkRepeatedDenialsBurst(supabase, orgId, user.id);
      return new Response(JSON.stringify({ success: true, message: "Action cancelled." }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- LOAD CAPABILITY ----------
    const { data: cap, error: capErr } = await supabase
      .from('ai_capabilities')
      .select('*')
      .eq('id', capability_id)
      .maybeSingle();
    if (capErr || !cap) {
      return new Response(JSON.stringify({ success: false, message: "Unknown capability." }), {
        status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const capability = cap as CapabilityRow;
    if (!capability.enabled) {
      return new Response(JSON.stringify({ success: false, message: "This capability is disabled." }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- RE-CHECK PERMISSION AT CLICK TIME ----------
    const { roleSet, permSet } = await getCallerRolesAndPermissions(supabase, user.id);
    if (!userCanInvoke(capability, roleSet, permSet)) {
      await recordAnomaly(supabase, {
        organizationId: orgId, userId: user.id, type: 'permission_denied_burst',
        capabilityId: capability_id, severity: 'high',
        details: { stage: 'execute', reason: 'userCanInvoke=false' },
      });
      return new Response(JSON.stringify({ success: false, message: "You do not have permission to perform this action." }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- INVARIANTS: refuse to run capabilities with a broken contract ----------
    const violations = validateCapability(capability);
    if (violations.length > 0) {
      console.error('[execute-ai-action] capability violates invariants:', violations);
      return new Response(JSON.stringify({ success: false, message: "This capability is misconfigured and has been blocked. Please contact support." }), {
        status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- KILL SWITCH ----------
    const kill = await isCapabilityKilled(supabase, orgId, capability_id);
    if (kill.killed) {
      await recordAnomaly(supabase, {
        organizationId: orgId, userId: user.id, type: 'kill_switch_attempt',
        capabilityId: capability_id, severity: 'high',
        details: { reason: kill.reason ?? null },
      });
      return new Response(JSON.stringify({ success: false, message: `This action has been disabled for your organization${kill.reason ? `: ${kill.reason}` : '.'}` }), {
        status: 423, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- ZOD PARAM VALIDATION ----------
    let validatedParams: Record<string, unknown>;
    try {
      validatedParams = validateCapabilityParams(capability_id, params || {});
    } catch (e: any) {
      await recordAnomaly(supabase, {
        organizationId: orgId, userId: user.id, type: 'invalid_param_burst',
        capabilityId: capability_id, severity: 'medium',
        details: { stage: 'execute', error: e?.message ?? 'invalid' },
      });
      return new Response(JSON.stringify({ success: false, message: e?.message || 'Invalid parameters.' }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- SIMULATION SHORT-CIRCUIT ----------
    // Returns validated payload + capability metadata without invoking the
    // handler. Mutations are NEVER performed in simulate mode.
    if (simulate) {
      return new Response(JSON.stringify({
        success: true,
        simulated: true,
        message: `Dry run: ${capability.display_name} would be executed with the validated parameters below. No data was changed.`,
        capability: {
          id: capability.id,
          display_name: capability.display_name,
          mutation: capability.mutation,
          risk_level: capability.risk_level,
          ownership_scope: capability.ownership_scope,
        },
        params: validatedParams,
      }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- RATE LIMIT (execute bucket) ----------
    try {
      await enforceRateLimit(supabase, orgId, user.id, 'execute');
    } catch (rl: any) {
      await recordAnomaly(supabase, {
        organizationId: orgId, userId: user.id, type: 'rate_limit_hit',
        capabilityId: capability_id, severity: 'medium',
        details: { bucket: 'execute' },
      });
      return new Response(JSON.stringify({ success: false, message: rl?.message || 'Rate limit exceeded.' }), {
        status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- HIGH-RISK CONFIRMATION TOKEN — verify against stored hash ----------
    if (capability.risk_level === 'high' && capability.confirmation_token_field) {
      if (!confirmation_token || !confirmation_token.trim()) {
        return new Response(JSON.stringify({ success: false, message: "Confirmation required for this high-risk action." }), {
          status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (!audit_id) {
        return new Response(JSON.stringify({ success: false, message: "High-risk actions must come from a proposal." }), {
          status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const { data: auditRow } = await supabase
        .from('ai_action_audit')
        .select('id, status, expected_confirmation_token_hash, organization_id, user_id, capability_id')
        .eq('id', audit_id)
        .maybeSingle();

      if (!auditRow || auditRow.organization_id !== orgId || auditRow.user_id !== user.id || auditRow.capability_id !== capability_id) {
        return new Response(JSON.stringify({ success: false, message: "Proposal could not be verified." }), {
          status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (auditRow.status !== 'proposed') {
        return new Response(JSON.stringify({ success: false, message: "This proposal has already been resolved." }), {
          status: 409, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (!auditRow.expected_confirmation_token_hash) {
        return new Response(JSON.stringify({ success: false, message: "Proposal is missing its confirmation token." }), {
          status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const providedHash = await hashConfirmationToken(confirmation_token);
      if (!constantTimeEquals(providedHash, auditRow.expected_confirmation_token_hash)) {
        return new Response(JSON.stringify({ success: false, message: "Confirmation text did not match. Please re-type it exactly." }), {
          status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }

    // ---------- DISPATCH HANDLER ----------
    const handlers = getCapabilityHandlers(capability_id);
    const exec = handlers?.execute || (capability.mutation ? undefined : handlers?.read);
    if (!exec) {
      return new Response(JSON.stringify({ success: false, message: "No handler registered for this capability." }), {
        status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    let result: { success: boolean; message: string; data?: unknown };
    try {
      if (handlers?.execute) {
        result = await handlers.execute({
          supabase, organizationId: orgId, userId: user.id, capability, params: validatedParams, roleSet,
        });
      } else if (handlers?.read) {
        const r = await handlers.read({
          supabase, organizationId: orgId, userId: user.id, capability, params: validatedParams, roleSet,
        });
        result = { success: true, message: r.message || "Done.", data: r.data };
      } else {
        result = { success: false, message: "No handler." };
      }
    } catch (e: any) {
      console.error(`[execute-ai-action] handler ${capability_id} threw:`, e);
      result = { success: false, message: e instanceof Error ? e.message : "Execution failed." };
    }

    // ---------- AUDIT ----------
    if (audit_id) {
      await updateAuditStatus(supabase, audit_id, {
        status: result.success ? 'executed' : 'failed',
        result: result.data ?? result.message,
        error: result.success ? null : result.message,
        executed_at: result.success ? new Date().toISOString() : null,
      });
    } else {
      await recordAudit(supabase, {
        organization_id: orgId,
        user_id: user.id,
        capability_id,
        params: validatedParams,
        status: result.success ? 'executed' : 'failed',
        result: result.data ?? result.message,
        error: result.success ? null : result.message,
        executed_at: result.success ? new Date().toISOString() : null,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("execute-ai-action error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
