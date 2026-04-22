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

/**
 * Truthiness for section tags. Mirrors mustache semantics, with a salon-aware
 * twist: empty arrays and the strings 'no'/'false' are treated as falsy so
 * configured "off" values don't accidentally render the truthy block.
 */
function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === '' || v === 'false' || v === 'no' || v === '0') return false;
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Process mustache-style section tags before token substitution:
 *   {{?key}}…{{/key}}  — render block when value is truthy
 *   {{^key}}…{{/key}}  — render block when value is falsy
 *
 * Exported so other surfaces (e.g. `InlineRuleEditor`) can apply the
 * conditional-block pass independently of the brand and rule-value passes —
 * specifically when they need to keep `{{key}}` tokens intact for chip
 * mounting downstream. This is the second of the three render passes
 * (brand → sections → rule values) and is safe to call on its own.
 *
 * Adjacent whitespace is collapsed so the surrounding sentence stays clean
 * regardless of whether the block renders.
 */
export function processConditionalSections(
  template: string,
  ruleValues: Record<string, unknown>,
): string {
  const sectionRe = /\{\{\s*([?^])\s*([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/\s*\2\s*\}\}/g;
  let out = template;
  let prev: string;
  do {
    prev = out;
    out = out.replace(sectionRe, (_m, sigil: string, key: string, body: string) => {
      const truthy = isTruthy(ruleValues[key]);
      const keep = sigil === '?' ? truthy : !truthy;
      return keep ? body : '';
    });
  } while (out !== prev);
  // Collapse whitespace artifacts left behind by removed blocks.
  return out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderStarterDraft(template: string, ctx: RenderContext): string {
  if (!template) return '';
  // First pass: brand tokens via shared helper.
  const branded = interpolateBrandTokens(template, {
    orgName: ctx.orgName,
    platformName: ctx.platformName,
  });
  // Second pass: conditional section tags ({{?key}}…{{/key}}, {{^key}}…{{/key}}).
  const sectioned = processSections(branded, ctx.ruleValues);
  // Third pass: rule-value tokens (schema-field keys).
  return sectioned.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (key === 'ORG_NAME' || key === 'PLATFORM_NAME') return _match; // already handled
    if (key in ctx.ruleValues) return humanize(ctx.ruleValues[key]);
    return _match; // unresolved token — leave as-is so authors notice
  });
}
