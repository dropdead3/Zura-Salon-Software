/**
 * Per-policy Applicability relevance manifest.
 *
 * Source of truth for which `policy_scope_type` lanes are meaningful for a
 * given library policy. The Applicability editor reads this to render only
 * the scopes that matter — surfacing irrelevant scopes is noise (lever and
 * confidence doctrine).
 *
 * Authoring rules:
 *   - Library-authored: platform decides per `library_key`. Operators don't
 *     configure the configurator.
 *   - Per-key overrides win over per-category defaults.
 *   - `audienceLocked: true` hides the Audience scope (and the editor pins
 *     a single locked row matching the library's audience). Used when the
 *     policy's audience is structurally fixed (e.g., HR policies are
 *     internal by definition).
 *   - `primaryScope` is rendered first with a "Primary lever" badge.
 *
 * Doctrine: structure precedes intelligence. A relevant-scope manifest is
 * structure; AI drafting downstream knows which levers are real because
 * the schema declares it.
 */
import type { PolicyScopeType } from '@/hooks/policy/usePolicyApplicability';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';

type Audience = 'internal' | 'external' | 'both';

export interface RelevantScopes {
  /** Scopes to render, in display order. */
  scopes: PolicyScopeType[];
  /** Hide the Audience scope; library audience is the locked answer. */
  audienceLocked?: boolean;
  /** Pin to top with "Primary lever" badge. Must be in `scopes`. */
  primaryScope?: PolicyScopeType;
}

/**
 * Per-key overrides. Anything not listed falls through to the category
 * defaults below. Keep this list short — only override when the category
 * default is wrong for this specific policy.
 */
const PER_KEY_OVERRIDES: Record<string, RelevantScopes> = {
  // ── HR / Team ────────────────────────────────────────────────────────────
  employment_classifications: {
    scopes: ['employment_type', 'location'],
    audienceLocked: true,
    primaryScope: 'employment_type',
  },
  attendance_punctuality: {
    scopes: ['role', 'employment_type', 'location'],
    audienceLocked: true,
  },
  commission_structure: {
    scopes: ['role', 'employment_type', 'location'],
    audienceLocked: true,
    primaryScope: 'employment_type',
  },
  tip_pooling: {
    scopes: ['role', 'employment_type', 'location'],
    audienceLocked: true,
    primaryScope: 'role',
  },
  pto_policy: {
    scopes: ['role', 'employment_type', 'location'],
    audienceLocked: true,
    primaryScope: 'employment_type',
  },
  benefits_eligibility: {
    scopes: ['employment_type', 'location'],
    audienceLocked: true,
    primaryScope: 'employment_type',
  },

  // ── Client-facing / universal ────────────────────────────────────────────
  cancellation_policy: {
    scopes: ['audience', 'service_category', 'location'],
  },
  no_show_policy: {
    scopes: ['audience', 'service_category', 'location'],
  },
  late_arrival_policy: {
    scopes: ['audience', 'service_category', 'location'],
  },
  deposit_policy: {
    scopes: ['audience', 'service_category', 'location'],
    primaryScope: 'service_category',
  },
  refund_policy: {
    scopes: ['audience', 'service_category', 'location'],
  },
  gift_card_policy: {
    scopes: ['audience', 'location'],
  },
  pet_policy: {
    scopes: ['audience', 'location'],
  },
  child_policy: {
    scopes: ['audience', 'location'],
  },
  guest_policy: {
    scopes: ['audience', 'location'],
  },
  photography_policy: {
    scopes: ['audience', 'location'],
  },

  // ── Service-premise (extensions etc.) ────────────────────────────────────
  extension_consultation: {
    scopes: ['service_category', 'role', 'location'],
    primaryScope: 'service_category',
  },
  extension_aftercare: {
    scopes: ['service_category', 'location'],
    primaryScope: 'service_category',
  },
  extension_redo: {
    scopes: ['service_category', 'location'],
    primaryScope: 'service_category',
  },
};

/**
 * Category defaults. Used when no per-key override exists.
 */
function defaultsForCategory(category: string): RelevantScopes {
  switch (category) {
    case 'team':
      return {
        scopes: ['role', 'employment_type', 'location'],
        audienceLocked: true,
      };
    case 'client':
      return {
        scopes: ['audience', 'service_category', 'location'],
      };
    case 'extensions':
      return {
        scopes: ['service_category', 'location'],
        primaryScope: 'service_category',
      };
    case 'financial':
    case 'facility':
      return {
        scopes: ['audience', 'location'],
      };
    case 'management':
      return {
        scopes: ['role', 'location'],
        audienceLocked: true,
      };
    default:
      // Conservative fallback: show everything, lock nothing.
      return {
        scopes: ['audience', 'role', 'employment_type', 'service_category', 'location'],
      };
  }
}

/**
 * Returns which scopes the Applicability editor should render for the given
 * library policy. Falls back to category defaults if no per-key override.
 */
export function getRelevantScopes(
  libraryKey: string,
  category: PolicyLibraryEntry['category'],
  // audience reserved for future "audience-implies-lock" logic; intentionally
  // unused today — locks are explicit per-key/per-category.
  _audience?: Audience,
): RelevantScopes {
  const override = PER_KEY_OVERRIDES[libraryKey];
  if (override) return override;
  return defaultsForCategory(category);
}

/**
 * Filter helper: takes existing applicability rows and a scope manifest, and
 * returns rows split into `relevant` (rendered/editable) and `legacy` (rows
 * for excluded scopes — preserved on read but not editable). Operator data
 * is sacred — we never silently delete legacy rows.
 */
export function partitionRowsByRelevance<T extends { scope_type: PolicyScopeType }>(
  rows: T[],
  manifest: RelevantScopes,
): { relevant: T[]; legacy: T[] } {
  const allowed = new Set<PolicyScopeType>(manifest.scopes);
  // The audience row is always allowed-through — even when audienceLocked
  // hides the chooser, we still write/preserve a single audience row.
  if (manifest.audienceLocked) allowed.add('audience');
  const relevant: T[] = [];
  const legacy: T[] = [];
  for (const row of rows) {
    if (allowed.has(row.scope_type)) relevant.push(row);
    else legacy.push(row);
  }
  return { relevant, legacy };
}
