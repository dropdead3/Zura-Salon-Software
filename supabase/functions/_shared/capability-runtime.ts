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
  /** 'self' = caller may only act on rows they own; 'org' = any row in their org; 'any' = unscoped (avoid). */
  ownership_scope: 'self' | 'org' | 'any';
}

// ============================================================
// Manager-role taxonomy. Anyone NOT holding one of these is
// treated as a stylist for ownership-scope enforcement.
// ============================================================
export const MANAGER_ROLES = new Set<string>([
  'admin',
  'super_admin',
  'manager',
  'owner',
]);

export function isManagerRole(roleSet: Set<string>): boolean {
  for (const r of roleSet) if (MANAGER_ROLES.has(r)) return true;
  return false;
}

// ============================================================
// Confirmation-token hashing (server-verifiable).
// ============================================================
export async function hashConfirmationToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time string compare to avoid timing leaks. */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface ProposeContext {
  supabase: any;            // service-role client
  organizationId: string;   // verified from session
  userId: string;           // verified from JWT
  capability: CapabilityRow;
  params: Record<string, unknown>;
  /** Caller's roles. Handlers use this to enforce ownership_scope = 'self' for non-managers. */
  roleSet?: Set<string>;
}

export interface ExecuteContext extends ProposeContext {}

/**
 * Generic ownership predicate. Handlers MUST call this before mutating any row
 * that has a `staff_user_id` / `assigned_to` style column.
 *
 * - capability.ownership_scope === 'self' → caller must own the row.
 * - capability.ownership_scope === 'org'  → caller must hold a manager role,
 *   OR be the row owner.
 * - capability.ownership_scope === 'any'  → no ownership check (logged).
 */
export function assertOwnership(
  capability: CapabilityRow,
  callerUserId: string,
  rowOwnerUserId: string | null | undefined,
  roleSet: Set<string> | undefined,
): void {
  if (capability.ownership_scope === 'any') return;
  const isManager = isManagerRole(roleSet || new Set());
  if (capability.ownership_scope === 'self') {
    if (rowOwnerUserId && rowOwnerUserId === callerUserId) return;
    throw new Error('You can only act on your own records.');
  }
  // 'org': managers OK; otherwise must be self-owned.
  if (isManager) return;
  if (rowOwnerUserId && rowOwnerUserId === callerUserId) return;
  throw new Error('Only a manager can perform this on another team member.');
}

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

  // Fetch caller roles + permissions + Account Owner flag once.
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
    expected_confirmation_token_hash?: string | null;
    conversation_id?: string | null;
    message_id?: string | null;
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
      expected_confirmation_token_hash: row.expected_confirmation_token_hash ?? null,
      conversation_id: row.conversation_id ?? null,
      message_id: row.message_id ?? null,
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
