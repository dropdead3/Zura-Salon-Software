

## Invert Chemical Toggle Logic

**Problem:** The toggle currently says "Show Color & Chemical Service Appointments Only" and defaults ON (filtering to chemical-only). User wants the inverse: label says "Show All Appointments", toggle ON = show all, toggle OFF = show only chemical/color.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

1. **Rename state:** `showChemicalOnly` → `showAll` (or just invert the semantics in-place)
2. **Default value:** Flip the default from `true` → `false` (so it starts showing chemical-only)
3. **Label text:** `"Show Color & Chemical Service Appointments Only"` → `"Show All Appointments"`
4. **Filter logic:** Invert the condition — currently `if (!showChemicalOnly) return all;` becomes `if (showAll) return all;` (same logic, just the variable name/semantics flip)
5. **localStorage:** Keep same storage key for continuity, but the stored boolean now means the opposite

Lines affected: ~81-83 (default), ~90-93 (handler), ~169-171 (filter), ~205-206 (label), ~210 (checked prop).

One file, semantic inversion only.

