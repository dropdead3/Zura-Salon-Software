

# Embed Stylist Levels Editor Inline in Settings

## Problem

When an admin clicks **Settings > Stylist Levels**, they get redirected away from Settings to the standalone `/admin/stylist-levels` page. This breaks the Settings flow — the user loses their Settings context and has to navigate back. The editor should render inline within the Settings page, just like every other Settings category.

## Approach

Extract the editor body from `StylistLevels.tsx` into a shared `StylistLevelsEditor` component. Both the standalone page and the Settings embed render this same component — no feature divergence possible.

### 1. Create `StylistLevelsEditor` component
Extract everything inside `<DashboardLayout>` from `StylistLevels.tsx` (the `div.p-6.max-w-4xl` container and the `GraduationWizard` dialog) into a new `src/components/dashboard/settings/StylistLevelsEditor.tsx`. This component contains all state, hooks, and UI — it's the full editor without the layout shell.

The component accepts an optional `embedded?: boolean` prop. When `true`:
- Omit the `DashboardPageHeader` (Settings already provides page context)
- Remove `sticky top-0` header behavior (Settings has its own scroll context)
- Skip the info notice about client-facing website (redundant in Settings)

### 2. Slim down `StylistLevels.tsx` (standalone page)
Reduce to just:
```tsx
<DashboardLayout>
  <StylistLevelsEditor />
</DashboardLayout>
```

### 3. Update `StylistLevelsContent.tsx` (Settings embed)
Replace the redirect with an inline render:
```tsx
export function StylistLevelsContent() {
  return <StylistLevelsEditor embedded />;
}
```

No more redirect. The full editor — commission rates, criteria configurator, team roster, PDF export — all renders inline within Settings.

## File Changes

| File | Action |
|------|--------|
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Create** — Extracted editor with all state/hooks/UI from StylistLevels.tsx |
| `src/pages/dashboard/admin/StylistLevels.tsx` | **Modify** — Slim wrapper: DashboardLayout + StylistLevelsEditor |
| `src/components/dashboard/settings/StylistLevelsContent.tsx` | **Modify** — Render StylistLevelsEditor inline instead of redirecting |

**1 new file, 2 modified files, 0 migrations.**

