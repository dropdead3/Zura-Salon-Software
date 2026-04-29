// ============================================================
// AI Capability Runtime
// ----------------------------------------------------------------
// Shared between `ai-agent-chat` (proposes actions) and
// `execute-ai-action` (executes them after human approval).
//
// A capability = one row in `ai_capabilities` (the contract) +
// one TS handler registered here (the implementation).
//
// To add a new action: insert a row + register a handler. No
// new tools to teach the LLM. No new switch arms in chat.
// ============================================================

// deno-lint-ignore-file no-explicit-any

export type CapabilityId = string;

export interface CapabilityRow {
  id: CapabilityId;
  category: string;
  display_name: string;
  description: string;
  mutation: boolean;
  required_permission: string | null;
  required_role: string[] | null;
  param_schema: Record<string, unknown>;
  preview_template: string | null;
  risk_level: 'low' | 'med' | 'high';
  confirmation_token_field: string | null;
  enabled: boolean;
}

export interface ProposeContext {
  supabase: any;            // service-role client
  organizationId: string;   // verified from session
  userId: string;           // verified from JWT
  capability: CapabilityRow;
  params: Record<string, unknown>;
}

export interface ExecuteContext extends ProposeContext {}

export interface ProposeResult {
  /** Free-text the model can show as the chat reply. */
  message: string;
  /**
   * Structured preview the user sees on the approval card.
   * `params` are what gets sent back to execute-ai-action verbatim.
   * `confirmation_token` (optional) is the value the user must type
   * to enable Approve on high-risk actions.
   */
  preview: Record<string, unknown>;
  params: Record<string, unknown>;
  confirmation_token?: string;
}

export interface ExecuteResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ReadResult {
  /** Returned to the LLM as the tool result. */
  data: unknown;
  /** Optional human-friendly message. */
  message?: string;
}

export type ProposeHandler = (ctx: ProposeContext) => Promise<ProposeResult>;
export type ExecuteHandler = (ctx: ExecuteContext) => Promise<ExecuteResult>;
export type ReadHandler = (ctx: ProposeContext) => Promise<ReadResult>;

interface Registration {
  read?: ReadHandler;
  propose?: ProposeHandler;
  execute?: ExecuteHandler;
}

const REGISTRY = new Map<CapabilityId, Registration>();

export function registerCapability(id: CapabilityId, reg: Registration) {
  REGISTRY.set(id, reg);
}

export function getCapabilityHandlers(id: CapabilityId): Registration | undefined {
  return REGISTRY.get(id);
}

// ============================================================
// Loading + permission filtering
// ============================================================

/**
 * Loads enabled capabilities and filters them to only those the
 * given user actually has permission to invoke. Used by ai-agent-chat
 * so the LLM never sees tools it cannot use.
 */
export async function loadCapabilitiesForUser(
  supabase: any,
  userId: string,
): Promise<CapabilityRow[]> {
  const { data: caps, error } = await supabase
    .from('ai_capabilities')
    .select('*')
    .eq('enabled', true);

  if (error || !caps) return [];

  // Fetch caller roles + permissions once.
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
      rps.forEach((rp: any) => {
        const name = rp?.permissions?.name;
        if (name) permSet.add(name);
      });
    } else if (rps?.permissions?.name) {
      permSet.add(rps.permissions.name);
    }
  });

  return (caps as CapabilityRow[]).filter((c) => userCanInvoke(c, roleSet, permSet));
}

export function userCanInvoke(
  cap: CapabilityRow,
  roleSet: Set<string>,
  permSet: Set<string>,
): boolean {
  // Read-only with no gating: always allowed.
  if (!cap.required_permission && (!cap.required_role || cap.required_role.length === 0)) {
    return true;
  }
  if (cap.required_role && cap.required_role.length > 0) {
    if (!cap.required_role.some((r) => roleSet.has(r))) return false;
  }
  if (cap.required_permission) {
    if (!permSet.has(cap.required_permission)) return false;
  }
  return true;
}

// ============================================================
// Audit
// ============================================================

export async function recordAudit(
  supabase: any,
  row: {
    organization_id: string;
    user_id: string;
    capability_id: string;
    params: Record<string, unknown>;
    status: 'proposed' | 'approved' | 'denied' | 'executed' | 'failed';
    reasoning?: string | null;
    result?: unknown;
    error?: string | null;
    executed_at?: string | null;
  },
): Promise<{ id?: string }> {
  const { data, error } = await supabase
    .from('ai_action_audit')
    .insert({
      organization_id: row.organization_id,
      user_id: row.user_id,
      capability_id: row.capability_id,
      params: row.params,
      status: row.status,
      reasoning: row.reasoning ?? null,
      result: row.result ?? null,
      error: row.error ?? null,
      executed_at: row.executed_at ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[capability-runtime] audit insert failed:', error);
    return {};
  }
  return { id: data?.id };
}

export async function updateAuditStatus(
  supabase: any,
  auditId: string,
  patch: {
    status: 'approved' | 'denied' | 'executed' | 'failed';
    result?: unknown;
    error?: string | null;
    executed_at?: string | null;
  },
) {
  const { error } = await supabase
    .from('ai_action_audit')
    .update(patch)
    .eq('id', auditId);
  if (error) console.error('[capability-runtime] audit update failed:', error);
}

// ============================================================
// Tiny preview-template renderer
// Supports {{var}} and {{#var}}…{{/var}} (truthy block).
// ============================================================
export function renderPreview(template: string | null, vars: Record<string, unknown>): string {
  if (!template) return '';
  // Block sections first.
  let out = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key, body) => {
    const v = vars[key];
    return v !== undefined && v !== null && v !== '' ? body : '';
  });
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
  return out.trim();
}
