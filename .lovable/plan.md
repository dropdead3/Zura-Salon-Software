

## Flatten Card Nesting in StylistsContent

The current structure is EditorCard → Card (Sample Cards Settings) → CardContent, creating triple-nested card borders and excessive padding. The fix is to remove the inner `Card`/`CardHeader`/`CardContent` wrapper and render the Sample Cards Settings content directly inside the `EditorCard` using a simple section header and divider.

### Change — `src/components/dashboard/website-editor/StylistsContent.tsx`

**Remove** the `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, and `<CardContent>` wrapper around the Sample Cards Settings block (lines 339-398). Replace with:

1. A lightweight section header using an inline icon + label (same `Settings` icon + "Sample Cards Settings" text) styled as `text-xs font-display tracking-wide text-muted-foreground` — no card border
2. A `text-xs text-muted-foreground` description line below
3. The existing toggle, badges, alert, and preview button rendered directly — no extra card padding layer
4. A `border-t border-border/30` divider before the Tabs section to visually separate

This eliminates one full nesting level, reclaiming ~24px of horizontal padding and removing the redundant inner card border. The `StylistCard` items inside tabs also use `<Card>` but those are leaf-level list items and appropriate.

**Imports cleanup**: Remove `CardHeader` and `CardTitle` and `CardDescription` from imports if no longer used (the empty-state cards in tabs still use `Card` so keep that import).

