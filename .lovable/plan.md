

# PlatformDialog Wrapper

## Problem

~15 dialog instances across platform files manually repeat `className="bg-slate-900 border-slate-700"` on `DialogContent`, plus `text-white` on titles and `text-slate-400` on descriptions. Several backroom dialogs (CSVImportDialog, RejectNoteDialog, AdminActivateDialog, PriceHistoryDialog, SupplyLibraryTab) are missing these overrides entirely, showing light-theme backgrounds.

## Plan

### 1. Create `PlatformDialog.tsx`

New file: `src/components/platform/ui/PlatformDialog.tsx`

Thin wrappers re-exporting base Dialog primitives with platform dark overrides:

- **PlatformDialogContent**: Merges `bg-slate-900 border-slate-700 text-white` into className (preserves max-w, overflow, flex overrides passed per-instance)
- **PlatformDialogTitle**: Merges `text-white`
- **PlatformDialogDescription**: Merges `text-slate-400`
- **PlatformAlertDialogContent**: Same dark overrides for AlertDialog usage
- **PlatformAlertDialogTitle**: Merges `text-white`
- **PlatformAlertDialogDescription**: Merges `text-slate-400`

Re-exports unchanged: `Dialog`, `DialogHeader`, `DialogFooter`, `DialogClose`, `DialogTrigger`, `AlertDialog`, `AlertDialogTrigger`, `AlertDialogAction`, `AlertDialogCancel`.

### 2. Export from barrel

Add to `src/components/platform/ui/index.ts`.

### 3. Update design rules

Add `PlatformDialogContent`/`PlatformDialogTitle`/`PlatformDialogDescription` to the component mapping table in `.cursor/rules/platform-backend-design.mdc`. Add `DialogContent` to the prohibited imports list.

### 4. Migrate ~15 files

Swap imports and remove redundant `bg-slate-900 border-slate-700 text-white text-slate-400` classNames:

| File | Has overrides? |
|------|---------------|
| ChangeDatesDialog.tsx | Yes — remove |
| CompMonthsDialog.tsx | Yes — remove |
| ExtendTermDialog.tsx | Yes — remove |
| LinkPandaDocDialog.tsx | Yes — remove |
| PlanUpgradeDialog.tsx | Yes — remove |
| KBArticleEditor.tsx | Yes — remove |
| KBCategoryManager.tsx | Yes — remove |
| InviteOrgUserDialog.tsx | Yes — remove |
| AccountFeatureFlagsTab.tsx | Yes (AlertDialog) — remove |
| AccountUsersTab.tsx | Yes (AlertDialog) — remove |
| CSVImportDialog.tsx | **Missing** — fixed by wrapper |
| RejectNoteDialog.tsx | **Missing** — fixed by wrapper |
| AdminActivateDialog.tsx | **Missing** — fixed by wrapper |
| PriceHistoryDialog.tsx | **Missing** — fixed by wrapper |
| SupplyLibraryTab.tsx (2 dialogs) | **Missing** — fixed by wrapper |

Functional classNames like `max-w-2xl`, `max-h-[80vh]`, `overflow-hidden`, `flex flex-col` are preserved as-is.

