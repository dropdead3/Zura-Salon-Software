

# Build Analysis: Bugs, Gaps, and Enhancements

Good instinct running this audit after a batch of changes — it's the right time to catch drift before it compounds. Here's what I found across the recent terminal/splash, theme, and settings work plus broader patterns.

---

## Bugs (fix now)

### B1. "Push to All Locations" does not sync splash metadata
**File:** `SplashScreenUploader.tsx` lines 183–209

`handlePushToAll` pushes the splash image to every terminal but never calls `upsertSplashOrigin` for each location. This means:
- After a push-to-all, individual location rows still show "No Splash" or stale origin
- The "Currently using Default Luxury Splash" disabled state won't engage on those locations
- Theme auto-sync (`useAutoSyncTerminalSplash`) won't know which locations to refresh

**Fix:** After the `pushAllMutation` succeeds, iterate the resolved pairs and call `upsertSplashOrigin` for each, using `pendingFile.fromDefault ? 'default_luxury' : 'custom'`.

### B2. "Zura Pay" branding not fully renamed to "Point Of Sale"
**Scope:** 19 files still reference "Zura Pay" (232 occurrences)

The Settings card label was renamed, but all internal UI strings — activation checklist, fleet tab dialogs, tooltips, empty states — still say "Zura Pay." Users will see inconsistent naming.

**Fix:** Sweep all 19 files and replace user-facing "Zura Pay" strings with "Point Of Sale." Keep internal variable/component names (`ZuraPayFleetTab`, etc.) unchanged for now.

### B3. Splash location list has no auto-select behavior
**File:** `SplashScreenUploader.tsx` line 51

`selectedLocationId` initializes as `''`, so no location is selected on first render. The user sees the location list but must manually click one before the editor appears. The first location with a terminal should auto-select.

**Fix:** After `allStatus` loads, auto-select the first location that has a terminal (or the first location overall if none have terminals).

---

## Gaps (should fix soon)

### G1. ThemeInitializer loads from `user_preferences`, not `site_settings`
**File:** `ThemeInitializer.tsx`

The color theme is stored org-scoped in `site_settings` (via `useColorTheme` → `useSiteSettings`), but `ThemeInitializer` reads from `user_preferences.custom_theme`. These are two different tables. If a user hasn't set personal overrides, `ThemeInitializer` returns nothing, and the theme flash you fixed earlier could recur on routes where `useColorTheme` isn't mounted yet.

**Status:** The earlier theme fix addressed the `useColorTheme` hook with module-load `localStorage` sync, which likely covers most cases. But `ThemeInitializer` is technically reading dead data for color theme purposes. Worth verifying whether `custom_theme` in `user_preferences` is still written to anywhere.

### G2. `useAllLocationTerminalStatus` makes N+1 network calls
**File:** `useAllLocationTerminalStatus.ts`

For each location it calls `invokeTerminalAction('list_locations')` individually, then calls `get_splash_screen` for each terminal. For an org with 10 locations, that's 20+ edge function invocations per card render.

**Improvement:** Batch the splash-screen-active check by reading terminal configurations from the metadata table instead of calling Stripe per-location. The metadata table already tracks origin — if origin exists, splash is active.

### G3. `useUpdateSiteSetting` uses read-then-write instead of upsert
**File:** `useSiteSettings.ts` lines 41–72

The mutation checks if a row exists, then does either UPDATE or INSERT. This is a race condition under concurrent writes and wastes a round-trip. Should use a single `.upsert()` call.

---

## Enhancements (nice to have)

### E1. Restore Settings subtab on refresh
Currently navigating back to Settings always lands on the grid. Preserving the active category/subtab in the URL (e.g., `/settings?tab=terminals`) would save clicks.

### E2. Splash screen animated GIF support callout
The upload zone mentions "JPG/PNG < 2MB" but doesn't mention GIF support (up to 4MB). Adding "GIF < 4MB" to the help text would improve discoverability.

### E3. Location list empty state
If an org has zero locations, the splash card shows nothing. An empty state directing to Location settings would be clearer than the current blank.

---

## Recommended execution order

1. **B1** — Push-to-all metadata sync (data integrity, ~15 min)
2. **B3** — Auto-select first terminal location (UX, ~5 min)
3. **B2** — Rename remaining "Zura Pay" strings (consistency, ~20 min)
4. **G3** — Upsert fix in `useUpdateSiteSetting` (correctness, ~5 min)
5. **E2** — GIF help text (trivial, ~2 min)

### Technical details

**B1 fix location:** `SplashScreenUploader.tsx` `handlePushToAll`, after line 200, add:
```typescript
const origin = pendingFile.fromDefault ? 'default_luxury' : 'custom';
if (orgId) {
  await Promise.allSettled(
    pairs.map(p => upsertSplashOrigin(orgId, p.locationId, p.terminalLocationId, origin))
  );
}
```

**B3 fix location:** Add a `useEffect` after `allStatus` loads that sets `selectedLocationId` to the first location with a terminal.

**G3 fix:** Replace the select+update/insert pattern with `.upsert({ ... }, { onConflict: 'id, organization_id' })`.

