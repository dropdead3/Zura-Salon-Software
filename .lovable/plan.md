

# Decouple Tip Config from Color Bar Settings

## Problem

`tip_config` is stored in `backroom_settings` and accessed via `useColorBarSetting` — a hook built for the Zura Color Bar backroom product. Terminal tipping has no relationship to color mixing. This creates a confusing architectural coupling.

Receipt config already uses the correct pattern: `useSiteSettings` → `site_settings` table. Tip config should follow suit.

## Changes

### 1. Migrate `tip_config` from `backroom_settings` to `site_settings`

**Database migration:**
- Insert existing `tip_config` rows from `backroom_settings` into `site_settings` (matching by `organization_id`)
- This is a data migration — both tables already exist

### 2. Create `useTipConfig` hook

**New file:** `src/hooks/useTipConfig.ts`

- Built on `useSiteSettings` (same pattern as `useReceiptConfig`)
- Exports `useTipConfig()` returning typed `TipConfig` with defaults
- Exports `useUpdateTipConfig()` for mutations
- Contains the `TipConfig` interface and `DEFAULT_TIP_CONFIG` constant (moved from `ZuraPayTippingTab.tsx`)

### 3. Update `ZuraPayTippingTab.tsx`

- Replace `useColorBarSetting('tip_config')` and `useUpsertColorBarSetting` with the new `useTipConfig` / `useUpdateTipConfig`
- Remove Color Bar imports entirely
- Keep all existing UI and logic unchanged

### 4. Update `CheckoutDisplayConcept.tsx`

- Replace `useColorBarSetting('tip_config')` with the new `useTipConfig`
- Remove `useColorBarSetting` import

## Technical Details

- `site_settings` table uses `(organization_id, setting_key)` as the lookup pattern — same as `backroom_settings` but scoped to site/platform config rather than Color Bar
- `useSiteSettings` already handles org context resolution via `useSettingsOrgId`
- The migration copies data so nothing is lost; the old `backroom_settings` rows can be cleaned up later

## Files Modified
1. `src/hooks/useTipConfig.ts` — New hook (mirrors `useReceiptConfig` pattern)
2. `src/components/dashboard/settings/terminal/ZuraPayTippingTab.tsx` — Swap to new hook
3. `src/components/dashboard/settings/terminal/CheckoutDisplayConcept.tsx` — Swap to new hook
4. Database migration — Copy `tip_config` rows from `backroom_settings` to `site_settings`

