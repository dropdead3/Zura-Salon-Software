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
  type CapabilityRow,
} from "../_shared/capability-runtime.ts";
// IMPORTANT: importing this file registers all capability handlers.
import "../_shared/capability-handlers.ts";

const ExecuteSchema = z.object({
  capability_id: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  organizationId: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  audit_id: z.string().uuid().optional(),
  confirmation_token: z.string().optional(),
  /** denied means the user clicked Cancel — no execution, just audit */
  denied: z.boolean().optional(),
});

// deno-lint-ignore no-explicit-any
async function getCallerRolesAndPermissions(supabase: any, userId: string) {
  const [{ data: roleRows }, { data: permRows }] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase
      .from('user_roles')
      .select('role, role_permissions:role_permissions!inner(permission_id, permissions:permission_id(name))')
      .eq('user_id', userId),
  ]);
  const roleSet = new Set<string>((roleRows || []).map((r: any) => r.role));
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
    const { capability_id, params, audit_id, confirmation_token, denied } = body;
    const orgId = body.organizationId || body.organization_id;
    if (!orgId) {
      return authErrorResponse({ status: 400, message: "organizationId is required" }, getCorsHeaders(req));
    }

    try { await requireOrgMember(supabaseAdmin, user.id, orgId); }
    catch (orgErr: any) { return authErrorResponse(orgErr, getCorsHeaders(req)); }

    // ---------- DENIAL PATH ----------
    if (denied) {
      if (audit_id) await updateAuditStatus(supabase, audit_id, { status: 'denied' });
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
      return new Response(JSON.stringify({ success: false, message: "You do not have permission to perform this action." }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ---------- HIGH-RISK CONFIRMATION TOKEN ----------
    if (capability.risk_level === 'high' && capability.confirmation_token_field) {
      // The expected token was returned at proposal time; the client must echo it.
      if (!confirmation_token || !confirmation_token.trim()) {
        return new Response(JSON.stringify({ success: false, message: "Confirmation required for this high-risk action." }), {
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
      // For execute handlers we use the typed signature. For read-only direct
      // execution we adapt the ReadResult shape to ExecuteResult.
      if (handlers?.execute) {
        result = await handlers.execute({
          supabase, organizationId: orgId, userId: user.id, capability, params: params || {},
        });
      } else if (handlers?.read) {
        const r = await handlers.read({
          supabase, organizationId: orgId, userId: user.id, capability, params: params || {},
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
      // No audit row from proposal (read-only execute_capability) — still log it.
      await recordAudit(supabase, {
        organization_id: orgId,
        user_id: user.id,
        capability_id,
        params: params || {},
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
