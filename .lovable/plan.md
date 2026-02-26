

## Fix: Security Toggles Not Persisting State

The "Require Email Verification" and "Restrict Sign-ups" toggles in the Security card are **completely uncontrolled** — they have no `checked` prop, no `onCheckedChange` handler, and no persistence logic. They render as bare `<Switch />` elements that flip visually but lose state on navigation.

### Root Cause (lines 1366 and 1373 of Settings.tsx)

```tsx
<Switch />  // No checked, no handler — purely decorative
<Switch />  // Same issue
```

### Solution

Follow the same pattern used by the Help & Guidance toggle (`useInfotainerSettings`) — persist these two booleans to the `organizations.settings` JSONB column.

### Step 1: Create `src/hooks/useOrgSecuritySettings.ts`

- Read `require_email_verification` and `restrict_signups` from `organizations.settings` JSONB (defaults: both `false`)
- Provide individual toggle mutation functions that merge into the existing settings object
- Use `useOrganizationContext` for org scoping
- Invalidate query cache on success

### Step 2: Update Security Card in `Settings.tsx` (lines 1352-1376)

- Extract the inline Security card into a `SecuritySettingsCard` component (same pattern as `InfotainerToggleCard`)
- Import and use the new hook
- Wire `checked` and `onCheckedChange` to the hook's state and mutators
- Add `disabled` prop during save to prevent double-toggling

### Technical Notes

- No database migration needed — `organizations.settings` is already a JSONB column used for `show_infotainers`
- The two new keys (`require_email_verification`, `restrict_signups`) merge safely alongside existing settings keys
- Optimistic updates via `onMutate` for instant UI feedback

