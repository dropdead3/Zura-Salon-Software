

# Platform Select — Match Dark Theme Design System

## Problem

The base `Select` component uses semantic colors (`bg-popover`, `bg-accent`) that resolve to the light/cream theme. In platform admin pages (which use a dark slate aesthetic), dropdowns appear with mismatched cream backgrounds — the screenshot shows this clearly on the scales selector.

## Solution

Create a `PlatformSelect` component in `src/components/platform/ui/` that wraps the base Select primitives with platform-consistent dark styling (matching `PlatformInput`: `bg-slate-800/50`, `border-slate-700/50`, violet focus, white text). Then update all platform files to use it.

## 1. New File: `src/components/platform/ui/PlatformSelect.tsx`

Thin wrappers around Radix Select primitives with platform dark styles:

- **PlatformSelectTrigger**: `bg-slate-800/50 border-slate-700/50 text-white rounded-xl` (matches PlatformInput)
- **PlatformSelectContent**: `bg-slate-800 border-slate-700 text-white rounded-xl`
- **PlatformSelectItem**: `text-slate-300 focus:bg-violet-500/20 focus:text-white hover:bg-slate-700/50 rounded-lg` (no cream highlight)

Re-exports `Select`, `SelectGroup`, `SelectValue`, `SelectSeparator` unchanged.

## 2. Update Platform Files (swap imports + remove inline overrides)

Files using Select in platform:

| File | Current Approach |
|------|-----------------|
| `BackroomEntitlementsTab.tsx` | Inline `bg-slate-800/60 border-slate-700/50` on trigger only, content unstyled |
| `SupplyLibraryTab.tsx` | Inline styles on trigger, content unstyled |
| `PlatformTeamManager.tsx` | Inline `bg-slate-800/50 border-slate-700` |
| `KBCategoryManager.tsx` | Inline `bg-slate-800 border-slate-700` |
| `HardwareOrdersTab.tsx` | Needs check |

Each file: change import from `@/components/ui/select` to `@/components/platform/ui/PlatformSelect`, use `PlatformSelectTrigger`/`PlatformSelectContent`/`PlatformSelectItem`, remove ad-hoc className overrides.

## 3. Export from barrel

Add `PlatformSelect` exports to `src/components/platform/ui/index.ts`.

