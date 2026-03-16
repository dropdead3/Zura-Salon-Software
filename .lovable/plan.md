

# Add PlatformTextarea and PlatformAlertDialogCancel Wrappers

## New Components

### 1. `PlatformTextarea` — `src/components/platform/ui/PlatformTextarea.tsx`

Wraps the base `Textarea` with platform dark styling: `bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:border-violet-500/50`. Functional classNames like `min-h-[300px]`, `font-mono`, `resize-none` passed per-instance are merged as-is.

### 2. `PlatformAlertDialogCancel` — add to existing `PlatformDialog.tsx`

Wraps `AlertDialogCancel` with `bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white`. Added alongside the existing Platform dialog wrappers.

## Exports

Both added to `src/components/platform/ui/index.ts`.

## Design Rules Update

Add `Textarea` and `AlertDialogCancel` to the prohibited/mapping tables in `.cursor/rules/platform-backend-design.mdc`.

## File Migrations

| File | Change |
|------|--------|
| `CompMonthsDialog.tsx` | `Textarea` → `PlatformTextarea`, remove `bg-slate-800 border-slate-700 text-white` |
| `ChangeDatesDialog.tsx` | Same |
| `ExtendTermDialog.tsx` | Same |
| `KBArticleEditor.tsx` | Same (2 instances) |
| `MentionInput.tsx` | Same |
| `BillingConfigurationPanel.tsx` | Same (also fixes wrong `bg-card/50` semantic class) |
| `AccountUsersTab.tsx` | `AlertDialogCancel` → `PlatformAlertDialogCancel`, remove overrides |
| `AccountFeatureFlagsTab.tsx` | Same |
| `PlatformTeamManager.tsx` | Same |

**9 files migrated, 2 new components, 2 files updated (index + rules).**

