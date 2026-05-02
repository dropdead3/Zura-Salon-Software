/**
 * Promo Experiment Resolver — pure A/B selection layer.
 *
 * Composition order at render time:
 *   1. **Schedule rotation** wins when an entry covers `now`. Operators have
 *      explicitly told us which creative to show, so experiments must defer
 *      to that intent.
 *   2. Otherwise an enabled **experiment** picks one variant per visitor.
 *      Bucketing is deterministic on `(sessionId, offerCode, version)` so a
 *      returning visitor stays in the same arm — flipping arms mid-session
 *      would corrupt the funnel and confuse the visitor.
 *   3. Falls back to the base wrapper config.
 *
 * Variant selection is weighted: each variant carries an integer `weight`
 * (defaults treated as 1). A 32-bit hash of the bucketing key is mapped onto
 * the cumulative weight band, so doubling a variant's weight doubles its
 * traffic share without coordination across visitors.
 *
 * The `version` integer is bumped by the editor whenever the variant set
 * changes (add / remove / weight edit). That re-shuffles every visitor into
 * potentially-new arms — the alternative (sticky bucketing across config
 * changes) would let a visitor see arm A's offer pre-edit and arm B's
 * tracking after, which corrupts attribution worse than re-bucketing does.
 *
 * The active variant key is stamped onto every impression / response (see
 * the `variant_key` column on `promo_offer_impressions` /
 * `promo_offer_responses`) so the editor can break the funnel down per arm.
 */
import type {
  PromotionalPopupSettings,
  SavedPromoScheduleEntry,
} from '@/hooks/usePromotionalPopup';
import type { SavedPromo, SavedPromoConfig } from '@/hooks/usePromoLibrary';
import {
  pickActiveEntry,
  applyScheduledSnapshot,
} from '@/lib/promo-schedule';

/** One arm in the experiment. References a `SavedPromo.id` so editing the
 *  underlying snapshot updates the live arm without an experiment rev. */
export interface PromoExperimentVariant {
  /** Stable id (uuid) — used for React keys and the funnel filter pill. */
  id: string;
  /** Short operator label, e.g. "Headline A" / "Free haircut framing". */
  label: string;
  /** `SavedPromo.id` from the library. Resolver looks this up at render time. */
  savedPromoId: string;
  /** Integer traffic weight. Treated as 1 when missing or non-positive. */
  weight: number;
}

export interface PromoExperimentConfig {
  /** Master switch — disabled = base wrapper renders. */
  enabled: boolean;
  /** Operator label for the test. Surfaced in the editor + analytics breakdown. */
  name?: string;
  /** Bucketing version. Bumped on every variant-set edit so visitor
   *  assignment re-shuffles when the test composition changes. */
  version: number;
  variants: PromoExperimentVariant[];
}

/** FNV-1a 32-bit hash. Plenty of entropy for traffic splitting; deterministic
 *  across browsers (no built-in stable string-hash). */
export function hashBucket(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Coerce to unsigned 32-bit.
  return h >>> 0;
}

/** Picks one variant by weighted bucket. `null` = no eligible variants. Pure. */
export function pickVariant(
  experiment: PromoExperimentConfig | undefined | null,
  bucketingKey: string,
): PromoExperimentVariant | null {
  if (!experiment?.enabled) return null;
  const eligible = experiment.variants.filter(
    (v) => v.savedPromoId && (v.weight ?? 1) > 0,
  );
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];

  const total = eligible.reduce((s, v) => s + Math.max(1, v.weight ?? 1), 0);
  // Hash includes the version so an edit re-shuffles assignment.
  const hash = hashBucket(`${bucketingKey}:v${experiment.version}`);
  const target = hash % total;
  let acc = 0;
  for (const v of eligible) {
    acc += Math.max(1, v.weight ?? 1);
    if (target < acc) return v;
  }
  // Defensive — should be unreachable given the modulo.
  return eligible[eligible.length - 1];
}

/** Resolves the popup config for one visitor at one moment, applying schedule
 *  rotation (priority) → experiment variant → base wrapper. Pure. */
export function resolvePromotionalPopupForVisitor(args: {
  cfg: PromotionalPopupSettings | null | undefined;
  library: SavedPromo[];
  experiment?: PromoExperimentConfig | null;
  schedule?: SavedPromoScheduleEntry[];
  bucketingKey: string;
  now?: Date;
}): {
  resolved: PromotionalPopupSettings | null;
  variantKey: string | null;
  variantLabel: string | null;
  scheduleEntryId: string | null;
} {
  const { cfg, library, experiment, schedule, bucketingKey } = args;
  const now = args.now ?? new Date();
  if (!cfg) {
    return { resolved: null, variantKey: null, variantLabel: null, scheduleEntryId: null };
  }

  // 1. Schedule rotation wins — explicit operator intent for this window.
  const activeEntry = pickActiveEntry(schedule ?? cfg.schedule, now);
  if (activeEntry) {
    const snap = library.find((s) => s.id === activeEntry.savedPromoId)?.config ?? null;
    if (!snap) {
      // Referenced saved-promo was deleted. Fall through to base creative
      // WITHOUT attributing impressions to the orphaned schedule entry —
      // doing so would surface phantom rotation analytics for a creative
      // the visitor never actually saw.
    } else {
      return {
        resolved: applyScheduledSnapshot(cfg, snap),
        // Experiments don't run during a scheduled rotation — attribution would
        // braid two operator intents into one funnel and become unreadable.
        variantKey: null,
        variantLabel: null,
        scheduleEntryId: activeEntry.id,
      };
    }
  }

  // 2. Experiment variant.
  const variant = pickVariant(experiment, bucketingKey);
  if (variant) {
    const snap = library.find((s) => s.id === variant.savedPromoId)?.config ?? null;
    if (snap) {
      return {
        resolved: applySnapshotCreative(cfg, snap),
        variantKey: variant.id,
        variantLabel: variant.label,
        scheduleEntryId: null,
      };
    }
    // Orphaned variant arm — fall through to base, drop attribution.
  }

  // 3. Base wrapper.
  return { resolved: cfg, variantKey: null, variantLabel: null, scheduleEntryId: null };
}

/** Identical override semantics to `applyScheduledSnapshot` — kept as a thin
 *  alias so the experiment path's intent is named explicitly at the call
 *  site. (Both are creative-only swaps; lifecycle / targeting / offerCode
 *  stay on the wrapper so funnel attribution is stable across arms.) */
function applySnapshotCreative(
  base: PromotionalPopupSettings,
  snapshot: SavedPromoConfig | null,
): PromotionalPopupSettings {
  return applyScheduledSnapshot(base, snapshot);
}
