

## Flatten Remaining Card-in-Card Nesting in StylistsContent

The screenshot shows three levels of nesting: EditorCard → Tabs → Card (for each stylist item and empty states). These inner cards create redundant borders and padding inside the already-bounded EditorCard.

### Changes — `src/components/dashboard/website-editor/StylistsContent.tsx`

**1. StylistCard (lines 240-328):** Replace `<Card><CardContent className="p-3 sm:p-4">` with a plain `<div className="p-3 border border-border/40 rounded-lg">`. This keeps visual separation between list items without the full card treatment.

**2. Empty state "No pending requests" (line 417):** Replace `<Card className="p-8 text-center">` with `<div className="p-8 text-center text-muted-foreground border border-dashed border-border/40 rounded-lg">` and remove the inner `<p>` wrapper (merge text into the div).

**3. Empty state "No stylists visible" (line 435):** Same treatment as above.

**4. Imports (line 3):** Remove `Card` and `CardContent` from imports if no longer used elsewhere in this file. Check `SpecialtyOptionsManager` — it's a separate component so its own card usage is fine.

Single file change: `src/components/dashboard/website-editor/StylistsContent.tsx`

