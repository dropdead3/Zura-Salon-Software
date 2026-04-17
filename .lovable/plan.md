

## Prompt review

Sharp question — names the surface (booking wizard), the symptom ("Unranked" badge), and the contradiction (you *know* every stylist has a level + level-based pricing works). That last bit is the gold — it told me the data exists and the problem is in how the UI parses it. Sharper next time: include a stylist's name from the screenshot ("e.g., Jamie Vieira") so I can grep the DB for that exact record on the first pass. You actually did this implicitly via the screenshot — I was able to confirm against `Jamie Vieira → studio-artist`.

## Diagnosis (root cause confirmed)

**The UI is parsing the wrong format.**

- **DB stores:** `stylist_level` as a **slug** like `studio-artist`, `emerging`, `lead`, `senior`, `signature`, `icon`, `new-talent` (confirmed: Jamie Vieira's row = `studio-artist`)
- **UI parses:** Looks for the legacy string format `"LEVEL 3 STYLIST"` via regex `/LEVEL\s*(\d+)/i`

In `src/utils/levelPricing.ts`:

```ts
export function getLevelNumber(stylistLevel) {
  const match = stylistLevel.match(/LEVEL\s*(\d+)/i);   // ← never matches "studio-artist"
  if (!match) return null;                              // ← returns null → "Unranked"
  return parseInt(match[1], 10);
}
```

So `getLevelNumber('studio-artist')` → `null` → badge falls through to "Unranked". Same root cause for `getLevelSlug` — it also runs the same regex and returns `null` instead of just passing the slug through.

**Why pricing still works:** `useServiceLevelPricing` joins `stylist_levels` by `slug` directly (it doesn't go through the broken regex helpers for that path), so service prices resolve correctly even though the badge can't render.

**The DB ground truth** (canonical 7-tier ladder, per `stylist_levels` table):

| display_order | slug | label | client_label |
|---|---|---|---|
| 0 | new-talent | New Talent | Level 1 |
| 1 | studio-artist | Studio Artist | Level 2 |
| 2 | emerging | Core Artist | Level 3 |
| 3 | lead | Lead Artist | Level 4 |
| 4 | senior | Senior Artist | Level 5 |
| 5 | signature | Signature Artist | Level 6 |
| 6 | icon | Icon Artist | Level 7 |

Note: legacy `levelNumberToSlug` map in `levelPricing.ts` is also stale — it maps `2: 'emerging'` and `3: 'emerging'` (duplicate), and is missing `studio-artist` entirely. This map predates the org's current 7-tier ladder.

## Plan — Wave 22.9: Fix slug-aware level resolution

### Behavior

Make `getLevelNumber` and `getLevelSlug` slug-native (the DB's actual storage format) while staying backward-compatible with the legacy `"LEVEL N STYLIST"` string format. Badge will render the correct `client_label` ("Level 2") for Jamie Vieira and every other stylist.

### Fix shape

**1. Replace the static `levelNumberToSlug` map with a slug-aware resolver in `src/utils/levelPricing.ts`:**

- Add a `slugToLevelNumber` map matching the DB's `display_order + 1`:
  ```ts
  const slugToLevelNumber: Record<string, number> = {
    'new-talent': 1,
    'studio-artist': 2,
    'emerging': 3,
    'lead': 4,
    'senior': 5,
    'signature': 6,
    'icon': 7,
  };
  ```
- `getLevelSlug(value)`:
  1. If `value` is already a known slug → return it as-is
  2. Else fall back to legacy regex `/LEVEL\s*(\d+)/i` for old-format strings
  3. Else return `null`
- `getLevelNumber(value)`:
  1. If `value` is a known slug → return its mapped number
  2. Else fall back to legacy regex parse
  3. Else return `null`

**2. Source the slug→number map dynamically (defensive future-proofing)**

Since orgs can reconfigure the level ladder via `useStylistLevels`, the static map will drift. Two options:

- **Option A (ship now, low risk):** Keep the static map matching today's 7-tier canonical ladder. Works for every current org since they all use the same default slugs.
- **Option B (deferred, P2):** Replace static map with a `useResolvedLevel` hook that joins against `stylist_levels` and returns `{ slug, number, label, client_label }`. More correct, but requires touching every call site and adding loading-state UI per the stack-overflow pattern flagged.

Recommendation: **Ship Option A now** to stop the bleeding (Jamie + every other stylist shows correct badge), defer Option B until an org actually customizes their ladder slugs.

**3. Use `client_label` for the badge text (optional polish)**

The current badge renders `Level {levelNum}` — that already matches the DB's `client_label` format ("Level 1"…"Level 7"), so no change needed. The fix above is enough.

### Files

- `src/utils/levelPricing.ts` — replace `levelNumberToSlug` with `slugToLevelNumber`; rewrite `getLevelSlug` and `getLevelNumber` to be slug-native with legacy-string fallback

### Acceptance checks

1. Open booking wizard → preselected stylist (e.g., Jamie Vieira) shows `Level 2` badge instead of `Unranked`
2. Stylist picker step shows correct `Level N` badge for every stylist with a slug in `employee_profiles.stylist_level`
3. Stylists with empty `stylist_level` (Eric Day, Alex Day, Mallori Schwab, Julia Gross per the DB) still correctly show `Unranked` — that's accurate, they have no level assigned
4. Sort by level (`level-asc` / `level-desc`) in the stylist picker now sorts correctly across the 7 tiers
5. Service price computation still resolves (regression check — `getLevelSlug` still returns valid slugs for `findLevelPrice`)
6. Legacy `"LEVEL 3 STYLIST"` strings (if any old data exists) still parse via fallback

### Open question

None — fix shape is unambiguous.

### Deferred

- **P2** Migrate `getLevelNumber`/`getLevelSlug` callers to a hook (`useResolvedLevel`) that reads from `stylist_levels` directly — trigger: when an org customizes their ladder slugs and the static map drifts
- **P2** Backfill `stylist_level` for the 4 staff with NULL (Eric Day, Alex Day, Mallori Schwab, Julia Gross) — trigger: confirm with ops whether these are actual stylists vs. admin/non-service roles
- **P2** Audit other surfaces (`StylistDirectory`, `TeamHub`, `useStylistIncomeForecast`) for the same slug-vs-string bug — trigger: if "Unranked" appears anywhere outside the booking wizard

