

# Replace Justice-Scale Icon with Weight Icon

The `Scale` icon from lucide-react (a justice/balance scale) is being used across 6 files for scale-related UI. Per the project's established UI vocabulary, the **`Weight`** icon is the correct visual for all scale-related surfaces.

## Files to Update

All changes follow the same pattern: replace `Scale` import with `Weight`, and `<Scale` with `<Weight`.

1. **`src/pages/dashboard/admin/BackroomSubscription.tsx`** — subscription page scale icon
2. **`src/components/dashboard/backroom/ManualWeightInput.tsx`** — capture button icon
3. **`src/components/platform/backroom/AdminActivateDialog.tsx`** — activation dialog scale count selector
4. **`src/components/platform/backroom/BackroomEntitlementsTab.tsx`** — entitlements table scale count selector (the screenshot)
5. **`src/components/dashboard/backroom-settings/StationHardwareWizard.tsx`** — discovered devices list icon

**Not changing**: `src/components/dashboard/settings/LeaderboardConfigurator.tsx` and `src/components/dashboard/settings/WebsiteSettingsContent.tsx` — these use `Scale` for "Scoring Weights" and "SEO & Legal" tabs respectively, which are unrelated to hardware scales.

Each file: swap `Scale` → `Weight` in the lucide-react import and in all JSX usage. No other logic changes.

