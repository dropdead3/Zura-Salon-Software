

# Fix: App Toggle Bugs in AccountAppsCard

## Bug 1: Color Bar toggle appears off despite being enabled

**Root cause**: The `useOrganizationFeatureFlags` merge logic (line 51) only iterates over the global `feature_flags` table. The global table contains: `new_dashboard_layout`, `advanced_analytics`, `beta_features`, `connect_enabled`, `payroll_enabled` — but NOT `backroom_enabled`. 

The org override for this account has `backroom_enabled: true`, but because there's no matching global flag, the merge drops it entirely. `colorBarFlag` resolves to `undefined`, so the UI shows "off" even though the database says "on". Toggling writes correctly to the database but the UI never reflects it.

**Fix**: Update the merge logic in `useOrganizationFeatureFlags.ts` to also include org-only overrides that don't exist in the global flags table. After mapping global flags, append any org overrides whose `flag_key` wasn't already covered.

| File | Change |
|------|--------|
| `src/hooks/useOrganizationFeatureFlags.ts` | After line 61, iterate remaining org overrides not in `globalFlags` and append them to `merged` with `global_enabled: false` |

## Bug 2: Switch toggle UI is near-invisible / wrong colors in platform admin

**Root cause**: The default `Switch` component uses `bg-primary` (checked) and `bg-muted` (unchecked). In the platform admin dark theme context, these CSS variables resolve to the dashboard org theme values (light cream/warm tones), not the platform violet palette. This makes the toggle track blend into the dark background or look wrong.

**Fix**: Pass platform-appropriate class overrides to each `Switch` in `AccountAppsCard.tsx`. Use explicit violet for checked state and slate for unchecked — matching the platform design system.

| File | Change |
|------|--------|
| `src/components/platform/account/AccountAppsCard.tsx` | Add className to each Switch: `data-[state=checked]:bg-violet-500 data-[state=unchecked]:bg-slate-600` |

## Technical detail

```typescript
// useOrganizationFeatureFlags.ts — after the globalFlags.map()
// Append org-only overrides not present in global flags
const globalKeys = new Set((globalFlags || []).map(f => f.flag_key));
for (const [key, override] of overrideMap) {
  if (!globalKeys.has(key)) {
    merged.push({
      flag_key: key,
      global_enabled: false,
      org_enabled: override.is_enabled,
      has_override: true,
      override_reason: override.override_reason || null,
      override_id: override.id || null,
    });
  }
}
```

```tsx
// AccountAppsCard.tsx — Switch className
<Switch
  checked={isColorBarEnabled}
  onCheckedChange={() => handleToggleFlag('backroom_enabled', isColorBarEnabled)}
  disabled={updateFlag.isPending}
  className="data-[state=checked]:bg-violet-500 data-[state=unchecked]:bg-slate-600"
/>
```

Both fixes applied to all three app toggles (Color Bar, Connect, Payroll).

