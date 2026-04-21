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

function humanize(value: unknown): string {
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

export function renderStarterDraft(template: string, ctx: RenderContext): string {
  if (!template) return '';
  const orgName = ctx.orgName?.trim() || 'our salon';
  const platformName = ctx.platformName?.trim() || 'Zura';

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (key === 'ORG_NAME') return orgName;
    if (key === 'PLATFORM_NAME') return platformName;
    if (key in ctx.ruleValues) return humanize(ctx.ruleValues[key]);
    return _match; // unresolved token — leave as-is so authors notice
  });
}
