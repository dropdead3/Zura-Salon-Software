/**
 * Promo Schedule Resolver — pure functions for the scheduled-rotation queue.
 *
 * Doctrine:
 *   - Pure: no React, no DB calls. Public component & editor preview both
 *     consume the same resolver so live and preview behave identically
 *     (Preview-Live Parity Pattern).
 *   - Schedule entries reference `SavedPromo.id` from the library — the
 *     snapshot is looked up at resolve time so renaming/editing a saved
 *     promo updates every queued rotation it powers.
 *   - When two entries overlap, the one with the *later* `startsAt` wins
 *     (operator intent: "the new offer starts now"). Documented in
 *     `pickActiveEntry`. Logged in dev under
 *     `promo-schedule:overlap-resolved`.
 *   - The active snapshot overrides content/style fields only. `enabled`,
 *     `schedule`, `offerCode`, and targeting fields stay on the wrapper —
 *     the schedule is a *creative* rotation layer, not a targeting/lifecycle
 *     swap. Funnel attribution stays bound to the wrapper's `offerCode`
 *     unless the snapshot itself carries one.
 */
import type {
  PromotionalPopupSettings,
  SavedPromoScheduleEntry,
} from '@/hooks/usePromotionalPopup';
import type { SavedPromo, SavedPromoConfig } from '@/hooks/usePromoLibrary';

/** Returns the entry whose window covers `now`, with later `startsAt` winning
 *  on overlap. `null` when none match. Pure. */
export function pickActiveEntry(
  schedule: SavedPromoScheduleEntry[] | undefined,
  now: Date,
): SavedPromoScheduleEntry | null {
  if (!schedule || schedule.length === 0) return null;
  const ts = now.getTime();
  const active = schedule.filter((e) => {
    const s = Date.parse(e.startsAt);
    const en = Date.parse(e.endsAt);
    return Number.isFinite(s) && Number.isFinite(en) && s <= ts && en >= ts;
  });
  if (active.length === 0) return null;
  if (active.length > 1 && typeof window !== 'undefined' && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug(
      'promo-schedule:overlap-resolved',
      active.map((e) => ({ id: e.id, label: e.label, startsAt: e.startsAt })),
    );
  }
  return active.reduce((latest, cur) =>
    Date.parse(cur.startsAt) > Date.parse(latest.startsAt) ? cur : latest,
  );
}

/** Fields we override from the snapshot. Targeting + lifecycle stay on the
 *  wrapper so the schedule rotates *creative*, not *who/when/where*. */
const SCHEDULED_OVERRIDE_KEYS = [
  'eyebrow',
  'eyebrowIcon',
  'headline',
  'body',
  'ctaAcceptLabel',
  'ctaDeclineLabel',
  'disclaimer',
  'imageUrl',
  'imageAlt',
  'imageTreatment',
  'modalImageLayout',
  'cornerCardImage',
  'imageFocalX',
  'imageFocalY',
  'appearance',
  'accentColor',
  'accentPresetKey',
  'valueAnchor',
] as const satisfies ReadonlyArray<keyof SavedPromoConfig>;

/**
 * Merges the active-snapshot's creative fields onto the wrapper. Returns the
 * wrapper unchanged when nothing's active.
 */
export function applyScheduledSnapshot(
  base: PromotionalPopupSettings,
  snapshot: SavedPromoConfig | null,
): PromotionalPopupSettings {
  if (!snapshot) return base;
  const merged: PromotionalPopupSettings = { ...base };
  for (const key of SCHEDULED_OVERRIDE_KEYS) {
    const v = snapshot[key];
    if (v !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[key] = v;
    }
  }
  return merged;
}

/**
 * Detects overlapping schedule entries. Two entries overlap when their
 * [startsAt, endsAt] windows intersect by any non-zero amount. The resolver
 * silently picks the entry with the later `startsAt` on overlap (operator
 * intent: "the new offer starts now"), which means the *other* entry will
 * appear "missing" to the operator unless we surface it pre-publish.
 *
 * Returns a Set of entry ids that participate in at least one overlap.
 * Pure; safe to call on every render.
 */
export function detectScheduleConflicts(
  schedule: SavedPromoScheduleEntry[] | undefined,
): Set<string> {
  const conflicts = new Set<string>();
  if (!schedule || schedule.length < 2) return conflicts;
  const parsed = schedule
    .map((e) => ({ e, s: Date.parse(e.startsAt), en: Date.parse(e.endsAt) }))
    .filter((x) => Number.isFinite(x.s) && Number.isFinite(x.en) && x.en > x.s);
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];
      if (a.s < b.en && b.s < a.en) {
        conflicts.add(a.e.id);
        conflicts.add(b.e.id);
      }
    }
  }
  return conflicts;
}

/** End-to-end: resolve `cfg` against the library at the given moment. */
export function resolvePromotionalPopupForNow(
  cfg: PromotionalPopupSettings | null | undefined,
  library: SavedPromo[],
  now: Date = new Date(),
): PromotionalPopupSettings | null {
  if (!cfg) return null;
  const active = pickActiveEntry(cfg.schedule, now);
  if (!active) return cfg;
  const snapshot =
    library.find((s) => s.id === active.savedPromoId)?.config ?? null;
  return applyScheduledSnapshot(cfg, snapshot);
}
