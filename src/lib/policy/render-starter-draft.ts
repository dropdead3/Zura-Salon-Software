/**
 * renderStarterDraft — substitutes {{token}} placeholders in starter draft
 * markdown with the operator's configured rule values (or schema defaults).
 *
 * Doctrine: the starter draft is a deterministic rendering of structured
 * inputs. AI cannot invent rules; the platform-authored prose cannot either.
 * Both layers render the same configured truth.
 */

export interface RenderContext {
  /** Configured rule values keyed by block_key (rule field key). */
  ruleValues: Record<string, unknown>;
  /** Brand/org tokens. */
  orgName?: string;
  platformName?: string;
}

const HUMAN_LABELS: Record<string, (v: unknown) => string> = {
  // Role values
  owner: () => 'the Owner',
  manager: () => 'a Manager',
  lead_stylist: () => 'a Lead Stylist',
  front_desk_lead: () => 'the Front Desk Lead',
  any_admin: () => 'any Admin',
};

export function humanize(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value
      .map((v) => (typeof v === 'string' ? v.replace(/_/g, ' ') : String(v)))
      .join(', ');
  }
  if (typeof value === 'string') {
    if (HUMAN_LABELS[value]) return HUMAN_LABELS[value](value);
    return value;
  }
  return String(value);
}

/**
 * Shared brand-token interpolation. The single source of truth for which
 * brand tokens exist ({{ORG_NAME}}, {{PLATFORM_NAME}}) and how they resolve.
 *
 * Used by:
 *  - renderStarterDraft (prose templates in the Drafts tab)
 *  - PolicyConfiguratorPanel hydration (structured-field defaults in Rules)
 *
 * Unresolved tokens are returned as-is so authors notice missing wiring.
 */
export interface BrandTokenContext {
  orgName?: string;
  platformName?: string;
}

export function interpolateBrandTokens(
  text: string,
  ctx: BrandTokenContext = {},
): string {
  if (!text) return text;
  const orgName = ctx.orgName?.trim() || 'our salon';
  const platformName = ctx.platformName?.trim() || 'Zura';
  return text.replace(/\{\{\s*(ORG_NAME|PLATFORM_NAME)\s*\}\}/g, (_m, key: string) => {
    if (key === 'ORG_NAME') return orgName;
    if (key === 'PLATFORM_NAME') return platformName;
    return _m;
  });
}

export function renderStarterDraft(template: string, ctx: RenderContext): string {
  if (!template) return '';
  // First pass: brand tokens via shared helper.
  const branded = interpolateBrandTokens(template, {
    orgName: ctx.orgName,
    platformName: ctx.platformName,
  });
  // Second pass: rule-value tokens (schema-field keys).
  return branded.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (key === 'ORG_NAME' || key === 'PLATFORM_NAME') return _match; // already handled
    if (key in ctx.ruleValues) return humanize(ctx.ruleValues[key]);
    return _match; // unresolved token — leave as-is so authors notice
  });
}
