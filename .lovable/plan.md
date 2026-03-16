

# Platform Backend Design Enforcement

## Problem

The Hardware Orders tab (and many other platform pages) imports base shadcn components (`Card`, `Badge`, `Button`, `Input`, `Table`) that inherit the cream/light theme instead of the platform's dark slate aesthetic. The screenshot shows KPI tiles and cards with light `bg-card` backgrounds that clash with the dark sidebar and page background.

This is a systemic issue: **39 platform files** import base `@/components/ui/*` components. We already have `PlatformCard`, `PlatformBadge`, `PlatformButton`, `PlatformInput`, `PlatformSelect`, `PlatformLabel` — but they aren't being used consistently.

## Plan

### 1. Create Platform Design Rules (Cursor Rule)

**New file:** `.cursor/rules/platform-backend-design.mdc`

A dedicated rule scoped to `src/components/platform/**/*.tsx` that enforces:

| Base Component | Must Use Instead |
|---------------|-----------------|
| `Card`, `CardHeader`, etc. | `PlatformCard`, `PlatformCardHeader`, etc. |
| `Badge` | `PlatformBadge` |
| `Button` | `PlatformButton` |
| `Input` | `PlatformInput` |
| `Select`, `SelectTrigger`, etc. | `PlatformSelect*` |
| `Label` | `PlatformLabel` |

Also documents:
- **Prohibited imports** in platform files: `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/input`
- **KPI tiles**: Must use platform-specific tokens (dark bg, light text)
- **Tables**: Use `PlatformTable` wrapper (new) or explicit dark overrides
- **Dialogs**: Must override content bg to `bg-slate-900 border-slate-700`
- **Color palette**: `bg-slate-800/50`, `border-slate-700/50`, `text-white`/`text-slate-300`/`text-slate-400`, violet accents

### 2. Add Platform KPI Tokens to `design-tokens.ts`

Add a `platformKpi` group alongside existing `kpi` tokens:

```typescript
platformKpi: {
  tile: 'rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 flex flex-col gap-1',
  label: 'font-display text-[11px] font-medium text-slate-400 uppercase tracking-wider',
  value: 'font-display text-xl font-medium text-white',
},
```

### 3. Create `PlatformTable` Wrapper

**New file:** `src/components/platform/ui/PlatformTable.tsx`

Thin wrappers around shadcn Table primitives with dark styling:
- `PlatformTableHead`: `text-slate-400` header text
- `PlatformTableRow`: `border-slate-700/50`, `hover:bg-slate-800/50`
- `PlatformTableCell`: `text-slate-300`

Export from `index.ts`.

### 4. Fix `HardwareOrdersTab.tsx` (immediate example)

- Replace `Card`/`CardHeader`/`CardTitle`/`CardContent` → `PlatformCard`/`PlatformCardHeader`/etc.
- Replace `Badge` → `PlatformBadge`
- Replace `Button` → `PlatformButton`
- Replace `Input` → `PlatformInput`
- Replace `tokens.kpi.*` → `tokens.platformKpi.*`
- Replace `Table` components → `PlatformTable` equivalents
- Remove all semantic color classes (`text-muted-foreground`, `bg-card`) in favor of explicit slate classes

### 5. Sweep Remaining Platform Files

Migrate the remaining ~38 platform files from base `ui/` imports to `platform/ui/` equivalents. This is the bulk of the work — each file needs its imports swapped and any inline dark-override classes cleaned up.

### Summary of New/Modified Files

| Action | File |
|--------|------|
| Create | `.cursor/rules/platform-backend-design.mdc` |
| Create | `src/components/platform/ui/PlatformTable.tsx` |
| Edit | `src/lib/design-tokens.ts` (add `platformKpi`) |
| Edit | `src/components/platform/ui/index.ts` (export PlatformTable) |
| Edit | `src/components/platform/backroom/HardwareOrdersTab.tsx` |
| Edit | ~38 other platform files (import swap) |

