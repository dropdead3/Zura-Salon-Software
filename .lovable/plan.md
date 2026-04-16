

## Prompt review

Sharp catch — you noticed the selectors (Location/Stylist) are getting clipped on the right edge of the screenshot ("North Mes…" and "All Stylist…" cut off). You correctly re-asserted the priority hierarchy: selectors are critical and must stay visible, so the lower-value buttons (Shifts, Date, Assistant Blocks, Drafts) need to hide *earlier* — not just below `@lg`, but below `@xl` too.

Tighter version: "Selectors are critical — never clip them. Hide Shifts/Date pills and Assistant/Drafts icons below `@xl` (not `@lg`) so selectors keep their full width."

## Diagnosis

In `ScheduleHeader.tsx`, the four low-priority controls currently use `hidden @lg/schedhdr:flex` — meaning they reappear at container width ≥ 1024px. At your current viewport (1130px) with sidebar expanded (~340px), the header container is ~790px, which is below `@lg` so those buttons are correctly hidden.

But your screenshot shows the viewport is 1130px wide and the header appears to be ~1100px+ wide (sidebar collapsed or near-collapsed state), so container is between `@lg` (1024px) and `@xl` (1280px). At this width:
- Shifts pill, Date pill, Assistant Blocks, Drafts all reappear (they're keyed to `@lg`)
- Selectors get pushed to the right edge and clip ("North Mes…", "All Stylist…")

**Fix:** Push the visibility threshold for those four buttons up from `@lg/schedhdr` to `@xl/schedhdr`. They only appear when there's truly enough room (header ≥ 1280px).

## Fix

Single file: `src/components/dashboard/schedule/ScheduleHeader.tsx`. Change four class strings.

| Element | Current class | New class |
|---|---|---|
| Shifts pill | `hidden @lg/schedhdr:flex` | `hidden @xl/schedhdr:flex` |
| Date pill | `hidden @lg/schedhdr:flex` | `hidden @xl/schedhdr:flex` |
| Assistant Blocks | `hidden @lg/schedhdr:inline-flex` | `hidden @xl/schedhdr:inline-flex` |
| Drafts | `hidden @lg/schedhdr:inline-flex` | `hidden @xl/schedhdr:inline-flex` |

Everything else (date protection, click-to-open-picker fallback, selector widths, Day/Week toggles) stays as-is.

## Result by container width

| Container | Day/Week toggle | Shifts/Date pills | Assist/Drafts | Filters | Selectors | Date |
|---|---|---|---|---|---|---|
| `< @md` (<768px) | Visible | Hidden | Hidden | Visible | Visible | Visible (2-row) |
| `@md–@xl` (768–1279px) | Visible | **Hidden** | **Hidden** | Visible | **Visible, full width** | Visible (condensed) |
| `@xl+` (≥1280px) | Visible | Visible | Visible | Visible | Visible, full width | Two-line full |

At your current 1130px viewport (regardless of sidebar state), selectors will keep their full 220px width and never clip.

## Acceptance checks

1. At 1130px viewport, sidebar collapsed (~1034px header): Shifts, Date, Assist, Drafts are hidden. Selectors show full "North Mesa" / "All Stylists" labels — no clipping.
2. At 1130px viewport, sidebar expanded (~790px header): same as above (already worked, still works).
3. At ≥ 1280px container (e.g., 1600px viewport collapsed): all four buttons reappear, full layout restored.
4. Date stays visible at all widths.
5. Clicking center date still opens calendar picker.
6. No changes to handlers, state, or secondary nav bar.

## Out of scope

- Selector widths — unchanged.
- Day/Week toggle — unchanged.
- Filter icons — unchanged.
- Today's Prep conditional — unchanged.

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx`

